import { StateCreator } from 'zustand';
import { UserState, Task, TaskActions } from '../types';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import * as Crypto from 'expo-crypto';
import { parseTimeString } from '../helpers';
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
      fireSync(() => dbService.saveTask(get().userId!, newTask), 'addTask', get().userId);
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
        fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'updateTask', state.userId);
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
    set((state) => {
      const task = state.tasks.find(t => t.id === id);
      if (!task) return state;

      const nowCompleted = !task.completed;
      const updatedTask = { ...task, completed: nowCompleted, status: (nowCompleted ? 'completed' : 'pending') as Task['status'] };
      if (!nowCompleted) delete updatedTask.systemComment;
      
      let newTasks = state.tasks.map((t) => t.id === id ? updatedTask : t);

      if (nowCompleted && task.repeat && task.repeat !== 'none') {
        const nextDate = new Date(task.date);
        if (task.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (task.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (task.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

        const nextDateStr = formatLocalDate(nextDate);
        const exists = state.tasks.some(t => t.text === task.text && t.date === nextDateStr);
        if (!exists) {
          const newTask = {
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
        fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'toggleTask', state.userId);
      }

      setTimeout(() => {
        const { actions } = get();
        actions.checkQuestProgress('task');
        actions.updateLifeScoreHistory();
      }, 0);

      if (nowCompleted) {
        import('@/services/notificationService').then(({ notificationService }) => {
          notificationService.cancelTaskNotification(id);
        });
        get().actions.addXP(15);
        analyticsService.logEvent(state.userId, 'task_completed', { priority: task.priority });
      } else {
        analyticsService.logEvent(state.userId, 'task_uncompleted', { priority: task.priority });
      }

      return { tasks: newTasks };
    });
  },

  removeTask: (id: string) => {
    set((state) => {
      const newTasks = state.tasks.filter((t) => t.id !== id);
      if (state.userId) {
        fireSync(() => dbService.deleteTask(state.userId!, id), 'removeTask', state.userId);
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
        if (state.userId) fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'updateSubtask', state.userId);
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
        if (state.userId) fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'toggleSubtask', state.userId);
        return updatedTask;
      }
      return t;
    });
    return { tasks };
  }),

  checkMissedTasks: () => set((state) => {
    const now = new Date();
    let changed = false;
    const newTasks = state.tasks.map(task => {
      if (task.status === 'pending' && task.endTime) {
        const parsed = parseTimeString(task.endTime);
        if (!parsed) return task;

        const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
        const endDateTime = new Date(taskYear, taskMonth - 1, taskDay, parsed.hours, parsed.minutes, 0, 0);

        if (now > endDateTime) {
          changed = true;
          const updatedTask = {
            ...task,
            status: 'missed' as const,
            systemComment: 'You missed this daily task! 😔'
          };
          if (state.userId) {
            fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'missedTaskSync', state.userId);
          }
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleMissedTaskNotification(task.text).catch(() => {});
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

    if (changed) {
      return { tasks: newTasks };
    }
    return state;
  }),
});
