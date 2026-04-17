import { collection, addDoc } from 'firebase/firestore';
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

export const analyticsService = {
  logEvent: async (userId: string | null, event: AnalyticsEvent, params: Record<string, any> = {}) => {
    // Add as a Sentry breadcrumb — gives crash reports rich event context
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

    if (!userId) return;

    // Secondary Firestore collection for historical auditing / offline resilience
    try {
      await addDoc(collection(db, 'users', userId, 'analytics'), {
        event,
        params,
        timestamp: new Date(),
      });

      if (__DEV__) {
        console.log(`[Analytics] ${event}:`, params);
      }
    } catch (err) {
      if (__DEV__) console.error('[Analytics] Failed to log event to Firestore:', err);
    }
  },

  logScreenView: async (userId: string | null, screenName: string) => {
    try {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: screenName,
        level: 'info',
      });
    } catch (err) {
      // Sentry may not be initialised yet — safe to swallow
    }

    analyticsService.logEvent(userId, 'screen_view', { screen_name: screenName });
  },
};
