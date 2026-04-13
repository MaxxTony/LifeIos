import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DEFAULT_CHANNEL_ID = 'default';

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

  scheduleHabitReminder: async (habitId: string, title: string, icon: string, time: string, frequency: string, days: number[]) => {
    if (Platform.OS === 'web') return;

    try {
      // 1. Prepare platform-specific channel (Async)
      await ensureChannel();

      // 2. Cancel existing notifications for this habit to avoid duplicates
      await notificationService.cancelHabitReminders(habitId);

      // 3. Parse reminder time
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

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
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduled) {
        if (notification.identifier.startsWith(`habit-${habitId}`)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (e) {
      // Silence cancel errors
    }
  },

  cancelAllNotifications: async () => {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Failed to cancel all notifications:', e);
    }
  }
};
