import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../firebase/config';

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
      return { user: result.user, error: null };
    } catch (error: any) {
      console.error('Google login error:', error);
      return { user: null, error: error.message };
    }
  },

  // Guest Login
  loginAsGuest: async () => {
    try {
      const result = await signInAnonymously(auth);
      return { user: result.user, error: null };
    } catch (error: any) {
      console.error('Guest login error:', error);
      return { user: null, error: error.message };
    }
  },

  // Email/Password Signup
  signUp: async (email: string, pass: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Email/Password Login
  login: async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
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
  }
};
