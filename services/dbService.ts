import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const dbService = {
  // User Profile
  saveUserProfile: async (userId: string, data: any) => {
    try {
      await setDoc(doc(db, 'users', userId), data, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  getUserProfile: async (userId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      return { data: docSnap.exists() ? docSnap.data() : null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  // Task Sync
  syncTasks: async (userId: string, tasks: any[]) => {
    try {
      await setDoc(doc(db, 'users', userId), { tasks }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Mood History
  saveMood: async (userId: string, moodData: { mood: string, timestamp: number }) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        moodHistory: arrayUnion(moodData),
        currentMood: moodData.mood
      }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  }
};
