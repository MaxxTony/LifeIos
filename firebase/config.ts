import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getReactNativePersistence, initializeAuth, Auth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
import { connectFunctionsEmulator, getFunctions, Functions } from 'firebase/functions';

// FIX C-1: Credentials moved to .env.local — never commit raw keys to source control
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// N-4: Enable Firestore Offline Persistence (Persistent Cache)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({}) 
});

// Lazy-loaded services
let storage: FirebaseStorage;
let rtdb: Database;
let functions: Functions;

/**
 * Lazy-load Firebase Storage
 */
const getStorageService = () => {
  if (!storage) storage = getStorage(app);
  return storage;
};

/**
 * Lazy-load Firebase Realtime Database
 */
const getRTDBService = () => {
  if (!rtdb) rtdb = getDatabase(app);
  return rtdb;
};

/**
 * Lazy-load Firebase Cloud Functions
 */
const getFunctionsService = () => {
  if (!functions) {
    functions = getFunctions(app, 'us-central1');
    if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
  }
  return functions;
};

// S-5: Connect to Auth Emulator if configured
if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
  console.log('[Firebase] Connecting to local auth emulator...');
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
}

export { auth, db, getStorageService, getRTDBService, getFunctionsService };
