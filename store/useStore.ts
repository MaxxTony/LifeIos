import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto'; // FIX C-3: proper UUID generation
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface Task {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  date: string; // ISO date (YYYY-MM-DD)
  completed: boolean;
  createdAt: number;
  dueTime?: number;
  startTime?: string; // e.g. "06:00 PM"
  endTime?: string;   // e.g. "07:00 PM"
  status: 'pending' | 'completed' | 'missed';
  systemComment?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly'; // F-3
  subtasks?: { id: string; text: string; completed: boolean }[]; // F-4
}

interface Habit {
  id: string;
  title: string;
  icon: string;
  category: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays: number[]; // [0, 1, 2, 3, 4, 5, 6] for Sun-Sat
  reminderTime: string | null;
  goalDays: number;
  completedDays: string[]; // ISO Dates (e.g. "2024-04-10")
  createdAt: number;
  bestStreak: number;
  pausedUntil: string | null; // F-2: ISO date string
}

interface FocusSession {
  totalSecondsToday: number;
  isActive: boolean;
  lastStartTime: number | null;
}

interface MoodEntry {
  mood: number; // 1-5 scale: 1=Awful, 2=Meh, 3=Okay, 4=Good, 5=Amazing
  timestamp: number;
  reason?: string; // Legacy support
  activities?: string[];
  emotions?: string[];
  note?: string;
}

interface UserState {
  _hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  onboardingData: {
    struggles: string[];
  };
  tasks: Task[];
  habits: Habit[];
  focusSession: FocusSession;
  focusGoalHours: number;
  focusHistory: Record<string, number>; // Date -> totalSeconds
  moodHistory: Record<string, MoodEntry>; // Date -> MoodEntry
  mood: number | null;
  moodTheme: 'classic' | 'panda' | 'cat' | null;
  lastResetDate: string | null;
  bio: string | null;
  location: string | null;
  occupation: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  birthday: string | null;
  pronouns: string | null;
  skills: string | null;
  socialLinks: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
    instagram?: string;
    threads?: string;
    discord?: string;
  };
  themePreference: 'light' | 'dark' | 'system';
  accentColor: string | null;

  notificationSettings: {
    push: boolean;
    habits: boolean;
    tasks: boolean;
    mood: boolean;
  };

  // Actions
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  setAuth: (userId: string | null, userName: string | null) => void;
  setOnboardingData: (data: Partial<UserState['onboardingData']>) => void;
  addTask: (text: string, startTime?: string, endTime?: string, priority?: Task['priority'], date?: string) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<{ text: string, completed: boolean }>) => void; // F-4
  toggleSubtask: (taskId: string, subtaskId: string) => void; // F-4
  checkMissedTasks: () => void;
  performDailyReset: () => void;

  // Habit Actions
  addHabit: (habit: Omit<Habit, 'completedDays' | 'bestStreak' | 'createdAt' | 'id' | 'pausedUntil'> & { id?: string }) => void;
  removeHabit: (id: string) => void;
  toggleHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  pauseHabit: (id: string, until: string | null) => void; // F-2

  // Focus Actions
  setFocusGoal: (hours: number) => void;
  toggleFocusSession: () => void;
  updateFocusTime: () => void;

  setMood: (mood: number, extras?: { activities?: string[]; emotions?: string[]; note?: string; reason?: string }, date?: string) => void;
  setMoodTheme: (theme: 'classic' | 'panda' | 'cat' | null) => void;
  updateProfile: (updates: Partial<{
    userName: string;
    email: string;
    bio: string;
    location: string;
    occupation: string;
    avatarUrl: string | null;
    phoneNumber: string;
    birthday: string;
    pronouns: string;
    skills: string;
    socialLinks: UserState['socialLinks'];
  }>) => Promise<void>;
  logout: () => void;
  hydrateFromCloud: () => Promise<void>;

  // Cloud Sync
  subscribeToCloud: () => void;
  _syncUnsubscribes: (() => void)[]; // Updated to manage multiple listeners

  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;
  updateNotificationSettings: (updates: Partial<UserState['notificationSettings']>) => void;

  // Utilities
  getStreak: (habitId: string) => number;
  refreshHabitNotifications: () => Promise<void>;
  hasSeenWalkthrough: boolean;
  setHasSeenWalkthrough: (seen: boolean) => void;
}

