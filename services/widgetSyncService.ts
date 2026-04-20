import SharedGroupPreferences from 'react-native-shared-group-preferences';
import { Platform } from 'react-native';

const APP_GROUP = 'group.com.lifeos.prime';

export interface WidgetData {
  tasks: { id: string; text: string; completed: boolean; priority: string }[];
  habitProgress: { completed: number; total: number };
  focus: { isActive: boolean; totalSecondsToday: number; goalSeconds: number; lastStartTime: number | null };
  stats: { level: number; totalXP: number; streak: number };
  lastUpdated: number;
}

export const widgetSyncService = {
  syncWholeStoreToWidget: async (data: WidgetData) => {
    if (Platform.OS === 'ios') {
      try {
        // We sync as a single JSON string to avoid multiple expensive bridge calls
        // and to keep the native side logic simple (one decode).
        await SharedGroupPreferences.setItem('widgetData', JSON.stringify(data), APP_GROUP);
        console.log('[WidgetSync] iOS Pro Data synced to App Group');
      } catch (error) {
        console.warn('[WidgetSync] iOS App Group sync failed', error);
      }
    }
  },

  // Legacy helper for simple streak (can be deprecated later)
  syncStreak: async (streak: number) => {
    if (Platform.OS === 'ios') {
      try {
        await SharedGroupPreferences.setItem('globalStreak', streak, APP_GROUP);
      } catch (error) {
        console.warn('[WidgetSync] Quick Streak sync failed', error);
      }
    }
  }
};
