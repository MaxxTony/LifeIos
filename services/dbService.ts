import {
  doc,
  setDoc,
  getDoc,
  onSnapshot
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
  saveMood: async (userId: string, moodData: any, dateKey: string) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        moodHistory: {
          [dateKey]: moodData
        },
        currentMood: moodData.mood
      }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  syncMoodHistory: async (userId: string, moodHistory: any) => {
    try {
      await setDoc(doc(db, 'users', userId), { moodHistory }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Focus History Sync
  syncFocusHistory: async (userId: string, focusHistory: any) => {
    try {
      await setDoc(doc(db, 'users', userId), { focusHistory }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Habit Sync
  syncHabits: async (userId: string, habits: any[]) => {
    try {
      await setDoc(doc(db, 'users', userId), { habits }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Mood Theme
  saveMoodTheme: async (userId: string, theme: string | null) => {
    try {
      await setDoc(doc(db, 'users', userId), { moodTheme: theme }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  saveAccentColor: async (userId: string, color: string | null) => {
    try {
      await setDoc(doc(db, 'users', userId), { accentColor: color }, { merge: true });
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Real-time listener for user data
  subscribeToUserData: (userId: string, onUpdate: (data: any) => void) => {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    }, (error) => {
      console.error('Firestore subscription error:', error);
    });
  }
};
