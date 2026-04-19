import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { StreakWidget } from './StreakWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Since the widget runs in a background headless JS task, we can't easily access the Zustand 
// store directly if it relies on complex setup. We can read raw AsyncStorage state instead.
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let streakInfo = { globalStreak: 0 };
  
  try {
    const zustandStorage = await AsyncStorage.getItem('lifeos-store');
    if (zustandStorage) {
      const parsed = JSON.parse(zustandStorage);
      if (parsed?.state?.globalStreak !== undefined) {
        streakInfo.globalStreak = parsed.state.globalStreak;
      }
    }
  } catch (e) {
    console.warn("Widget couldn't read storage", e);
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<StreakWidget globalStreak={streakInfo.globalStreak} />);
      break;
    default:
      break;
  }
}
