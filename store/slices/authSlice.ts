import { StateCreator } from 'zustand';
import { UserState, Task, Habit, MoodEntry, AuthActions } from '../types';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { fireSync } from '../syncHelper';
import { migrateTasks } from '../helpers';
import { where, orderBy, limit } from 'firebase/firestore';

export const createAuthSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], AuthActions> = (set, get) => ({
  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  
  setAuth: async (userId, userName) => {
    const unsubs = get()._syncUnsubscribes;
    for (const unsub of unsubs) {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    }
    set((state) => ({
      userId,
      userName,
      isAuthenticated: !!userId,
      _syncUnsubscribes: [],
      _subscriptionGen: state._subscriptionGen + 1,
    }));
    if (userId) {
      get().actions.subscribeToCloud();
    }
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

  logout: () => {
    get()._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });
    set({
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
        pomodoroMode: 'work',
        pomodoroWorkDuration: 25 * 60,
        pomodoroBreakDuration: 5 * 60,
        pomodoroTimeLeft: 25 * 60
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
      _syncUnsubscribes: [],
    });
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
      if (isStale() || !data) return;
      set({
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
        hasSeenWalkthrough: data.hasSeenWalkthrough !== undefined ? data.hasSeenWalkthrough : get().hasSeenWalkthrough
      });
    });

    const unsubTasks = dbService.subscribeToCollection(userId, 'tasks', (docs) => {
      if (isStale()) return;
      set({ tasks: migrateTasks(docs as Task[]) });
    }, [where('date', '>=', thirtyDaysAgoStr)]);

    const unsubHabits = dbService.subscribeToCollection(userId, 'habits', (docs) => {
      if (isStale()) return;
      set({ habits: docs as Habit[] });
    }, [orderBy('createdAt', 'desc'), limit(200)]);

    const unsubMood = dbService.subscribeToCollection(userId, 'moodHistory', (docs) => {
      const map: Record<string, MoodEntry> = {};
      docs.forEach(doc => { 
        const { id, ...entry } = doc as { id: string } & MoodEntry; 
        map[id] = entry; 
      });
      const today = getTodayLocal();
      set(state => ({
        moodHistory: { ...state.moodHistory, ...map },
        mood: map[today]?.mood ?? state.mood
      }));
    }, [where('__name__', '>=', windowStartStr)]);

    const unsubFocus = dbService.subscribeToCollection(userId, 'focusHistory', (docs) => {
      const map: Record<string, number> = {};
      docs.forEach(doc => { 
        map[doc.id] = (doc as { totalSeconds?: number }).totalSeconds || 0; 
      });
      set({ focusHistory: map });
    }, [where('__name__', '>=', windowStartStr)]);

    set({ _syncUnsubscribes: [unsubRoot, unsubTasks, unsubHabits, unsubMood, unsubFocus] });
  },

  hydrateFromCloud: async () => {
    const userId = authService.currentUser?.uid || get().userId;
    if (userId) {
      try {
        const { data } = await dbService.getUserProfile(userId);
        if (data) {
          await dbService.migrateLegacyData(userId, data);
          const legacyStruggles = (data as any).struggles;
          set({
            userName: data.userName || null,
            hasCompletedOnboarding: data.hasCompletedOnboarding || get().hasCompletedOnboarding || (Array.isArray(legacyStruggles) && legacyStruggles.length > 0),
            onboardingData: { struggles: Array.isArray(legacyStruggles) ? legacyStruggles : [] },
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
    const { userId } = get();
    if (!userId) return;
    try {
      get().actions.subscribeToCloud();
    } catch (err: any) {
      console.error('[LifeOS] retrySync failed:', err?.message || err);
      set({ syncError: { label: 'retrySync', message: err?.message || String(err), timestamp: Date.now() } });
    }
  },

  setOnboardingData: (data) => set((state) => ({ onboardingData: { ...state.onboardingData, ...data } })),
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
