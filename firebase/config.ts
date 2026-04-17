import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LifeOS Firebase Configuration (JS SDK)
 * ========================================
 * Uses the Firebase JS SDK (modular API v9+) which keeps the JS bundle light.
 * Auth state persists via AsyncStorage between app restarts.
 * Firestore uses memory-only cache (no IndexedDB in React Native).
 * Crash analytics are handled by Sentry — see services/crashAnalytics.ts.
 */

const firebaseConfig = {
  apiKey: 'AIzaSyBkv2NE_MVH6ks3qB5v4fk58hiFwinext8',
  authDomain: 'lifeos-a86b7.firebaseapp.com',
  databaseURL: 'https://lifeos-a86b7-default-rtdb.firebaseio.com',
  projectId: 'lifeos-a86b7',
  storageBucket: 'lifeos-a86b7.firebasestorage.app',
  messagingSenderId: '191144362794',
  appId: '1:191144362794:ios:0afd76057efd98dac69453',
};

// Prevent duplicate initialization (guards against hot reload in Metro)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with AsyncStorage persistence so sessions survive app restarts
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

// Firestore with memory cache (IndexedDB is not available in React Native)
export const db = (() => {
  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    return getFirestore(app);
  }
})();

export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app);

// Connect to local emulators in development
if (__DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === 'true') {
  const {
    connectAuthEmulator,
  } = require('firebase/auth') as typeof import('firebase/auth');
  const {
    connectFirestoreEmulator,
  } = require('firebase/firestore') as typeof import('firebase/firestore');
  const {
    connectFunctionsEmulator,
  } = require('firebase/functions') as typeof import('firebase/functions');
  const {
    connectDatabaseEmulator,
  } = require('firebase/database') as typeof import('firebase/database');

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectDatabaseEmulator(rtdb, 'localhost', 9000);
    console.log('[Firebase JS SDK] Connected to emulators.');
  } catch (e) {
    console.warn('[Firebase JS SDK] Emulator connection failed (ok if already connected):', e);
  }
}
