export interface Task {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  date: string; // ISO date (YYYY-MM-DD)
  completed: boolean;
  createdAt: number;
  dueTime?: number | null;
  startTime?: string | null; // e.g. "06:00 PM"
  endTime?: string | null;   // e.g. "07:00 PM"
  status: 'pending' | 'completed' | 'missed';
  systemComment?: string | null;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly';
  subtasks?: { id: string; text: string; completed: boolean }[];
  /** Set to true the first time XP is awarded for completing this task. Prevents duplicate XP on re-toggle. */
  xpAwarded?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  category: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays: number[]; // [0, 1, 2, 3, 4, 5, 6] for Sun-Sat
  monthlyTarget?: number; // target completions per month if frequency === 'monthly'
  monthlyDay?: number;    // specific day-of-month (1-31) for monthly habits (e.g. 7 = every 7th)
  reminderTime: string | null;
  goalDays: number;
  completedDays: string[]; // ISO Dates (e.g. "2024-04-10")
  createdAt: number;
  bestStreak: number;
  currentStreak: number;
  pausedUntil: string | null; // ISO date string
  /** Tracks which dates XP was already awarded to prevent duplicate XP on re-toggle. Max 90 entries. */
  xpAwardedDays?: string[];
}

export interface FocusSession {
  totalSecondsToday: number;
  isActive: boolean;
  lastStartTime: number | null;
  isPomodoro: boolean;
  pomodoroMode: 'work' | 'break';
  pomodoroWorkDuration: number; // in seconds
  pomodoroBreakDuration: number; // in seconds
  pomodoroTimeLeft: number; // in seconds
  sessionStartSeconds: number; // Total seconds today at the moment the current session started
  pomodoroOverflow: number; // C-02 FIX: carry capped tick overflow to next tick
}

export interface MoodEntry {
  mood: number; // 1-5 scale
  timestamp: number;
  reason?: string | null;
  activities?: string[] | null;
  emotions?: string[] | null;
  note?: string | null;
}

export interface Quest {
  id: string;
  type: 'task' | 'habit' | 'focus' | 'mood';
  title: string;
  rewardXP: number;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  date: string; // ISO date (YYYY-MM-DD)
}

export interface SyncStatus {
  tasksLoaded: boolean;
  habitsLoaded: boolean;
  moodLoaded: boolean;
  focusLoaded: boolean;
  isOffline: boolean;
  lastCloudSync: number | null;
}

export interface UserState {
  _hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  userName: string | null;
  email: string | null;
  createdAt: number | null;
  onboardingData: {
    struggles: string[];
  };
  tasks: Task[];
  habits: Habit[];
  focusSession: FocusSession;
  focusGoalHours: number;
  focusHistory: Record<string, number>;
  moodHistory: Record<string, MoodEntry>;
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
  homeTimezone: string | null;
  notificationSettings: {
    push: boolean;
    tasks: boolean;
    habits: boolean;
    mood: boolean;
    proactive: boolean;
  };
  recentXP: { amount: number; timestamp: number } | null;
  // C-06 FIX: Queue so multiple simultaneous streak milestones all display.
  streakMilestones: { habitTitle: string; streak: number; timestamp: number }[];
  lastMoodLog: { mood: number; timestamp: number } | null;
  lifeScoreHistory: Record<string, number>;
  lastActiveTimestamp: number;
  totalXP: number;
  level: number;
  weeklyXP: number;
  globalStreak: number;
  lastActiveDate: string | null;
  lastWeekResetDate: string | null;
  lastLoginBonusDate: string | null;
  streakFreezes: number;
  globalConfetti: boolean;
  dailyQuests: Quest[];
  completedQuests: string[];
  proactivePrompt: { message: string; trigger: string; timestamp: number } | null;
  syncError: { label: string; message: string; timestamp: number } | null;
  _lastRetryAt: number;
  hasSeenWalkthrough: boolean;
  _syncUnsubscribes: (() => void)[];
  _subscriptionGen: number;
  sessionToken: string | null;
  syncStatus: SyncStatus;
  pendingActions: {
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: 'tasks' | 'habits' | 'moodHistory' | 'focusHistory' | 'profile';
    payload: any;
    timestamp: number;
  }[];

  // Actions grouped by slices
  actions: UserActions;
}

