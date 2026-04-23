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

// Heartbeat fires every 30s so the user stays well within the 60s stale window
// in presenceService. Racing at 60s/60s caused users to flicker out of the room.
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

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

    // Seed the checkpoint ref with the current total so we don't double-write on mount
    const { totalSecondsToday } = useStore.getState().focusSession;
    lastSavedSeconds.current = totalSecondsToday;

    // FIX: Do NOT call updateFocusTime() on mount here.
    // The interval below fires every second and handles all increments.
    // Calling updateFocusTime() on mount + interval start caused a double-tick
    // on session resume, making the timer jump 2 seconds instantly.

    // Tick every second while the session is active
    const interval = setInterval(() => {
      updateFocusTime();
    }, 1000);

    // Heartbeat every 30s to stay well within the 60s stale window.
    const heartbeat = setInterval(() => {
      const s = useStore.getState();
      if (!s.userId || !s.focusSession.isActive) return;
      const { presenceService } = require('@/services/presenceService');
      presenceService.updateHeartbeat(s.userId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    // Periodic Firestore checkpoint every 60s.
    // We read fresh state from the store inside the callback so we always
    // persist the latest accumulated value, not a stale closure snapshot.
    const checkpoint = setInterval(() => {
      const s = useStore.getState();
      if (!s.userId || !s.focusSession.isActive) return;

      const totalSeconds = s.focusSession.totalSecondsToday;

      if (totalSeconds <= 0) return;

      // Only write if user has accumulated at least 30 new focus seconds.
      const delta = totalSeconds - lastSavedSeconds.current;
      if (delta < 30) return;

      lastSavedSeconds.current = totalSeconds;
      dbService.saveFocusEntry(s.userId, getTodayLocal(), totalSeconds).catch((e) => {
        console.warn('[LifeOS] Focus checkpoint failed:', e?.message || e);
      });
    }, CHECKPOINT_INTERVAL_MS);

    // When app returns to foreground after backgrounding, sync wall-clock time.
    // FIX: Instead of calling updateFocusTime() (which would add a large delta at once),
    // we update lastStartTime to now so the NEXT normal tick picks up a clean 1s delta.
    // The total elapsed time while backgrounded is added as a single accurate delta.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isActive
      ) {
        const s = useStore.getState();
        if (!s.focusSession.isActive || !s.focusSession.lastStartTime) return;

        // Calculate how long the app was in background
        const backgroundElapsed = (Date.now() - s.focusSession.lastStartTime) / 1000;

        // Guard: if elapsed is unreasonably large (overnight), cap it
        if (backgroundElapsed > 0 && backgroundElapsed < MAX_SESSION_MS / 1000) {
          // Apply the background time as a single accumulated update
          // updateFocusTime will read lastStartTime and add the full delta
          updateFocusTime();
        }
      }

      // Flush to Firestore when app goes to background
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const s = useStore.getState();
        if (s.focusSession.isActive && s.userId && s.focusSession.totalSecondsToday > 0) {
          dbService.saveFocusEntry(s.userId, getTodayLocal(), s.focusSession.totalSecondsToday)
            .catch(() => {});
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      clearInterval(checkpoint);
      subscription.remove();
    };
  }, [isActive, userId, updateFocusTime]);
}
