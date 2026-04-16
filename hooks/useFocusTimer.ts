import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '@/store/useStore';
import { dbService } from '@/services/dbService';
import { getTodayLocal } from '@/utils/dateUtils';

/**
 * useFocusTimer
 * Global hook to drive the focus session accumulation.
 * Running this at the root (_layout.tsx) ensures focus time is updated
 * regardless of which screen the user is on.
 */
// Maximum session length cap: 24 hours in ms.
// If the app was left running overnight, clamp the elapsed time to avoid garbage data.
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;

// C-6: Checkpoint accumulated focus seconds to Firestore on this cadence so a
// crash or force-quit loses at most ~60s of focus time instead of the whole
// session. Keep well above Firestore write cost thresholds (<=1/min/user).
const CHECKPOINT_INTERVAL_MS = 60 * 1000;

export function useFocusTimer() {
  // Selector pattern: subscribe only to primitives so this hook does NOT
  // re-render on every focus tick (only when isActive or lastStartTime changes).
  const isActive = useStore(s => s.focusSession.isActive);
  const userId = useStore(s => s.userId);
  const updateFocusTime = useStore(s => s.actions.updateFocusTime);
  const appState = useRef(AppState.currentState);
  const lastSavedSeconds = useRef(0);

  useEffect(() => {
    if (!isActive || !userId) return;

    // C-6: On mount while active (app cold-started mid-session), immediately
    // reconcile elapsed wall-clock time so we don't wait a full tick.
    const { lastStartTime, totalSecondsToday } = useStore.getState().focusSession;
    const bootElapsed = lastStartTime ? Date.now() - lastStartTime : 0;
    
    // Seed the checkpoint ref with the current total so we don't double-write on mount
    lastSavedSeconds.current = totalSecondsToday;

    if (bootElapsed > 0 && bootElapsed < MAX_SESSION_MS) {
      updateFocusTime();
    }

    // Tick every second while the session is active
    const interval = setInterval(() => {
      updateFocusTime();
    }, 1000);

    // C-6: Periodic Firestore checkpoint. We read fresh state from the store
    // inside the callback so we always persist the latest accumulated value,
    // not a stale closure snapshot from mount.
    const checkpoint = setInterval(() => {
      const s = useStore.getState();
      if (!s.userId || !s.focusSession.isActive) return;
      
      const totalSeconds = s.focusSession.totalSecondsToday;
      if (totalSeconds <= 0) return;

      // F-H2: Only write if the user has accumulated at least 30 new focus seconds.
      // This prevents 1,440 redundant daily writes for an idle session or break.
      const delta = totalSeconds - lastSavedSeconds.current;
      if (delta < 30) return;

      lastSavedSeconds.current = totalSeconds;
      dbService.saveFocusEntry(s.userId, getTodayLocal(), totalSeconds).catch((e) => {
        console.warn('[LifeOS] Focus checkpoint failed:', e?.message || e);
      });
    }, CHECKPOINT_INTERVAL_MS);

    // When the app returns to foreground after being backgrounded,
    // immediately sync the wall-clock time that elapsed while suspended.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isActive
      ) {
        // Guard against extreme elapsed times (e.g. overnight)
        const { lastStartTime } = useStore.getState().focusSession;
        const elapsed = lastStartTime ? Date.now() - lastStartTime : 0;
        if (elapsed < MAX_SESSION_MS) {
          updateFocusTime();
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      clearInterval(checkpoint);
      subscription.remove();
    };
  }, [isActive, userId, updateFocusTime]);
}
