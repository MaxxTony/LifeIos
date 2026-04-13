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

  // Actions
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  setAuth: (userId: string | null, userName: string | null) => void;
  setOnboardingData: (data: Partial<UserState['onboardingData']>) => void;
  addTask: (text: string, startTime?: string, endTime?: string, priority?: Task['priority'], date?: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  checkMissedTasks: () => void;
  performDailyReset: () => void;

  // Habit Actions
  addHabit: (habit: Omit<Habit, 'completedDays' | 'bestStreak' | 'createdAt' | 'id'> & { id?: string }) => void;
  removeHabit: (id: string) => void;
  toggleHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;

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

  // Utilities
  getStreak: (habitId: string) => number;
  refreshHabitNotifications: () => Promise<void>;
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
      _syncUnsubscribes: [],

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
          const [time, modifier] = startTime.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (modifier === 'PM' && hours < 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;

          const [year, month, day] = date.split('-').map(Number);
          const targetDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
          dueTime = targetDate.getTime();
        }

        const newTask: Task = {
          id: Crypto.randomUUID(),
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
      },

      updateTask: (id, updates) => {
        set((state) => {
          const newTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
          const updatedTask = newTasks.find(t => t.id === id);
          if (state.userId && updatedTask) {
            fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'updateTask');
          }
          return { tasks: newTasks };
        });
      },

      toggleTask: (id) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          if (!task || task.completed) return state;

          const updatedTask: Task = { ...task, completed: true, status: 'completed' };
          const newTasks: Task[] = state.tasks.map((t) =>
            t.id === id ? updatedTask : t
          );
          
          if (state.userId) {
            fireSync(() => dbService.saveTask(state.userId!, updatedTask), 'toggleTask');
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
          return { tasks: newTasks };
        });
      },
      setTasks: (tasks) => set({ tasks }),

      addHabit: (habitData) => {
        const newHabit: Habit = {
          ...habitData,
          id: habitData.id || Crypto.randomUUID(),
          completedDays: [],
          bestStreak: 0,
          createdAt: Date.now()
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

      getStreak: (id) => {
        const habit = get().habits.find(h => h.id === id);
        if (!habit) return 0;
        let streak = 0;
        const today = new Date();
        const todayStr = formatLocalDate(today);
        const todayDone = habit.completedDays.includes(todayStr);

        for (let i = todayDone ? 0 : 1; i < 365; i++) {
          const checkDate = new Date();
          checkDate.setDate(today.getDate() - i);
          const dateStr = formatLocalDate(checkDate);
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
            const [time, modifier] = task.endTime.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
            const endDateTime = new Date(taskYear, taskMonth - 1, taskDay, hours, minutes, 0, 0);

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

        const newFocusHistory = {
          ...state.focusHistory,
          [yesterdayStr]: state.focusSession.totalSecondsToday
        };

        if (state.userId) {
          fireSync(() => dbService.saveFocusEntry(state.userId!, yesterdayStr, state.focusSession.totalSecondsToday), 'dailyResetFocusSync');
        }

        const newTasks = state.tasks.filter(t => t.date >= today);
        
        // Sync status changes for tasks that were removed/missed
        if (state.userId) {
          state.tasks.forEach(t => {
            if (t.date < today && t.status === 'pending') {
               fireSync(() => dbService.saveTask(state.userId!, { ...t, status: 'missed', systemComment: 'Daily reset: task missed.' }), 'taskResetSync');
            }
          });
        }

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
        const elapsed = (now - state.focusSession.lastStartTime) / 1000;
        const totalSeconds = state.focusSession.totalSecondsToday + elapsed;
        
        // Frequent updates to Firestore for the timer are avoided; 
        // Sync happens on stop or app background (see hooks/useFocusTimer.ts)
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

          return {
            mood: dateKey === getTodayLocal() ? mood : state.mood,
            moodHistory: newHistory
          };
        });
      },

      setMoodTheme: (theme) => set((state) => {
        if (state.userId) fireSync(() => dbService.saveMoodTheme(state.userId!, theme), 'saveMoodTheme');
        return { moodTheme: theme };
      }),

      updateProfile: async (updates) => {
        const { userId } = get();
        if (!userId) return;

        set((state) => ({ ...state, ...updates }));
        await dbService.saveUserProfile(userId, updates);
      },

      logout: () => {
        get()._syncUnsubscribes.forEach(unsub => unsub());
        set({
          isAuthenticated: false, userId: null, userName: null,
          tasks: [], mood: null, habits: [], moodHistory: {},
          _syncUnsubscribes: [],
          focusSession: { totalSecondsToday: 0, isActive: false, lastStartTime: null }
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
                mood: data.currentMood || null,
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
            mood: data.currentMood || get().mood,
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
          docs.forEach(doc => { map[doc.id] = doc as any; });
          set({ moodHistory: map });
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
