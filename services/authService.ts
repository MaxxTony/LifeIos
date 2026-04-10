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
      return { user: null, error: mapAuthErrorToMessage(error.code) };
    }
  },

  // Email/Password Login
  login: async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: mapAuthErrorToMessage(error.code) };
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
      // If user is not found, it means they were deleted from the console
      if (error.code === 'auth/user-not-found' || error.code === 'auth/user-token-expired') {
        return false;
      }
      // For other errors, we might still be offline, so we return true to avoid false logouts
      return true;
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
    default:
      return 'Authentication failed. Please try again';
  }
};
