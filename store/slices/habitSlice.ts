import { StateCreator } from 'zustand';
import { UserState, Habit, HabitActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import * as Crypto from 'expo-crypto';
import { fireSync } from '../syncHelper';
import { analyticsService } from '@/services/analyticsService';
import Toast from 'react-native-toast-message';

export const createHabitSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], HabitActions> = (set, get) => ({
  addHabit: (habitData: Omit<Habit, 'completedDays' | 'bestStreak' | 'currentStreak' | 'createdAt' | 'id' | 'pausedUntil'> & { id?: string }) => {
    const newHabit: Habit = {
      ...habitData,
      id: habitData.id || Crypto.randomUUID(),
      reminderTime: habitData.reminderTime ?? null,
      completedDays: [],
      bestStreak: 0,
      currentStreak: 0,
      createdAt: Date.now(),
      pausedUntil: null
    };
    set((state) => ({ habits: [...state.habits, newHabit] }));
    if (get().userId) {
      fireSync(
        () => dbService.saveHabit(get().userId!, newHabit),
        'addHabit',
        get().userId,
        'habits',
        newHabit,
        newHabit.id
      );
      if (newHabit.reminderTime) {
        import('@/services/notificationService').then(({ notificationService }) => {
          notificationService.requestPermissions();
        });
      }
      get().actions.refreshHabitNotifications();
      analyticsService.logEvent(get().userId, 'habit_added', { title: newHabit.title });
    }
  },

  removeHabit: (id) => set((state) => {
    const newHabits = state.habits.filter(h => h.id !== id);
    if (state.userId) {
      fireSync(
        () => dbService.deleteHabit(state.userId!, id), 
        'removeHabit', 
        state.userId,
        'habits',
        { id },
        id
      );
      // Clean up notifications immediately on removal
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.cancelHabitReminders(id);
      });
    }

    setTimeout(() => {
      const { actions } = get();
      actions.checkQuestProgress('habit');
      actions.updateLifeScoreHistory();
    }, 0);

    return { habits: newHabits };
  }),

  toggleHabit: (id: string, dateStr?: string) => set((state) => {
    const newHabits = state.habits.map(h => {
      if (h.id === id) {
        const today = dateStr || getTodayLocal();
        // Prevent completing habits for future dates (XP farming guard)
        if (today > getTodayLocal()) return h;
        if (h.pausedUntil && today <= h.pausedUntil) return h;

        const completedSet = new Set(h.completedDays);
        const isCompleted = completedSet.has(today);

        // ── Due-Day Validation ──
        if (!isCompleted) {
          // T-31: Improved date parsing to be timezone-resilient (Local components)
          const [y, m, d_num] = today.split('-').map(Number);
          const d_obj = new Date(y, m - 1, d_num);
          const jsDay = d_obj.getDay();
          const dayOfMonth = d_obj.getDate();

          if (h.frequency === 'weekly') {
            if (!h.targetDays?.includes(jsDay)) {
              const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
              const scheduled = h.targetDays?.map(d => DAY_NAMES[d]).join(', ') || 'scheduled days';
              Toast.show({ type: 'info', text1: 'Not scheduled today', text2: `This habit runs on ${scheduled}.`, visibilityTime: 3000 });
              return h;
            }
          } else if (h.frequency === 'monthly') {
            const isFixed = h.monthlyDay && h.monthlyDay > 0;
            if (isFixed) {
              if (dayOfMonth !== h.monthlyDay) return h;
            } else {
              // Monthly Count Goal: cap completions at the target
              const monthStr = today.slice(0, 7);
              const isFixed = h.monthlyDay && h.monthlyDay > 0;
              const monthCompletions = h.completedDays.filter(cd => {
                if (!cd.startsWith(monthStr)) return false;
                if (isFixed) {
                  const dayNum = parseInt(cd.split('-')[2], 10);
                  return dayNum === h.monthlyDay;
                }
                return true;
              }).length;
              if (monthCompletions >= (h.monthlyTarget || 1)) return h;
            }
          }
        }
        
        let newCompletedDays = isCompleted
          ? h.completedDays.filter(d => d !== today)
          : [...h.completedDays, today];
        
        // Z-3: Prune stale completions (performance & doc size)
        const TWO_YEARS_AGO = formatLocalDate(new Date(Date.now() - 2 * 365 * 86400000));
        if (newCompletedDays.length > 2000) {
          newCompletedDays = newCompletedDays.sort().slice(-2000);
        }
        newCompletedDays = newCompletedDays.filter(d => d >= TWO_YEARS_AGO);

        let currentStreak = 0;
        const todayForStreak = new Date();
        const todayStrForStreak = formatLocalDate(todayForStreak);
        const newCompletedSet = new Set(newCompletedDays);
        const startOffset = newCompletedSet.has(todayStrForStreak) ? 0 : 1;
        
        if (h.frequency === 'monthly') {
          // Count consecutive months (going back from current) where the monthly target was met or skipped.
          const nowForStreak = new Date();
          for (let m = 0; m < 24; m++) {
            const d = new Date(nowForStreak.getFullYear(), nowForStreak.getMonth() - m, 1);
            const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            // Monthly check: Was this month target met or was it skipped?
            const isFixed = h.monthlyDay && h.monthlyDay > 0;
            const monthCompletions = newCompletedDays.filter(cd => {
              if (!cd.startsWith(monthStr)) return false;
              if (isFixed) {
                const dayNum = parseInt(cd.split('-')[2], 10);
                return dayNum === h.monthlyDay;
              }
              return true;
            }).length;
            const monthTarget = h.monthlyTarget || 1;
            
            // Advanced Pause Check: If fixed date, was the date within pausedUntil?
            // If count goal, is the entire month within pausedUntil?
            let isSkipped = false;
            if (h.pausedUntil) {
              if (h.monthlyDay && h.monthlyDay > 0) {
                // Fixed date: check if that specific date is <= pausedUntil
                const targetDateInMonth = `${monthStr}-${String(h.monthlyDay).padStart(2, '0')}`;
                if (targetDateInMonth <= h.pausedUntil) isSkipped = true;
              } else {
                // Count goal: If last day of month is <= pausedUntil, the whole month was skipped
                const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                const lastDayStr = formatLocalDate(lastDay);
                if (lastDayStr <= h.pausedUntil) isSkipped = true;
              }
            }

            if (monthCompletions >= monthTarget || isSkipped) {
              // Streak continues if target met OR month skipped
              if (!isSkipped || monthCompletions >= monthTarget) {
                 // Only increment internal count if it wasn't purely skipped (optional detail)
                 // Actually, if skipped, we just don't BREAK. 
              }
              currentStreak++;
            } else if (m > 0) {
              // Allow current month to still be in progress (m === 0)
              break;
            }
          }
        } else {
          for (let i = startOffset; i < 365; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = formatLocalDate(d);

            if (h.frequency === 'weekly' && !h.targetDays.includes(d.getDay())) continue;
            if (h.pausedUntil && dStr <= h.pausedUntil) continue;

            if (newCompletedSet.has(dStr)) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        // XP guard: only award once per habit per calendar day.
        const xpAwardedDays = h.xpAwardedDays || [];
        const xpAwardedSet = new Set(xpAwardedDays);
        const alreadyAwardedToday = xpAwardedSet.has(today);
        const shouldAwardXP = !isCompleted && !alreadyAwardedToday;

        let newXpAwardedDays = xpAwardedDays;
        if (shouldAwardXP) {
          // C-20 FIX: Extended prune window to 365 days (was 180, allowing re-award of old dates).
          const cutoff = formatLocalDate(new Date(Date.now() - 365 * 86400000));
          newXpAwardedDays = [...xpAwardedDays, today]
            .filter(d => d >= cutoff)
            .sort()
            .slice(-365);
        }

        const updatedHabit: Habit = {
          ...h,
          completedDays: newCompletedDays,
          currentStreak,
          bestStreak: Math.max(h.bestStreak || 0, currentStreak),
          xpAwardedDays: newXpAwardedDays,
        };

        if (state.userId) {
          fireSync(
            () => dbService.toggleHabitDate(state.userId!, id, newCompletedDays, newXpAwardedDays, currentStreak, Math.max(h.bestStreak || 0, currentStreak)),
            'toggleHabit',
            state.userId,
            'habits',
            updatedHabit,
            updatedHabit.id
          );
        }

        let detectedMilestone: { habitTitle: string; streak: number; timestamp: number } | null = null;
        if (!isCompleted) {
          const milestones = [7, 14, 30, 50, 100];
          if (milestones.includes(currentStreak)) {
            detectedMilestone = { habitTitle: h.title, streak: currentStreak, timestamp: Date.now() };
          }
          // Only award XP if not already given today (idempotent guard)
          if (shouldAwardXP) {
            get().actions.addXP(10);
          }
          analyticsService.logEvent(state.userId, 'habit_completed', { title: h.title, streak: currentStreak });
        } else {
          analyticsService.logEvent(state.userId, 'habit_uncompleted', { title: h.title });
        }

        if (detectedMilestone) {
          const milestone = detectedMilestone;
          setTimeout(() => {
            import('react-native-toast-message').then(Toast => {
              Toast.default.show({
                type: 'success',
                text1: 'Milestone Reached! 🔥',
                text2: `You hit a ${milestone.streak}-day streak for ${h.title}!`
              });
            });
            // Request App Store review at meaningful streak milestones (7 & 30 days)
            if (milestone.streak === 7 || milestone.streak === 30) {
              import('expo-store-review').then(StoreReview => {
                StoreReview.isAvailableAsync().then(available => {
                  if (available) StoreReview.requestReview();
                });
              }).catch(() => {});
            }
            get().actions.triggerProactivePrompt(
              'milestone',
              `Incredible consistency! You just hit a ${milestone.streak}-day streak for ${h.title}. How does it feel to be this focused?`
            );
          }, 500);
        }

        setTimeout(() => {
          const { actions } = get();
          actions.checkQuestProgress('habit');
          actions.updateLifeScoreHistory();
          actions.refreshHabitNotifications();
        }, 0);

        // C-06 FIX: Return milestone outside habit object so caller can add to root state queue.
        (updatedHabit as any).__detectedMilestone = detectedMilestone;
        return updatedHabit;
      }
      return h;
    });

    // C-06 FIX: Collect milestone from the updated habit and push to root streakMilestones queue.
    const newMilestone = (newHabits.find(h => (h as any).__detectedMilestone) as any)?.__detectedMilestone ?? null;
    // Clean up temporary field
    newHabits.forEach(h => { delete (h as any).__detectedMilestone; });

    return {
      habits: newHabits,
      ...(newMilestone && { streakMilestones: [...state.streakMilestones, newMilestone] }),
    };
  }),

  updateHabit: (id: string, updates: Partial<Habit>) => set((state) => {
    const newHabits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
    const updatedHabit = newHabits.find(h => h.id === id);
    if (state.userId && updatedHabit) {
      fireSync(
        () => dbService.saveHabit(state.userId!, updatedHabit), 
        'updateHabit', 
        state.userId,
        'habits',
        updatedHabit,
        updatedHabit.id
      );
      get().actions.refreshHabitNotifications();
    }
    return { habits: newHabits };
  }),

  pauseHabit: (id: string, until: string | null) => set((state) => {
    const newHabits = state.habits.map(h => h.id === id ? { ...h, pausedUntil: until } : h);
    const updatedHabit = newHabits.find(h => h.id === id);
    if (state.userId && updatedHabit) {
      fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'pauseHabit', state.userId);
      get().actions.refreshHabitNotifications();
    }
    return { habits: newHabits };
  }),

  getStreak: (id: string) => {
    const habit = get().habits.find(h => h.id === id);
    if (!habit) return 0;

    // M-4: Return precomputed streak for O(1) performance.
    // If not yet computed (legacy habit), we return 0 but it will be 
    // reconciled on the next toggle or daily reset.
    return habit.currentStreak || 0;
  },

  refreshHabitNotifications: async () => {
    const { habits } = get();
    try {
      const { notificationService } = await import('@/services/notificationService');
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) return;

      for (const habit of habits) {
        if (habit.reminderTime) {
          await notificationService.scheduleHabitReminder(
            habit.id, habit.title, habit.icon, habit.reminderTime, habit.frequency, habit.targetDays, habit.monthlyDay
          );
        } else {
          await notificationService.cancelHabitReminders(habit.id);
        }
      }
    } catch (err) {
      console.error('[LifeOS] Failed to refresh notifications:', err);
    }
  },
});
