import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';

const DEFAULT_CHANNEL_ID = 'default';

const parseTimeString = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const cleaned = timeStr.trim().replace(/\s+/g, ' ').toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];
  
  if (modifier === 'PM' && hours < 12) hours += 12;
  else if (modifier === 'AM' && hours === 12) hours = 0;
  
  return { hours, minutes };
};

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      if (notification.request.content.data?.type === 'MIDNIGHT_RESET') {
        return { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
      }
      return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true };
    },
  });
}

const ensureChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C5CFF',
    });
  }
};

export const notificationService = {
  requestPermissions: async () => {
    if (Platform.OS === 'web') return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Notifications not supported on this platform');
      return false;
    }
  },
  
  ensurePermissions: async () => {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  scheduleHabitReminder: async (habitId: string, title: string, icon: string, time: string, frequency: string, days: number[], monthlyDay?: number) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.habitReminders) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await notificationService.cancelHabitReminders(habitId);

      const habit = useStore.getState().habits.find(h => h.id === habitId);
      if (!habit) return;

      const today = getTodayLocal();
      if (habit.pausedUntil && today <= habit.pausedUntil) return;

      const parsed = parseTimeString(time);
      if (!parsed) return;
      const { hours, minutes } = parsed;

      if (frequency === 'daily') {
        const trigger: any = Platform.OS === 'ios'
          ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: hours, minute: minutes, repeats: true }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hours, minute: minutes, channelId: DEFAULT_CHANNEL_ID };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${icon} Time for your habit!`,
            body: `Don't break your daily streak for ${title}! 🔥`,
            data: { habitId, type: 'HABIT_REMINDER' },
            sound: true,
          },
          trigger,
          identifier: `habit-${habitId}-daily`,
        });
      } else if (frequency === 'weekly') {
        for (const day of days) {
          const expoDay = day + 1;
          const trigger: any = Platform.OS === 'ios'
            ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: hours, minute: minutes, repeats: true, weekday: expoDay }
            : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: expoDay, hour: hours, minute: minutes, channelId: DEFAULT_CHANNEL_ID };

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${icon} Habit Day!`,
              body: `It's your scheduled day for ${title} — keep it up! 🗓`,
              data: { habitId, type: 'HABIT_REMINDER' },
              sound: true,
            },
            trigger,
            identifier: `habit-${habitId}-${day}`,
          });
        }
      } else if (frequency === 'monthly') {
        const now = new Date();
        const targetDay = monthlyDay && monthlyDay > 0 ? monthlyDay : 1;
        let nextDate = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes, 0, 0);
        const isDoneToday = habit.completedDays.includes(today);
        if (nextDate <= now || isDoneToday) {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes, 0, 0);
        }
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfMonth) nextDate.setDate(lastDayOfMonth);

        const monthlyTrigger: any = Platform.OS === 'ios'
          ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, day: nextDate.getDate(), hour: hours, minute: minutes, repeats: true }
          : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextDate, channelId: DEFAULT_CHANNEL_ID };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${icon} Monthly Habit Reminder!`,
            body: `Time to log this month's session for ${title}! 📅`,
            data: { habitId, type: 'HABIT_REMINDER' },
            sound: true,
          },
          trigger: monthlyTrigger,
          identifier: `habit-${habitId}-monthly`,
        });
      }
    } catch (e) {
      console.warn('Failed to schedule habit reminder:', e);
    }
  },

  cancelHabitReminders: async (habitId: string) => {
    if (Platform.OS === 'web') return;
    try {
      const cancels: Promise<void>[] = [];
      cancels.push(Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-daily`).catch(() => {}));
      for (let day = 0; day < 7; day++) {
        cancels.push(Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-${day}`).catch(() => {}));
      }
      cancels.push(Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-monthly`).catch(() => {}));
      await Promise.all(cancels);
    } catch (e) {}
  },

  scheduleMissedTaskNotification: async (taskId: string, taskText: string) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.missedTaskAlert) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync(`missed-task-${taskId}`).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Missed',
          body: `"${taskText}" passed its end time without being completed.`,
          sound: true,
        },
        trigger: null,
        identifier: `missed-task-${taskId}`,
      });
    } catch (e) {}
  },

  scheduleTaskNotification: async (taskId: string, title: string, startTime: string, date: string) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.taskReminders) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await notificationService.cancelTaskNotification(taskId);
      const parsed = parseTimeString(startTime);
      if (!parsed) return;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day, parsed.hours, parsed.minutes, 0, 0);
      const triggerDate = new Date(targetDate.getTime() - 5 * 60 * 1000);
      if (isNaN(triggerDate.getTime())) return;
      const secondsUntil = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
      if (secondsUntil <= 0) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚀 Task Starting Soon`,
          body: `"${title}" starts in 5 minutes!`,
          data: { taskId, type: 'TASK_REMINDER' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        identifier: `task-${taskId}`,
      });
    } catch (e) {
      console.warn('Failed to schedule task notification:', e);
    }
  },

  cancelTaskNotification: async (taskId: string) => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`); } catch (e) {}
  },

  cancelAllNotifications: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
  },

  scheduleStreakWarningNotification: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, globalStreak } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.streakWarning) return;
    if (globalStreak <= 0) return; 

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await notificationService.cancelStreakWarningNotification();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Save your streak!',
          body: `Your ${globalStreak}-day streak is about to die! Take 2 minutes to complete a habit.`,
          sound: true,
          data: { type: 'STREAK_WARNING' }
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 22, minute: 0 },
        identifier: 'streak-warning',
      });
    } catch (e) {}
  },

  cancelStreakWarningNotification: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync('streak-warning'); } catch (e) {}
  },

  scheduleDailyMoodReminder: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, moodHistory } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.dailyMoodCheckin) {
      await notificationService.cancelMoodReminder();
      return;
    }

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await notificationService.cancelMoodReminder();
      const today = getTodayLocal();
      const moodEntry = moodHistory[today];
      let title = "How are you feeling today? 🌿";
      let body = "Take a moment to record your mood and reflect on your day.";
      if (moodEntry) {
        if (moodEntry.mood >= 4) {
          title = "Glad you're having a great day! 🚀";
          body = "Keep that positive energy going. Remember to celebrate the wins!";
        } else {
          title = "How's it going? 🧘‍♂️";
          body = "It's okay to have rough days. Take a breath and remember to be kind to yourself.";
        }
      }
      const trigger: any = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 20, minute: 0, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 };

      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { type: 'MOOD_REMINDER' }, sound: true },
        trigger,
        identifier: 'daily-mood-reminder',
      });
    } catch (e) {}
  },

  cancelMoodReminder: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync('daily-mood-reminder'); } catch (e) {}
  },

  cancelComebackNotifications: async () => {
    if (Platform.OS === 'web') return;
    try {
      const ids = ['comeback-24h', 'comeback-48h', 'comeback-3d', 'comeback-7d', 'comeback-30d', 'level-up-nudge'];
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    } catch (e) {}
  },

  scheduleComebackNotifications: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, totalXP, level } = useStore.getState();
    if (!notificationSettings.masterEnabled) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await notificationService.cancelComebackNotifications();

      // 24h
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Your goals didn't take a day off 🎯",
          body: "3 new quests are waiting for you. Let's make today count!",
          data: { type: 'COMEBACK' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 24 * 3600 },
        identifier: 'comeback-24h',
      });

      // 48h
      if (notificationSettings.comeback48h) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "We miss you! 🌿",
            body: "Your streak is waiting. Let's get back on track with your goals today. 🔥",
            data: { type: 'COMEBACK' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 48 * 3600 },
          identifier: 'comeback-48h',
        });
      }

      // 3-day
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Don't let your streak die! 🧊",
          body: "It's been 3 days. One small action today saves your progress.",
          data: { type: 'COMEBACK' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 * 24 * 3600 },
        identifier: 'comeback-3d',
      });

      // 7-day
      if (notificationSettings.comeback7d) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Level Up Pending... 🚀",
            body: "A week away! Check in now to see your progress and stay consistent.",
            data: { type: 'COMEBACK' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 7 * 24 * 3600 },
          identifier: 'comeback-7d',
        });
      }

      // 30-day
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "LifeOS: We kept your account 🏠",
          body: "Did you keep your goals? Open the app and start fresh today.",
          data: { type: 'COMEBACK' },
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * 24 * 3600 },
        identifier: 'comeback-30d',
      });

      // Near Level-Up
      const { getLevelProgress } = await import('@/store/helpers');
      const { xpInLevel, xpRequiredForNext } = getLevelProgress(totalXP);
      const xpToNextLevel = xpRequiredForNext - xpInLevel;
      
      if (xpRequiredForNext > 0 && xpToNextLevel <= 100) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "So close to Leveling Up! 🚀",
            body: `You're only ${xpToNextLevel} XP away from Level ${level + 1}. Complete one quest now!`,
            data: { type: 'LEVEL_NUDGE' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 12 * 3600 },
          identifier: 'level-up-nudge',
        });
      }
    } catch (e) {}
  },

  scheduleMorningBrief: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, globalStreak, tasks, habits } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.morningBrief) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync('morning-brief').catch(() => {});
      const today = getTodayLocal();
      const todayDayOfWeek = new Date().getDay();
      const tasksDueToday = tasks.filter(t => t.date === today && !t.completed).length;
      const habitsDueToday = habits.filter(h => {
        if (h.pausedUntil && today <= h.pausedUntil) return false;
        if (h.completedDays.includes(today)) return false;
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly') return (h.targetDays || []).includes(todayDayOfWeek);
        if (h.frequency === 'monthly') return true;
        return false;
      }).length;

      let title = '🌅 Good morning!';
      let body = "Let's make today count.";
      const parts: string[] = [];
      if (tasksDueToday > 0) parts.push(`${tasksDueToday} task${tasksDueToday > 1 ? 's' : ''} waiting`);
      if (habitsDueToday > 0) parts.push(`${habitsDueToday} habit${habitsDueToday > 1 ? 's' : ''} to complete`);

      if (globalStreak > 1) title = `🔥 Day ${globalStreak} streak — keep it alive!`;
      else if (globalStreak === 1) title = '🌅 Good morning! Day 1 of your new streak.';

      if (parts.length > 0) body = `🎯 ${parts.join(' · ')}. Let's go!`;
      else if (habits.length === 0 && tasks.filter(t => t.date === today).length === 0) body = 'Open LifeOS and plan your day. 5 minutes = better results all day.';
      else body = "You're all caught up! Add a task or log your mood to earn XP. 💡";

      const trigger: any = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 8, minute: 0, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 };

      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { type: 'MORNING_BRIEF' }, sound: true },
        trigger,
        identifier: 'morning-brief',
      });
    } catch (e) {}
  },

  cancelMorningBrief: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync('morning-brief'); } catch (e) {}
  },

  scheduleQuestFOMO: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, dailyQuests } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.questCompleted) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync('quest-fomo').catch(() => {});
      const incompleteQuests = dailyQuests.filter(q => !q.completed);
      if (incompleteQuests.length === 0) return;
      const totalXPLeft = incompleteQuests.reduce((sum, q) => sum + q.rewardXP, 0);
      const questWord = incompleteQuests.length === 1 ? 'quest' : 'quests';
      const title = `⏰ ${incompleteQuests.length} ${questWord} expiring at midnight!`;
      const body = `${totalXPLeft} XP on the line. Complete them before the day resets. 🏆`;
      const trigger: any = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 21, minute: 0, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 0 };

      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { type: 'QUEST_FOMO' }, sound: true },
        trigger,
        identifier: 'quest-fomo',
      });
    } catch (e) {}
  },

  cancelQuestFOMO: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync('quest-fomo'); } catch (e) {}
  },

  scheduleWeeklyLeaderboardAlert: async (userRank?: number) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled || !notificationSettings.weeklyLeaderboard) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync('weekly-leaderboard').catch(() => {});
      let title = '📊 Weekly XP resets tonight at midnight!';
      let body = "Last chance to climb the leaderboard before Monday's reset. 🚀";
      if (userRank !== undefined && userRank > 0) {
        if (userRank === 1) { title = '👑 You\'re #1! Defend your throne.'; body = "Weekly reset in 3 hours. Log one more habit to lock in your top spot. 🔥"; }
        else if (userRank <= 3) { title = `🥇 You're #${userRank} on the leaderboard!`; body = "Weekly reset in 3 hours — stay in the top 3. Complete a quest now. 💪"; }
        else if (userRank <= 10) { title = `📊 You're #${userRank} — top 10 is yours.`; body = "Weekly reset in 3 hours. Push one more habit or task to climb higher. 🏆"; }
        else { title = `📊 Weekly reset in 3 hours! You're #${userRank}.`; body = "Complete your quests to earn XP and climb the leaderboard tonight. ⚡"; }
      }
      const trigger: any = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, weekday: 1, hour: 21, minute: 0, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 21, minute: 0 };

      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { type: 'WEEKLY_LEADERBOARD' }, sound: true },
        trigger,
        identifier: 'weekly-leaderboard',
      });
    } catch (e) {}
  },

  cancelWeeklyLeaderboardAlert: async () => {
    if (Platform.OS === 'web') return;
    try { await Notifications.cancelScheduledNotificationAsync('weekly-leaderboard'); } catch (e) {}
  },

  scheduleMidnightReset: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('midnight-reset-trigger').catch(() => {});
      const trigger: any = Platform.OS === 'ios'
        ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: 0, minute: 1, repeats: true }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 0, minute: 1, channelId: DEFAULT_CHANNEL_ID };

      await Notifications.scheduleNotificationAsync({
        identifier: 'midnight-reset-trigger',
        content: {
          title: 'New day, new quests! 🌅',
          body: 'Your daily quests and habits have refreshed.',
          data: { type: 'MIDNIGHT_RESET' },
          sound: false,
        },
        trigger,
      });
    } catch (e) {}
  },

  sendImmediateNotification: async (title: string, body: string, data: any = {}) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true },
        trigger: null,
      });
    } catch (e) {}
  },

  sendProactiveAI: async (title: string, body: string, type: 'ai' | 'pomodoro' = 'ai') => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.masterEnabled) return;
    if (type === 'ai' && !notificationSettings.aiCoachNudge) return;
    if (type === 'pomodoro' && !notificationSettings.pomodoroAlert) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;
      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { type: 'PROACTIVE_AI' }, sound: true },
        trigger: null,
      });
    } catch (e) {}
  },

  rescheduleAllHabits: async () => {
    if (Platform.OS === 'web') return;
    const { habits, userId } = useStore.getState();
    if (!userId) return;
    for (const habit of habits) {
      if (habit.reminderTime) {
        await notificationService.scheduleHabitReminder(habit.id, habit.title, habit.icon, habit.reminderTime, habit.frequency, habit.targetDays || [], habit.monthlyDay);
      }
    }
  }
};
