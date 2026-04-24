import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export const initCrashAnalytics = () => {
  // Read DSN from app.config.js extra (injected at build time, not bundled as EXPO_PUBLIC_).
  // For EAS builds: add SENTRY_DSN to EAS Secrets. For local dev: set SENTRY_DSN in .env.local.
  const dsn = (Constants.expoConfig?.extra?.sentryDsn as string | null) ?? null;
  if (!dsn) {
    if (__DEV__) {
      console.warn('[CrashAnalytics] SENTRY_DSN is not set. Crash reporting disabled.');
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
