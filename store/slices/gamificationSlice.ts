import { dbService } from '@/services/dbService';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { StateCreator } from 'zustand';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { QUEST_TEMPLATES, computeLevel, shuffleArray } from '../helpers';
import { fireSync } from '../syncHelper';
import { GamificationActions, UserState } from '../types';
import { analyticsService } from '@/services/analyticsService';

// C-03 FIX: Module-level re-entrancy guard prevents simultaneous double resets.
let isResetting = false;
// MED-004: Rate-limit publicProfiles writes — only on level-up or at most once per 5 min.
let lastPublicProfileWriteTime = 0;

export const createGamificationSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], GamificationActions> = (set, get) => ({
  performDailyReset: () => {
    if (isResetting) return;
    isResetting = true;
    try {
      set((state) => {
        try {
          const today = getTodayLocal();
          if (state.lastResetDate === today) return state;

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

          const newTasks = updatedTasks.filter(t => t.date >= cutoffStr);
          console.log(`[LifeOS] Daily reset performed for ${today}. Tasks pruned to last 30 days.`);

          if (state.userId) {
            // FIREBASE-2 FIX: Pass today as beforeDate so only docs with IDs < "quest-{today}"
            fireSync(() => dbService.deleteDailyQuests(state.userId!, today), 'deleteDailyQuestsSync', state.userId);
          }

          // Global Streak Breakage Check
          let newGlobalStreak = state.globalStreak || 0;
          let newStreakFreezes = state.streakFreezes || 0;
          
          if (state.lastActiveDate && state.lastActiveDate < yesterdayStr) {
            if (newStreakFreezes > 0) {
              // Consume freeze to protect streak
              newStreakFreezes -= 1;
              console.log(`[LifeOS] Global streak protected using a Freeze. Remaining: ${newStreakFreezes}`);
              setTimeout(() => {
                import('react-native-toast-message').then(Toast => {
                  Toast.default.show({
                    type: 'success',
                    text1: '🧊 Streak Saved!',
                    text2: `A Freeze was used to keep your ${newGlobalStreak}-day streak alive.`
                  });
                });
              }, 2000);
              
              if (state.userId) {
                // Must update the saved profile immediately
                fireSync(() => dbService.saveUserProfile(state.userId!, { streakFreezes: newStreakFreezes } as any), 'consumeFreeze_profile', state.userId);
              }
            } else {
              // Streak broken!
              newGlobalStreak = 0;
              if ((state.globalStreak || 0) > 2) {
                // PHASE 6: Trigger full-screen Grief/Recovery UI
                return {
                  ...state,
                  globalStreak: 0,
                  showStreakBroken: true,
                  lastResetDate: today
                };
              }
            }
          }

          // If a focus session is actively running at midnight, preserve it rather than
          // killing it silently. Reset the daily counter so the new day starts at 0,
          // but keep isActive/pomodoroMode intact so the user's session continues.
          const focusReset = state.focusSession.isActive
            ? { totalSecondsToday: 0, sessionStartSeconds: 0, lastStartTime: Date.now() }
            : { totalSecondsToday: 0, isActive: false as const, lastStartTime: null, pomodoroMode: 'work' as const, pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration };

          return {
            lastResetDate,
            globalStreak: newGlobalStreak,
            streakFreezes: newStreakFreezes,
            tasks: newTasks,
            focusSession: { ...state.focusSession, ...focusReset },
            focusHistory: newFocusHistory,
            dailyQuests: [],
          };
        } catch (error) {
          console.error('[LifeOS] Daily reset failed:', error);
          return state;
        }
      });
    } finally {
      isResetting = false;
    }
  },

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
    
    // Z-4: Prune Life Score history beyond 90 days (database health)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = formatLocalDate(ninetyDaysAgo);
    
    const prunedHistory = Object.keys(newHistory)
      .filter(k => k >= ninetyDaysAgoStr)
      .reduce((obj, key) => {
        obj[key] = newHistory[key];
        return obj;
      }, {} as Record<string, number>);

    if (state.userId && state.lifeScoreHistory[today] !== lifeScore) {
      fireSync(() => dbService.saveCollectionDoc(state.userId!, 'lifeScoreHistory', today, { score: lifeScore }), 'saveLifeScore', state.userId);
    }

    return { lifeScoreHistory: prunedHistory };
  }),

  generateDailyQuests: () => {
    const { lastResetDate, dailyQuests, userId, syncStatus } = get();
    const today = getTodayLocal();
    
    // C-SYNC-QUEST FIX: If we are online and quests haven't loaded from cloud yet, 
    // WAIT for the sync listener to provide them instead of generating fresh ones 
    // which causes a race condition and "resets" the user's progress.
    if (userId && !syncStatus.questsLoaded && !syncStatus.isOffline) {
      console.log('[LifeOS Quests] Waiting for cloud sync before generating...');
      return;
    }

    const questsAreForToday = dailyQuests.length > 0 && dailyQuests.every(q => q.id.includes(today));
    if (lastResetDate === today && questsAreForToday) return;

    // If we have quests from cloud (loaded via subscribeToCloud), don't overwrite them
    if (questsAreForToday) return;

    const shuffled = shuffleArray(QUEST_TEMPLATES);
    const selected = shuffled.slice(0, 3).map((q, idx) => ({
      ...q,
      id: `quest-${today}-${idx}`,
      currentCount: 0,
      completed: false,
      date: today,
      rewardXP: Math.max(1, Math.min(q.rewardXP, 500)),
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
      completedQuests: [...state.completedQuests, questId].slice(-100)
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
    // --- Phase 6 Gamification Gameloop ---
    const todayStr = getTodayLocal();
    let newGlobalStreak = state.globalStreak || 0;
    let newLastActiveDate = state.lastActiveDate;
    let finalAmount = amount;
    let isLuckyBoost = false;

    // 1. Lucky XP Boost (5% chance to double XP)
    if (Math.random() < 0.05) {
      finalAmount = amount * 2;
      isLuckyBoost = true;
    }

    const newTotalXP = state.totalXP + finalAmount;
    const newLevel = computeLevel(newTotalXP);

    // Reset comeback notifications on any activity (XP gain)
    import('@/services/notificationService').then(({ notificationService }) => {
      notificationService.scheduleComebackNotifications();
    });

    // 2. Check Global Streak
    if (state.lastActiveDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatLocalDate(yesterday);

      if (state.lastActiveDate === yesterdayStr) {
        newGlobalStreak += 1;
      } else {
        newGlobalStreak = 1; // Restart streak
      }
      newLastActiveDate = todayStr;
      
      // Streak saved for today, cancel any streak warnings!
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.cancelStreakWarningNotification();
      });
      
      // Toast notification for streak if > 1
      if (newGlobalStreak > 1) {
        setTimeout(() => {
          import('react-native-toast-message').then(Toast => {
            Toast.default.show({
              type: 'success',
              text1: isLuckyBoost ? '🍀 LUCKY BOOST!' : 'Streak Saved! 🔥',
              text2: isLuckyBoost 
                ? `You earned DOUBLE XP (+${finalAmount}) and your ${newGlobalStreak}-day streak is alive!`
                : `You're on a ${newGlobalStreak}-day streak!`
            });
          });
        }, 1500);
      }
    }

    // 3. Streak Milestones (+500 XP at 3, 7, 14, 30, 60, 100 days)
    const milestones = [3, 7, 14, 30, 60, 100];
    let milestoneBonus = 0;
    const newStreakMilestones = [...(state.streakMilestones || [])];

    if (milestones.includes(newGlobalStreak) && state.lastActiveDate !== todayStr) {
      milestoneBonus = 500;
      newStreakMilestones.push({
        id: `milestone-${newGlobalStreak}-${Date.now()}`,
        days: newGlobalStreak,
        rewardXP: 500,
        timestamp: Date.now()
      });
      
      analyticsService.logMilestone(state.userId, 'streak_milestone', { days: newGlobalStreak });

      // PHASE 8: 100-Day Master Content Unlock
      if (newGlobalStreak === 100 && !state.masterUnlocked) {
        setTimeout(() => {
          import('react-native-toast-message').then(Toast => {
            Toast.default.show({
              type: 'success',
              text1: '🏆 LEGENDARY UNLOCKED!',
              text2: 'You have reached a 100-day streak! The Legendary Gold theme is now yours.',
              visibilityTime: 6000,
            });
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 3000);
      }
    }

    // Atomic update for master status
    const masterUpdate = (newGlobalStreak >= 100 && !state.masterUnlocked) 
      ? { masterUnlocked: true, unlockedThemes: [...state.unlockedThemes, 'Legendary Gold'] }
      : {};

    const adjustedTotalXP = newTotalXP + milestoneBonus;
    const adjustedLevel = computeLevel(adjustedTotalXP);

    // 4. Check Weekly XP (Resets every Monday)
    const todayDate = new Date();
    const dayOfWeek = todayDate.getDay() || 7; 
    const diffToMonday = todayDate.getDate() - dayOfWeek + 1;
    const currentMonday = new Date(todayDate);
    currentMonday.setDate(diffToMonday);
    const currentMondayStr = formatLocalDate(currentMonday);

    let newWeeklyXP = (state.weeklyXP || 0) + finalAmount + milestoneBonus;
    let newLastWeekResetDate = state.lastWeekResetDate;

    if (state.lastWeekResetDate !== currentMondayStr) {
      newWeeklyXP = finalAmount + milestoneBonus;
      newLastWeekResetDate = currentMondayStr;
    }

    // Check for Level Up
    if (adjustedLevel > state.level) {
      analyticsService.logMilestone(state.userId, 'level_up', { newLevel: adjustedLevel });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const newStatData = { 
      totalXP: adjustedTotalXP, 
      level: adjustedLevel,
      weeklyXP: newWeeklyXP,
      globalStreak: newGlobalStreak,
      lastActiveDate: newLastActiveDate,
      lastWeekResetDate: newLastWeekResetDate,
      streakMilestones: newStreakMilestones
    };

    if (state.userId) {
      fireSync(() => dbService.saveCollectionDoc(state.userId!, 'stats', 'global', newStatData), 'xpUpdate', state.userId);
      const levelChanged = adjustedLevel !== state.level;
      const now = Date.now();
      if (levelChanged || now - lastPublicProfileWriteTime > 5 * 60 * 1000) {
        lastPublicProfileWriteTime = now;
        fireSync(() => setDoc(doc(db, 'publicProfiles', state.userId!), {
          level: adjustedLevel,
          weeklyXP: newWeeklyXP,
          globalStreak: newGlobalStreak,
          lastActive: now,
          userName: state.userName || 'Anonymous',
          userNameLower: (state.userName || 'Anonymous').toLowerCase(),
          avatarUrl: state.avatarUrl || null
        }, { merge: true }), 'publicProfileSync', state.userId);
      }
    }

    return {
      ...newStatData,
      ...masterUpdate,
      recentXP: { amount: finalAmount + milestoneBonus, timestamp: Date.now(), isLucky: isLuckyBoost }
    };
  }),

  checkQuestProgress: (type: 'task' | 'habit' | 'focus' | 'mood', count?: number) => set((state) => {
    let changed = false;
    let totalXPToAdd = 0;
    const completedQuestsThisTick: string[] = [];
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
          analyticsService.logEvent(state.userId, 'quest_completed', { questId: q.id, type: q.type });
          // C-STORE-6 FIX: Mark completed and award XP ATOMICALLY
          updated.completed = true;
          totalXPToAdd += q.rewardXP;
          completedQuestsThisTick.push(q.id);

          // Trigger UI rewards (outside set, but logic is atomic)
          setTimeout(() => {
            import('react-native-toast-message').then(Toast => {
              Toast.default.show({
                type: 'success',
                text1: 'Quest Completed! 🏆',
                text2: `${q.title} (+${q.rewardXP} XP)`
              });
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 500);
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

      // If we awarded XP, also calculate level up atomically
      const newState: Partial<UserState> = { dailyQuests: newQuests };
      if (totalXPToAdd > 0) {
        // Reset comeback notifications on activity
        import('@/services/notificationService').then(({ notificationService }) => {
          notificationService.scheduleComebackNotifications();
        });

        const newTotalXP = state.totalXP + totalXPToAdd;
        const newLevel = computeLevel(newTotalXP);

        // XP-01 FIX: Compute weeklyXP here so the leaderboard stays accurate
        // even when XP is awarded directly from quest completion (not via addXP).
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay() || 7;
        const diffToMonday = todayDate.getDate() - dayOfWeek + 1;
        const currentMonday = new Date(todayDate);
        currentMonday.setDate(diffToMonday);
        const currentMondayStr = formatLocalDate(currentMonday);

        const isNewWeek = state.lastWeekResetDate !== currentMondayStr;
        const newWeeklyXP = isNewWeek ? totalXPToAdd : (state.weeklyXP || 0) + totalXPToAdd;
        const newLastWeekResetDate = isNewWeek ? currentMondayStr : state.lastWeekResetDate;

        if (newLevel > state.level) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        newState.totalXP = newTotalXP;
        newState.level = newLevel;
        newState.weeklyXP = newWeeklyXP;
        newState.lastWeekResetDate = newLastWeekResetDate;
        newState.recentXP = { amount: totalXPToAdd, timestamp: Date.now() };
        newState.completedQuests = [...state.completedQuests, ...completedQuestsThisTick].slice(-100);

        if (state.userId) {
          // XP-01 FIX: Include weeklyXP in the Firestore sync so the leaderboard
          // reflects quest XP immediately without waiting for the next addXP() call.
          fireSync(() => dbService.saveCollectionDoc(state.userId!, 'stats', 'global', {
            totalXP: newTotalXP,
            level: newLevel,
            weeklyXP: newWeeklyXP,
            lastWeekResetDate: newLastWeekResetDate,
          }), 'xpUpdateQuests', state.userId);
        }
      }

      return newState as any;
    }
    return state;
  }),

  triggerProactivePrompt: (trigger: string, message: string) => {
    const { notificationSettings } = get();
    if (!notificationSettings.masterEnabled || !notificationSettings.aiCoachNudge) return;
    set({ proactivePrompt: { message, trigger, timestamp: Date.now() } });
    import('@/services/notificationService').then(({ notificationService }) => {
      let title = "LifeOS Assistant ✨";
      if (trigger === 'low_mood') title = "LifeOS Care 🌿";
      else if (trigger === 'missed_task') title = "LifeOS Insight 🚀";
      else if (trigger === 'habit_streak') title = "LifeOS Habit 🧘‍♂️";
      notificationService.sendProactiveAI(title, message, 'ai');
    });
  },

  dismissXP: () => set({ recentXP: null }),
  // C-06 FIX: Shift from front of queue so simultaneous milestones all play in order.
  dismissMilestone: () => set(state => ({ streakMilestones: state.streakMilestones.slice(1) })),
  dismissMoodLog: () => set({ lastMoodLog: null }),
  dismissProactive: () => set({ proactivePrompt: null }),
  dismissStreakBroken: () => set({ showStreakBroken: false }),
  setLastActive: () => set((state) => {
    const today = getTodayLocal();
    const updates: Record<string, unknown> = { lastActiveTimestamp: Date.now() };
    if (state.lastActiveDate !== today) {
      updates.lastActiveDate = today;
      if (state.userId) {
        fireSync(
          () => dbService.saveCollectionDoc(state.userId!, 'stats', 'global', { lastActiveDate: today }),
          'setLastActive', state.userId
        );
      }
    }
    return updates;
  }),
});
