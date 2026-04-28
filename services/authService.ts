import * as Crypto from 'expo-crypto';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { dbService } from './dbService';

export const authService = {
  // Current user
  get currentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Google Login
  loginWithGoogle: async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const sessionToken = await authService.generateAndSaveSessionToken(result.user.uid);
      return { user: result.user, sessionToken, error: null };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { user: null, error: error.message };
    }
  },

  // Generates a new session token and saves it to Firestore.
  // NOTE: We do NOT revoke Firebase refresh tokens here — doing so invalidates
  // the user's own token immediately, causing background Firestore calls to fail
  // with permission-denied, which triggers an erroneous auto-logout.
  generateAndSaveSessionToken: async (userId: string) => {
    const token = Crypto.randomUUID();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await dbService.saveUserProfile(userId, {
      sessionToken: token,
      homeTimezone: tz,
    } as any);
    return token;
  },

  // Email Verification
  sendEmailVerification: async () => {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    }
  },

  // Email/Password Signup
  signUp: async (email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const sessionToken = await authService.generateAndSaveSessionToken(result.user.uid);
      // LOW-005: Send verification email immediately after account creation.
      sendEmailVerification(result.user).catch(() => {});
      return { user: result.user, sessionToken, error: null, errorCode: null };
    } catch (error: any) {
      return { user: null, sessionToken: null, error: mapAuthErrorToMessage(error.code), errorCode: error.code as string };
    }
  },

  // Email/Password Login
  login: async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const sessionToken = await authService.generateAndSaveSessionToken(result.user.uid);
      // LOW-005: Warn unverified users. Re-send verification so they can act on it.
      const emailVerified = result.user.emailVerified;
      if (!emailVerified) {
        sendEmailVerification(result.user).catch(() => {});
      }
      return { user: result.user, sessionToken, error: null, errorCode: null, emailVerified };
    } catch (error: any) {
      return { user: null, sessionToken: null, error: mapAuthErrorToMessage(error.code), errorCode: error.code as string };
    }
  },

  // Logout
  logout: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Change Password (requires re-authentication with current password)
  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return { error: 'No authenticated user' };

      // Re-authenticate before sensitive operation
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { error: null };
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { error: 'Current password is incorrect' };
      }
      if (error.code === 'auth/weak-password') {
        return { error: 'New password must be at least 6 characters' };
      }
      if (error.code === 'auth/requires-recent-login') {
        return { error: 'Please log out and log back in, then try again' };
      }
      return { error: mapAuthErrorToMessage(error.code) };
    }
  },

  // Password Reset
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Validate session (check if user still exists on server)
  validateSession: async (user: User) => {
    try {
      // Serve the cached token first (no network). Firebase auto-refreshes
      // if the token is within 5 minutes of expiry, so this is safe for the
      // vast majority of cold starts. Force-refreshing every open added a
      // 1-2s network delay before the app could route.
      await user.getIdToken(false);
      return true;
    } catch (error: any) {
      // Cached token invalid — try a full network refresh before giving up.
      try {
        await user.getIdToken(true);
        return true;
      } catch (refreshError: any) {
        if (
          refreshError.code === 'auth/user-not-found' ||
          refreshError.code === 'auth/user-disabled' ||
          refreshError.code === 'auth/id-token-revoked'
        ) {
          return false;
        }
        // Network error — trust the cached session to avoid false logouts
        return true;
      }
    }
  },

  // Delete Account
  deleteAccount: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');

      const uid = user.uid;

      // 1. PRE-CHECK: Force a token refresh to check if session is still valid.
      // This catches many 'requires-recent-login' cases BEFORE we touch any data.
      try {
        await user.getIdToken(true);
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login' || error.code === 'auth/user-token-expired') {
          return { error: 'requires-recent-login' };
        }
      }

      // 2. CLEANUP DATA (Must happen WHILE authenticated to have permissions)
      try {
        console.log('[LifeOS Auth] Starting deep cleanup for UID:', uid);

        try {
          const { useStore } = await import('@/store/useStore');
          const syncUnsubs = useStore.getState()._syncUnsubscribes;
          if (Array.isArray(syncUnsubs)) {
            syncUnsubs.forEach(unsub => {
              try { if (typeof unsub === 'function') unsub(); } catch (_) { }
            });
          }
        } catch (unsubErr) {
          console.warn('[LifeOS Auth] Failed to unsubscribe before cleanup:', unsubErr);
        }

        // Cleanup avatar from Storage
        const { useStore } = await import('@/store/useStore');
        const { storageService } = await import('./storageService');
        const state = useStore.getState();
        if (state.avatarUrl) {
          await storageService.deleteImage(state.avatarUrl);
        }
        await storageService.clearOrphanedAvatar(uid);

        // Delete all data from Firestore & Realtime DB
        await dbService.deleteAllUserData(uid);

        console.log('[LifeOS Auth] Deep cleanup finished.');
      } catch (err) {
        console.error('[LifeOS Auth] Data cleanup failed:', err);
        // We continue anyway to try and delete the Auth account
      }

      // 3. DELETE AUTH ACCOUNT (Final Step)
      try {
        await deleteUser(user);
      } catch (error: any) {
        console.error('[LifeOS Auth] Auth deletion failed:', error);
        if (error.code === 'auth/requires-recent-login') {
          // Data is gone, but account remains. 
          // We must inform the user to re-login to finish.
          return { error: 'requires-recent-login' };
        }
        throw error;
      }

      // 4. Force local logout to clear zustand store and AsyncStorage
      await authService.logout();

      return { error: null };
    } catch (error: any) {
      console.error('Account deletion error:', error);
      return { error: mapAuthErrorToMessage(error.code) || error.message };
    }
  },
};

const mapAuthErrorToMessage = (code: string): string => {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Invalid credentials';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/network-request-failed':
      return 'Network error, please check your connection';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/requires-recent-login':
      return 'For security, please log out and log back in before deleting your account.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials. Please log in using your original provider.';
    default:
      return 'Authentication failed. Please try again';
  }
};
