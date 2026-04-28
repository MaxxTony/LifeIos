import Toast from 'react-native-toast-message';
import { isTransientError, SYNC_RETRY_DELAYS_MS } from './helpers';

// Module-level variables to handle error publishing and re-entrancy locking
export let publishSyncError: ((err: { label: string; message: string }) => void) | null = null;
export let isSyncingGlobal = false;
export let store: any = null;

export const setSyncingGlobal = (val: boolean) => {
  isSyncingGlobal = val;
};

// Injection point to avoid circular dependencies with useStore
export const wireStore = (s: any) => {
  store = s;
};

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
  // CRITICAL FIX: Add to pending actions SYNCHRONOUSLY before attempting sync.
  // This guarantees offline durability even if the app drops or force closes during fn().
  if (collection && payload && docId) {
    const state = store?.getState();
    if (state) {
      const inQueue = (state.pendingActions || []).some((a: any) => a.id === docId && a.collection === collection);
      if (!inQueue) {
        store.setState((s: any) => ({
          pendingActions: [
            ...(s.pendingActions || []),
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
  }

  const attempt = async (tryIdx: number): Promise<void> => {
    try {
      await fn();
      
      // Remove from queue on success
      if (collection && docId) {
        const state = store?.getState();
        if (state) {
          store.setState((s: any) => ({
            pendingActions: (s.pendingActions || []).filter((a: any) => !(a.id === docId && a.collection === collection))
          }));
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      const canRetry = tryIdx < SYNC_RETRY_DELAYS_MS.length && isTransientError(err, userId);
      
      if (canRetry) {
        // C-NET-3 FIX: Add 30% jitter to prevent thundering herd during recovery
        const baseDelay = SYNC_RETRY_DELAYS_MS[tryIdx];
        const jitter = Math.random() * 0.3 * baseDelay;
        const finalDelay = baseDelay + jitter;
        
        if (__DEV__) console.log(`[LifeOS Sync] Retrying ${label} in ${(finalDelay / 1000).toFixed(1)}s (jitter: ${(jitter / 1000).toFixed(1)}s)`);
        
        await new Promise((r) => setTimeout(r, finalDelay));
        return attempt(tryIdx + 1);
      }
      
      if (err?.code === 'permission-denied' && !userId) return;

      console.error(`[LifeOS Sync] ${label} failed (final):`, msg);
      publishSyncError?.({ label, message: msg });
      
      Toast.show({
        type: 'error',
        text1: 'Sync pending',
        text2: 'Changes saved locally and will sync when online.',
        visibilityTime: 4000,
      });
    }
  };
  return attempt(0);
};
