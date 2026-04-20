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
import { widgetSyncService } from '@/services/widgetSyncService';
import { getTodayLocal } from '@/utils/dateUtils';

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
        lastLoginBonusDate: null,
        streakFreezes: 0,
        globalConfetti: false,
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

// --- Phase 9: Pro Widget Sync Subscriber ---
// O16 FIX: Added 500ms debounce so JSON.stringify doesn't fire on every 1s
// focus timer tick. Instead, groups consecutive rapid changes before syncing.
let lastSyncDataSerialized = '';
let widgetSyncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

useStore.subscribe((state) => {
  if (!state._hasHydrated || !state.userId) return;

  // Debounce: clear any pending timer and re-set it
  if (widgetSyncDebounceTimer) clearTimeout(widgetSyncDebounceTimer);

  widgetSyncDebounceTimer = setTimeout(() => {
    const today = getTodayLocal();
    const todayTasks = state.tasks.filter(t => t.date === today);
    const todayHabits = state.habits.filter(h => {
      const dayOfWeek = new Date().getDay();
      return h.targetDays.includes(dayOfWeek);
    });
    const completedHabitsToday = state.habits.filter(h => h.completedDays.includes(today)).length;

    const widgetData = {
      tasks: todayTasks
        .filter(t => !t.completed)
        .sort((a, b) => {
          const pMap = { high: 0, medium: 1, low: 2 };
          return pMap[a.priority] - pMap[b.priority];
        })
        .slice(0, 4)
        .map(t => ({ id: t.id, text: t.text, completed: t.completed, priority: t.priority })),
      habitProgress: {
        completed: completedHabitsToday,
        total: todayHabits.length || 1,
      },
      focus: {
        isActive: state.focusSession.isActive,
        totalSecondsToday: state.focusSession.totalSecondsToday,
        goalSeconds: (state.focusGoalHours || 8) * 3600,
        lastStartTime: state.focusSession.lastStartTime,
      },
      stats: {
        level: state.level,
        totalXP: state.totalXP,
        streak: state.globalStreak,
      },
      lastUpdated: Date.now(),
    };

    const serialized = JSON.stringify(widgetData);
    if (serialized !== lastSyncDataSerialized) {
      lastSyncDataSerialized = serialized;
      widgetSyncService.syncWholeStoreToWidget(widgetData);
    }
  }, 500); // 500ms debounce — groups rapid changes from timer ticks
});
