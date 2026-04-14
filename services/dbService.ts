import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const dbService = {
  // User Profile
  saveUserProfile: async (userId: string, data: any) => {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
  },

  getUserProfile: async (userId: string) => {
    const docSnap = await getDoc(doc(db, 'users', userId));
    return { data: docSnap.exists() ? docSnap.data() : null };
  },

  // Atomic Task Operations
  saveTask: async (userId: string, task: any) => {
    // Firestore rejects undefined values. Replace undefined fields with deleteField()
    // so clearing optional fields (e.g. systemComment) removes them from the document.
    const sanitized = Object.fromEntries(
      Object.entries(task).map(([k, v]) => [k, v === undefined ? deleteField() : v])
    );
    await setDoc(doc(db, 'users', userId, 'tasks', task.id), sanitized);
  },

  deleteTask: async (userId: string, taskId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  },

  // Atomic Habit Operations
  saveHabit: async (userId: string, habit: any) => {
    await setDoc(doc(db, 'users', userId, 'habits', habit.id), habit);
  },

  deleteHabit: async (userId: string, habitId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  },

  // Mood History (Atomic per date)
  saveMood: async (userId: string, moodData: any, dateKey: string) => {
    // moodHistory sub-collection is the single source of truth — no currentMood cache on root doc
    await setDoc(doc(db, 'users', userId, 'moodHistory', dateKey), moodData);
  },

  // Focus History (Atomic per date)
  saveFocusEntry: async (userId: string, dateKey: string, totalSeconds: number) => {
    await setDoc(doc(db, 'users', userId, 'focusHistory', dateKey), { totalSeconds });
  },

  saveMoodTheme: async (userId: string, theme: string | null) => {
    await setDoc(doc(db, 'users', userId), { moodTheme: theme }, { merge: true });
  },

  // Generic Sub-collection Persistence
  saveCollectionDoc: async (userId: string, collectionName: string, docId: string, data: any) => {
    await setDoc(doc(db, 'users', userId, collectionName, docId), data, { merge: true });
  },

  saveAccentColor: async (userId: string, color: string | null) => {
    await setDoc(doc(db, 'users', userId), { accentColor: color }, { merge: true });
  },

  /**
   * DATA MIGRATION Logic
   * Checks for legacy array-based data on the root document and moves it to sub-collections.
   */
  migrateLegacyData: async (userId: string, legacyData: any) => {
    const batch = writeBatch(db);
    const updates: any = {};
    let hasMigration = false;

    // 1. Migrate Tasks
    if (Array.isArray(legacyData.tasks)) {
      legacyData.tasks.forEach((task: any) => {
        const taskRef = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(taskRef, task);
      });
      updates.tasks = deleteField();
      hasMigration = true;
    }

    // 2. Migrate Habits
    if (Array.isArray(legacyData.habits)) {
      legacyData.habits.forEach((habit: any) => {
        const habitRef = doc(db, 'users', userId, 'habits', habit.id);
        batch.set(habitRef, habit);
      });
      updates.habits = deleteField();
      hasMigration = true;
    }

    // 3. Migrate Mood History
    if (legacyData.moodHistory && typeof legacyData.moodHistory === 'object' && !Array.isArray(legacyData.moodHistory)) {
      Object.entries(legacyData.moodHistory).forEach(([dateKey, entry]: [string, any]) => {
        const moodRef = doc(db, 'users', userId, 'moodHistory', dateKey);
        batch.set(moodRef, entry);
      });
      updates.moodHistory = deleteField();
      hasMigration = true;
    }

    // 4. Migrate Focus History
    if (legacyData.focusHistory && typeof legacyData.focusHistory === 'object') {
      Object.entries(legacyData.focusHistory).forEach(([dateKey, seconds]: [string, any]) => {
        const focusRef = doc(db, 'users', userId, 'focusHistory', dateKey);
        batch.set(focusRef, { totalSeconds: seconds });
      });
      updates.focusHistory = deleteField();
      hasMigration = true;
    }

    if (hasMigration) {
      console.log(`[LifeOS Migration] Migrating legacy data for user ${userId}...`);
      await batch.commit();
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
      console.log(`[LifeOS Migration] Successfully migrated user ${userId}.`);
    }
  },

  // Real-time listener for user root document (profile/settings)
  subscribeToUserData: (userId: string, onUpdate: (data: any) => void) => {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        process.env.NODE_ENV === 'development' && console.warn('Firestore root subscription closed: Permission denied (likely logout)');
      } else {
        console.error('Firestore root subscription error:', error);
      }
    });
  },

  // Real-time listener for any sub-collection
  subscribeToCollection: (userId: string, collectionName: string, onUpdate: (docs: any[]) => void) => {
    const collRef = collection(db, 'users', userId, collectionName);
    return onSnapshot(collRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(docs);
    }, (error) => {
      if (error.code === 'permission-denied') {
        process.env.NODE_ENV === 'development' && console.warn(`Firestore ${collectionName} subscription closed: Permission denied (likely logout)`);
      } else {
        console.error(`Firestore ${collectionName} subscription error:`, error);
      }
    });
  }
};
