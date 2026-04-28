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

        const previousXP = Math.floor((state.focusSession.sessionStartSeconds || 0) / 180);
        const newXP = Math.floor(totalSeconds / 180);
        const earnedDelta = newXP - previousXP;
        if (earnedDelta > 0) {
          get().actions.addXP(earnedDelta);
        }
      }

      // BACKGROUND FIX: Cancel focus notifications when stopping
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.cancelFocusNotifications();
      });

      // SYNC FIX: Clear active focus session from cloud
      if (state.userId) {
        dbService.saveUserProfile(state.userId, { activeFocusSession: null } as any).catch(() => {});
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
        
        // SYNC FIX: Persist active focus session to cloud so other devices can pick it up
        dbService.saveUserProfile(state.userId!, {
          activeFocusSession: {
            isActive: true,
            lastStartTime: now,
            isPomodoro: state.focusSession.isPomodoro,
            pomodoroMode: state.focusSession.pomodoroMode,
            pomodoroTimeLeft: state.focusSession.pomodoroTimeLeft,
          }
        } as any).catch(() => {});
      }

      // BACKGROUND FIX: Schedule background notification
      import('@/services/notificationService').then(({ notificationService }) => {
        if (state.focusSession.isPomodoro) {
          notificationService.scheduleFocusReminder(state.focusSession.pomodoroTimeLeft, state.focusSession.pomodoroMode);
        } else {
          notificationService.scheduleFocusReminder(3600, 'work');
        }
      });

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

    const rawDelta = lastStartTime ? (now - lastStartTime) / 1000 : 1;
    const delta = Math.min(Math.max(0, rawDelta), 30);
    const newTotalSeconds = totalSecondsToday + delta;

    let newMode = state.focusSession.pomodoroMode;
    let newTimeLeft = state.focusSession.pomodoroTimeLeft;
    let pomodoroPhaseChanged = false;

    if (state.focusSession.isPomodoro) {
      newTimeLeft = Math.max(0, state.focusSession.pomodoroTimeLeft - delta);

      if (newTimeLeft <= 0 && !pomodoroPhaseChanged) {
        pomodoroPhaseChanged = true;
        import('expo-haptics').then(Haptics =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        );
        
        import('@/services/notificationService').then(({ notificationService }) => {
          const title = newMode === 'work' ? '☕ Break Time!' : '🔥 Focus Time!';
          const body  = newMode === 'work' ? 'Work session complete! Take a break.' : 'Break over! Time to focus.';
          notificationService.sendProactiveAI(title, body, 'pomodoro');
          
          // BACKGROUND FIX: Reschedule for next phase
          const nextDuration = newMode === 'work' ? state.focusSession.pomodoroBreakDuration : state.focusSession.pomodoroWorkDuration;
          const nextMode = newMode === 'work' ? 'break' : 'work';
          notificationService.scheduleFocusReminder(nextDuration, nextMode);
        });

        if (newMode === 'work') {
          newMode = 'break';
          newTimeLeft = state.focusSession.pomodoroBreakDuration;
        } else {
          newMode = 'work';
          newTimeLeft = state.focusSession.pomodoroWorkDuration;
        }
        analyticsService.logEvent(state.userId, 'pomodoro_phase_complete', { phase: newMode === 'break' ? 'work' : 'break', newMode });
      }
    }

    setTimeout(() => {
      const { actions } = get();
      actions.checkQuestProgress('focus', newTotalSeconds);
      actions.updateLifeScoreHistory();
    }, 0);

    return {
      focusSession: {
        ...state.focusSession,
        totalSecondsToday: newTotalSeconds,
        lastStartTime: now,
        pomodoroMode: newMode,
        pomodoroTimeLeft: newTimeLeft,
        pomodoroOverflow: 0,
      }
    };
  }),

  togglePomodoro: () => set((state) => ({
    focusSession: {
      ...state.focusSession,
      isPomodoro: !state.focusSession.isPomodoro,
      pomodoroMode: 'work',
      pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration,
      lastStartTime: state.focusSession.isActive ? Date.now() : state.focusSession.lastStartTime,
    }
  })),
});
