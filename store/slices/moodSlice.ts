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
      reason: extras?.reason ?? null,
      activities: extras?.activities ?? [],
      emotions: extras?.emotions ?? [],
      note: extras?.note ?? null
    };

    set((state) => {
      const newHistory = { ...state.moodHistory, [dateKey]: cleanEntry as MoodEntry };
      if (state.userId) {
        fireSync(() => dbService.saveMood(state.userId!, cleanEntry, dateKey), 'saveMood', state.userId);
        analyticsService.logEvent(state.userId, 'mood_logged', { mood });
      }

      const today = getTodayLocal();
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.scheduleDailyMoodReminder();
      });

      setTimeout(() => {
        const { actions } = get();
        actions.checkQuestProgress('mood');
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
