import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserState } from './types';
import { createShardedStorage } from './shardedStorage';
import { formatLocalDate } from '@/utils/dateUtils';
import { createAuthSlice } from './slices/authSlice';
import { createTaskSlice } from './slices/taskSlice';
import { createHabitSlice } from './slices/habitSlice';
import { createFocusSlice } from './slices/focusSlice';
import { createMoodSlice } from './slices/moodSlice';
import { createGamificationSlice } from './slices/gamificationSlice';
import { wireSyncErrorPublisher, wireStore } from './syncHelper';
import { widgetSyncService } from '@/services/widgetSyncService';
import { getTodayLocal } from '@/utils/dateUtils';
import { getLevelProgress, LEVEL_NAMES } from './helpers';

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
        _authStateResolved: false,
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
        focusGoalHours: 2,
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
          masterEnabled: true,
          habitReminders: true,
          taskReminders: true,
          missedTaskAlert: true,
          morningBrief: true,
          streakWarning: true,
          questCompleted: true,
          weeklyLeaderboard: true,
          dailyMoodCheckin: true,
          aiCoachNudge: true,
          pomodoroAlert: true,
          comeback48h: true,
          comeback7d: true,
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
          questsLoaded: false,
          profileLoaded: false,
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
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          if (!Array.isArray(persistedState.pendingActions)) {
            persistedState.pendingActions = [];
          }
        }
        if (version <= 1) {
          // v1→v2: replace wrong notification settings keys with correct ones
          persistedState.notificationSettings = {
            masterEnabled: true,
            habitReminders: true,
            taskReminders: true,
            missedTaskAlert: true,
            morningBrief: true,
            streakWarning: true,
            questCompleted: true,
            weeklyLeaderboard: true,
            dailyMoodCheckin: true,
            aiCoachNudge: true,
            pomodoroAlert: true,
            comeback48h: true,
            comeback7d: true,
          };
        }
        return persistedState;
      },
      storage: createJSONStorage(() => createShardedStorage('lifeos-storage')),
      partialize: (state) => {
        const {
          _syncUnsubscribes,
          _hasHydrated,
          _authStateResolved,
          _lastRetryAt,
          _subscriptionGen,
          syncError,
          recentXP,
          streakMilestones,
          lastMoodLog,
          actions,
          // C-STORE-1 Fix: NEVER persist PII or sensitive session credentials to AsyncStorage in plaintext.
          sessionToken,
          email,
          phoneNumber,
          birthday,
          ...rest
        } = state;

        // Prune history to last 90 days so the persisted blob stays small.
        // Older entries are always available from Firestore when needed.
        const cutoff = formatLocalDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        const prunedMoodHistory = Object.fromEntries(
          Object.entries(rest.moodHistory || {}).filter(([k]) => k >= cutoff)
        );
        const prunedFocusHistory = Object.fromEntries(
          Object.entries(rest.focusHistory || {}).filter(([k]) => k >= cutoff)
        );
        const prunedLifeScoreHistory = Object.fromEntries(
          Object.entries(rest.lifeScoreHistory || {}).filter(([k]) => k >= cutoff)
        );

        // Keep all incomplete tasks + completed tasks from last 30 days only.
        const taskCutoff = formatLocalDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        const prunedTasks = rest.tasks.filter(
          (t) => !t.completed || (t.date && t.date >= taskCutoff)
        );

        return {
          ...rest,
          moodHistory: prunedMoodHistory,
          focusHistory: prunedFocusHistory,
          lifeScoreHistory: prunedLifeScoreHistory,
          tasks: prunedTasks,
        };
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
  if (!state._hasHydrated) return;

  // When user logs out, push an explicit not-logged-in payload so the iOS
  // widget shows the lock screen instead of stale data from the previous session.
  if (!state.userId) {
    widgetSyncService.syncWholeStoreToWidget({
      isLoggedIn: false, accentColor: '#7C5CFF',
      tasks: [], habits: [], habitProgress: { completed: 0, total: 0 },
      focus: { isActive: false, totalSecondsToday: 0, goalSeconds: 28800, lastStartTime: null },
      stats: { level: 1, totalXP: 0, streak: 0, xpProgress: 0, levelName: 'Spark' },
      mood: { today: 0, last5Days: [0, 0, 0, 0, 0] },
      lastUpdated: Date.now(),
    });
    return;
  }

  // Debounce: clear any pending timer and re-set it
  if (widgetSyncDebounceTimer) clearTimeout(widgetSyncDebounceTimer);

  widgetSyncDebounceTimer = setTimeout(() => {
    const today = getTodayLocal();
    const dayOfWeek = new Date().getDay();

    const todayTasks = state.tasks.filter(t => t.date === today);
    const todayHabits = state.habits.filter(h => {
      if (h.pausedUntil && h.pausedUntil >= today) return false;
      if (h.frequency === 'daily' || h.frequency === 'weekly') {
        return (h.targetDays ?? []).includes(dayOfWeek);
      }
      return false;
    });
    const completedHabitsToday = todayHabits.filter(h => (h.completedDays ?? []).includes(today)).length;

    const { progress: xpProgress } = getLevelProgress(state.totalXP ?? 0);

    // Last 5 days of mood (index 0 = 4 days ago, index 4 = today)
    const last5Moods: number[] = Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i));
      const dateStr = formatLocalDate(d);
      return state.moodHistory?.[dateStr]?.mood ?? 0;
    });

    const widgetData = {
      isLoggedIn: true,
      accentColor: state.accentColor ?? '#7C5CFF',
      moodTheme: state.moodTheme ?? 'classic',
      tasks: todayTasks
        .filter(t => !t.completed && t.status !== 'missed')
        .sort((a, b) => {
          const pMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
          return (pMap[a.priority] ?? 1) - (pMap[b.priority] ?? 1);
        })
        .slice(0, 4)
        .map(t => ({ id: t.id, text: t.text, completed: t.completed, priority: t.priority })),
      habits: todayHabits.slice(0, 4).map(h => ({
        id: h.id,
        title: h.title,
        icon: h.icon ?? '●',
        isDoneToday: (h.completedDays ?? []).includes(today),
      })),
      habitProgress: {
        completed: completedHabitsToday,
        total: todayHabits.length,
      },
      focus: {
        isActive: state.focusSession.isActive,
        totalSecondsToday: state.focusSession.totalSecondsToday,
        goalSeconds: (state.focusGoalHours || 8) * 3600,
        lastStartTime: state.focusSession.lastStartTime,
      },
      stats: {
        level: state.level ?? 1,
        totalXP: state.totalXP ?? 0,
        streak: state.globalStreak ?? 0,
        xpProgress: Math.min(1, Math.max(0, xpProgress)),
        levelName: LEVEL_NAMES[state.level ?? 1] ?? 'Spark',
      },
      mood: {
        today: state.moodHistory?.[today]?.mood ?? 0,
        last5Days: last5Moods,
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

// Re-schedule morning brief when tasks or habits change so tomorrow's
// notification shows fresh counts instead of stale data.
let prevTaskCount = 0;
let prevHabitCount = 0;
let morningBriefDebounce: ReturnType<typeof setTimeout> | null = null;

useStore.subscribe((state) => {
  if (!state._hasHydrated || !state.userId) return;
  const taskCount = state.tasks.length;
  const habitCount = state.habits.length;
  if (taskCount === prevTaskCount && habitCount === prevHabitCount) return;
  prevTaskCount = taskCount;
  prevHabitCount = habitCount;
  if (morningBriefDebounce) clearTimeout(morningBriefDebounce);
  morningBriefDebounce = setTimeout(() => {
    import('@/services/notificationService').then(({ notificationService }) => {
      notificationService.scheduleMorningBrief();
    });
  }, 3000); // 3s delay — wait for state to settle after bulk loads
});
