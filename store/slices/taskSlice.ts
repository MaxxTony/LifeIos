import { StateCreator } from 'zustand';
import { UserState, Task, TaskActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

// T-28: Global throttle for haptics to prevent jam
let lastHapticTime = 0;
const throttleHaptic = (type: Haptics.NotificationFeedbackType) => {
  const now = Date.now();
  if (now - lastHapticTime > 200) {
    Haptics.notificationAsync(type);
    lastHapticTime = now;
  }
};
// BUG-026: Lock per task ID to prevent race conditions on rapid toggle.
const togglingTasks = new Set<string>();
import { parseTimeString, computeLevel } from '../helpers';
import { fireSync } from '../syncHelper';
import { analyticsService } from '@/services/analyticsService';

export const createTaskSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], TaskActions> = (set, get) => ({
  addTask: (text, startTime, endTime, priority = 'medium', date = getTodayLocal()) => {
    let dueTime: number | undefined;

    if (startTime) {
      const parsed = parseTimeString(startTime);
      if (parsed) {
        const [year, month, day] = date.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, parsed.hours, parsed.minutes, 0, 0);
        const ts = targetDate.getTime();
        if (!isNaN(ts)) dueTime = ts;
      }
    }

    const id = Crypto.randomUUID();
    const newTask: Task = {
      id,
      text,
      priority,
      date,
      completed: false,
      createdAt: Date.now(),
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      dueTime: dueTime ?? null,
      status: 'pending' as const
    };

    set((state) => ({ tasks: [...state.tasks, newTask] }));
    if (get().userId) {
      fireSync(
        () => dbService.saveTask(get().userId!, newTask), 
        'addTask', 
        get().userId,
        'tasks',
        newTask,
        newTask.id
      );
      analyticsService.logEvent(get().userId, 'task_added', { priority, hasTime: !!startTime });
    }
    
    if (newTask.startTime && newTask.dueTime) {
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.scheduleTaskNotification(newTask.id, newTask.text, newTask.startTime!, newTask.date);
      });
    }

    return id;
  },

  updateTask: (id: string, updates: Partial<Task>) => {
    set((state) => {
      const newTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
      const updatedTask = newTasks.find(t => t.id === id);
      if (state.userId && updatedTask) {
        fireSync(
          () => dbService.saveTask(state.userId!, updatedTask), 
          'updateTask', 
          state.userId,
          'tasks',
          updatedTask,
          updatedTask.id
        );
      }

      if (updates.startTime || updates.date || updates.text) {
        const task = updatedTask || newTasks.find(t => t.id === id);
        if (task?.startTime) {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleTaskNotification(task.id, task.text, task.startTime!, task.date);
          });
        } else {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.cancelTaskNotification(id);
          });
        }
      }

      return { tasks: newTasks };
    });
  },

  toggleTask: (id: string) => {
    if (togglingTasks.has(id)) return;
    togglingTasks.add(id);

    set((state) => {
      try {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return state;

        const todayStr = getTodayLocal();
        if (task.date > todayStr && !task.completed) {
          Toast.show({
            type: 'info',
            text1: 'Locked 🔒',
            text2: `You cannot complete future tasks yet!`
          });
          return state;
        }

        const nowCompleted = !task.completed;
        // XP guard: only award once per task lifetime. xpAwarded stays true even after un-toggle.
        const shouldAwardXP = nowCompleted && !task.xpAwarded;
        const updatedTask = {
          ...task,
          completed: nowCompleted,
          status: (nowCompleted ? 'completed' : 'pending') as Task['status'],
          xpAwarded: task.xpAwarded || shouldAwardXP,
        };
        if (!nowCompleted) delete updatedTask.systemComment;
        
        let newTasks = state.tasks.map((t) => t.id === id ? updatedTask : t);

        if (nowCompleted && task.repeat && task.repeat !== 'none') {
          const nextDate = new Date(task.date);
          if (task.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (task.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (task.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          const nextDateStr = formatLocalDate(nextDate);
          
          // M-2 FIX: Extra-strong check to prevent duplication on rapid toggling
          const alreadySpawned = newTasks.some(t => t.text === task.text && t.date === nextDateStr && t.repeat === task.repeat);
          if (!alreadySpawned) {
            const newTask: Task = {
              ...task,
              id: Crypto.randomUUID(),
              date: nextDateStr,
              completed: false,
              status: 'pending' as const,
              createdAt: Date.now(),
            };
            delete newTask.systemComment;
            newTasks.push(newTask);
            if (state.userId) {
              fireSync(() => dbService.saveTask(state.userId!, newTask), 'recursiveTaskSync', state.userId);
            }
          }
        }

        if (state.userId) {
          fireSync(
            () => dbService.saveTask(state.userId!, updatedTask), 
            'toggleTask', 
            state.userId,
            'tasks',
            updatedTask,
            updatedTask.id
          );
        }

        const newState: Partial<UserState> = { tasks: newTasks };

        if (nowCompleted) {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.cancelTaskNotification(id);
          });
          
          // C-STORE-7 FIX: Award XP atomically within the same set() call
          if (shouldAwardXP) {
            // Reset comeback notifications on activity
            import('@/services/notificationService').then(({ notificationService }) => {
              notificationService.scheduleComebackNotifications();
            });

            const amount = 15;
            const newTotalXP = state.totalXP + amount;
            const newLevel = computeLevel(newTotalXP);
            
            if (newLevel > state.level) {
              setTimeout(() => {
                Toast.show({
                  type: 'success',
                  text1: 'Level Up! ✨',
                  text2: `You reached Level ${newLevel}! Keep evolving.`
                });
                throttleHaptic(Haptics.NotificationFeedbackType.Success);
              }, 800);
            }
            
            newState.totalXP = newTotalXP;
            newState.level = newLevel;
            newState.recentXP = { amount, timestamp: Date.now() };

            if (state.userId) {
              // O7 FIX: Also sync weeklyXP so the leaderboard stays accurate.
              // Without this, weeklyXP in the cloud only updates on addXP() calls,
              // not on in-slice atomic XP awards like task completion.
              const newWeeklyXP = (state.weeklyXP || 0) + amount;
              newState.weeklyXP = newWeeklyXP;
              fireSync(() => dbService.saveCollectionDoc(state.userId!, 'stats', 'global', { totalXP: newTotalXP, level: newLevel, weeklyXP: newWeeklyXP }), 'xpUpdateTask', state.userId);
            }
          }
          analyticsService.logEvent(state.userId, 'task_completed', { priority: task.priority });
        } else {
          analyticsService.logEvent(state.userId, 'task_uncompleted', { priority: task.priority });
        }

        setTimeout(() => {
          const { actions } = get();
          actions.checkQuestProgress('task');
          actions.updateLifeScoreHistory();
          togglingTasks.delete(id);
        }, 0);

        return newState as any;
      } catch (e) {
        console.error('Error toggling task:', e);
        togglingTasks.delete(id);
        return state;
      } finally {
        // Fallback safety to release lock
        setTimeout(() => togglingTasks.delete(id), 500);
      }
    });
  },

  removeTask: (id: string) => {
    set((state) => {
      const newTasks = state.tasks.filter((t) => t.id !== id);
      if (state.userId) {
        fireSync(
          () => dbService.deleteTask(state.userId!, id), 
          'removeTask', 
          state.userId,
          'tasks',
          { id }, // Payload for delete is just ID
          id
        );
      }

      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.cancelTaskNotification(id);
      });

      return { tasks: newTasks };
    });
  },
  
  setTasks: (tasks: Task[]) => set({ tasks }),

  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<{ text: string, completed: boolean }>) => set((state) => {
    const tasks = state.tasks.map(t => {
      if (t.id === taskId) {
        const subtasks = t.subtasks?.map(st => st.id === subtaskId ? { ...st, ...updates } : st);
        const updatedTask = { ...t, subtasks };
        if (state.userId) {
          fireSync(
            () => dbService.saveTask(state.userId!, updatedTask), 
            'updateSubtask', 
            state.userId,
            'tasks',
            updatedTask,
            updatedTask.id
          );
        }
        return updatedTask;
      }
      return t;
    });
    return { tasks };
  }),

  toggleSubtask: (taskId: string, subtaskId: string) => set((state) => {
    const tasks = state.tasks.map(t => {
      if (t.id === taskId) {
        const subtasks = t.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
        const updatedTask = { ...t, subtasks };
        if (state.userId) {
          fireSync(
            () => dbService.saveTask(state.userId!, updatedTask), 
            'toggleSubtask', 
            state.userId,
            'tasks',
            updatedTask,
            updatedTask.id
          );
        }
        return updatedTask;
      }
      return t;
    });
    return { tasks };
  }),

  checkMissedTasks: () => set((state) => {
    const now = new Date();
    const missedTasksToSync: Task[] = [];
    
    const newTasks = state.tasks.map(task => {
      if (task.status === 'pending' && task.endTime) {
        const parsed = parseTimeString(task.endTime);
        if (!parsed) return task;

        const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
        const endDateTime = new Date(taskYear, taskMonth - 1, taskDay, parsed.hours, parsed.minutes, 0, 0);

        const todayStr = getTodayLocal();
        if (task.date > todayStr) return task; 

        if (now > endDateTime) {
          const updatedTask = {
            ...task,
            status: 'missed' as const,
            systemComment: 'You missed this daily task! 😔'
          };
          
          missedTasksToSync.push(updatedTask);
          
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleMissedTaskNotification(task.id, task.text).catch(() => {});
          });

          setTimeout(() => {
            get().actions.triggerProactivePrompt(
              'missed_task',
              `I noticed you missed "${task.text}". Don't sweat it—life happens! Want to reschedule this or adjust your focus for the rest of the day?`
            );
          }, 1000);

          return updatedTask;
        }
      }
      return task;
    });

    if (missedTasksToSync.length > 0) {
      if (state.userId) {
        // C-11: Batching daily reset writes into 1 atomic operation to save costs and avoid key collisions
        fireSync(() => dbService.saveTasksBatch(state.userId!, missedTasksToSync), 'missedTaskBatchSync', state.userId);
      }
      return { tasks: newTasks };
    }
    return state;
  }),
});
