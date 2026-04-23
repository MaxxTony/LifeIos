import { Platform } from 'react-native';
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_GROUP = 'group.com.lifeos.prime';

export interface WidgetData {
  isLoggedIn: boolean;
  accentColor: string;
  tasks: { id: string; text: string; completed: boolean; priority: string }[];
  habits: { id: string; title: string; icon: string; isDoneToday: boolean }[];
  habitProgress: { completed: number; total: number };
  focus: {
    isActive: boolean;
    totalSecondsToday: number;
    goalSeconds: number;
    lastStartTime: number | null;
  };
  stats: {
    level: number;
    totalXP: number;
    streak: number;
    xpProgress: number;
    levelName: string;
  };
  mood: {
    today: number;
    last5Days: number[];
  };
  theme?: 'light' | 'dark';
  moodTheme?: string;
  lastUpdated: number;
}

export const widgetSyncService = {
  syncWholeStoreToWidget: async (data: WidgetData) => {
    if (Platform.OS === 'ios') {
      try {
        await SharedGroupPreferences.setItem('widgetData', JSON.stringify(data), APP_GROUP);
      } catch (error) {
        console.warn('[WidgetSync] iOS App Group sync failed', error);
      }
    } else if (Platform.OS === 'android') {
      try {
        await AsyncStorage.setItem('widgetData', JSON.stringify(data));
        
        const { requestWidgetUpdate } = await import('react-native-android-widget');
        const { renderWidgetByName } = await import('../widget/WidgetRenderer');
        const widgetNames = [
          'XPLevelWidget',
          'TasksWidget',
          'HabitsWidget',
          'FocusTimerWidget',
          'MoodWidget'
        ];
        
        for (const name of widgetNames) {
          requestWidgetUpdate({
            widgetName: name,
            renderWidget: (widgetInfo) => renderWidgetByName(name, data, widgetInfo),
          });
        }

      } catch (error) {
        console.warn('[WidgetSync] Android widget update failed', error);
      }
    }
  },
};
