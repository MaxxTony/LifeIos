import { StateCreator } from 'zustand';
import { UserState, Task, Habit, MoodEntry, AuthActions } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { fireSync, isSyncingGlobal, setSyncingGlobal } from '../syncHelper';
import { migrateTasks, computeLevel } from '../helpers';
import Toast from 'react-native-toast-message';
import { query, where, orderBy, limit, documentId, setDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { setSentryUser } from '@/services/crashAnalytics';

// Full state reset applied on logout or forced sign-out (e.g. server-side user deletion).
const LOGGED_OUT_STATE: Partial<UserState> = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  userId: null,
  userName: null,
  email: null,
  createdAt: null,
  tasks: [],
  habits: [],
  mood: null,
  moodHistory: {},
  focusSession: {
    totalSecondsToday: 0,
    isActive: false,
    lastStartTime: null,
    isPomodoro: false,
    pomodoroMode: 'work' as const,
    pomodoroWorkDuration: 25 * 60,
    pomodoroBreakDuration: 5 * 60,
    pomodoroTimeLeft: 25 * 60,
    sessionStartSeconds: 0,
    pomodoroOverflow: 0,
  },
  focusHistory: {},
  focusGoalHours: 8,
  lastResetDate: null,
  bio: null,
  location: null,
  occupation: null,
  avatarUrl: null,
  phoneNumber: null,
  birthday: null,
  pronouns: null,
  skills: null,
  socialLinks: {},
  moodTheme: null,
  themePreference: 'system' as const,
  accentColor: null as string | null,
  homeTimezone: null as string | null,
  notificationSettings: {
    push: true,
    tasks: true,
    habits: true,
    mood: true,
    proactive: true,
  },
  onboardingData: { struggles: [] },
  recentXP: null,
  streakMilestones: [],
  lastMoodLog: null,
  lifeScoreHistory: {},
  totalXP: 0,
  level: 1,
  weeklyXP: 0,
  globalStreak: 0,
  lastActiveDate: null,
  lastWeekResetDate: null,
  lastLoginBonusDate: null,
  streakFreezes: 0,
  globalConfetti: false,
  dailyQuests: [],
  completedQuests: [],
  proactivePrompt: null,
  _syncUnsubscribes: [],
  sessionToken: null,
  syncError: null,
  _lastRetryAt: 0,
  hasSeenWalkthrough: false,
  lastActiveTimestamp: Date.now(),
  syncStatus: {
    tasksLoaded: false,
    habitsLoaded: false,
    moodLoaded: false,
    focusLoaded: false,
    isOffline: false,
    lastCloudSync: null,
  },
  pendingActions: [],
};

