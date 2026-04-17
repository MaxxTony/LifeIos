import { dbService } from '@/services/dbService';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { StateCreator } from 'zustand';
import { QUEST_TEMPLATES, computeLevel } from '../helpers';
import { fireSync } from '../syncHelper';
import { GamificationActions, UserState } from '../types';

export const createGamificationSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], GamificationActions> = (set, get) => ({
  performDailyReset: () => set((state) => {
    try {
      const today = getTodayLocal();
      if (state.lastResetDate === today) return state;

      // Guard: already running reset in this tick
      const lastResetDate = today;

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

      const missedTasks: any[] = [];
      const updatedTasks = state.tasks.map(t => {
        // Mark all PENDING tasks from any day BEFORE today as missed
        if (t.date < today && t.status === 'pending') {
          const missedTask = {
            ...t,
            status: 'missed' as const,
            systemComment: t.date === yesterdayStr ? 'You missed this daily task! 😔' : `Missed on ${t.date}.`
          };
          missedTasks.push(missedTask);
          return missedTask;
        }
        return t;
      });

      if (state.userId && missedTasks.length > 0) {
        fireSync(() => dbService.saveTasksBatch(state.userId!, missedTasks), 'taskResetSyncBatch', state.userId);
      }

      // Keep only recent tasks (last 30 days) to prevent store bloat
      const newTasks = updatedTasks.filter(t => t.date >= cutoffStr);

      console.log(`[LifeOS] Daily reset performed for ${today}. Tasks pruned to last 30 days.`);

      if (state.userId) {
        fireSync(() => dbService.deleteDailyQuests(state.userId!), 'deleteDailyQuestsSync', state.userId);
      }

      return {
        lastResetDate,
        tasks: newTasks,
        focusSession: {
          ...state.focusSession,
          totalSecondsToday: 0,
          isActive: false,
          lastStartTime: null,
          pomodoroMode: 'work',
          pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration
        },
        focusHistory: newFocusHistory,
        dailyQuests: [],
      };
    } catch (error) {
      console.error('[LifeOS] Daily reset failed:', error);
      return state;
    }
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
    const { lastResetDate, dailyQuests, userId } = get();
    const today = getTodayLocal();
    const questsAreForToday = dailyQuests.length > 0 && dailyQuests.every(q => q.id.includes(today));

    if (lastResetDate === today && questsAreForToday) return;

    const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `quest-${today}-${idx}`,
      currentCount: 0,
      completed: false,
      date: today
    }));

    set({ dailyQuests: selected, lastResetDate: today });

    // Sync to Firestore
    if (userId) {
      selected.forEach(quest => {
        fireSync(() => dbService.saveDailyQuest(userId, quest), `generateQuestSync_${quest.id}`, userId);
      });
    }
  },

  completeQuest: (questId: string) => {
    const { dailyQuests, userId } = get();
    const quest = dailyQuests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    // Use addXP to award the reward
    get().actions.addXP(quest.rewardXP);

    const updatedQuest = { ...quest, completed: true, currentCount: quest.targetCount };

    set((state) => ({
      dailyQuests: state.dailyQuests.map(q =>
        q.id === questId ? updatedQuest : q
      ),
      completedQuests: [...state.completedQuests, questId]
    }));

    if (userId) {
      fireSync(() => dbService.saveDailyQuest(userId, updatedQuest), `completeQuestSync_${questId}`, userId);
    }

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
    const newLevel = computeLevel(newTotalXP);

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
    const questsToSync: any[] = [];
    const newQuests = state.dailyQuests.map(q => {
      if (q.type !== type || q.completed) return q;

      let newCount = q.currentCount;
      if (type === 'task') {
        newCount = state.tasks.filter(t => t.date === getTodayLocal() && t.completed).length;
      } else if (type === 'habit') {
        newCount = state.habits.filter(h => h.completedDays.includes(getTodayLocal())).length;
      } else if (type === 'focus' && count !== undefined) {
        newCount = count;
      } else if (type === 'mood' && count !== undefined) {
        newCount = count;
      }

      if (newCount !== q.currentCount) {
        changed = true;
        const isFinished = newCount >= q.targetCount;
        const updated = { ...q, currentCount: Math.min(newCount, q.targetCount) };
        
        if (isFinished) {
          updated.completed = true; // Mark completed optimistically to prevent double-award
          setTimeout(() => get().actions.completeQuest(q.id), 0);
        }
        
        questsToSync.push(updated);
        return updated;
      }
      return q;
    });

    if (changed) {
      if (state.userId) {
        questsToSync.forEach(q => {
          fireSync(() => dbService.saveDailyQuest(state.userId!, q), `questProgressSync_${q.id}`, state.userId!);
        });
      }
      return { dailyQuests: newQuests };
    }
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
