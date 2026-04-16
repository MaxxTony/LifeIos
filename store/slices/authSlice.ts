import { StateCreator } from 'zustand';
import { UserState, Task, Habit, MoodEntry, AuthActions } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { fireSync } from '../syncHelper';
import { migrateTasks } from '../helpers';
import { where, orderBy, limit } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

// Full state reset applied on logout or forced sign-out (e.g. server-side user deletion).
const LOGGED_OUT_STATE = {
  isAuthenticated: false,
  userId: null,
  userName: null,
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
  accentColor: null,
  onboardingData: { struggles: [] },
  recentXP: null,
  streakMilestone: null,
  lastMoodLog: null,
  lifeScoreHistory: {},
  totalXP: 0,
  level: 1,
  dailyQuests: [],
  completedQuests: [],
  proactivePrompt: null,
  _syncUnsubscribes: [],
  sessionToken: null,
  syncStatus: {
    tasksLoaded: false,
    habitsLoaded: false,
    moodLoaded: false,
    focusLoaded: false,
    isOffline: false,
    lastCloudSync: null,
  },
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
    get()._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    // C-1: Clear AsyncStorage immediately to prevent data leak window
    try {
      await AsyncStorage.removeItem('lifeos-storage');
    } catch (err) {
      console.warn('[LifeOS] Failed to clear storage on logout:', err);
    }
    set(LOGGED_OUT_STATE);
  },

  subscribeToCloud: () => {
    const userId = get().userId;
    if (!userId) return;

    get()._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });

    const myGen = get()._subscriptionGen + 1;
    set({ _subscriptionGen: myGen, _syncUnsubscribes: [] });
    const isStale = () => get()._subscriptionGen !== myGen || get().userId !== userId;

    const HISTORY_WINDOW_DAYS = 90;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    const windowStartStr = formatLocalDate(windowStart);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatLocalDate(thirtyDaysAgo);

    const unsubRoot = dbService.subscribeToUserData(userId, (data) => {
      // C-1: Session Validation vs Connectivity
      // If data is null, it means the document DOES NOT EXIST on the server.
      // However, if we are offline, onSnapshot might still return null if it's the first
      // load and cache is empty. We should ONLY logout if we are confirmed online.
      if (!data) {
        if (!get().syncStatus.isOffline) {
          console.warn('[LifeOS] User document deleted from Firestore - forcing logout.');
          authService.logout();          
          get().actions.setAuth(null, null); 
        } else {
          console.log('[LifeOS] User doc empty but offline - skipping logout guard.');
        }
        return;
      }

      // TEST A-3: Multiple Simultaneous Logins (Remote Revocation)
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
        hasSeenWalkthrough: data.hasSeenWalkthrough !== undefined ? data.hasSeenWalkthrough : get().hasSeenWalkthrough,
        syncStatus: {
          ...state.syncStatus,
          isOffline: !!data._fromCache, // Handled by metadata in subscribeToUserData
          lastCloudSync: !data._fromCache ? Date.now() : state.syncStatus.lastCloudSync
        }
      }));
    });

    const unsubTasks = dbService.subscribeToCollection(userId, 'tasks', (docs, metadata) => {
      if (isStale()) return;
      set((state) => ({ 
        tasks: migrateTasks(docs as Task[]),
        syncStatus: { 
          ...state.syncStatus, 
          tasksLoaded: true,
          isOffline: metadata?.fromCache ?? state.syncStatus.isOffline
        }
      }));
    }, [where('date', '>=', thirtyDaysAgoStr)]);

    const unsubHabits = dbService.subscribeToCollection(userId, 'habits', (docs, metadata) => {
      if (isStale()) return;
      set((state) => ({ 
        habits: docs as Habit[],
        syncStatus: { 
          ...state.syncStatus, 
          habitsLoaded: true,
          isOffline: metadata?.fromCache ?? state.syncStatus.isOffline
        }
      }));
    }, [orderBy('createdAt', 'desc'), limit(200)]);

    const unsubMood = dbService.subscribeToCollection(userId, 'moodHistory', (docs, metadata) => {
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
          isOffline: metadata?.fromCache ?? state.syncStatus.isOffline
        }
      }));
    }, [where('__name__', '>=', windowStartStr)]);

    const unsubFocus = dbService.subscribeToCollection(userId, 'focusHistory', (docs, metadata) => {
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
          isOffline: metadata?.fromCache ?? state.syncStatus.isOffline
        }
      }));
    }, [where('__name__', '>=', windowStartStr)]);

    const unsubQuests = dbService.subscribeToCollection(userId, 'dailyQuests', (docs) => {
      if (isStale()) return;
      set({ dailyQuests: docs as any[] });
    });

    set({ _syncUnsubscribes: [unsubRoot, unsubTasks, unsubHabits, unsubMood, unsubFocus, unsubQuests] });
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
            hasSeenWalkthrough: data.hasSeenWalkthrough !== undefined ? data.hasSeenWalkthrough : get().hasSeenWalkthrough
          });
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
    set({ syncError: null, _lastRetryAt: now });
    
    const { userId, pendingActions } = get();
    if (!userId) return;

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
          // Remove from queue on success
          set(state => ({
            pendingActions: state.pendingActions.filter(a => a.id !== action.id)
          }));
        } catch (err) {
          console.warn(`[LifeOS Sync] Retry failed for ${action.id}:`, err);
        }
      }
    }

    try {
      get().actions.subscribeToCloud();
    } catch (err: any) {
      console.error('[LifeOS] retrySync failed:', err?.message || err);
      set({ syncError: { label: 'retrySync', message: err?.message || String(err), timestamp: Date.now() } });
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
});
