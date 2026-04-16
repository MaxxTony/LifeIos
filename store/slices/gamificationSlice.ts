import { StateCreator } from 'zustand';
import { UserState, GamificationActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { fireSync } from '../syncHelper';
import { QUEST_TEMPLATES } from '../helpers';
import * as Haptics from 'expo-haptics';

export const createGamificationSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], GamificationActions> = (set, get) => ({
  performDailyReset: () => set((state) => {
    const today = getTodayLocal();
    if (state.lastResetDate === today) return state;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);

    let newFocusHistory = state.focusHistory;
    if (state.focusSession.totalSecondsToday > 0) {
      newFocusHistory = { ...state.focusHistory, [yesterdayStr]: state.focusSession.totalSecondsToday };
      if (state.userId) {
        fireSync(() => dbService.saveFocusEntry(state.userId!, yesterdayStr, state.focusSession.totalSecondsToday), 'dailyResetFocusSync', state.userId);
      }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = formatLocalDate(cutoff);

    if (state.userId) {
      state.tasks.forEach(t => {
        if (t.date < today && t.status === 'pending') {
          fireSync(() => dbService.saveTask(state.userId!, { ...t, status: 'missed', systemComment: 'Daily reset: task missed.' }), 'taskResetSync', state.userId);
        }
        if (t.date < cutoffStr) {
          fireSync(() => dbService.deleteTask(state.userId!, t.id), 'taskCleanup', state.userId);
        }
      });
    }

    const newTasks = state.tasks.filter(t => t.date >= cutoffStr);

    return {
      lastResetDate: today,
      tasks: newTasks,
      focusSession: { 
        ...state.focusSession, 
        totalSecondsToday: 0, 
        isActive: false, 
        lastStartTime: null,
        pomodoroMode: 'work',
        pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration
      },
      focusHistory: newFocusHistory
    };
  }),

  updateLifeScoreHistory: () => set((state) => {
    const today = getTodayLocal();
    const todayTasks = state.tasks.filter(t => t.date === today);
    const completedTasksCount = todayTasks.filter(t => t.completed).length;
    const totalTasksCount = todayTasks.length;
    
    const completedHabitsCount = state.habits.filter(h => h.completedDays.includes(today)).length;
    const totalHabitsCount = state.habits.length;

    const focusSecondsToday = state.focusSession?.totalSecondsToday || 0;
    const focusGoalSeconds = (state.focusGoalHours || 8) * 3600;
    const focusCompletionPerc = Math.min((focusSecondsToday / focusGoalSeconds) * 100, 100);

    const taskCompletionPerc = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : null;
    const habitCompletionPerc = totalHabitsCount > 0 ? (completedHabitsCount / totalHabitsCount) * 100 : null;

    const activeMetrics = [taskCompletionPerc, habitCompletionPerc, focusCompletionPerc].filter(v => v !== null) as number[];
    const lifeScore = activeMetrics.length > 0
      ? Math.round(activeMetrics.reduce((a, b) => a + b, 0) / activeMetrics.length)
      : 0;

    const newHistory = { ...state.lifeScoreHistory, [today]: lifeScore };

    if (state.userId && state.lifeScoreHistory[today] !== lifeScore) {
      fireSync(() => dbService.saveCollectionDoc(state.userId!, 'lifeScoreHistory', today, { score: lifeScore }), 'saveLifeScore', state.userId);
    }

    return { lifeScoreHistory: newHistory };
  }),

  generateDailyQuests: () => {
    const { lastResetDate, dailyQuests } = get();
    const today = getTodayLocal();
    if (lastResetDate === today && dailyQuests.length > 0) return;

    const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `quest-${today}-${idx}`,
      currentCount: 0,
      completed: false
    }));

    set({ dailyQuests: selected, lastResetDate: today });
  },

  completeQuest: (questId: string) => {
    const { dailyQuests } = get();
    const quest = dailyQuests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    // Use addXP to award the reward
    get().actions.addXP(quest.rewardXP);

    set((state) => ({
      dailyQuests: state.dailyQuests.map(q => 
        q.id === questId ? { ...q, completed: true, currentCount: q.targetCount } : q
      ),
      completedQuests: [...state.completedQuests, questId]
    }));

    setTimeout(() => {
      import('react-native-toast-message').then(Toast => {
        Toast.default.show({
          type: 'success',
          text1: 'Quest Completed! 🏆',
          text2: `${quest.title} (+${quest.rewardXP} XP)`
        });
      });
    }, 500);
  },

  addXP: (amount: number) => set((state) => {
    const newTotalXP = state.totalXP + amount;
    const newLevel = Math.floor(newTotalXP / 100) + 1;
    
    // Check for Level Up
    if (newLevel > state.level) {
      setTimeout(() => {
        import('react-native-toast-message').then(Toast => {
          Toast.default.show({
            type: 'success',
            text1: 'Level Up! ✨',
            text2: `You reached Level ${newLevel}! Keep evolving.`
          });
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 800);
    }

    const newStatData = { totalXP: newTotalXP, level: newLevel };
    
    if (state.userId) {
      fireSync(() => dbService.saveCollectionDoc(state.userId!, 'stats', 'global', newStatData), 'xpUpdate', state.userId);
    }

    return { 
      ...newStatData,
      recentXP: { amount, timestamp: Date.now() }
    };
  }),

  checkQuestProgress: (type: 'task' | 'habit' | 'focus' | 'mood', count?: number) => set((state) => {
    let changed = false;
    const newQuests = state.dailyQuests.map(q => {
      if (q.type !== type || q.completed) return q;
      
      let newCount = q.currentCount;
      if (type === 'task') {
        newCount = state.tasks.filter(t => t.date === getTodayLocal() && t.completed).length;
      } else if (type === 'habit') {
        newCount = state.habits.filter(h => h.completedDays.includes(getTodayLocal())).length;
      } else if (type === 'focus' && count !== undefined) {
         newCount = count;
      } else if (type === 'mood') {
         newCount = 1;
      }

      if (newCount !== q.currentCount) {
        changed = true;
        const isFinished = newCount >= q.targetCount;
        if (isFinished) {
          setTimeout(() => get().actions.completeQuest(q.id), 0);
        }
        return { ...q, currentCount: Math.min(newCount, q.targetCount) };
      }
      return q;
    });

    if (changed) return { dailyQuests: newQuests };
    return state;
  }),

  triggerProactivePrompt: (trigger: string, message: string) => {
    const { notificationSettings } = get();
    if (!notificationSettings.proactive) return;
    set({ proactivePrompt: { message, trigger, timestamp: Date.now() } });
    import('@/services/notificationService').then(({ notificationService }) => {
      let title = "LifeOS Assistant ✨";
      if (trigger === 'low_mood') title = "LifeOS Care 🌿";
      else if (trigger === 'missed_task') title = "LifeOS Insight 🚀";
      else if (trigger === 'habit_streak') title = "LifeOS Habit 🧘‍♂️";
      notificationService.sendProactiveAI(title, message);
    });
  },

  dismissXP: () => set({ recentXP: null }),
  dismissMilestone: () => set({ streakMilestone: null }),
  dismissMoodLog: () => set({ lastMoodLog: null }),
  dismissProactive: () => set({ proactivePrompt: null }),
  setLastActive: () => set({ lastActiveTimestamp: Date.now() }),
});
