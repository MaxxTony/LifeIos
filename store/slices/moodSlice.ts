import { StateCreator } from 'zustand';
import { UserState, MoodEntry, MoodActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal } from '@/utils/dateUtils';
import { fireSync } from '../syncHelper';
import { analyticsService } from '@/services/analyticsService';

export const createMoodSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], MoodActions> = (set, get) => ({
  setMood: (mood: number, extras?: { activities?: string[]; emotions?: string[]; note?: string; reason?: string }, date?: string) => {
    const dateKey = date || getTodayLocal();
    const cleanEntry: MoodEntry = { 
      mood, 
      timestamp: Date.now(),
      reason: extras?.reason ? extras.reason.slice(0, 500) : null,
      activities: extras?.activities ?? [],
      emotions: extras?.emotions ?? [],
      note: extras?.note ? extras.note.slice(0, 2000) : null
    };

    set((state) => {
      const rawHistory = { ...state.moodHistory, [dateKey]: cleanEntry as MoodEntry };

      // M-18 FIX: Prune mood history beyond 365 days to prevent unbounded growth.
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      const newHistory = Object.fromEntries(
        Object.entries(rawHistory).filter(([k]) => k >= cutoffStr)
      ) as typeof rawHistory;
      if (state.userId) {
        fireSync(() => dbService.saveMood(state.userId!, cleanEntry, dateKey), 'saveMood', state.userId);
        analyticsService.logEvent(state.userId, 'mood_logged', { mood });
        get().actions.addXP(5); // Small reward for self-awareness
      }

      const today = getTodayLocal();
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.scheduleDailyMoodReminder();
      });

      setTimeout(() => {
        const { actions } = get();
        actions.checkQuestProgress('mood', !!extras?.note ? 2 : 1);
        actions.updateLifeScoreHistory();
        if (mood <= 2) {
          actions.triggerProactivePrompt(
            'low_mood',
            "I'm sorry to hear you're having a rough time today. 🌿 I'm here if you want to talk it out or just need a moment of zen."
          );
        }
      }, 0);

      return {
        mood: newHistory[today]?.mood ?? null,
        moodHistory: newHistory,
        lastMoodLog: { mood, timestamp: Date.now() }
      };
    });
  },

  setMoodTheme: (theme: UserState['moodTheme']) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveMoodTheme(state.userId!, theme), 'saveMoodTheme', state.userId);
    return { moodTheme: theme };
  }),
});
