import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderWidgetByName } from './WidgetRenderer';


async function readState(): Promise<Record<string, any> | null> {
  try {
    const dataStr = await AsyncStorage.getItem('widgetData');
    if (!dataStr) return null;
    return JSON.parse(dataStr);
  } catch (error) {
    console.error('[WidgetHandler] Failed to read widget data:', error);
    return null;
  }
}



// Actions that should trigger a widget re-render.
const RENDER_ACTIONS = new Set(['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED']);

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;
  const widgetName = widgetInfo.widgetName;

  if (!RENDER_ACTIONS.has(widgetAction)) return;

  const state = await readState();
  props.renderWidget(renderWidgetByName(widgetName, state, widgetInfo));
}

