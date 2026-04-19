import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { Platform } from 'react-native';

const APP_GROUP = 'group.com.lifeos.prime';

export const widgetSyncService = {
  syncStreak: async (streak: number) => {
    if (Platform.OS === 'ios') {
      try {
        await SharedGroupPreferences.setItem('globalStreak', streak, APP_GROUP);
        console.log('[WidgetSync] iOS Streak synced to App Group');
      } catch (error) {
        console.warn('[WidgetSync] iOS Auth Group sync failed', error);
      }
    }
    // Android sync is handled via AsyncStorage in the WidgetTaskHandler, 
    // so no explicit push is needed here if AsyncStorage is used.
  }
};
