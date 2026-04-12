import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '@/services/dbService';
import { authService } from '@/services/authService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import * as Crypto from 'expo-crypto'; // FIX C-3: proper UUID generation

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
  mood: string | null;
  moodTheme: 'classic' | 'panda' | 'cat';
  lastResetDate: string | null;
  bio: string | null;
  location: string | null;
  occupation: string | null;
  avatarUrl: string | null;
  socialLinks: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  themePreference: 'light' | 'dark' | 'system';
  accentColor: string;

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
  setMoodTheme: (theme: 'classic' | 'panda' | 'cat') => void;
  updateProfile: (updates: Partial<{
    userName: string;
    bio: string;
    location: string;
    occupation: string;
    avatarUrl: string;
    socialLinks: UserState['socialLinks'];
  }>) => Promise<void>;
  logout: () => void;
  hydrateFromCloud: () => Promise<void>;

  // Cloud Sync
  subscribeToCloud: () => void;
  _syncUnsubscribe: (() => void) | null;

  setThemePreference: (theme: 'light' | 'dark' | 'system') => void;
  setAccentColor: (color: string) => void;

  // Utilities
  getStreak: (habitId: string) => number;
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
      moodTheme: 'classic',
      lastResetDate: null,
      bio: null,
      location: null,
      occupation: null,
      avatarUrl: null,
      socialLinks: {},
      themePreference: 'dark',
      accentColor: '#7C5CFF',
      _syncUnsubscribe: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      setAuth: (userId, userName) => {
        const currentUnsub = get()._syncUnsubscribe;
        if (currentUnsub) currentUnsub();

        set({ userId, userName, isAuthenticated: !!userId });

        if (userId) {
          get().subscribeToCloud();
        }
      },
      setOnboardingData: (data) => set((state) => ({
        onboardingData: { ...state.onboardingData, ...data }
      })),

      // FIX C-3: Use Crypto.randomUUID() instead of Math.random().substring(7)
      // FIX L-1: Removed false async keyword
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
          id: Crypto.randomUUID(), // FIX C-3
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
        set((state) => {
          const newTasks = [...state.tasks, newTask];
          if (state.userId) fireSync(() => dbService.syncTasks(state.userId!, newTasks), 'addTask'); // FIX H-6
          return { tasks: newTasks };
        });
      },

      updateTask: (id, updates) => set((state) => {
        const newTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        if (state.userId) fireSync(() => dbService.syncTasks(state.userId!, newTasks), 'updateTask'); // FIX H-6
        return { tasks: newTasks };
      }),

      // FIX L-1: Removed false async keyword
      toggleTask: (id) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          // Commitment Rule: toggling only completes, never un-completes.
          if (!task || task.completed) return state;

          const newTasks: Task[] = state.tasks.map((t) =>
            t.id === id ? { ...t, completed: true, status: 'completed' } : t
          );
          if (state.userId) fireSync(() => dbService.syncTasks(state.userId!, newTasks), 'toggleTask'); // FIX H-6
          return { tasks: newTasks };
        });
      },

      removeTask: (id) => {
        set((state) => {
          const newTasks = state.tasks.filter((t) => t.id !== id);
          if (state.userId) fireSync(() => dbService.syncTasks(state.userId!, newTasks), 'removeTask'); // FIX H-6
          return { tasks: newTasks };
        });
      },
      setTasks: (tasks) => set({ tasks }),

      // FIX C-3: Use Crypto.randomUUID() for habit ID
      addHabit: (habitData) => set((state) => {
        const newHabit: Habit = {
          ...habitData,
          id: habitData.id || Crypto.randomUUID(), // FIX C-3
          completedDays: [],
          bestStreak: 0,
          createdAt: Date.now()
        };
        const newHabits = [...state.habits, newHabit];
        if (state.userId) fireSync(() => dbService.syncHabits(state.userId!, newHabits), 'addHabit'); // FIX H-6
        return { habits: newHabits };
      }),
      removeHabit: (id) => set((state) => {
        const newHabits = state.habits.filter(h => h.id !== id);
        if (state.userId) fireSync(() => dbService.syncHabits(state.userId!, newHabits), 'removeHabit'); // FIX H-6
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

            // FIX H-3: Use formatLocalDate instead of toISOString() to avoid UTC off-by-one
            let currentStreak = 0;
            for (let i = 0; i < 365; i++) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              const dStr = formatLocalDate(d); // FIX H-3
              if (newCompletedDays.includes(dStr)) {
                currentStreak++;
              } else if (i > 0) {
                break;
              }
            }

            return {
              ...h,
              completedDays: newCompletedDays,
              bestStreak: Math.max(h.bestStreak || 0, currentStreak)
            };
          }
          return h;
        });
        if (state.userId) fireSync(() => dbService.syncHabits(state.userId!, newHabits), 'toggleHabit'); // FIX H-6
        return { habits: newHabits };
      }),
      updateHabit: (id, updates) => set((state) => {
        const newHabits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
        if (state.userId) fireSync(() => dbService.syncHabits(state.userId!, newHabits), 'updateHabit'); // FIX H-6
        return { habits: newHabits };
      }),

      // FIX H-3: Use formatLocalDate instead of toISOString() to avoid UTC off-by-one
      getStreak: (id) => {
        const habit = get().habits.find(h => h.id === id);
        if (!habit) return 0;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date();
          checkDate.setDate(today.getDate() - i);
          const dateStr = formatLocalDate(checkDate); // FIX H-3
          if (habit.completedDays.includes(dateStr)) {
            streak++;
          } else if (i > 0) {
            break;
          }
        }
        return streak;
      },

      setFocusGoal: (hours) => set({ focusGoalHours: hours }),

      // FIX H-4: Use task's own date to build endDateTime, not today's date
      checkMissedTasks: () => set((state) => {
        const now = new Date();
        let changed = false;
        const newTasks = state.tasks.map(task => {
          if (task.status === 'pending' && task.endTime) {
            const [time, modifier] = task.endTime.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            // FIX H-4: Build endDateTime from task.date not today
            const [taskYear, taskMonth, taskDay] = task.date.split('-').map(Number);
            const endDateTime = new Date(taskYear, taskMonth - 1, taskDay, hours, minutes, 0, 0);

            if (now > endDateTime) {
              changed = true;
              return {
                ...task,
                status: 'missed' as const,
                systemComment: 'You missed this daily task! 😔'
              };
            }
          }
          return task;
        });

        if (changed) {
          if (state.userId) fireSync(() => dbService.syncTasks(state.userId!, newTasks), 'checkMissedTasks'); // FIX H-6
          return { tasks: newTasks };
        }
        return state;
      }),

      // FIX C-4: Call this on app start via useEffect in _layout.tsx
      // FIX C-4: Use formatLocalDate (not toISOString) for UTC-safe archiving
      performDailyReset: () => set((state) => {
        const today = getTodayLocal();
        if (state.lastResetDate === today) return state;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday); // FIX C-4: was toISOString().split('T')[0]

        const newFocusHistory = {
          ...state.focusHistory,
          [yesterdayStr]: state.focusSession.totalSecondsToday
        };

        // FIX C-4: Keep future-dated tasks instead of wiping everything
        const newTasks = state.tasks.filter(t => t.date > today);

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
          return {
            focusSession: {
              ...state.focusSession,
              isActive: false,
              totalSecondsToday: Math.max(0, state.focusSession.totalSecondsToday + elapsed),
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
        return {
          focusSession: {
            ...state.focusSession,
            totalSecondsToday: state.focusSession.totalSecondsToday + elapsed,
            lastStartTime: now
          }
        };
      }),

      // FIX L-1: Removed false async keyword
      setMood: (mood, extras, date) => {
        const dateKey = date || getTodayLocal();
        const entry: MoodEntry = {
          mood,
          timestamp: Date.now(),
          reason: extras?.reason,
          activities: extras?.activities,
          emotions: extras?.emotions,
          note: extras?.note,
        };

        set((state) => {
          const newHistory = {
            ...state.moodHistory,
            [dateKey]: entry
          };

          if (state.userId) {
            fireSync(() => dbService.saveMood(state.userId!, entry, dateKey), 'saveMood'); // FIX H-6
          }

          return {
            mood: dateKey === getTodayLocal() ? mood.toString() : state.mood,
            moodHistory: newHistory
          };
        });
      },

      setMoodTheme: (theme) => set((state) => {
        if (state.userId) fireSync(() => dbService.saveMoodTheme(state.userId!, theme), 'saveMoodTheme'); // FIX H-6
        return { moodTheme: theme };
      }),

      updateProfile: async (updates) => {
        const { userId } = get();
        if (!userId) return;

        set((state) => ({ ...state, ...updates }));
        await dbService.saveUserProfile(userId, updates);
      },

      logout: () => {
        const unsub = get()._syncUnsubscribe;
        if (unsub) unsub();
        set({
          isAuthenticated: false, userId: null, userName: null,
          tasks: [], mood: null, habits: [], moodHistory: {},
          _syncUnsubscribe: null,
          focusSession: { totalSecondsToday: 0, isActive: false, lastStartTime: null }
        });
      },

      hydrateFromCloud: async () => {
        const userId = authService.currentUser?.uid || get().userId;
        if (userId) {
          try {
            const { data, error } = await dbService.getUserProfile(userId);
            if (error) throw new Error(error);

            if (data) {
              const migratedTasks = migrateTasks(data.tasks || []);
              set({
                tasks: migratedTasks,
                mood: data.currentMood || null,
                userName: data.userName || null,
                hasCompletedOnboarding: data.hasCompletedOnboarding || get().hasCompletedOnboarding || (!!data.struggles && data.struggles.length > 0),
                onboardingData: {
                  struggles: data.struggles || []
                },
                habits: data.habits || [],
                moodHistory: data.moodHistory ? migrateMoodHistory(data.moodHistory) : get().moodHistory,
                moodTheme: data.moodTheme || get().moodTheme,
                focusGoalHours: data.focusGoalHours || 8,
                bio: data.bio || null,
                location: data.location || null,
                occupation: data.occupation || null,
                avatarUrl: data.avatarUrl || null,
                socialLinks: data.socialLinks || {}
              });
            }
          } catch (err: any) {
            console.error('Cloud hydration failed:', err);
            if (err.message?.includes('permission-denied')) {
              await authService.logout();
              set({ isAuthenticated: false, userId: null });
            }
          }
        }
      },

      subscribeToCloud: () => {
        const userId = get().userId;
        if (!userId) return;

        // Clean up existing listener first to avoid duplicates
        const existing = get()._syncUnsubscribe;
        if (existing) existing();

        const unsub = dbService.subscribeToUserData(userId, (data) => {
          if (!data) return;

          const migratedTasks = migrateTasks(data.tasks || []);
          set({
            tasks: migratedTasks,
            mood: data.currentMood || get().mood,
            moodHistory: data.moodHistory ? migrateMoodHistory(data.moodHistory) : get().moodHistory,
            moodTheme: data.moodTheme || get().moodTheme,
            habits: data.habits || get().habits,
            focusGoalHours: data.focusGoalHours || get().focusGoalHours,
            bio: data.bio !== undefined ? data.bio : get().bio,
            location: data.location !== undefined ? data.location : get().location,
            occupation: data.occupation !== undefined ? data.occupation : get().occupation,
            avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : get().avatarUrl,
            socialLinks: data.socialLinks !== undefined ? data.socialLinks : get().socialLinks
          });
        });

        set({ _syncUnsubscribe: unsub });
      },

      setThemePreference: (theme) => set({ themePreference: theme }),
      setAccentColor: (color) => set({ accentColor: color }),
    }),

    {
      name: 'lifeos-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
