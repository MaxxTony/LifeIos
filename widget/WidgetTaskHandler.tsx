import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderWidgetByName } from './WidgetRenderer';


// Actions that should trigger a widget re-render.
const RENDER_ACTIONS = new Set(['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED']);

const STORAGE_BASE = 'lifeos-storage';
const SHARDS = [`${STORAGE_BASE}:core`, `${STORAGE_BASE}:tasks`, `${STORAGE_BASE}:hist`];

// Cast to any to access multiGet if types are missing/inconsistent.
// AsyncStorage v3+ renames multiGet to getMany.
const AS = (AsyncStorage as any).multiGet ? AsyncStorage : (AsyncStorage as any).default || AsyncStorage;

async function readState(): Promise<Record<string, any> | null> {
  try {
    const multiGetFn = (AS as any).multiGet || (AS as any).getMany;
    
    if (typeof multiGetFn !== 'function') {
      console.error('[WidgetHandler] No multiGet or getMany found on AS. Keys:', Object.keys(AS));
      throw new Error('AsyncStorage multi-key read function is undefined');
    }

    let results = (await multiGetFn.call(AS, SHARDS));
    console.log('[WidgetHandler] Raw results from storage:', JSON.stringify(results));
    
    // Normalize result structure (AsyncStorage v3 might return an object)
    if (results && !Array.isArray(results) && typeof results === 'object') {
      results = Object.entries(results);
    }
    
    if (!results || !Array.isArray(results)) {
      console.error('[WidgetHandler] results is not an array or is null. results:', results);
      // Return null so we fallback to NotLoggedInWidget instead of crashing
      return null;
    }
    
    // Check if any shard exists. If not, try legacy key.
    const hasShards = results.some((r: any) => r && r[1] !== null);


    if (!hasShards) {
      const legacy = await AsyncStorage.getItem(STORAGE_BASE);
      if (!legacy) return null;
      const parsed = JSON.parse(legacy);
      return parsed?.state ?? null;
    }

    const coreObj = results[0][1] ? JSON.parse(results[0][1]) : null;
    const tasksObj = results[1][1] ? JSON.parse(results[1][1]) : null;
    const histObj = results[2][1] ? JSON.parse(results[2][1]) : null;

    if (!coreObj) return null;

    // Merge shards back into a single state object
    return {
      ...coreObj.state,
      ...(tasksObj?.state || {}),
      ...(histObj?.state || {}),
    };
  } catch (error) {
    console.error('[WidgetHandler] Failed to read sharded state:', error);
    return null;
  }
}



export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;
  const widgetName = widgetInfo.widgetName;

  if (!RENDER_ACTIONS.has(widgetAction)) return;

  const state = await readState();
  props.renderWidget(renderWidgetByName(widgetName, state));
}

