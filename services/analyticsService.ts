import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import * as Sentry from '@sentry/react-native';

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

// C-11: Internal queue for batching Firestore writes
let eventQueue: { event: AnalyticsEvent; params: Record<string, any>; timestamp: Date }[] = [];
const BATCH_SIZE_LIMIT = 5;

const flushQueue = async (userId: string) => {
  if (eventQueue.length === 0) return;
  
  const eventsToCommit = [...eventQueue];
  eventQueue = []; // Clear immediately to prevent double-processing
  
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
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: event,
        data: { userId: userId || 'anonymous', ...params },
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
  }
};
