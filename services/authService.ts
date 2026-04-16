import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  deleteUser
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
  // This effectively invalidates all other active sessions for this user.
  generateAndSaveSessionToken: async (userId: string) => {
    const token = Crypto.randomUUID();
    await dbService.saveUserProfile(userId, { sessionToken: token } as any);
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

  // Validate session (Check if user still exists on server)
  validateSession: async (user: User) => {
    try {
      await user.reload();
      return true;
    } catch (error: any) {
      // If user is not found or disabled, they were likely deleted from the console
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/user-disabled' ||
        error.code === 'auth/user-token-expired'
      ) {
        return false;
      }
      // If it's a network error, we trust the cached session and return true to avoid false logouts
      // This is critical for users in subways, elevators, or areas with poor reception.
      if (error.code === 'auth/network-request-failed') {
        return true;
      }
      // For any other unknown error, we err on the side of caution and keep the session to prevent UX failure
      return true;
    }
  },

  // Delete Account
  deleteAccount: async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user found');
      await deleteUser(user);
       return { error: null };
     } catch (error: any) {
       console.error('Account deletion error:', error);
       return { error: mapAuthErrorToMessage(error.code) || error.message };
     }
   }
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
