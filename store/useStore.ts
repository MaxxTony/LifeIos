import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createHabitSlice } from './slices/habitSlice';
import { createFocusSlice } from './slices/focusSlice';
import { createMoodSlice } from './slices/moodSlice';
import { createGamificationSlice } from './slices/gamificationSlice';
import { wireSyncErrorPublisher, wireStore } from './syncHelper';

export const useStore = create<UserState>()(
  persist(
    (set, get, api) => {
      // Initialize slices
      const auth = createAuthSlice(set, get, api);
      const tasks = createTaskSlice(set, get, api);
      const habits = createHabitSlice(set, get, api);
      const focus = createFocusSlice(set, get, api);
      const mood = createMoodSlice(set, get, api);
      const gamification = createGamificationSlice(set, get, api);

      return {
        // Initial State
        _hasHydrated: false,
        hasCompletedOnboarding: false,
        isAuthenticated: false,
        userId: null,
        userName: null,
        email: null,
        createdAt: null,
        onboardingData: { struggles: [] },
        tasks: [],
        habits: [],
        focusSession: {
          totalSecondsToday: 0,
          isActive: false,
          lastStartTime: null,
          isPomodoro: false,
          pomodoroMode: 'work',
          pomodoroWorkDuration: 25 * 60,
          pomodoroBreakDuration: 5 * 60,
          pomodoroTimeLeft: 25 * 60,
          sessionStartSeconds: 0,
          pomodoroOverflow: 0,
        },
        focusGoalHours: 8,
        focusHistory: {},
        moodHistory: {},
        mood: null,
        moodTheme: null,
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
        themePreference: 'system',
        accentColor: null,
        homeTimezone: null,
        notificationSettings: {
          push: true,
          tasks: true,
          habits: true,
          mood: true,
          proactive: true,
        },
        recentXP: null,
        streakMilestones: [],
        lastMoodLog: null,
        lifeScoreHistory: {},
        lastActiveTimestamp: Date.now(),
        totalXP: 0,
        level: 1,
        weeklyXP: 0,
        globalStreak: 0,
        lastActiveDate: null,
        lastWeekResetDate: null,
        dailyQuests: [],
        completedQuests: [],
        proactivePrompt: null,
        syncError: null,
        _lastRetryAt: 0,
        hasSeenWalkthrough: false,
        _syncUnsubscribes: [],
        _subscriptionGen: 0,
        sessionToken: null,
        syncStatus: {
          tasksLoaded: false,
          habitsLoaded: false,
          moodLoaded: false,
          focusLoaded: false,
          isOffline: false,
          lastCloudSync: null,
        },
        pendingActions: [],

        // Actions
        actions: {
          ...auth,
          ...tasks,
          ...habits,
          ...focus,
          ...mood,
          ...gamification,
        },
      };
    },
    {
      name: 'lifeos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const {
          _syncUnsubscribes,
          _hasHydrated,
          _lastRetryAt,
          _subscriptionGen,
          syncError,
          proactivePrompt,
          recentXP,
          streakMilestones,
          lastMoodLog,
          actions,
          // C-STORE-1 Fix: NEVER persist PII or sensitive session credentials to AsyncStorage in plaintext.
          // These will be re-hydrated from the Cloud on login/reconnect.
          sessionToken,
          email,
          phoneNumber,
          birthday,
          ...rest
        } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        state?.actions.setHasHydrated(true);
      },
    }
  )
);

// Wire up the sync error publisher to the store
wireSyncErrorPublisher((err) => {
  useStore.setState({ syncError: { label: err.label, message: err.message, timestamp: Date.now() } });
});

// C-NET-2 FIX: Inject store reference explicitly to resolve circular dependency
wireStore(useStore);
