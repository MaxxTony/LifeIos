// Task definitions MUST be imported before expo-router so they execute
// synchronously at bundle root — expo-task-manager requires this.
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget/WidgetTaskHandler';
import './taskDefinitions';

// Register widget handler only on Android background tasks
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

import 'expo-router/entry';

