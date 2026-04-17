import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  addDoc,
  query,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteField,
  writeBatch,
  CollectionReference,
  Query,
  DocumentData,
  SnapshotMetadata,
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
    const taskData = sanitizeData({
      ...task,
      createdAt: task.createdAt || serverTimestamp(),
      serverCreatedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', userId, 'tasks', task.id), taskData);
  },

  deleteTask: async (userId: string, taskId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  },

  // Atomic Habit Operations
  saveHabit: async (userId: string, habit: Habit) => {
    let prunedCompletions = habit.completedDays || [];
    if (prunedCompletions.length > 500) {
      prunedCompletions = prunedCompletions.sort().slice(-500);
    }

    const habitData = sanitizeData({
      ...habit,
      completedDays: prunedCompletions,
      createdAt: habit.createdAt || serverTimestamp(),
      serverCreatedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', userId, 'habits', habit.id), habitData);
  },

  deleteHabit: async (userId: string, habitId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'habits', habitId));
  },

  // Atomic Habit Completion
  toggleHabitDate: async (userId: string, habitId: string, dateStr: string, isCompleted: boolean) => {
    await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
      completedDays: isCompleted ? arrayUnion(dateStr) : arrayRemove(dateStr),
      lastUpdatedAt: serverTimestamp(),
    });
  },

  // Mood History
  saveMood: async (userId: string, moodData: MoodEntry, dateKey: string) => {
    const data = sanitizeData({
      ...moodData,
      createdAt: moodData.timestamp || serverTimestamp(),
      serverCreatedAt: serverTimestamp(),
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

  // Focus History
  saveFocusEntry: async (userId: string, dateKey: string, totalSeconds: number) => {
    const data = sanitizeData({
      totalSeconds,
      serverUpdatedAt: serverTimestamp(),
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

  // DATA MIGRATION Logic
  migrateLegacyData: async (userId: string, legacyData: Partial<UserState> & { tasks?: any[]; habits?: any[]; moodHistory?: any; focusHistory?: any }) => {
    const batch = writeBatch(db);
    const updates: any = {};
    let hasMigration = false;

    if (Array.isArray(legacyData.tasks)) {
      legacyData.tasks.forEach((task: any) => {
        const taskRef = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(taskRef, sanitizeData(task));
      });
      updates.tasks = deleteField();
      hasMigration = true;
    }

    if (Array.isArray(legacyData.habits)) {
      legacyData.habits.forEach((habit: any) => {
        const habitRef = doc(db, 'users', userId, 'habits', habit.id);
        batch.set(habitRef, sanitizeData(habit));
      });
      updates.habits = deleteField();
      hasMigration = true;
    }

    if (legacyData.moodHistory && typeof legacyData.moodHistory === 'object') {
      Object.entries(legacyData.moodHistory).forEach(([dateKey, entry]: [string, any]) => {
        const moodRef = doc(db, 'users', userId, 'moodHistory', dateKey);
        batch.set(moodRef, sanitizeData(entry));
      });
      updates.moodHistory = deleteField();
      hasMigration = true;
    }

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

  // Real-time listener for user root document
  subscribeToUserData: (userId: string, onUpdate: (data: (Partial<UserState> & { _fromCache?: boolean }) | null) => void) => {
    const docRef = doc(db, 'users', userId);
    let hasExisted = false;
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          hasExisted = true;
          const data = snap.data() as Partial<UserState>;
          onUpdate({ ...data, _fromCache: snap.metadata.fromCache });
        } else if (hasExisted) {
          onUpdate(null);
        }
      },
      (error: any) => {
        if (error.code === 'permission-denied') {
          process.env.NODE_ENV === 'development' && console.warn('Firestore root subscription closed: Permission denied');
        } else {
          console.error('Firestore root subscription error:', error);
        }
      }
    );
  },

  // Real-time listener for sub-collections
  subscribeToCollection: (
    userId: string,
    collectionName: string,
    onUpdate: (docs: DocumentData[], metadata: SnapshotMetadata) => void,
    queryFn?: (ref: CollectionReference<DocumentData>) => Query<DocumentData>
  ) => {
    const collRef = collection(db, 'users', userId, collectionName);
    const finalRef = queryFn ? queryFn(collRef) : collRef;

    return onSnapshot(
      finalRef,
      (querySnap) => {
        onUpdate(
          querySnap.docs.map(d => ({ id: d.id, ...d.data() })),
          querySnap.metadata
        );
      },
      (error: any) => {
        if (error.code === 'permission-denied') {
          process.env.NODE_ENV === 'development' && console.warn(`Firestore ${collectionName} subscription closed: Permission denied`);
        } else {
          console.error(`Firestore ${collectionName} subscription error:`, error);
        }
      }
    );
  },
};