const migrateTasks = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    let migrated = { ...task };
    if (!migrated.date) {
      migrated.date = formatLocalDate(new Date(task.createdAt));
    }
    if (!migrated.priority) {
      migrated.priority = 'medium';
    }
    if (!migrated.status) {
      migrated.status = 'pending';
    }
    return migrated;
  });
};

const parseTimeString = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  try {
    // Robustly handle different space characters and casing (e.g. "12:30pm", "12:30 PM", "12:30\u202fPM")
    const cleaned = timeStr.trim().replace(/\s+/g, ' ').toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
    
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3];
    
    if (modifier === 'PM' && hours < 12) hours += 12;
    else if (modifier === 'AM' && hours === 12) hours = 0;
    
    return { hours, minutes };
  } catch (e) {
    return null;
  }
};

const migrateMoodHistory = (history: any): Record<string, MoodEntry> => {
  if (!history) return {};
  if (!Array.isArray(history)) return history; // Already a map

  const map: Record<string, MoodEntry> = {};
  history.forEach((entry: any) => {
    if (entry && entry.timestamp) {
      const dateKey = formatLocalDate(new Date(entry.timestamp));
      map[dateKey] = entry;
    }
  });
  return map;
};

// FIX H-6: Fire-and-forget sync with error logging instead of silent failure
const fireSync = (fn: () => Promise<any>, label: string) => {
  fn().catch((err: any) => {
    console.error(`[LifeOS Sync] ${label} failed:`, err?.message || err);
  });
};

