import { isTransientError, SYNC_RETRY_DELAYS_MS } from './helpers';

// Module-level variable to store the error publisher
export let publishSyncError: ((err: { label: string; message: string }) => void) | null = null;

// This function will be called from useStore to wire up the error publisher
export const wireSyncErrorPublisher = (publisher: typeof publishSyncError) => {
  publishSyncError = publisher;
};

export const fireSync = (fn: () => Promise<unknown>, label: string, userId?: string | null) => {
  const attempt = async (tryIdx: number): Promise<void> => {
    try {
      await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const canRetry = tryIdx < SYNC_RETRY_DELAYS_MS.length && isTransientError(err, userId);
      
      if (canRetry) {
        await new Promise((r) => setTimeout(r, SYNC_RETRY_DELAYS_MS[tryIdx]));
        return attempt(tryIdx + 1);
      }
      
      if (err?.code === 'permission-denied' && !userId) return;

      console.error(`[LifeOS Sync] ${label} failed (final):`, msg);
      publishSyncError?.({ label, message: msg });
      
      import('react-native-toast-message')
        .then((Toast) => {
          Toast.default.show({
            type: 'error',
            text1: 'Some changes didn\'t sync',
            text2: 'Tap retry from the sync banner on your home screen.',
            visibilityTime: 4000,
          });
        })
        .catch(() => {});
    }
  };
  attempt(0);
};
