import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyA7PhyTYqv_LF5P-9goXIGgyvqCkl01kJs",
  authDomain: "lifeos-a86b7.firebaseapp.com",
  projectId: "lifeos-a86b7",
  storageBucket: "lifeos-a86b7.firebasestorage.app",
  messagingSenderId: "191144362794",
  appId: "1:191144362794:web:26e02f828ca95c50c69453",
  measurementId: "G-0XZ2PBRD5R"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
