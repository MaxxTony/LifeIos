import { StateCreator } from 'zustand';
import { UserState, FocusActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal } from '@/utils/dateUtils';
import { fireSync } from '../syncHelper';
import { analyticsService } from '@/services/analyticsService';

export const createFocusSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], FocusActions> = (set, get) => ({
  setFocusGoal: (hours: number) => set({ focusGoalHours: hours }),

  toggleFocusSession: () => set((state) => {
    const now = Date.now();

    if (state.focusSession.isActive) {
      // DELTA FIX: totalSecondsToday is already accurate (updated each tick).
      // Just add the small gap between the last tick and the stop press (~0-1s).
      const lastTickDelta = state.focusSession.lastStartTime
        ? Math.min((now - state.focusSession.lastStartTime) / 1000, 30)
        : 0;
      const totalSeconds = Math.max(0, state.focusSession.totalSecondsToday + lastTickDelta);

      if (state.userId) {
        fireSync(() => dbService.saveFocusEntry(state.userId!, getTodayLocal(), totalSeconds), 'stopFocusSync', state.userId);
        import('@/services/presenceService').then(({ presenceService }) => {
          presenceService.leaveFocusRoom(state.userId!);
        });
        analyticsService.logEvent(state.userId, 'focus_session_stop', { duration: totalSeconds });

        // XP awarded based on minutes of focus (1 XP per 3 minutes)
        const previousXP = Math.floor((state.focusSession.sessionStartSeconds || 0) / 180);
        const newXP = Math.floor(totalSeconds / 180);
        const earnedDelta = newXP - previousXP;
        if (earnedDelta > 0) {
          get().actions.addXP(earnedDelta);
        }
      }

      return {
        focusSession: {
          ...state.focusSession,
          isActive: false,
          totalSecondsToday: totalSeconds,
          lastStartTime: null,
          sessionStartSeconds: totalSeconds,
        }
      };
    } else {
      if (state.userId && state.userName) {
        import('@/services/presenceService').then(({ presenceService }) => {
          presenceService.joinFocusRoom(state.userId!, state.userName!);
        });
        analyticsService.logEvent(state.userId, 'focus_session_start', { isPomodoro: state.focusSession.isPomodoro });
      }

      return {
        focusSession: {
          ...state.focusSession,
          isActive: true,
          lastStartTime: now,
          sessionStartSeconds: state.focusSession.totalSecondsToday,
        }
      };
    }
  }),

  updateFocusTime: () => set((state) => {
    if (!state.focusSession.isActive) return state;

    const now = Date.now();
    const { lastStartTime, totalSecondsToday } = state.focusSession;

    // DELTA-BASED FIX: Calculate only the time since the last tick (not since session start).
    // This prevents the timer from counting up and fixes minute-jumping.
    // lastStartTime is updated to 'now' at the end of each tick.
    const rawDelta = lastStartTime ? (now - lastStartTime) / 1000 : 1;
    // Cap delta to 30s to handle app backgrounding / JS thread freezes.
    // Anything > 30s means the app was suspended; the AppState handler reconciles those.
    const delta = Math.min(Math.max(0, rawDelta), 30);

    const newTotalSeconds = totalSecondsToday + delta;

    let newMode = state.focusSession.pomodoroMode;
    let newTimeLeft = state.focusSession.pomodoroTimeLeft;
    let pomodoroPhaseChanged = false;

    if (state.focusSession.isPomodoro) {
      // COUNTDOWN FIX: decrement pomodoroTimeLeft by delta (not recalculate from scratch)
      newTimeLeft = Math.max(0, state.focusSession.pomodoroTimeLeft - delta);

      if (newTimeLeft <= 0 && !pomodoroPhaseChanged) {
        pomodoroPhaseChanged = true;
        // Fire haptic + notification asynchronously
        import('expo-haptics').then(Haptics =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        import('@/services/notificationService').then(({ notificationService }) => {
          const title = newMode === 'work' ? '☕ Break Time!' : '🔥 Focus Time!';
          const body  = newMode === 'work' ? 'Work session complete! Take a break.' : 'Break over! Time to focus.';
          notificationService.sendProactiveAI(title, body, 'pomodoro');
        });

        if (newMode === 'work') {
          newMode = 'break';
          newTimeLeft = state.focusSession.pomodoroBreakDuration;
          // O8 FIX: Changed from 'error_occurred' (which polluted Sentry) to a descriptive event name.
          analyticsService.logEvent(state.userId, 'pomodoro_phase_complete', { phase: 'work', newMode: 'break' });
        } else {
          newMode = 'work';
          newTimeLeft = state.focusSession.pomodoroWorkDuration;
          analyticsService.logEvent(state.userId, 'pomodoro_phase_complete', { phase: 'break', newMode: 'work' });
        }
        analyticsService.logEvent(state.userId, 'pomodoro_cycle_step', { type: 'pomodoro_phase' });
      }
    }

    // Quest progress + life score (async, outside set)
    setTimeout(() => {
      const { actions } = get();
      actions.checkQuestProgress('focus', newTotalSeconds);
      actions.updateLifeScoreHistory();
    }, 0);

    return {
      focusSession: {
        ...state.focusSession,
        totalSecondsToday: newTotalSeconds,
        lastStartTime: now,          // ← Advance lastStartTime so next tick delta is ~1s
        pomodoroMode: newMode,
        pomodoroTimeLeft: newTimeLeft,
        pomodoroOverflow: 0,          // No longer needed but keep field for compat
      }
    };
  }),

  togglePomodoro: () => set((state) => ({
    focusSession: {
      ...state.focusSession,
      isPomodoro: !state.focusSession.isPomodoro,
      pomodoroMode: 'work',
      // FIX: Always reset to full work duration when toggling Pomodoro on.
      // Never use stale pomodoroTimeLeft — it may be 0 from a finished previous cycle.
      pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration,
      // Reset lastStartTime so the next tick calculates a fresh 1s delta
      lastStartTime: state.focusSession.isActive ? Date.now() : state.focusSession.lastStartTime,
    }
  })),
});
