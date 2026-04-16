import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  query,
  QueryConstraint,
  serverTimestamp,
  DocumentData,
  QuerySnapshot,
  SnapshotMetadata,
  arrayUnion,
  arrayRemove,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, Habit, MoodEntry, UserState } from '../store/types';

/**
 * sanitizeData
 * Recursively removes any values that are 'undefined' from an object.
 * Firestore throws errors if any field is undefined.
 */
const sanitizeData = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => sanitizeData(v));

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, sanitizeData(v)])
  );
};

export const dbService = {
  // User Profile
  saveUserProfile: async (userId: string, data: Partial<UserState>) => {
    await setDoc(doc(db, 'users', userId), sanitizeData(data), { merge: true });
  },

  getUserProfile: async (userId: string) => {
    const docSnap = await getDoc(doc(db, 'users', userId));
    return { data: docSnap.exists() ? docSnap.data() as Partial<UserState> : null };
  },

  // Atomic Task Operations
  saveTask: async (userId: string, task: Task) => {
    // F-8: Use serverTimestamp for all createdAt fields to ensure sorting consistency
    const taskData = sanitizeData({
      ...task,
      createdAt: task.createdAt || serverTimestamp(),
      serverCreatedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'users', userId, 'tasks', task.id), taskData);
  },

  deleteTask: async (userId: string, taskId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  },

  // Atomic Habit Operations
  saveHabit: async (userId: string, habit: Habit) => {
    // F-1: Defensive pruning to ensure 1MB limit is never hit
    let prunedCompletions = habit.completedDays || [];
    if (prunedCompletions.length > 500) {
      prunedCompletions = prunedCompletions.sort().slice(-500);
    }

    const habitData = sanitizeData({
      ...habit,
      completedDays: prunedCompletions,
      createdAt: habit.createdAt || serverTimestamp(),
      serverCreatedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'users', userId, 'habits', habit.id), habitData);
  },

  deleteHabit: async (userId: string, habitId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  },

  // Atomic Habit Completion (fixes race conditions on multi-device)
  toggleHabitDate: async (userId: string, habitId: string, dateStr: string, isCompleted: boolean) => {
    const habitRef = doc(db, 'users', userId, 'habits', habitId);
    await updateDoc(habitRef, {
      completedDays: isCompleted ? arrayUnion(dateStr) : arrayRemove(dateStr),
      lastUpdatedAt: serverTimestamp()
    });
  },

  // Mood History (Atomic per date)
  saveMood: async (userId: string, moodData: MoodEntry, dateKey: string) => {
    const data = sanitizeData({ 
      ...moodData, 
      createdAt: moodData.timestamp || serverTimestamp(),
      serverCreatedAt: serverTimestamp() 
    });
    await setDoc(doc(db, 'users', userId, 'moodHistory', dateKey), data);
  },

  // Daily Quests
  saveDailyQuest: async (userId: string, quest: any) => {
    await setDoc(doc(db, 'users', userId, 'dailyQuests', quest.id), sanitizeData(quest));
  },

  deleteDailyQuests: async (userId: string) => {
    const collRef = collection(db, 'users', userId, 'dailyQuests');
    const snap = await getDocs(collRef);
    if (snap.empty) return;
    
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },

  // Focus History (Atomic per date)
  saveFocusEntry: async (userId: string, dateKey: string, totalSeconds: number) => {
    const data = sanitizeData({
      totalSeconds,
      serverUpdatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'users', userId, 'focusHistory', dateKey), data);
  },

  saveMoodTheme: async (userId: string, theme: string | null) => {
    await setDoc(doc(db, 'users', userId), { moodTheme: theme }, { merge: true });
  },

  // Generic Sub-collection Persistence
  saveCollectionDoc: async (userId: string, collectionName: string, docId: string, data: any) => {
    await setDoc(doc(db, 'users', userId, collectionName, docId), sanitizeData(data), { merge: true });
  },

  saveAccentColor: async (userId: string, color: string | null) => {
    await setDoc(doc(db, 'users', userId), { accentColor: color }, { merge: true });
  },

  /**
   * DATA MIGRATION Logic
   * Checks for legacy array-based data on the root document and moves it to sub-collections.
   */
  migrateLegacyData: async (userId: string, legacyData: Partial<UserState> & { tasks?: any[]; habits?: any[]; moodHistory?: any; focusHistory?: any }) => {
    const batch = writeBatch(db);
    const updates: any = {};
    let hasMigration = false;

    // 1. Migrate Tasks
    if (Array.isArray(legacyData.tasks)) {
      legacyData.tasks.forEach((task: any) => {
        const taskRef = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(taskRef, sanitizeData(task));
      });
      updates.tasks = deleteField();
      hasMigration = true;
    }

    // 2. Migrate Habits
    if (Array.isArray(legacyData.habits)) {
      legacyData.habits.forEach((habit: any) => {
        const habitRef = doc(db, 'users', userId, 'habits', habit.id);
        batch.set(habitRef, sanitizeData(habit));
      });
      updates.habits = deleteField();
      hasMigration = true;
    }

    // 3. Migrate Mood History
    if (legacyData.moodHistory && typeof legacyData.moodHistory === 'object') {
      Object.entries(legacyData.moodHistory).forEach(([dateKey, entry]: [string, any]) => {
        const moodRef = doc(db, 'users', userId, 'moodHistory', dateKey);
        batch.set(moodRef, sanitizeData(entry));
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
      await setDoc(doc(db, 'users', userId), sanitizeData(updates), { merge: true });
      console.log(`[LifeOS Migration] Successfully migrated user ${userId}.`);
    }
  },

  // Real-time listener for user root document (profile/settings).
  //
  // Calls onUpdate(data) whenever the document changes.
  // Calls onUpdate(null) ONLY if the document was previously observed to exist
  // and then disappears — i.e. it was deleted server-side. Snapshots where the
  // document has never existed (new users whose profile hasn't been written yet)
  // are silently ignored so Google/email sign-up doesn't trigger a false logout.
  subscribeToUserData: (userId: string, onUpdate: (data: (Partial<UserState> & { _fromCache?: boolean }) | null) => void) => {
    const docRef = doc(db, 'users', userId);
    let hasExisted = false;
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        hasExisted = true;
        const data = docSnap.data() as Partial<UserState>;
        onUpdate({ ...data, _fromCache: docSnap.metadata.fromCache });
      } else if (hasExisted) {
        // Document existed previously — it was deleted, force sign-out.
        onUpdate(null);
      }
      // else: doc never existed yet (new user being set up) — do nothing.
    }, (error) => {
      if (error.code === 'permission-denied') {
        process.env.NODE_ENV === 'development' && console.warn('Firestore root subscription closed: Permission denied (likely logout)');
      } else {
        console.error('Firestore root subscription error:', error);
      }
    });
  },

  // Real-time listener for any sub-collection with constraint support
  subscribeToCollection: (
    userId: string, 
    collectionName: string, 
    onUpdate: (docs: DocumentData[], metadata: SnapshotMetadata) => void, 
    constraints: QueryConstraint[] = []
  ) => {
    let collRef: any = collection(db, 'users', userId, collectionName);
    if (constraints.length > 0) {
      collRef = query(collRef, ...constraints);
    }
    return onSnapshot(collRef, (querySnap: QuerySnapshot) => {
      onUpdate(
        querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        querySnap.metadata
      );
    }, (error) => {
      if (error.code === 'permission-denied') {
        process.env.NODE_ENV === 'development' && console.warn(`Firestore ${collectionName} subscription closed: Permission denied (logout)`);
      } else {
        console.error(`Firestore ${collectionName} subscription error:`, error);
      }
    });
  }
};
