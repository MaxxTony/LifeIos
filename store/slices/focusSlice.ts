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
      const elapsed = state.focusSession.lastStartTime ? (now - state.focusSession.lastStartTime) / 1000 : 0;
      const totalSeconds = Math.max(0, state.focusSession.totalSecondsToday + elapsed);
      
      if (state.userId) {
        fireSync(() => dbService.saveFocusEntry(state.userId!, getTodayLocal(), totalSeconds), 'stopFocusSync', state.userId);
        import('@/services/presenceService').then(({ presenceService }) => {
          presenceService.leaveFocusRoom(state.userId!);
        });
        analyticsService.logEvent(state.userId, 'focus_session_stop', { duration: elapsed });
        
        // Award XP for focus time (20 XP per hour)
        const earnedXP = Math.floor((elapsed / 3600) * 20);
        if (earnedXP > 0) {
          get().actions.addXP(earnedXP);
        }
      }

      return {
        focusSession: { ...state.focusSession, isActive: false, totalSecondsToday: totalSeconds, lastStartTime: null }
      };
    } else {
      if (state.userId && state.userName) {
        import('@/services/presenceService').then(({ presenceService }) => {
          presenceService.joinFocusRoom(state.userId!, state.userName!);
        });
        analyticsService.logEvent(state.userId, 'focus_session_start', { isPomodoro: state.focusSession.isPomodoro });
      }

      return {
        focusSession: { ...state.focusSession, isActive: true, lastStartTime: now }
      };
    }
  }),

  updateFocusTime: () => set((state) => {
    if (!state.focusSession.isActive || !state.focusSession.lastStartTime) return state;
    const now = Date.now();
    const rawElapsed = now - state.focusSession.lastStartTime;
    const MAX_TICK_MS = 24 * 60 * 60 * 1000;
    const elapsed = Math.min(rawElapsed, MAX_TICK_MS) / 1000;
    const totalSeconds = state.focusSession.totalSecondsToday + elapsed;

    let newMode = state.focusSession.pomodoroMode;
    let newTimeLeft = state.focusSession.pomodoroTimeLeft - elapsed;
    let newIsActive = state.focusSession.isActive;

    if (state.focusSession.isPomodoro) {
      if (newTimeLeft <= 0) {
        import('expo-haptics').then(Haptics => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        import('@/services/notificationService').then(({ notificationService }) => {
          const title = newMode === 'work' ? "Focus Session Complete ☕" : "Break Over 🔥";
          const body = newMode === 'work' ? "Work session complete! Time for a break." : "Break over! Ready to focus?";
          notificationService.sendProactiveAI(title, body);
        });

        if (newMode === 'work') {
          newMode = 'break';
          newTimeLeft = state.focusSession.pomodoroBreakDuration;
        } else {
          newMode = 'work';
          newTimeLeft = state.focusSession.pomodoroWorkDuration;
        }
      }
    }

    setTimeout(() => {
      const { actions } = get();
      actions.checkQuestProgress('focus', totalSeconds);
      actions.updateLifeScoreHistory();
    }, 0);

    return {
      focusSession: {
        ...state.focusSession,
        totalSecondsToday: totalSeconds,
        lastStartTime: now,
        pomodoroMode: newMode,
        pomodoroTimeLeft: newTimeLeft,
        isActive: newIsActive
      }
    };
  }),

  togglePomodoro: () => set((state) => ({
    focusSession: {
      ...state.focusSession,
      isPomodoro: !state.focusSession.isPomodoro,
      pomodoroMode: 'work',
      pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration
    }
  })),
});
