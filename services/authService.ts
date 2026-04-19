import {
  GoogleAuthProvider,
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  reload,
  deleteUser,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import * as Crypto from 'expo-crypto';
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
    await dbService.saveUserProfile(userId, { sessionToken: token, homeTimezone: tz } as any);
    return token;
  },

  // Email/Password Signup
  signUp: async (email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const sessionToken = await authService.generateAndSaveSessionToken(result.user.uid);
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
      return { user: result.user, sessionToken, error: null, errorCode: null };
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
      // C-AUTH-2 FIX: Use getIdToken(true) instead of reload().
      // getIdToken(true) forces a refresh and will fail if tokens were revoked.
      await user.getIdToken(true);
      return true;
    } catch (error: any) {
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/user-disabled' ||
        error.code === 'auth/id-token-revoked'
      ) {
        return false;
      }
      // Network error — trust the cached session to avoid false logouts
      if (error.code === 'auth/network-request-failed') {
        return true;
      }
      return true;
    }
  },

  // Delete Account
  deleteAccount: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');

      // C-AUTH-4 FIX: Clear session token in Firestore before deletion.
      // This ensures other devices listening to the profile will log out
      // even if the Auth deletion is pending or partial.
      try {
        await dbService.saveUserProfile(user.uid, { sessionToken: null } as any);
      } catch (err) {
        console.warn('[LifeOS Auth] Failed to clear sessionToken during deletion:', err);
      }

      await deleteUser(user);

      // C-AUTH-4 FIX: Must force logout to clear zustand store and AsyncStorage
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
    case 'auth/requires-recent-login':
      return 'For security, please log out and log back in before deleting your account.';
    default:
      return 'Authentication failed. Please try again';
  }
};
