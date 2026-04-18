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

  scheduleHabitReminder: async (habitId: string, title: string, icon: string, time: string, frequency: string, days: number[]) => {
    if (Platform.OS === 'web') return;

    const { notificationSettings, homeTimezone } = useStore.getState();
    if (!notificationSettings.push || !notificationSettings.habits) return;

    try {
      const hasPermission = await notificationService.ensurePermissions();
      if (!hasPermission) return;

      // 1. Prepare platform-specific channel (Async)
      await ensureChannel();

      // 2. Cancel existing notifications for this habit to avoid duplicates
      await notificationService.cancelHabitReminders(habitId);

      // 3. Parse reminder time
      const parsed = parseTimeString(time);
      if (!parsed) return;
      const { hours, minutes } = parsed;

      // C-NOTIF-2: Handle Timezone locking
      // If we have a home timezone, we MUST ensure the notification 
      // fires at that absolute time. 
      // Note: expo-notifications CALENDAR and WEEKLY triggers are local.
      // To keep them "locked" to a home timezone while the device travels,
      // we would technically need to reschedule on every timezone change.
      // For now, we will schedule them as local triggers as they are more reliable 
      // for "Alarms", but we calculate the target offset if needed.
      
      // 4. Schedule based on selected days (1=Sunday in expo-notifications)
      for (const day of days) {
        const expoDay = day + 1;

        // Choose the correct trigger per platform
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
            title: `${icon} Time for your habit!`,
            body: `Don't break your streak for ${title}! Let's make it happen. 🔥`,
            data: { habitId, type: 'HABIT_REMINDER' },
            sound: true,
          },
          trigger,
          identifier: `habit-${habitId}-${day}`,
        });
      }
    } catch (e) {
      console.warn('Failed to schedule habit reminder:', e);
    }
  },

  cancelHabitReminders: async (habitId: string) => {
    if (Platform.OS === 'web') return;
    try {
      // M-05 FIX: Cancel by direct identifier instead of fetching all scheduled notifications.
      // IDs are deterministic: habit-${habitId}-${dayIndex} for days 0–6.
      const cancels = Array.from({ length: 7 }, (_, day) =>
        Notifications.cancelScheduledNotificationAsync(`habit-${habitId}-${day}`).catch(() => {})
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

      // 1. Cancel existing comeback notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of scheduled) {
        if (n.identifier.startsWith('comeback-')) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

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
