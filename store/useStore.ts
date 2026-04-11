import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '@/services/dbService';
import { authService } from '@/services/authService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';

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
  addHabit: (habit: Omit<Habit, 'completedDays' | 'bestStreak' | 'createdAt'> & { id?: string }) => void;
  removeHabit: (id: string) => void;
  toggleHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  
  // Focus Actions
  setFocusGoal: (hours: number) => void;
  toggleFocusSession: () => void;
  updateFocusTime: () => void;
  
  setMood: (mood: number, extras?: { activities?: string[]; emotions?: string[]; note?: string; reason?: string }, date?: string) => void;
  setMoodTheme: (theme: 'classic' | 'panda' | 'cat') => void;
  logout: () => void;
  hydrateFromCloud: () => Promise<void>;
  
  // Cloud Sync
  subscribeToCloud: () => void;
  _syncUnsubscribe: (() => void) | null;
  
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

      addTask: async (text, startTime, endTime, priority = 'medium', date = getTodayLocal()) => {
        let dueTime: number | undefined;
        
        if (startTime) {
          // Parse "09:00 AM" into today's timestamp
          const [time, modifier] = startTime.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (modifier === 'PM' && hours < 12) hours += 12;
          if (modifier === 'AM' && hours === 12) hours = 0;
          
          // Parse "YYYY-MM-DD" into local date components
          const [year, month, day] = date.split('-').map(Number);
          const targetDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
          dueTime = targetDate.getTime();
        }

        const newTask: Task = { 
          id: Math.random().toString(36).substring(7), 
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
          if (state.userId) dbService.syncTasks(state.userId, newTasks);
          return { tasks: newTasks };
        });
      },

      updateTask: (id, updates) => set((state) => {
        const newTasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        if (state.userId) dbService.syncTasks(state.userId, newTasks);
        return { tasks: newTasks };
      }),

      toggleTask: async (id) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          // Commitment Rule: On main dashboard, toggling only completes.
          if (!task || task.completed) return state;

          const newTasks: Task[] = state.tasks.map((t) => 
            t.id === id ? { 
              ...t, 
              completed: true, 
              status: 'completed'
            } : t
          );
          if (state.userId) dbService.syncTasks(state.userId, newTasks);
          return { tasks: newTasks };
        });
      },

      removeTask: (id) => {
        set((state) => {
          const newTasks = state.tasks.filter((t) => t.id !== id);
          if (state.userId) dbService.syncTasks(state.userId, newTasks);
          return { tasks: newTasks };
        });
      },
      setTasks: (tasks) => set({ tasks }),

      addHabit: (habitData) => set((state) => {
        const newHabit: Habit = { 
          ...habitData, 
          id: habitData.id || Math.random().toString(36).substring(7), 
          completedDays: [],
          bestStreak: 0,
          createdAt: Date.now()
        };
        const newHabits = [...state.habits, newHabit];
        if (state.userId) dbService.syncHabits(state.userId, newHabits);
        return { habits: newHabits };
      }),
      removeHabit: (id) => set((state) => {
        const newHabits = state.habits.filter(h => h.id !== id);
        if (state.userId) dbService.syncHabits(state.userId, newHabits);
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
            
            // Calculate streak to update bestStreak
            let currentStreak = 0;
            const checkDate = new Date();
            // Start from today or yesterday depending on completion
            for (let i = 0; i < 365; i++) {
              const d = new Date();
              d.setDate(checkDate.getDate() - i);
              const dStr = d.toISOString().split('T')[0];
              if (newCompletedDays.includes(dStr)) {
                currentStreak++;
              } else if (i > 0 || (i === 0 && !newCompletedDays.includes(dStr))) {
                // If we check today and it's not done, and we check yesterday and it's not done -> break
                // But specifically for bestStreak, we want the most recent contiguous streak including today if done.
                if (i > 0) break; 
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
        if (state.userId) dbService.syncHabits(state.userId, newHabits);
        return { habits: newHabits };
      }),
      updateHabit: (id, updates) => set((state) => {
        const newHabits = state.habits.map(h => h.id === id ? { ...h, ...updates } : h);
        if (state.userId) dbService.syncHabits(state.userId, newHabits);
        return { habits: newHabits };
      }),
      getStreak: (id) => {
        const habit = get().habits.find(h => h.id === id);
        if (!habit) return 0;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date();
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          if (habit.completedDays.includes(dateStr)) {
            streak++;
          } else if (i > 0) { // If missing a day (other than potentially today), streak breaks
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
            // Parse "06:00 PM" to Date
            const [time, modifier] = task.endTime.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            
            const endDateTime = new Date();
            endDateTime.setHours(hours, minutes, 0, 0);

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
          if (state.userId) dbService.syncTasks(state.userId, newTasks);
          return { tasks: newTasks };
        }
        return state;
      }),

      performDailyReset: () => set((state) => {
        const today = getTodayLocal();
        if (state.lastResetDate === today) return state;

        // Archive yesterday's focus to history
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const newFocusHistory = { 
          ...state.focusHistory, 
          [yesterdayStr]: state.focusSession.totalSecondsToday 
        };

        // Reset tasks list (keep as empty for now, or move to history in DB)
        // In a real app we'd archive these tasks to a "history" collection
        
        return {
          lastResetDate: today,
          tasks: [] as Task[],
          focusSession: { ...state.focusSession, totalSecondsToday: 0 },
          focusHistory: newFocusHistory
        };
      }),

      toggleFocusSession: () => set((state) => {
        const now = Date.now();
        if (state.focusSession.isActive) {
          // Stopping: Calculate final elapsed from last sync
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
          // Starting: Record start time
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
        // Reset check: if it's a new day, reset totalSecondsToday (simplistic for now)
        // In a real app we'd compare dates of lastStartTime and now
        return {
          focusSession: {
            ...state.focusSession,
            totalSecondsToday: state.focusSession.totalSecondsToday + elapsed,
            lastStartTime: now
          }
        };
      }),

      setMood: async (mood, extras, date) => {
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
            dbService.saveMood(state.userId, entry, dateKey);
          }
          
          return { 
            mood: dateKey === getTodayLocal() ? mood.toString() : state.mood,
            moodHistory: newHistory
          };
        });
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
      setMoodTheme: (theme) => set((state) => {
        if (state.userId) dbService.saveMoodTheme(state.userId, theme);
        return { moodTheme: theme };
      }),
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
                userName: data.userName || (data.isGuest ? 'Guest' : null),
                hasCompletedOnboarding: data.hasCompletedOnboarding || get().hasCompletedOnboarding || (!!data.struggles && data.struggles.length > 0),
                onboardingData: {
                  struggles: data.struggles || []
                },
                habits: data.habits || [],
                moodHistory: data.moodHistory ? migrateMoodHistory(data.moodHistory) : get().moodHistory,
                moodTheme: data.moodTheme || get().moodTheme,
                focusGoalHours: data.focusGoalHours || 8
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

        // Clean up existing listener if any
        if (get()._syncUnsubscribe) {
          get()._syncUnsubscribe?.();
        }

        const unsub = dbService.subscribeToUserData(userId, (data) => {
          if (!data) return;
          
          // Only update if we are not in an active session to avoid overwriting non-synced focus time
          // unless focus time is explicitly different on server
          const migratedTasks = migrateTasks(data.tasks || []);
          set({
            tasks: migratedTasks,
            mood: data.currentMood || get().mood,
            moodHistory: data.moodHistory ? migrateMoodHistory(data.moodHistory) : get().moodHistory,
            moodTheme: data.moodTheme || get().moodTheme,
            habits: data.habits || get().habits,
            focusGoalHours: data.focusGoalHours || get().focusGoalHours
          });
        });

        set({ _syncUnsubscribe: unsub });
      },
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
