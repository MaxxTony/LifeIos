import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEvent =
  | 'task_added'
  | 'task_completed'
  | 'task_uncompleted'
  | 'habit_added'
  | 'habit_completed'
  | 'habit_uncompleted'
  | 'habit_toggled'
  | 'focus_session_start'
  | 'focus_session_stop'
  | 'mood_logged'
  | 'quest_completed'
  | 'screen_view'
  | 'app_open'
  | 'error_occurred';

// These events are high-value and rare. We save them to Firestore for auditing.
const HIGH_VALUE_EVENTS: AnalyticsEvent[] = [
  'quest_completed',
  'mood_logged',
  'error_occurred',
  'habit_added',
  'task_added',
  'focus_session_stop',
];

let eventQueue: { event: AnalyticsEvent; params: Record<string, any>; timestamp: Date }[] = [];
const BATCH_SIZE_LIMIT = 30; // Optimized for high volume (1M+ users)
const QUEUE_STORAGE_KEY = 'lifeos_analytics_queue';

const persistQueue = async () => {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(eventQueue));
  } catch (err) {
    if (__DEV__) console.warn('[Analytics] Failed to persist queue:', err);
  }
};

const flushQueue = async (userId: string) => {
  if (eventQueue.length === 0) return;
  
  const eventsToCommit = [...eventQueue];
  eventQueue = []; // Clear immediately to prevent double-processing
  await persistQueue(); // Sync persistence
  
  try {
    const batch = writeBatch(db);
    eventsToCommit.forEach((item) => {
      const eventRef = doc(collection(db, 'users', userId, 'analytics'));
      batch.set(eventRef, item);
    });
    await batch.commit();
    if (__DEV__) console.log(`[Analytics] Successfully committed batch of ${eventsToCommit.length} events.`);
  } catch (err) {
    if (__DEV__) console.error('[Analytics] Batch commit failed:', err);
    // Silent fail in production to avoid disrupting user experience
  }
};

export const analyticsService = {
  logEvent: async (userId: string | null, event: AnalyticsEvent, params: Record<string, any> = {}) => {
    // 1. ALWAYS ADD TO SENTRY (Perfect for debugging, free on most plans)
    try {
      // M-06 FIX: Strip PII fields before sending to Sentry. Only send safe metadata.
      const { title, text, note, reason, body, content, ...safeParams } = params;
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: event,
        data: { userId: userId || 'anonymous', ...safeParams },
        level: 'info',
      });
    } catch (err) {
      if (__DEV__) console.warn('[Analytics Sentry] breadcrumb failed:', err);
    }

    // 2. ONLY LOG HIGH-VALUE EVENTS TO FIRESTORE (Keep costs very low)
    if (!userId || !HIGH_VALUE_EVENTS.includes(event)) {
      if (__DEV__) console.log(`[Analytics (Sentry Only)] ${event}:`, params);
      return;
    }

    // Add to queue
    eventQueue.push({
      event,
      params,
      timestamp: new Date(),
    });
    await persistQueue();

    // Flush if limit reached
    if (eventQueue.length >= BATCH_SIZE_LIMIT) {
      await flushQueue(userId);
    } else {
      if (__DEV__) console.log(`[Analytics (Queued)] ${event}. Queue size: ${eventQueue.length}`);
    }
  },

  logScreenView: async (userId: string | null, screenName: string) => {
    try {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: screenName,
        level: 'info',
      });
    } catch (err) { }
    analyticsService.logEvent(userId, 'screen_view', { screen_name: screenName });
  },

  // Manual flush (e.g. on app background or logout)
  forceFlush: async (userId: string | null) => {
    if (userId) await flushQueue(userId);
  },

  initAnalyticsService: async () => {
    try {
      const persisted = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (persisted) {
        eventQueue = JSON.parse(persisted);
        if (__DEV__) console.log(`[Analytics] Recovered ${eventQueue.length} events from storage.`);
      }
    } catch (err) {
      if (__DEV__) console.warn('[Analytics] Failed to init service:', err);
    }
  }
};
