import { isTransientError, SYNC_RETRY_DELAYS_MS } from './helpers';

// Module-level variable to store the error publisher
export let publishSyncError: ((err: { label: string; message: string }) => void) | null = null;

// This function will be called from useStore to wire up the error publisher
export const wireSyncErrorPublisher = (publisher: typeof publishSyncError) => {
  publishSyncError = publisher;
};

export const fireSync = (
  fn: () => Promise<unknown>, 
  label: string, 
  userId?: string | null,
  collection?: 'tasks' | 'habits' | 'moodHistory' | 'focusHistory' | 'profile',
  payload?: any,
  docId?: string
) => {
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

      // C-5: If we hit a final failure and have a payload, queue it for later
      if (collection && payload && docId) {
        const { useStore } = require('./useStore');
        const state = useStore.getState();
        
        // Only queue if not already in queue
        const inQueue = state.pendingActions.some((a: any) => a.id === docId && a.collection === collection);
        if (!inQueue) {
          useStore.setState((state: any) => ({
            pendingActions: [
              ...state.pendingActions,
              {
                id: docId,
                type: label.startsWith('remove') ? 'delete' : (label.startsWith('add') ? 'create' : 'update'),
                collection,
                payload,
                timestamp: Date.now()
              }
            ]
          }));
        }
      }

      console.error(`[LifeOS Sync] ${label} failed (final):`, msg);
      publishSyncError?.({ label, message: msg });
      
      import('react-native-toast-message')
        .then((Toast) => {
          Toast.default.show({
            type: 'error',
            text1: 'Sync pending',
            text2: 'Changes saved locally and will sync when online.',
            visibilityTime: 4000,
          });
        })
        .catch(() => {});
    }
  };
  attempt(0);
};
