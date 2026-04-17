import * as Sentry from '@sentry/react-native';

/**
 * Crash Analytics (Sentry)
 * =========================
 * Call initCrashAnalytics() once at app startup (e.g. in app/_layout.tsx).
 * Set EXPO_PUBLIC_SENTRY_DSN in your .env.local — get it from sentry.io.
 *
 * Sentry captures:
 *  - Native crashes (iOS/Android)
 *  - Unhandled JS exceptions
 *  - Performance traces
 *  - Breadcrumbs from analyticsService.logEvent
 */

export const initCrashAnalytics = () => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.warn('[CrashAnalytics] EXPO_PUBLIC_SENTRY_DSN is not set. Crash reporting disabled.');
    }
    return;
  }

  Sentry.init({
    dsn,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  });
};

/** Report a caught error to Sentry with optional extra context. */
export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, { extra: context });
};

/** Tag the current Sentry session with the authenticated user. Pass null to clear on logout. */
export const setSentryUser = (userId: string | null, userName?: string | null) => {
  if (userId) {
    Sentry.setUser({ id: userId, username: userName || undefined });
  } else {
    Sentry.setUser(null);
  }
};
