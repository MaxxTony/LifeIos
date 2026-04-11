import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is foregrounded
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

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
      // 1. Cancel existing notifications for this habit if any
      await notificationService.cancelHabitReminders(habitId);

      // Parse time (e.g., "09:00 AM")
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      if (frequency === 'daily') {
        // Schedule for each selected day
        for (const day of days) {
          const expoDay = day + 1;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${icon} Time for ${title}!`,
              body: "Don't break your streak! Keep going today.",
              data: { habitId, type: 'HABIT_REMINDER' },
              sound: true,
            },
            trigger: {
              type: 'calendar',
              hour: hours,
              minute: minutes,
              repeats: true,
              weekday: expoDay,
            } as Notifications.NotificationTriggerInput,
            identifier: `habit-${habitId}-${day}`,
          });
        }
      }
    } catch (e) {
      console.warn('Failed to schedule notification:', e);
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
      console.warn('Failed to cancel notifications:', e);
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
