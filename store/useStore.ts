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
  isPomodoro: boolean; // A-8
  pomodoroMode: 'work' | 'break'; // A-8
  pomodoroWorkDuration: number; // in seconds
  pomodoroBreakDuration: number; // in seconds
  pomodoroTimeLeft: number; // in seconds
}

interface MoodEntry {
  mood: number; // 1-5 scale: 1=Awful, 2=Meh, 3=Okay, 4=Good, 5=Amazing
  timestamp: number;
  reason?: string; // Legacy support
  activities?: string[];
  emotions?: string[];
  note?: string;
}

interface Quest {
  id: string;
  type: 'task' | 'habit' | 'focus' | 'mood';
  title: string;
  rewardXP: number;
  targetCount: number;
  currentCount: number;
  completed: boolean;
}

const QUEST_TEMPLATES: Omit<Quest, 'id' | 'currentCount' | 'completed'>[] = [
  { type: 'task', title: 'Complete 3 Tasks', targetCount: 3, rewardXP: 50 },
  { type: 'task', title: 'Complete 5 Tasks', targetCount: 5, rewardXP: 100 },
  { type: 'focus', title: 'Deep Work: 1 Hour Focus', targetCount: 3600, rewardXP: 100 },
  { type: 'focus', title: 'Zen Moment: 10 Min Break', targetCount: 600, rewardXP: 30 },
  { type: 'habit', title: 'Consistency: 2 Habits Done', targetCount: 2, rewardXP: 60 },
  { type: 'habit', title: 'Daily Master: 4 Habits Done', targetCount: 4, rewardXP: 100 },
  { type: 'mood', title: 'Emotional Insight: Log Mood', targetCount: 1, rewardXP: 40 },
  { type: 'mood', title: 'Daily Reflection: Log with Note', targetCount: 1, rewardXP: 60 },
];

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
    tasks: boolean;
    habits: boolean;
    mood: boolean;
    proactive: boolean; // A-10
  };

  recentXP: { amount: number; timestamp: number } | null;
  streakMilestone: { habitTitle: string; streak: number; timestamp: number } | null;
  lastMoodLog: { mood: number; timestamp: number } | null;
  
  // Phase 2 State
  lifeScoreHistory: Record<string, number>; // Date -> Score
  lastActiveTimestamp: number;
  dailyQuests: Quest[];
  completedQuests: string[]; // Quest IDs
  proactivePrompt: { message: string; trigger: string; timestamp: number } | null;

  dismissXP: () => void;
  dismissMilestone: () => void;
  dismissMoodLog: () => void;

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
  togglePomodoro: () => void; // A-8
  
  // Phase 2 Actions
  updateLifeScoreHistory: () => void;
  generateDailyQuests: () => void;
  completeQuest: (questId: string) => void;
  checkQuestProgress: (type: Quest['type'], count?: number) => void;
  triggerProactivePrompt: (trigger: string, message: string) => void;
  dismissProactive: () => void;
  setLastActive: () => void;

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
        isPomodoro: false,
        pomodoroMode: 'work',
        pomodoroWorkDuration: 25 * 60,
        pomodoroBreakDuration: 5 * 60,
        pomodoroTimeLeft: 25 * 60,
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
        tasks: true,
        habits: true,
        mood: true,
        proactive: true,
      },
      recentXP: null,
      streakMilestone: null,
      lastMoodLog: null,
      lifeScoreHistory: {},
      lastActiveTimestamp: Date.now(),
      dailyQuests: [],
      completedQuests: [],
      proactivePrompt: null,

      _syncUnsubscribes: [],
      hasSeenWalkthrough: false,
      dismissXP: () => set({ recentXP: null }),
      dismissMilestone: () => set({ streakMilestone: null }),
      dismissMoodLog: () => set({ lastMoodLog: null }),
      dismissProactive: () => set({ proactivePrompt: null }),

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

          // Phase 2: Quests & Scoring
          setTimeout(() => {
            const { checkQuestProgress, updateLifeScoreHistory } = get();
            checkQuestProgress('task');
            updateLifeScoreHistory();
          }, 0);

          // F-6: Cancel notification if completed
          if (nowCompleted) {
            import('@/services/notificationService').then(({ notificationService }) => {
              notificationService.cancelTaskNotification(id);
            });
            // A-3: Visible XP (Tasks give 10 XP but let's make them 15 as per user request example)
            set({ recentXP: { amount: 15, timestamp: Date.now() } });
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

        // Phase 2: Quests & Scoring
        setTimeout(() => {
          const { checkQuestProgress, updateLifeScoreHistory } = get();
          checkQuestProgress('habit');
          updateLifeScoreHistory();
        }, 0);

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

            // A-1 & A-3: Rewards
            let streakMilestone = null;
            if (!isCompleted) {
              const milestones = [7, 14, 30, 50, 100];
              if (milestones.includes(currentStreak)) {
                streakMilestone = { habitTitle: h.title, streak: currentStreak, timestamp: Date.now() };
              }
              set({ recentXP: { amount: 10, timestamp: Date.now() } });
            }

              // Trigger celebration
              if (streakMilestone) {
                setTimeout(() => {
                  import('react-native-toast-message').then(Toast => {
                    Toast.default.show({
                      type: 'success',
                      text1: 'Milestone Reached! 🔥',
                      text2: `You hit a ${streakMilestone.streak}-day streak for ${h.title}!`
                    });
                  });
                  
                  // Proactive AI Milestone
                  get().triggerProactivePrompt(
                    'milestone', 
                    `Incredible consistency! You just hit a ${streakMilestone.streak}-day streak for ${h.title}. How does it feel to be this focused?`
                  );
                }, 500);
              }

            // Phase 2: Quests & Scoring
            setTimeout(() => {
              const { checkQuestProgress, updateLifeScoreHistory } = get();
              checkQuestProgress('habit');
              updateLifeScoreHistory();
            }, 0);

            return {
              ...updatedHabit,
              streakMilestone
            };
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

              // Phase 2: Proactive AI Missed Task
              setTimeout(() => {
                get().triggerProactivePrompt(
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
        // Cap a single tick to 5 minutes
        const MAX_TICK_MS = 5 * 60 * 1000;
        const elapsed = Math.min(rawElapsed, MAX_TICK_MS) / 1000;
        const totalSeconds = state.focusSession.totalSecondsToday + elapsed;

        // A-8: Pomodoro Logic
        let newMode = state.focusSession.pomodoroMode;
        let newTimeLeft = state.focusSession.pomodoroTimeLeft - elapsed;
        let newIsActive = state.focusSession.isActive;

        if (state.focusSession.isPomodoro) {
          if (newTimeLeft <= 0) {
            // Signal transition
            import('expo-haptics').then(Haptics => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
            import('@/services/notificationService').then(({ notificationService }) => {
              notificationService.scheduleMissedTaskNotification(
                newMode === 'work' ? "Work session complete! Time for a break. ☕" : "Break over! Ready to focus? 🔥"
              );
            });

            if (newMode === 'work') {
              newMode = 'break';
              newTimeLeft = state.focusSession.pomodoroBreakDuration;
            } else {
              newMode = 'work';
              newTimeLeft = state.focusSession.pomodoroWorkDuration;
            }
          }
        }

        // Phase 2: Quests & Scoring
        setTimeout(() => {
          const { checkQuestProgress, updateLifeScoreHistory } = get();
          checkQuestProgress('focus', totalSeconds);
          updateLifeScoreHistory();
        }, 0);

        return {
          focusSession: {
            ...state.focusSession,
            totalSecondsToday: totalSeconds,
            lastStartTime: now,
            pomodoroMode: newMode,
            pomodoroTimeLeft: newTimeLeft,
            isActive: newIsActive
          }
        };
      }),

      togglePomodoro: () => set((state) => ({
        focusSession: {
          ...state.focusSession,
          isPomodoro: !state.focusSession.isPomodoro,
          pomodoroMode: 'work',
          pomodoroTimeLeft: state.focusSession.pomodoroWorkDuration
        }
      })),

      updateLifeScoreHistory: () => set((state) => {
        const today = getTodayLocal();
        
        // Calculate current Life Score (Logic from progress.tsx)
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

        // Save to Firestore if score changed or is new
        if (state.userId && state.lifeScoreHistory[today] !== lifeScore) {
          fireSync(() => dbService.saveCollectionDoc(state.userId!, 'lifeScoreHistory', today, { score: lifeScore }), 'saveLifeScore');
        }

        return { lifeScoreHistory: newHistory };
      }),

      generateDailyQuests: () => {
        const { lastResetDate, dailyQuests } = get();
        const today = getTodayLocal();
        
        if (lastResetDate === today && dailyQuests.length > 0) return;

        // Pick 3 random quests
        const shuffled = [...QUEST_TEMPLATES].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3).map((q, idx) => ({
          ...q,
          id: `quest-${today}-${idx}`,
          currentCount: 0,
          completed: false
        }));

        set({ dailyQuests: selected, lastResetDate: today });
      },

      completeQuest: (questId) => set((state) => {
        const quest = state.dailyQuests.find(q => q.id === questId);
        if (!quest || quest.completed) return state;

        const newQuests = state.dailyQuests.map(q => 
          q.id === questId ? { ...q, completed: true, currentCount: q.targetCount } : q
        );

        // Reward XP
        const now = Date.now();
        const newXP = { amount: quest.rewardXP, timestamp: now };
        
        // Trigger celebration
        setTimeout(() => {
          import('react-native-toast-message').then(Toast => {
            Toast.default.show({
              type: 'success',
              text1: 'Quest Completed! 🏆',
              text2: `${quest.title} (+${quest.rewardXP} XP)`
            });
          });
        }, 500);

        return { 
          dailyQuests: newQuests, 
          completedQuests: [...state.completedQuests, questId],
          recentXP: newXP
        };
      }),

      checkQuestProgress: (type, count) => set((state) => {
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
              // We'll call completeQuest separately or trigger here
              setTimeout(() => get().completeQuest(q.id), 0);
            }
            return { ...q, currentCount: Math.min(newCount, q.targetCount) };
          }
          return q;
        });

        if (changed) return { dailyQuests: newQuests };
        return state;
      }),

      triggerProactivePrompt: (trigger, message) => {
        const { notificationSettings } = get();
        if (!notificationSettings.proactive) return;

        set({ proactivePrompt: { message, trigger, timestamp: Date.now() } });
        
        // Push notification
        import('@/services/notificationService').then(({ notificationService }) => {
          notificationService.scheduleMissedTaskNotification(message); // Re-using for simplicity
        });
      },

      setLastActive: () => set({ lastActiveTimestamp: Date.now() }),

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

          // Phase 2: Quests & Scoring
          setTimeout(() => {
            const { checkQuestProgress, updateLifeScoreHistory, triggerProactivePrompt } = get();
            checkQuestProgress('mood');
            updateLifeScoreHistory();

            // Low Mood Proactive Trigger
            if (mood <= 2) {
              triggerProactivePrompt(
                'low_mood',
                "I'm sorry to hear you're having a rough time today. 🌿 I'm here if you want to talk it out or just need a moment of zen."
              );
            }
          }, 0);

          return {
            mood: newHistory[today]?.mood ?? null,
            moodHistory: newHistory,
            lastMoodLog: { mood, timestamp: Date.now() }
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
          focusSession: { 
            totalSecondsToday: 0, 
            isActive: false, 
            lastStartTime: null,
            isPomodoro: false,
            pomodoroMode: 'work',
            pomodoroWorkDuration: 25 * 60,
            pomodoroBreakDuration: 5 * 60,
            pomodoroTimeLeft: 25 * 60
          },
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
