import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
    if (!userId) return;
    
    try {
      // In a real production app, this might go to Google Analytics for Firebase (GA4F)
      // or Segment. For now, we'll log to a dedicated 'analytics' sub-collection to track retention.
      await addDoc(collection(db, 'users', userId, 'analytics'), {
        event,
        params,
        timestamp: serverTimestamp(),
      });
      
      if (__DEV__) {
        console.log(`[Analytics] ${event}:`, params);
      }
    } catch (err) {
      // Silently fail analytics to not block user flow
      if (__DEV__) console.error('[Analytics] Failed to log event:', err);
    }
  },

  logScreenView: (userId: string | null, screenName: string) => {
    analyticsService.logEvent(userId, 'screen_view', { screenName });
  }
};
