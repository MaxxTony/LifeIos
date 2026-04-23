// Task definitions MUST be imported before expo-router so they execute
// synchronously at bundle root — expo-task-manager requires this.
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget/WidgetTaskHandler';
import './taskDefinitions';

// Register widget handler at the absolute root for Android background tasks
registerWidgetTaskHandler(widgetTaskHandler);

import 'expo-router/entry';

