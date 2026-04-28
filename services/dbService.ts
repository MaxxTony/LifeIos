import {
  collection,
  CollectionReference,
  deleteDoc,
  deleteField,
  doc,
  DocumentData,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Query,
  serverTimestamp,
  setDoc,
  SnapshotMetadata,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Habit, MoodEntry, Task, UserState } from '../store/types';

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

  saveTasksBatch: async (userId: string, tasks: Task[]) => {
    if (tasks.length === 0) return;

    // Chunk into 499 to stay safely within Firestore Limits (max 500)
    for (let i = 0; i < tasks.length; i += 499) {
      const batch = writeBatch(db);
      const chunk = tasks.slice(i, i + 499);

      chunk.forEach(task => {
        const taskData = sanitizeData({
          ...task,
          createdAt: task.createdAt || serverTimestamp(),
          serverCreatedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'users', userId, 'tasks', task.id), taskData);
      });

      await batch.commit();
    }
  },

  deleteTask: async (userId: string, taskId: string) => {
    await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
  },

  // Atomic Habit Operations
  saveHabit: async (userId: string, habit: Habit) => {
    // C-DB-2 FIX: Lower limit to 1000 and Deduplicate entries using Set to prevent 1MB document limit breach
    let prunedCompletions = Array.from(new Set(habit.completedDays || []));
    if (prunedCompletions.length > 1000) {
      prunedCompletions = prunedCompletions.sort((a, b) => a.localeCompare(b)).slice(-1000);
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
  // HAB-XP FIX: xpAwardedDays MUST be persisted alongside completedDays.
  // Previously only completedDays was written; when the Firestore onSnapshot fired
  // it returned the old document (with empty/stale xpAwardedDays), silently resetting
  // the XP guard and allowing repeated XP awards on done → undo → done in the same day.
  toggleHabitDate: async (userId: string, habitId: string, completedDays: string[], xpAwardedDays: string[], currentStreak?: number, bestStreak?: number) => {
    const updatePayload: any = {
      completedDays,
      xpAwardedDays,
      lastUpdatedAt: serverTimestamp(),
    };
    if (currentStreak !== undefined) updatePayload.currentStreak = currentStreak;
    if (bestStreak !== undefined) updatePayload.bestStreak = bestStreak;

    await updateDoc(doc(db, 'users', userId, 'habits', habitId), updatePayload);
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

  // FIREBASE-2 FIX: Accept `beforeDate` (YYYY-MM-DD) and only delete quest docs
  // whose IDs are strictly older than that date. Quest IDs follow the pattern
  // `quest-{YYYY-MM-DD}-{idx}`, so a string comparison on documentId() is sufficient.
  // This replaces the full getDocs() scan (reads every quest doc!) with a tiny targeted
  // query — saves ~3 reads/user/day at essentially zero write cost at scale.
  deleteDailyQuests: async (userId: string, beforeDate?: string) => {
    const collRef = collection(db, 'users', userId, 'dailyQuests');

    // Build the query: if beforeDate is supplied, only fetch docs whose ID is
    // lexicographically less than `quest-{beforeDate}` (i.e. yesterday and earlier).
    const q = beforeDate
      ? query(collRef, where(documentId(), '<', `quest-${beforeDate}`))
      : query(collRef); // fallback: fetch all (should only hit during legacy cleanup)

    const snap = await getDocs(q);
    if (snap.empty) return;

    // Chunked batch deletion — stays within Firestore's 500-op batch limit
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 499) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 499);
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
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

  getCollectionDoc: async (userId: string, collectionName: string, docId: string) => {
    const snap = await getDoc(doc(db, 'users', userId, collectionName, docId));
    return snap.exists() ? snap.data() : null;
  },

  saveAccentColor: async (userId: string, color: string | null) => {
    await setDoc(doc(db, 'users', userId), { accentColor: color }, { merge: true });
  },

  // DATA MIGRATION Logic
  migrateLegacyData: async (userId: string, legacyData: Partial<UserState> & { tasks?: any[]; habits?: any[]; moodHistory?: any; focusHistory?: any }) => {
    // C-DB-3 FIX: Idempotency check to prevent redundant writes/quota drain
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data()?._migrationComplete) {
      console.log(`[LifeOS Migration] User ${userId} already migrated. Skipping.`);
      return;
    }

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
      await setDoc(doc(db, 'users', userId), { ...sanitizeData(updates), _migrationComplete: true }, { merge: true });
      console.log(`[LifeOS Migration] Successfully migrated user ${userId}.`);
    }
  },

  // Real-time listener for user root document
  subscribeToUserData: (
    userId: string,
    onUpdate: (data: (Partial<UserState> & { _fromCache?: boolean }) | null) => void,
    onError?: (error: any) => void
  ): Unsubscribe => {
    const docRef = doc(db, 'users', userId);
    let hasExisted = false;
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          hasExisted = true;
          const data = snap.data() as Partial<UserState>;
          onUpdate({ ...data, _fromCache: snap.metadata.fromCache });
        } else {
          // Document doesn't exist. 
          // If it never existed, this is a new user; notify with null doc but 'loaded' status.
          // If it DID exist, it was deleted; notify with null to trigger logout.
          onUpdate(hasExisted ? null : { _isNewUser: true } as any);
        }
      },
      (error: any) => {
        if (onError) {
          onError(error);
        } else if (error.code === 'permission-denied') {
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
  ): Unsubscribe => {
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

  // GDPR Article 17 — Right to Erasure: delete all subcollections and root doc for a user.
  deleteAllUserData: async (userId: string) => {
    // 1. Delete Firestore subcollections under /users/{userId}
    const subcollections = [
      'tasks', 'habits', 'moodHistory', 'focusHistory',
      'dailyQuests', 'stats', 'lifeScoreHistory',
      'conversations', 'memories'
    ];
    for (const sub of subcollections) {
      try {
        const collRef = collection(db, 'users', userId, sub);
        const snap = await getDocs(collRef);
        if (!snap.empty) {
          // GDPR-DEEP: If this is conversations, we must ALSO delete the messages subcollection
          // for every single conversation document before deleting the conversation itself.
          if (sub === 'conversations') {
            for (const convDoc of snap.docs) {
              const msgSnap = await getDocs(collection(db, convDoc.ref.path, 'messages'));
              if (!msgSnap.empty) {
                for (let i = 0; i < msgSnap.docs.length; i += 499) {
                  const batch = writeBatch(db);
                  msgSnap.docs.slice(i, i + 499).forEach(d => batch.delete(d.ref));
                  await batch.commit();
                }
              }
            }
          }

          // Delete the documents in the main subcollection
          for (let i = 0; i < snap.docs.length; i += 499) {
            const batch = writeBatch(db);
            snap.docs.slice(i, i + 499).forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn(`[LifeOS Cleanup] Failed to clear subcollection ${sub}:`, err);
      }
    }

    // 2. Delete root Firestore documents
    try {
      await deleteDoc(doc(db, 'users', userId));
      await deleteDoc(doc(db, 'publicProfiles', userId));
    } catch (err) {
      console.warn('[LifeOS Cleanup] Failed to clear root docs:', err);
    }

    // 3. Delete from Realtime Database (Focus Room)
    try {
      const { ref, remove } = await import('firebase/database');
      const { rtdb } = await import('../firebase/config');
      await remove(ref(rtdb, `focusRoom/${userId}`));
    } catch (err) {
      console.warn('[LifeOS Cleanup] Failed to clear Realtime Database entry:', err);
    }
  },

  // BUFFERED XP SYSTEM: To reduce Firestore write costs and prevent 'hot doc' 
  // contention, we no longer write XP directly to users/{uid}/stats/global 
  // on every small gain. Instead, we write to a global 'xpBuffer' collection
  // which a Cloud Function aggregates every 5 minutes.
  updateGlobalStats: async (userId: string, statsData: Record<string, any>, deltaXP: number = 0) => {
    try {
      const now = Date.now();
      // 1. Direct update to stats/global doc only every 5 minutes
      const shouldUpdateCloudStats = now - (dbService as any)._lastStatsUpdate > 300000; 

      if (shouldUpdateCloudStats) {
        (dbService as any)._lastStatsUpdate = now;
        await setDoc(doc(db, 'users', userId, 'stats', 'global'), sanitizeData({
          ...statsData,
          lastUpdatedAt: serverTimestamp(),
        }), { merge: true });
      }

      // 2. Buffer the XP gain via transaction collection
      if (deltaXP > 0) {
        const txId = `tx_${userId}_${now}_${Math.random().toString(36).substring(7)}`;
        await setDoc(doc(db, 'xpBuffer', txId), {
          userId,
          amount: deltaXP,
          timestamp: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('[LifeOS] updateGlobalStats failed:', err);
    }
  },
  _lastStatsUpdate: 0,
};
