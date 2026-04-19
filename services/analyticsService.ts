import * as Sentry from '@sentry/react-native';

// ─── Analytics Service ────────────────────────────────────────────────────────
// Uses ONLY Sentry breadcrumbs for event tracking.
//
// WHY NOT Firestore?
//   We previously batched events to users/{uid}/analytics/ in Firestore.
//   Sentry already captures every event as a breadcrumb (free, zero writes).
//   Duplicate Firestore writes were costing money with zero extra debugging value.
//   Removed: custom queue, AsyncStorage persist, writeBatch, flushQueue.
// ─────────────────────────────────────────────────────────────────────────────

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
  logEvent: (userId: string | null, event: AnalyticsEvent, params: Record<string, any> = {}) => {
    try {
      // Strip any PII fields before sending — only safe metadata goes to Sentry
      const { title, text, note, reason, body, content, ...safeParams } = params;
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: event,
        data: { userId: userId || 'anonymous', ...safeParams },
        level: 'info',
      });
    } catch (err) {
      // Sentry itself failing is non-critical — silently ignore
    }
    if (__DEV__) console.log(`[Analytics] ${event}:`, params);
  },

  logScreenView: (userId: string | null, screenName: string) => {
    try {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: screenName,
        level: 'info',
      });
    } catch (err) {}
    if (__DEV__) console.log(`[Analytics] screen_view: ${screenName}`);
  },

  // Kept for API compatibility — no-op since there's no queue anymore
  forceFlush: async (_userId: string | null) => {
    // Nothing to flush — Sentry sends breadcrumbs automatically
  },

  // Kept for API compatibility — no-op since there's no queue to restore
  initAnalyticsService: async () => {
    if (__DEV__) console.log('[Analytics] Sentry-only mode active. Firestore analytics removed.');
  },
};