export const createAuthSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], AuthActions> = (set, get) => ({
  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),

  setAuth: async (userId, userName, sessionToken) => {
    const unsubs = get()._syncUnsubscribes;
    for (const unsub of unsubs) {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    }
    if (!userId) {
      // User signed out or was deleted server-side — clear all persisted user data.
      set((state) => ({
        ...LOGGED_OUT_STATE,
        _subscriptionGen: state._subscriptionGen + 1,
      }));
      return;
    }
    set((state) => ({
      userId,
      userName,
      sessionToken: sessionToken || state.sessionToken,
      isAuthenticated: true,
      _syncUnsubscribes: [],
      _subscriptionGen: state._subscriptionGen + 1,
    }));
    // C-18 FIX: Tag Sentry session so crashes are attributed to the correct user.
    setSentryUser(userId, userName);
    get().actions.subscribeToCloud();
  },

  updateProfile: async (updates) => {
    const { userId } = get();
    if (!userId) return;
    const allowed: (keyof UserState)[] = [
      'userName', 'bio', 'location', 'occupation', 'avatarUrl',
      'phoneNumber', 'birthday', 'pronouns', 'skills', 'socialLinks',
    ];
    const safe: Partial<UserState> = {};
    for (const key of allowed) {
      if (key in updates) {
        (safe as any)[key] = (updates as any)[key];
      }
    }
    set(safe as any);
    await dbService.saveUserProfile(userId, safe);
  },

  logout: async () => {
    // C-09 FIX: Clean up presence before clearing state so we have userId available.
    const state = get();
    if (state.focusSession?.isActive && state.userId) {
      try {
        const { presenceService } = await import('@/services/presenceService');
        await presenceService.leaveFocusRoom(state.userId);
      } catch (_) {}
    }
    state._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    // C-1: Clear AsyncStorage immediately to prevent data leak window
    try {
      await AsyncStorage.removeItem('lifeos-storage');
    } catch (err) {
      console.warn('[LifeOS] Failed to clear storage on logout:', err);
    }
    setSentryUser(null);
    set(LOGGED_OUT_STATE);
  },

  subscribeToCloud: () => {
    const userId = get().userId;
    if (!userId) return;

    // Clear existing subs
    get()._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });

    let myGen!: number;
    set(state => {
      myGen = state._subscriptionGen + 1;
      return { _subscriptionGen: myGen, _syncUnsubscribes: [] };
    });
    const isStale = () => get()._subscriptionGen !== myGen || get().userId !== userId;

    const HISTORY_WINDOW_DAYS = 365;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    const windowStartStr = formatLocalDate(windowStart);

    const syncWindowDate = new Date();
    syncWindowDate.setDate(syncWindowDate.getDate() - 365);
    const syncWindowStr = formatLocalDate(syncWindowDate);
    const syncStartedAt = Date.now();

    const checkOfflineStatus = (fromCache: boolean) => {
      if (!fromCache) return false;
      const now = Date.now();
      const { lastCloudSync } = get().syncStatus;
      if (now - syncStartedAt < 5000) return false;
      if (lastCloudSync && now - lastCloudSync < 30000) return false;
      return true;
    };

    // C-STORE-4 FIX: Collect ALL unsubscribers in a local array first.
    // If an error occurs midway, we still update the store with what we have
    // so they can be cleaned up on the next logout/login.
    // O1 FIX: Removed eager publicProfile upsert here — it was firing a
    // duplicate write every app open. The onSnapshot callback below already
    // upserts on every non-cached Firestore read, which covers the same case
    // within ~500ms of open. One write per session is sufficient.
    const collected: (() => void)[] = [];

    try {
      // Root Profile Subscription
      const unsubRoot = dbService.subscribeToUserData(
        userId,
        (data) => {
          if (!data) {
            console.warn('[LifeOS] User document deleted from Firestore - forcing logout.');
            authService.logout();
            get().actions.setAuth(null, null);
            return;
          }

          const currentToken = get().sessionToken;
          if (data.sessionToken && currentToken && data.sessionToken !== currentToken) {
            console.warn('[LifeOS] sessionToken mismatch - logging out device.');
            Toast.show({
              type: 'error',
              text1: 'Session Expired',
              text2: 'You have been logged in on another device.'
            });
            authService.logout();
            get().actions.setAuth(null, null);
            return;
          }

          set((state) => ({
            userName: data.userName || get().userName,
            moodTheme: data.moodTheme || get().moodTheme,
            focusGoalHours: data.focusGoalHours || get().focusGoalHours,
            bio: data.bio !== undefined ? data.bio : get().bio,
            location: data.location !== undefined ? data.location : get().location,
            occupation: data.occupation !== undefined ? data.occupation : get().occupation,
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : get().avatarUrl,
            phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : get().phoneNumber,
            birthday: data.birthday !== undefined ? data.birthday : get().birthday,
            pronouns: data.pronouns !== undefined ? data.pronouns : get().pronouns,
            skills: data.skills !== undefined ? data.skills : get().skills,
            socialLinks: data.socialLinks !== undefined ? data.socialLinks : get().socialLinks,
            accentColor: data.accentColor || get().accentColor,
            homeTimezone: data.homeTimezone || get().homeTimezone,
            hasSeenWalkthrough: data.hasSeenWalkthrough !== undefined ? data.hasSeenWalkthrough : get().hasSeenWalkthrough,
            streakFreezes: data.streakFreezes !== undefined ? data.streakFreezes : get().streakFreezes,
            lastLoginBonusDate: data.lastLoginBonusDate !== undefined ? data.lastLoginBonusDate : get().lastLoginBonusDate,
            syncStatus: {
              ...state.syncStatus,
              isOffline: checkOfflineStatus(!!data._fromCache),
              lastCloudSync: !data._fromCache ? Date.now() : state.syncStatus.lastCloudSync
            }
          }));

          // GAMIFICATION: Daily Login Bonus (+5 XP)
          if (!data._fromCache) {
            const todayStr = formatLocalDate(new Date());
            const currentState = get();
            
            // If they haven't gotten the bonus today
            if (currentState.lastLoginBonusDate !== todayStr) {
              const newXP = currentState.totalXP + 5;
              const newWeeklyXP = currentState.weeklyXP + 5;
              const newLevel = computeLevel(newXP);
              
              set({
                totalXP: newXP,
                weeklyXP: newWeeklyXP,
                level: newLevel,
                lastLoginBonusDate: todayStr
              });
              
              fireSync(() => dbService.updateGlobalStats(userId!, { totalXP: newXP, weeklyXP: newWeeklyXP }), 'dailyLoginBonus_stats', userId);
              fireSync(() => dbService.saveUserProfile(userId!, { lastLoginBonusDate: todayStr } as any), 'dailyLoginBonus_profile', userId);

              // Show toast and trigger confetti!
              currentState.actions.triggerGlobalConfetti();
              Toast.show({
                type: 'success',
                text1: '🎁 Daily Bonus!',
                text2: '+5 XP for logging in today.',
                visibilityTime: 4000
              });
            }
          }

          // SOCIAL: Sync fresh profile to publicProfiles root collection.
          // Fires on every app open with real username + avatar from Firestore.
          if (!data._fromCache) {
            const currentState = get();
            const displayName = data.userName || currentState.userName || 'Unknown';
            setDoc(
              doc(db, 'publicProfiles', userId),
              {
                userName: displayName,
                // O9 FIX: Keep lowercase version for case-insensitive search queries.
                userNameLower: displayName.toLowerCase(),
                avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (currentState.avatarUrl || null),
                level: currentState.level || 1,
                weeklyXP: currentState.weeklyXP || 0,
                globalStreak: currentState.globalStreak || 0,
                lastActive: Date.now(),
              },
              { merge: true }
            ).catch(err => console.warn('[LifeOS] publicProfile sync failed:', err));
          }
        },
        (error) => {
          if (error.code === 'permission-denied') {
            console.warn('[LifeOS] Firestore permission denied for root user - forcing logout.');
            authService.logout();
            get().actions.setAuth(null, null);
          }
        }
      );
      collected.push(unsubRoot);

      // Tasks Subscription
      const unsubTasks = dbService.subscribeToCollection(
        userId,
        'tasks',
        (docs, metadata) => {
          if (isStale()) return;
          set((state) => ({
            tasks: migrateTasks(docs as Task[]),
            syncStatus: {
              ...state.syncStatus,
              tasksLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where('date', '>=', syncWindowStr))
      );
      collected.push(unsubTasks);

      // Habits Subscription
      const unsubHabits = dbService.subscribeToCollection(
        userId,
        'habits',
        (docs, metadata) => {
          if (isStale()) return;
          set((state) => ({
            habits: docs as Habit[],
            syncStatus: {
              ...state.syncStatus,
              habitsLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, orderBy('createdAt', 'desc'), limit(500))
      );
      collected.push(unsubHabits);

      // Mood History Subscription
      const unsubMood = dbService.subscribeToCollection(
        userId,
        'moodHistory',
        (docs, metadata) => {
          const map: Record<string, MoodEntry> = {};
          docs.forEach(doc => {
            const { id, ...entry } = doc as { id: string } & MoodEntry;
            map[id] = entry;
          });
          const today = getTodayLocal();
          set(state => ({
            moodHistory: { ...state.moodHistory, ...map },
            mood: map[today]?.mood ?? state.mood,
            syncStatus: {
              ...state.syncStatus,
              moodLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where(documentId(), '>=', windowStartStr))
      );
      collected.push(unsubMood);

      // Focus History Subscription
      const unsubFocus = dbService.subscribeToCollection(
        userId,
        'focusHistory',
        (docs, metadata) => {
          if (isStale()) return;
          const map: Record<string, number> = {};
          docs.forEach(doc => {
            map[doc.id] = (doc as { totalSeconds?: number }).totalSeconds || 0;
          });
          set((state) => ({
            focusHistory: map,
            syncStatus: {
              ...state.syncStatus,
              focusLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where(documentId(), '>=', windowStartStr))
      );
      collected.push(unsubFocus);

      // Quests Subscription
      const unsubQuests = dbService.subscribeToCollection(
        userId,
        'dailyQuests',
        (docs) => {
          if (isStale()) return;
          set({ dailyQuests: docs as any[] });
        },
        (ref) => query(ref, where(documentId(), '>=', `quest-${windowStartStr}`))
      );
      collected.push(unsubQuests);
    } catch (err) {
      console.error('[LifeOS] Sync subscription set failed:', err);
    } finally {
      set({ _syncUnsubscribes: collected });
    }
  },

  hydrateFromCloud: async () => {
    const userId = authService.currentUser?.uid || get().userId;
    if (userId) {
      try {
        const { data } = await dbService.getUserProfile(userId);
        if (data) {
          await dbService.migrateLegacyData(userId, data);
          const struggles = (data as any).struggles;
          set({
            userName: data.userName || null,
            hasCompletedOnboarding: data.hasCompletedOnboarding || get().hasCompletedOnboarding || (Array.isArray(struggles) && struggles.length > 0),
            onboardingData: { struggles: Array.isArray(struggles) ? struggles : [] },
            moodTheme: data.moodTheme || get().moodTheme,
            focusGoalHours: data.focusGoalHours || 8,
            bio: data.bio || null,
            location: data.location || null,
            occupation: data.occupation || null,
            avatarUrl: data.avatarUrl || null,
            phoneNumber: data.phoneNumber || null,
            birthday: data.birthday || null,
            pronouns: data.pronouns || null,
            skills: data.skills || null,
            socialLinks: data.socialLinks || {},
            accentColor: data.accentColor || get().accentColor,
            homeTimezone: data.homeTimezone || null,
            hasSeenWalkthrough: data.hasSeenWalkthrough !== undefined ? data.hasSeenWalkthrough : get().hasSeenWalkthrough
          });
        }

        // M-12 FIX: Server-wins for XP — take max(local, server) so the higher value always wins.
        // Prevents cheating rollbacks when re-logging in and prevents data loss from multi-device use.
        const statsDoc = await dbService.getCollectionDoc(userId, 'stats', 'global');
        if (statsDoc) {
          const serverXP: number = statsDoc.totalXP || 0;
          const localXP = get().totalXP;
          
          const updates: Partial<UserState> = {};
          
          if (serverXP > localXP) {
            updates.totalXP = serverXP;
            updates.level = computeLevel(serverXP);
          }
          
          if (statsDoc.globalStreak !== undefined) updates.globalStreak = statsDoc.globalStreak;
          // O5 FIX: Use Math.max to prevent a device that was offline from
          // overwriting a higher weeklyXP earned on another device.
          if (statsDoc.weeklyXP !== undefined) updates.weeklyXP = Math.max(statsDoc.weeklyXP, get().weeklyXP);
          if (statsDoc.lastActiveDate !== undefined) updates.lastActiveDate = statsDoc.lastActiveDate;
          if (statsDoc.lastWeekResetDate !== undefined) updates.lastWeekResetDate = statsDoc.lastWeekResetDate;
          
          if (Object.keys(updates).length > 0) {
            set(updates);
            
            // --- Phase 6: Sync to Native Widgets ---
            import('@/services/widgetSyncService').then(({ widgetSyncService }) => {
              widgetSyncService.syncStreak(updates.globalStreak ?? get().globalStreak);
            });
          }
        }

        // SOCIAL FIX: Always upsert publicProfile on login so user appears
        // in other users' Discover tab. This fires even if user has never earned XP.
        try {
          const state = get();
          const displayName = state.userName || 'Unknown';
          await setDoc(
            doc(db, 'publicProfiles', userId),
            {
              userName: displayName,
              // O9 FIX: Keep lowercase version for case-insensitive search queries.
              userNameLower: displayName.toLowerCase(),
              avatarUrl: state.avatarUrl || null,
              level: state.level || 1,
              weeklyXP: state.weeklyXP || 0,
              globalStreak: state.globalStreak || 0,
              lastActive: Date.now(),
            },
            { merge: true }
          );
        } catch (profileErr) {
          console.warn('[LifeOS] publicProfile upsert failed (non-fatal):', profileErr);
        }
      } catch (err: any) {
        console.error('Cloud hydration failed:', err);
      }
    }
  },

  clearSyncError: () => set({ syncError: null }),
  retrySync: async () => {
    const now = Date.now();
    if (now - get()._lastRetryAt < 10000) return;
    
    // C-SYNC-3 FIX: Re-entrancy lock
    if (isSyncingGlobal) {
      console.log('[LifeOS Sync] Sync already in progress, skipping retry.');
      return;
    }
    setSyncingGlobal(true);

    set({ syncError: null, _lastRetryAt: now });
    
    const { userId, pendingActions } = get();
    if (!userId) {
      setSyncingGlobal(false);
      return;
    }

    try {
      // C-5: Process Pending Actions Queue
      if (pendingActions.length > 0) {
        console.log(`[LifeOS Sync] Processing ${pendingActions.length} pending actions...`);
        for (const action of pendingActions) {
          try {
            if (action.collection === 'tasks') {
              if (action.type === 'delete') await dbService.deleteTask(userId, action.id);
              else await dbService.saveTask(userId, action.payload);
            } else if (action.collection === 'habits') {
              if (action.type === 'delete') await dbService.deleteHabit(userId, action.id);
              else await dbService.saveHabit(userId, action.payload);
            }
            set(state => ({
              pendingActions: state.pendingActions.filter(a => a.id !== action.id)
            }));
          } catch (err) {
            console.warn(`[LifeOS Sync] Retry failed for ${action.id}:`, err);
          }
        }
      }

      get().actions.subscribeToCloud();
    } catch (err: any) {
      console.error('[LifeOS] retrySync failed:', err?.message || err);
      set({ syncError: { label: 'retrySync', message: err?.message || String(err), timestamp: Date.now() } });
    } finally {
      setSyncingGlobal(false);
    }
  },

  setOnboardingData: (data) => set((state) => {
    const next = { ...state.onboardingData, ...data };
    if (state.userId && data.struggles) {
      fireSync(() => dbService.saveUserProfile(state.userId!, { struggles: data.struggles } as any), 'saveStruggles', state.userId);
    }
    return { onboardingData: next };
  }),
  setThemePreference: (theme) => set({ themePreference: theme }),
  setAccentColor: (color) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveAccentColor(state.userId!, color), 'saveAccentColor', state.userId);
    return { accentColor: color };
  }),
  triggerGlobalConfetti: () => {
    set({ globalConfetti: true });
    // Auto turn off so it can be re-triggered
    setTimeout(() => {
      set({ globalConfetti: false });
    }, 4000);
  },
  setHasSeenWalkthrough: (seen) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveUserProfile(state.userId!, { hasSeenWalkthrough: seen }), 'saveWalkthroughState', state.userId);
    return { hasSeenWalkthrough: seen };
  }),
  updateNotificationSettings: (updates) => {
    const next = { ...get().notificationSettings, ...updates };
    set({ notificationSettings: next });
    if (updates.push === false) {
      import('@/services/notificationService').then(({ notificationService }) => notificationService.cancelAllNotifications());
    }
    if (updates.mood !== undefined || updates.push !== undefined) {
      import('@/services/notificationService').then(({ notificationService }) => notificationService.scheduleDailyMoodReminder());
    }
    if (get().userId) {
      fireSync(() => dbService.saveUserProfile(get().userId!, { notificationSettings: next }), 'updateNotificationSettings', get().userId);
    }
  },
  buyStreakFreeze: async () => {
    const state = get();
    if (!state.userId) return;
    if (state.totalXP < 1000) {
      Toast.show({ type: 'error', text1: 'Not enough XP', text2: 'You need 1,000 XP to buy a Freeze.' });
      return;
    }
    if (state.streakFreezes >= 3) {
      Toast.show({ type: 'info', text1: 'Max Freezes Reached', text2: 'You can only hold 3 Streak Freezes at a time.' });
      return;
    }

    const newXP = state.totalXP - 1000;
    const newWeeklyXP = Math.max(0, state.weeklyXP - 1000);
    const newFreezes = state.streakFreezes + 1;
    const newLevel = computeLevel(newXP);
    
    set({ totalXP: newXP, weeklyXP: newWeeklyXP, streakFreezes: newFreezes, level: newLevel });
    
    // Save to global stats
    fireSync(() => dbService.updateGlobalStats(state.userId!, { totalXP: newXP, weeklyXP: newWeeklyXP }), 'buyFreeze_stats', state.userId);
    // Save freeze count to root profile
    fireSync(() => dbService.saveUserProfile(state.userId!, { streakFreezes: newFreezes } as any), 'buyFreeze_profile', state.userId);
    
    Toast.show({ type: 'success', text1: '❄️ Streak Freeze Bought!', text2: 'It will automatically be used if you miss a day.' });
  },
});
