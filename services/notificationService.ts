import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';

const DEFAULT_CHANNEL_ID = 'default';

const parseTimeString = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
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
};

// Configure how notifications should be handled when the app is foregrounded
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Ensure notification channel exists on Android
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
    if (status !== 'granted') {
      const { status: nextStatus } = await Notifications.requestPermissionsAsync();
      return nextStatus === 'granted';
    }
    return true;
  },

  scheduleHabitReminder: async (habitId: string, title: string, icon: string, time: string, frequency: string, days: number[], monthlyDay?: number) => {
    if (Platform.OS === 'web') return;

    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.push || !notificationSettings.habits) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();

      // Cancel all existing reminders for this habit first
      await notificationService.cancelHabitReminders(habitId);

      // Fetch habit detail for advanced checks (pause, completion)
      const habit = useStore.getState().habits.find(h => h.id === habitId);
      if (!habit) return;

      // ── Logic Polish: Respect Pause ──
      const today = getTodayLocal();
      if (habit.pausedUntil && today <= habit.pausedUntil) {
        // Habit is currently paused; don't schedule reminders.
        // They will be re-scheduled when the habit is resumed or edited.
        return;
      }

      // Parse reminder time (e.g. "8:30 pm")
      const parsed = parseTimeString(time);
      if (!parsed) return;
      const { hours, minutes } = parsed;

      if (frequency === 'daily') {
        // ── Daily: single DAILY trigger (one notification, fires every day) ──
        const trigger: any = Platform.OS === 'ios'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              hour: hours,
              minute: minutes,
              repeats: true,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: hours,
              minute: minutes,
              channelId: DEFAULT_CHANNEL_ID,
            };

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
        // ── Weekly: one WEEKLY trigger per target weekday ──
        // days[] contains JS getDay() values (0=Sun … 6=Sat)
        // expo-notifications weekday: 1=Sun … 7=Sat, so expo = jsDay + 1
        for (const day of days) {
          const expoDay = day + 1; // convert JS day → expo day
          const trigger: any = Platform.OS === 'ios'
            ? {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                hour: hours,
                minute: minutes,
                repeats: true,
                weekday: expoDay,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: expoDay,
                hour: hours,
                minute: minutes,
                channelId: DEFAULT_CHANNEL_ID,
              };

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
        // ── Monthly: DATE trigger aimed at next occurrence of the scheduled day ──
        // For count-goal mode (no fixed day), we fire on the 1st of next month as a reminder.
        const now = new Date();
        const targetDay = monthlyDay && monthlyDay > 0 ? monthlyDay : 1;

        // Build next occurrence date
        let nextDate = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes, 0, 0);
        
        // ── Logic Polish: Avoid Duplicate/Redundant Prompts ──
        // If the habit is already completed today, we definitely don't want a reminder.
        const isDoneToday = habit.completedDays.includes(today);
        
        if (nextDate <= now || isDoneToday) {
          // Date has passed OR habit already completed today → schedule for next month
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes, 0, 0);
        }

        // Clamp to last valid day of that month (e.g. Feb 30 → Feb 28)
        const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        if (targetDay > lastDayOfMonth) {
          nextDate.setDate(lastDayOfMonth);
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${icon} Monthly Habit Reminder!`,
            body: `Time to log this month's session for ${title}! 📅`,
            data: { habitId, type: 'HABIT_REMINDER' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextDate,
          },
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

      // Cancel daily trigger
      cancels.push(
        Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-daily`).catch(() => {})
      );

      // Cancel weekly triggers (days 0–6)
      for (let day = 0; day < 7; day++) {
        cancels.push(
          Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-${day}`).catch(() => {})
        );
      }

      // Cancel monthly trigger
      cancels.push(
        Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-monthly`).catch(() => {})
      );

      await Promise.all(cancels);
    } catch (e) {
      // Silence cancel errors
    }
  },

  scheduleMissedTaskNotification: async (taskText: string) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.push || !notificationSettings.tasks) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Missed',
          body: `"${taskText}" passed its end time without being completed.`,
          sound: true,
        },
        trigger: null, // fire immediately
      });
    } catch (e) {
      // Silence — notifications are best-effort
    }
  },

  scheduleTaskNotification: async (taskId: string, title: string, startTime: string, date: string) => {
    if (Platform.OS === 'web') return;

    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.push || !notificationSettings.tasks) return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();
      await notificationService.cancelTaskNotification(taskId);

      const parsed = parseTimeString(startTime);
      if (!parsed) return;

      // C-NOTIF-3: Safe date splitting
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        console.warn('[Notifications] Invalid task date format:', date);
        return;
      }

      const [year, month, day] = date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day, parsed.hours, parsed.minutes, 0, 0);

      // Schedule for 5 minutes before
      const triggerDate = new Date(targetDate.getTime() - 5 * 60 * 1000);
      
      // Safety check: ensure triggerDate is valid and in the future
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
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate 
        },
        identifier: `task-${taskId}`,
      });
    } catch (e) {
      console.warn('Failed to schedule task notification:', e);
    }
  },

  cancelTaskNotification: async (taskId: string) => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`);
    } catch (e) {
      // Silence
    }
  },

  cancelAllNotifications: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel all notifications:', e);
    }
  },

  scheduleStreakWarningNotification: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, globalStreak } = useStore.getState();
    if (!notificationSettings.push) return;
    if (globalStreak <= 0) return; // Only warn if they actually have a streak going

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
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 22, // 10:00 PM
          minute: 0,
        },
        identifier: 'streak-warning',
      });
    } catch (e) {
      console.warn('Failed to schedule streak warning notification:', e);
    }
  },

  cancelStreakWarningNotification: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('streak-warning');
    } catch (e) {
      // Silence
    }
  },

  scheduleDailyMoodReminder: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, moodHistory, homeTimezone } = useStore.getState();
    if (!notificationSettings.push || !notificationSettings.mood) {
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

      // Schedule for 8:00 PM every day
      const trigger: any = Platform.OS === 'ios'
        ? {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: 20,
          minute: 0,
          repeats: true,
        }
        : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        };

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'MOOD_REMINDER' },
          sound: true,
        },
        trigger,
        identifier: 'daily-mood-reminder',
      });
    } catch (e) {
      console.warn('Failed to schedule mood reminder:', e);
    }
  },

  cancelMoodReminder: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('daily-mood-reminder');
    } catch (e) {
      // Silence
    }
  },

  scheduleComebackNotifications: async () => {
    if (Platform.OS === 'web') return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      // 1. Cancel existing comeback notifications using deterministic IDs.
      // O15 FIX: No longer fetches getAllScheduledNotificationsAsync() (which could
      // return 100+ items). We know exactly which IDs we used — cancel them directly.
      await Notifications.cancelScheduledNotificationAsync('comeback-48h').catch(() => {});
      await Notifications.cancelScheduledNotificationAsync('comeback-7d').catch(() => {});

      // 2. Schedule 48h reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "We miss you! 🌿",
          body: "Your streak is waiting. Let's get back on track with your goals today. 🔥",
          data: { type: 'COMEBACK' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
        identifier: 'comeback-48h',
      });

      // 3. Schedule 7 day reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Level Up Pending... 🚀",
          body: "It's been a week! Check in now to see your progress and stay consistent.",
          data: { type: 'COMEBACK' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        identifier: 'comeback-7d',
      });
    } catch (e) {
      console.warn('Failed to schedule comeback notifications:', e);
    }
  },

  scheduleMorningBrief: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, globalStreak, tasks, habits } = useStore.getState();
    if (!notificationSettings.push) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();

      // Cancel old brief before re-scheduling so content stays fresh
      await Notifications.cancelScheduledNotificationAsync('morning-brief').catch(() => {});

      const today = getTodayLocal();
      const todayDayOfWeek = new Date().getDay();

      // Count tasks due today
      const tasksDueToday = tasks.filter(t => t.date === today && !t.completed).length;

      // Count habits due today (respects frequency)
      const habitsDueToday = habits.filter(h => {
        if (h.pausedUntil && today <= h.pausedUntil) return false;
        if (h.completedDays.includes(today)) return false; // already done
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekly') return (h.targetDays || []).includes(todayDayOfWeek);
        if (h.frequency === 'monthly') return true;
        return false;
      }).length;

      // Build dynamic title + body
      let title = '🌅 Good morning!';
      let body = "Let's make today count.";

      const parts: string[] = [];
      if (tasksDueToday > 0) parts.push(`${tasksDueToday} task${tasksDueToday > 1 ? 's' : ''} waiting`);
      if (habitsDueToday > 0) parts.push(`${habitsDueToday} habit${habitsDueToday > 1 ? 's' : ''} to complete`);

      if (globalStreak > 1) {
        title = `🔥 Day ${globalStreak} streak — keep it alive!`;
      } else if (globalStreak === 1) {
        title = '🌅 Good morning! Day 1 of your new streak.';
      }

      if (parts.length > 0) {
        body = `🎯 ${parts.join(' · ')}. Let's go!`;
      } else if (habits.length === 0 && tasks.filter(t => t.date === today).length === 0) {
        body = 'Open LifeOS and plan your day. 5 minutes = better results all day.';
      } else {
        body = "You're all caught up! Add a task or log your mood to earn XP. 💡";
      }

      const trigger: any = Platform.OS === 'ios'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: 8,
            minute: 0,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 8,
            minute: 0,
          };

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'MORNING_BRIEF' },
          sound: true,
        },
        trigger,
        identifier: 'morning-brief',
      });
    } catch (e) {
      console.warn('Failed to schedule morning brief:', e);
    }
  },

  cancelMorningBrief: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('morning-brief');
    } catch (e) {
      // Silence
    }
  },

  scheduleQuestFOMO: async () => {
    if (Platform.OS === 'web') return;
    const { notificationSettings, dailyQuests } = useStore.getState();
    if (!notificationSettings.push) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();
      // Always cancel first — if all quests are done, we don't want a stale notification
      await Notifications.cancelScheduledNotificationAsync('quest-fomo').catch(() => {});

      const incompleteQuests = dailyQuests.filter(q => !q.completed);
      if (incompleteQuests.length === 0) return; // all done — no FOMO needed

      const totalXPLeft = incompleteQuests.reduce((sum, q) => sum + q.rewardXP, 0);
      const questWord = incompleteQuests.length === 1 ? 'quest' : 'quests';

      const title = `⏰ ${incompleteQuests.length} ${questWord} expiring at midnight!`;
      const body = `${totalXPLeft} XP on the line. Complete them before the day resets. 🏆`;

      const trigger: any = Platform.OS === 'ios'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: 21,
            minute: 0,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 21,
            minute: 0,
          };

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'QUEST_FOMO' },
          sound: true,
        },
        trigger,
        identifier: 'quest-fomo',
      });
    } catch (e) {
      console.warn('Failed to schedule quest FOMO notification:', e);
    }
  },

  cancelQuestFOMO: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('quest-fomo');
    } catch (e) {
      // Silence
    }
  },

  scheduleWeeklyLeaderboardAlert: async (userRank?: number) => {
    if (Platform.OS === 'web') return;
    const { notificationSettings } = useStore.getState();
    if (!notificationSettings.push) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();
      await Notifications.cancelScheduledNotificationAsync('weekly-leaderboard').catch(() => {});

      // Build rank-aware body copy
      let title = '📊 Weekly XP resets tonight at midnight!';
      let body = "Last chance to climb the leaderboard before Monday's reset. 🚀";

      if (userRank !== undefined && userRank > 0) {
        if (userRank === 1) {
          title = '👑 You\'re #1! Defend your throne.';
          body = "Weekly reset in 3 hours. Log one more habit to lock in your top spot. 🔥";
        } else if (userRank <= 3) {
          title = `🥇 You're #${userRank} on the leaderboard!`;
          body = "Weekly reset in 3 hours — stay in the top 3. Complete a quest now. 💪";
        } else if (userRank <= 10) {
          title = `📊 You're #${userRank} — top 10 is yours.`;
          body = "Weekly reset in 3 hours. Push one more habit or task to climb higher. 🏆";
        } else {
          title = `📊 Weekly reset in 3 hours! You're #${userRank}.`;
          body = "Complete your quests to earn XP and climb the leaderboard tonight. ⚡";
        }
      }

      // Fire every Sunday at 9 PM (weekday 1=Sun in expo, JS getDay()=0)
      const trigger: any = Platform.OS === 'ios'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday: 1, // Sunday (expo: 1=Sun)
            hour: 21,
            minute: 0,
            repeats: true,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1, // Sunday (expo: 1=Sun)
            hour: 21,
            minute: 0,
          };

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'WEEKLY_LEADERBOARD' },
          sound: true,
        },
        trigger,
        identifier: 'weekly-leaderboard',
      });
    } catch (e) {
      console.warn('Failed to schedule weekly leaderboard alert:', e);
    }
  },

  cancelWeeklyLeaderboardAlert: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync('weekly-leaderboard');
    } catch (e) {
      // Silence
    }
  },

  sendProactiveAI: async (title: string, body: string) => {
    if (Platform.OS === 'web') return;
    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      await ensureChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'PROACTIVE_AI' },
          sound: true,
        },
        trigger: null, // fire immediately
      });
    } catch (e) {
      // Silence
    }
  }
};