export interface UserActions {
  // Auth/Profile
  setHasHydrated: (state: boolean) => void;
  completeOnboarding: () => void;
  setAuth: (userId: string | null, userName: string | null, sessionToken?: string | null) => Promise<void>;
  setOnboardingData: (data: Partial<UserState['onboardingData']>) => void;
  updateProfile: (updates: Partial<{
    userName: string; bio: string; location: string; occupation: string;
    avatarUrl: string | null; phoneNumber: string; birthday: string;
    pronouns: string; skills: string; socialLinks: UserState['socialLinks'];
  }>) => Promise<void>;
  logout: () => void;
  setHasSeenWalkthrough: (seen: boolean) => void;
  setThemePreference: (theme: UserState['themePreference']) => void;
  setAccentColor: (color: string) => void;
  triggerGlobalConfetti: () => void;
  updateNotificationSettings: (updates: Partial<UserState['notificationSettings']>) => void;
  buyStreakFreeze: () => Promise<void>;

  // Tasks
  addTask: (text: string, startTime?: string, endTime?: string, priority?: Task['priority'], date?: string) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<{ text: string, completed: boolean }>) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  checkMissedTasks: () => void;

  // Habits
  addHabit: (habit: Omit<Habit, 'completedDays' | 'bestStreak' | 'currentStreak' | 'createdAt' | 'id' | 'pausedUntil'> & { id?: string }) => void;
  removeHabit: (id: string) => void;
  toggleHabit: (id: string, dateStr?: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  pauseHabit: (id: string, until: string | null) => void;
  getStreak: (habitId: string) => number;
  refreshHabitNotifications: () => Promise<void>;

  // Focus
  setFocusGoal: (hours: number) => void;
  toggleFocusSession: () => void;
  updateFocusTime: () => void;
  togglePomodoro: () => void;

  // Mood
  setMood: (mood: number, extras?: { activities?: string[]; emotions?: string[]; note?: string; reason?: string }, date?: string) => void;
  setMoodTheme: (theme: UserState['moodTheme']) => void;

  // Gamification / Global
  performDailyReset: () => void;
  updateLifeScoreHistory: () => void;
  generateDailyQuests: () => void;
  completeQuest: (questId: string) => void;
  checkQuestProgress: (type: Quest['type'], count?: number) => void;
  addXP: (amount: number) => void;
  triggerProactivePrompt: (trigger: string, message: string) => void;
  dismissXP: () => void;
  dismissMilestone: () => void;
  dismissMoodLog: () => void;
  dismissProactive: () => void;
  setLastActive: () => void;

  // Sync
  subscribeToCloud: () => void;
  clearSyncError: () => void;
  retrySync: () => Promise<void>;
  hydrateFromCloud: () => Promise<void>;
}

// Per-slice action type aliases used by StateCreator return types
export type AuthActions = Pick<UserActions,
  'setHasHydrated' | 'completeOnboarding' | 'setAuth' | 'setOnboardingData' |
  'updateProfile' | 'logout' | 'setHasSeenWalkthrough' | 'setThemePreference' |
  'setAccentColor' | 'updateNotificationSettings' | 'subscribeToCloud' |
  'clearSyncError' | 'retrySync' | 'hydrateFromCloud' | 'triggerGlobalConfetti' | 'buyStreakFreeze'
>;

export type TaskActions = Pick<UserActions,
  'addTask' | 'updateTask' | 'toggleTask' | 'removeTask' | 'setTasks' |
  'updateSubtask' | 'toggleSubtask' | 'checkMissedTasks'
>;

export type HabitActions = Pick<UserActions,
  'addHabit' | 'removeHabit' | 'toggleHabit' | 'updateHabit' | 'pauseHabit' |
  'getStreak' | 'refreshHabitNotifications'
>;

export type FocusActions = Pick<UserActions,
  'setFocusGoal' | 'toggleFocusSession' | 'updateFocusTime' | 'togglePomodoro'
>;

export type MoodActions = Pick<UserActions, 'setMood' | 'setMoodTheme'>;

export type GamificationActions = Pick<UserActions,
  'performDailyReset' | 'updateLifeScoreHistory' | 'generateDailyQuests' |
  'completeQuest' | 'checkQuestProgress' | 'addXP' | 'triggerProactivePrompt' |
  'dismissXP' | 'dismissMilestone' | 'dismissMoodLog' | 'dismissProactive' | 'setLastActive'
>;