export const useStore = create<UserState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      hasCompletedOnboarding: false,
      isAuthenticated: false,
      userId: null,
      userName: null,
      onboardingData: {
        struggles: [],
      },
      tasks: [],
      habits: [],
      focusSession: {
        totalSecondsToday: 0,
        isActive: false,
        lastStartTime: null,
      },
      focusGoalHours: 8,
      focusHistory: {},
      moodHistory: {},
      mood: null,
      moodTheme: null,
      lastResetDate: null,
      bio: null,
      location: null,
      occupation: null,
      avatarUrl: null,
      phoneNumber: null,
      birthday: null,
      pronouns: null,
      skills: null,
      socialLinks: {},
      themePreference: 'system',
      accentColor: null,
      notificationSettings: {
        push: true,
        habits: true,
        tasks: true,
        mood: true,
      },
      _syncUnsubscribes: [],
      hasSeenWalkthrough: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setAuth: (userId, userName) => {
        // Clean up all existing listeners
        get()._syncUnsubscribes.forEach(unsub => {
          if (typeof unsub === 'function') unsub();
        });

        set({ userId, userName, isAuthenticated: !!userId, _syncUnsubscribes: [] });

        if (userId) {
          get().subscribeToCloud();
        }
      },
      setOnboardingData: (data) => set((state) => ({
        onboardingData: { ...state.onboardingData, ...data }
      })),

      // FIX C-3: Use Crypto.randomUUID() instead of Math.random().substring(7)
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
          startTime,
          endTime,
          dueTime,
          status: 'pending'
        };

        set((state) => ({ tasks: [...state.tasks, newTask] }));
        if (get().userId) {
          fireSync(() => dbService.saveTask(get().userId!, newTask), 'addTask');
        }
        
        // F-6: Schedule Notification
        if (newTask.startTime && newTask.dueTime) {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleTaskNotification(newTask.id, newTask.text, newTask.startTime!, newTask.date);
          });
        }

        return id;
      },

      updateTask: (id, updates) => {
        set((state) => {
          const newTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
          const updatedTask = newTasks.find(t => t.id === id);
          if (state.userId && updatedTask) {
            fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'updateTask');
          }

          // F-6: Refresh Notification
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

      toggleTask: (id) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          if (!task) return state;

          // Allow toggling: completed → pending, pending → completed
          // Missed tasks cannot be re-opened (they are past their end time)
          if (task.status === 'missed') return state;

          const nowCompleted = !task.completed;
          const updatedTask: Task = { ...task, completed: nowCompleted, status: nowCompleted ? 'completed' : 'pending' };
          // When undoing completion, remove the systemComment (auto-set by checkMissedTasks)
          if (!nowCompleted) delete updatedTask.systemComment;
          
          let newTasks: Task[] = state.tasks.map((t) =>
            t.id === id ? updatedTask : t
          );

          // F-3: Recurring Task Logic
          if (nowCompleted && task.repeat && task.repeat !== 'none') {
            const nextDate = new Date(task.date);
            if (task.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (task.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (task.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

            const nextDateStr = formatLocalDate(nextDate);
            
            // Check if next occurrence already exists to avoid duplicates
            const exists = state.tasks.some(t => t.text === task.text && t.date === nextDateStr);
            if (!exists) {
              const newTask: Task = {
                ...task,
                id: Crypto.randomUUID(),
                date: nextDateStr,
                completed: false,
                status: 'pending',
                createdAt: Date.now(),
              };
              delete newTask.systemComment;
              newTasks.push(newTask);
              if (state.userId) {
                fireSync(() => dbService.saveTask(state.userId!, newTask), 'recursiveTaskSync');
              }
            }
          }

          if (state.userId) {
            fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'toggleTask');
          }

          // F-6: Cancel notification if completed
          if (nowCompleted) {
            import('@/services/notificationService').then(({ notificationService }) => {
              notificationService.cancelTaskNotification(id);
            });
          }

          return { tasks: newTasks };
        });
      },

      removeTask: (id) => {
        set((state) => {
          const newTasks = state.tasks.filter((t) => t.id !== id);
          if (state.userId) {
            fireSync(() => dbService.deleteTask(state.userId!, id), 'removeTask');
          }

          // F-6: Cancel Notification
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.cancelTaskNotification(id);
          });

          return { tasks: newTasks };
        });
      },
      setTasks: (tasks) => set({ tasks }),

      updateSubtask: (taskId, subtaskId, updates) => set((state) => {
        const tasks = state.tasks.map(t => {
          if (t.id === taskId) {
            const subtasks = t.subtasks?.map(st => st.id === subtaskId ? { ...st, ...updates } : st);
            const updatedTask = { ...t, subtasks };
            if (state.userId) fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'updateSubtask');
            return updatedTask;
          }
          return t;
        });
        return { tasks };
      }),

      toggleSubtask: (taskId, subtaskId) => set((state) => {
        const tasks = state.tasks.map(t => {
          if (t.id === taskId) {
            const subtasks = t.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
            const updatedTask = { ...t, subtasks };
            if (state.userId) fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'toggleSubtask');
            return updatedTask;
          }
          return t;
        });
        return { tasks };
      }),

      addHabit: (habitData) => {
        const newHabit: Habit = {
          ...habitData,
          id: habitData.id || Crypto.randomUUID(),
          completedDays: [],
          bestStreak: 0,
          createdAt: Date.now(),
          pausedUntil: null // F-2
        };
        set((state) => ({ habits: [...state.habits, newHabit] }));
        if (get().userId) {
          fireSync(() => dbService.saveHabit(get().userId!, newHabit), 'addHabit');
          get().refreshHabitNotifications();
        }
      },
      removeHabit: (id) => set((state) => {
        const newHabits = state.habits.filter(h => h.id !== id);
        if (state.userId) {
          fireSync(() => dbService.deleteHabit(state.userId!, id), 'removeHabit');
        }
        return { habits: newHabits };
      }),
      toggleHabit: (id) => set((state) => {
        const newHabits = state.habits.map(h => {
          if (h.id === id) {
            const today = getTodayLocal();
            
            // F-2: Cannot toggle if paused
            if (h.pausedUntil && today <= h.pausedUntil) return h;

            const isCompleted = h.completedDays.includes(today);
            const newCompletedDays = isCompleted
              ? h.completedDays.filter(d => d !== today)
              : [...h.completedDays, today];

            let currentStreak = 0;
            const todayForStreak = new Date();
            const todayStrForStreak = formatLocalDate(todayForStreak);
            const startOffset = newCompletedDays.includes(todayStrForStreak) ? 0 : 1;
            for (let i = startOffset; i < 365; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dStr = formatLocalDate(d);

              // Respect targetDays for weekly habits — don't break streak on unscheduled days
              if (h.frequency === 'weekly' && !h.targetDays.includes(d.getDay())) continue;
              
              // F-2: Skip days the habit was paused — don't break the streak
              if (h.pausedUntil && dStr <= h.pausedUntil) continue;

              if (newCompletedDays.includes(dStr)) {
                currentStreak++;
              } else {
                break;
              }
            }

            const updatedHabit = {
              ...h,
              completedDays: newCompletedDays,
              bestStreak: Math.max(h.bestStreak || 0, currentStreak)
            };

            if (state.userId) {
              fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'toggleHabit');
            }

            return updatedHabit;
          }
          return h;
        });
        return { habits: newHabits };
      }),
      updateHabit: (id, updates) => set((state) => {
        const newHabits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
        const updatedHabit = newHabits.find(h => h.id === id);
        if (state.userId && updatedHabit) {
          fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'updateHabit');
          get().refreshHabitNotifications();
        }
        return { habits: newHabits };
      }),

      pauseHabit: (id, until) => set((state) => {
        const newHabits = state.habits.map(h => h.id === id ? { ...h, pausedUntil: until } : h);
        const updatedHabit = newHabits.find(h => h.id === id);
        if (state.userId && updatedHabit) {
          fireSync(() => dbService.saveHabit(state.userId!, updatedHabit), 'pauseHabit');
        }
        return { habits: newHabits };
      }),

      getStreak: (id) => {
        const habit = get().habits.find(h => h.id === id);
        if (!habit) return 0;

        // For habits with specific target days, only count scheduled days in the streak.
        // A streak breaks only if the habit was SCHEDULED for that day but not completed.
        const isScheduledDay = (date: Date): boolean => {
          if (habit.frequency !== 'weekly') return true; // daily/monthly: every day counts
          return habit.targetDays.includes(date.getDay());
        };

        let streak = 0;
        const today = new Date();
        const todayStr = formatLocalDate(today);
        const todayDone = habit.completedDays.includes(todayStr);
        const startOffset = todayDone ? 0 : 1;

        for (let i = startOffset; i < 365; i++) {
          const checkDate = new Date();
          checkDate.setDate(today.getDate() - i);

          // Skip days the habit isn't scheduled for — don't break the streak
          if (!isScheduledDay(checkDate)) continue;

          const dateStr = formatLocalDate(checkDate);
          
          // F-2: Skip days the habit was paused
          if (habit.pausedUntil && dateStr <= habit.pausedUntil) continue;

          if (habit.completedDays.includes(dateStr)) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      setFocusGoal: (hours) => set({ focusGoalHours: hours }),

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
              const updatedTask: Task = {
                ...task,
                status: 'missed' as const,
                systemComment: 'You missed this daily task! 😔'
              };
              if (state.userId) {
                fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'missedTaskSync');
              }
              // U-3: fire an immediate local notification so user knows a task was missed
              import('@/services/notificationService').then(({ notificationService }) => {
                notificationService.scheduleMissedTaskNotification(task.text).catch(() => {});
              });
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

      performDailyReset: () => set((state) => {
        const today = getTodayLocal();
        if (state.lastResetDate === today) return state;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday);

        // Only persist focus if the user actually ran a session — don't pollute
        // focusHistory with zero-second entries for days the app was idle.
        let newFocusHistory = state.focusHistory;
        if (state.focusSession.totalSecondsToday > 0) {
          newFocusHistory = { ...state.focusHistory, [yesterdayStr]: state.focusSession.totalSecondsToday };
          if (state.userId) {
            fireSync(() => dbService.saveFocusEntry(state.userId!, yesterdayStr, state.focusSession.totalSecondsToday), 'dailyResetFocusSync');
          }
        }

        // Prune tasks older than 30 days from both local state and Firestore.
        // Without this, old tasks accumulate indefinitely — the real-time listener
        // re-hydrates all Firestore tasks on every login, so local filtering alone
        // is insufficient.
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        const cutoffStr = formatLocalDate(cutoff);

        // Sync status changes and delete stale tasks in Firestore
        if (state.userId) {
          state.tasks.forEach(t => {
            if (t.date < today && t.status === 'pending') {
              fireSync(() => dbService.saveTask(state.userId!, { ...t, status: 'missed', systemComment: 'Daily reset: task missed.' }), 'taskResetSync');
            }
            // Delete tasks older than 30 days from Firestore
            if (t.date < cutoffStr) {
              fireSync(() => dbService.deleteTask(state.userId!, t.id), 'taskCleanup');
            }
          });
        }

        // Keep tasks from the last 30 days (includes future tasks)
        const newTasks = state.tasks.filter(t => t.date >= cutoffStr);

        return {
          lastResetDate: today,
          tasks: newTasks,
          focusSession: { ...state.focusSession, totalSecondsToday: 0, isActive: false, lastStartTime: null },
          focusHistory: newFocusHistory
        };
      }),

      toggleFocusSession: () => set((state) => {
        const now = Date.now();
        if (state.focusSession.isActive) {
          const elapsed = state.focusSession.lastStartTime ? (now - state.focusSession.lastStartTime) / 1000 : 0;
          const totalSeconds = Math.max(0, state.focusSession.totalSecondsToday + elapsed);
          
          if (state.userId) {
            fireSync(() => dbService.saveFocusEntry(state.userId!, getTodayLocal(), totalSeconds), 'stopFocusSync');
          }

          return {
            focusSession: {
              ...state.focusSession,
              isActive: false,
              totalSecondsToday: totalSeconds,
              lastStartTime: null
            }
          };
        } else {
          return {
            focusSession: {
              ...state.focusSession,
              isActive: true,
              lastStartTime: now
            }
          };
        }
      }),

      updateFocusTime: () => set((state) => {
        if (!state.focusSession.isActive || !state.focusSession.lastStartTime) return state;
        const now = Date.now();
        const rawElapsed = now - state.focusSession.lastStartTime;
        // Cap a single tick to 5 minutes — guards against app backgrounding adding
        // hours of phantom focus time when the user wasn't actually working.
        const MAX_TICK_MS = 5 * 60 * 1000;
        const elapsed = Math.min(rawElapsed, MAX_TICK_MS) / 1000;
        const totalSeconds = state.focusSession.totalSecondsToday + elapsed;

        return {
          focusSession: {
            ...state.focusSession,
            totalSecondsToday: totalSeconds,
            lastStartTime: now
          }
        };
      }),

      setMood: (mood, extras, date) => {
        const dateKey = date || getTodayLocal();

        // Strip undefined fields for Firestore compatibility
        const cleanEntry: any = { mood, timestamp: Date.now() };
        if (extras?.reason) cleanEntry.reason = extras.reason;
        if (extras?.activities) cleanEntry.activities = extras.activities;
        if (extras?.emotions) cleanEntry.emotions = extras.emotions;
        if (extras?.note) cleanEntry.note = extras.note;

        set((state) => {
          const newHistory = {
            ...state.moodHistory,
            [dateKey]: cleanEntry as MoodEntry
          };

          if (state.userId) {
            fireSync(() => dbService.saveMood(state.userId!, cleanEntry, dateKey), 'saveMood');
          }

          // M-5 FIX: Derive the current mood from moodHistory[today] instead of a
          // separate root field that can drift on multi-device or date-boundary scenarios.
          const today = getTodayLocal();
          
          // Refresh mood reminder content based on new mood
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleDailyMoodReminder();
          });

          return {
            mood: newHistory[today]?.mood ?? null,
            moodHistory: newHistory
          };
        });
      },

      setMoodTheme: (theme) => set((state) => {
        if (state.userId) fireSync(() => dbService.saveMoodTheme(state.userId!, theme), 'saveMoodTheme');
        return { moodTheme: theme };
      }),

      updateNotificationSettings: (updates) => {
        const current = get().notificationSettings;
        const next = { ...current, ...updates };
        set({ notificationSettings: next });

        // If push is disabled, cancel all
        if (updates.push === false) {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.cancelAllNotifications();
          });
        }

        // If specific categories are disabled, we might want to cancel them
        // But for tasks/habits, the service will check on next schedule.
        // For habits, we can force refresh
        // Force refresh mood reminder if setting changed
        if (updates.mood !== undefined || updates.push !== undefined) {
          import('@/services/notificationService').then(({ notificationService }) => {
            notificationService.scheduleDailyMoodReminder();
          });
        }

        // Save to cloud if needed (not implemented in dbService yet, but could be)
        if (get().userId) {
          fireSync(() => dbService.saveUserProfile(get().userId!, { notificationSettings: next }), 'updateNotificationSettings');
        }
      },

      updateProfile: async (updates) => {
        const { userId } = get();
        if (!userId) return;

        set((state) => ({ ...state, ...updates }));
        await dbService.saveUserProfile(userId, updates);
      },

      logout: () => {
        get()._syncUnsubscribes.forEach(unsub => unsub());
        // Clear ALL user-specific data to prevent profile leakage between accounts
        // on a shared device. themePreference is intentionally kept (device pref, not user data).
        set({
          isAuthenticated: false,
          userId: null,
          userName: null,
          tasks: [],
          habits: [],
          mood: null,
          moodHistory: {},
          focusSession: { totalSecondsToday: 0, isActive: false, lastStartTime: null },
          focusHistory: {},
          focusGoalHours: 8,
          lastResetDate: null,
          bio: null,
          location: null,
          occupation: null,
          avatarUrl: null,
          phoneNumber: null,
          birthday: null,
          pronouns: null,
          skills: null,
          socialLinks: {},
          moodTheme: null,
          accentColor: null,
          onboardingData: { struggles: [] },
          _syncUnsubscribes: [],
        });
      },

      hydrateFromCloud: async () => {
        const userId = authService.currentUser?.uid || get().userId;
        if (userId) {
          try {
            const { data } = await dbService.getUserProfile(userId);

            if (data) {
              // TRIGGER MIGRATION: Move old root-level data to sub-collections if found
              await dbService.migrateLegacyData(userId, data);

              set({
                userName: data.userName || null,
                hasCompletedOnboarding: data.hasCompletedOnboarding || get().hasCompletedOnboarding || (!!data.struggles && data.struggles.length > 0),
                onboardingData: {
                  struggles: data.struggles || []
                },
                moodTheme: data.moodTheme || get().moodTheme,
                focusGoalHours: data.focusGoalHours || 8,
                bio: data.bio || null,
                location: data.location || null,
                occupation: data.occupation || null,
                avatarUrl: data.avatarUrl || null,
                phoneNumber: data.phoneNumber || null,
                birthday: data.birthday || null,
                pronouns: data.pronouns || null,
                skills: data.skills || null,
                socialLinks: data.socialLinks || {},
                accentColor: data.accentColor || get().accentColor
              });
            }
          } catch (err: any) {
            console.error('Cloud hydration failed:', err);
          }
        }
      },

      subscribeToCloud: () => {
        const userId = get().userId;
        if (!userId) return;

        // Clean up existing listeners
        get()._syncUnsubscribes.forEach(unsub => {
          if (typeof unsub === 'function') unsub();
        });

        // 1. Root Profile Listener
        const unsubRoot = dbService.subscribeToUserData(userId, (data) => {
          if (!data) return;
          set({
            userName: data.userName || get().userName,
            moodTheme: data.moodTheme || get().moodTheme,
            focusGoalHours: data.focusGoalHours || get().focusGoalHours,
            bio: data.bio !== undefined ? data.bio : get().bio,
            location: data.location !== undefined ? data.location : get().location,
            occupation: data.occupation !== undefined ? data.occupation : get().occupation,
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : get().avatarUrl,
            phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : get().phoneNumber,
            birthday: data.birthday !== undefined ? data.birthday : get().birthday,
            pronouns: data.pronouns !== undefined ? data.pronouns : get().pronouns,
            skills: data.skills !== undefined ? data.skills : get().skills,
            socialLinks: data.socialLinks !== undefined ? data.socialLinks : get().socialLinks,
            accentColor: data.accentColor || get().accentColor
          });
        });

        // 2. Tasks Listener
        const unsubTasks = dbService.subscribeToCollection(userId, 'tasks', (docs) => {
          set({ tasks: migrateTasks(docs as Task[]) });
        });

        // 3. Habits Listener
        const unsubHabits = dbService.subscribeToCollection(userId, 'habits', (docs) => {
          set({ habits: docs as Habit[] });
        });

        // 4. Mood History Listener
        const unsubMood = dbService.subscribeToCollection(userId, 'moodHistory', (docs) => {
          const map: Record<string, MoodEntry> = {};
          docs.forEach(doc => { const { id, ...entry } = doc as any; map[id] = entry as MoodEntry; });
          // B-8 FIX: merge with local state instead of replacing — prevents an in-flight
          // optimistic setMood() from being wiped by a listener tick before Firestore confirms.
          const today = getTodayLocal();
          set(state => ({
            moodHistory: { ...state.moodHistory, ...map },
            mood: map[today]?.mood ?? state.mood
          }));
        });

        // 5. Focus History Listener
        const unsubFocus = dbService.subscribeToCollection(userId, 'focusHistory', (docs) => {
          const map: Record<string, number> = {};
          docs.forEach(doc => { map[doc.id] = (doc as any).totalSeconds || 0; });
          set({ focusHistory: map });
        });

        set({ _syncUnsubscribes: [unsubRoot, unsubTasks, unsubHabits, unsubMood, unsubFocus] });
      },

      refreshHabitNotifications: async () => {
        const { habits } = get();
        try {
          const { notificationService } = await import('@/services/notificationService');
          const hasPermission = await notificationService.requestPermissions();
          if (!hasPermission) return;

          // Process in sequence to avoid notification engine overload
          for (const habit of habits) {
            if (habit.reminderTime) {
              await notificationService.scheduleHabitReminder(
                habit.id,
                habit.title,
                habit.icon,
                habit.reminderTime,
                habit.frequency,
                habit.targetDays
              );
            } else {
              await notificationService.cancelHabitReminders(habit.id);
            }
          }
        } catch (err) {
          console.error('[LifeOS] Failed to refresh notifications:', err);
        }
      },

      setThemePreference: (theme) => set({ themePreference: theme }),
      setAccentColor: (color) => set((state) => {
        if (state.userId) fireSync(() => dbService.saveAccentColor(state.userId!, color), 'saveAccentColor');
        return { accentColor: color };
      }),
      setHasSeenWalkthrough: (seen) => set({ hasSeenWalkthrough: seen }),
    }),

    {
      name: 'lifeos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const { _syncUnsubscribes, _hasHydrated, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
