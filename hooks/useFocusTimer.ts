import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '@/store/useStore';

/**
 * useFocusTimer
 * Global hook to drive the focus session accumulation.
 * Running this at the root (_layout.tsx) ensures focus time is updated
 * regardless of which screen the user is on.
 */
// Maximum session length cap: 24 hours in ms.
// If the app was left running overnight, clamp the elapsed time to avoid garbage data.
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;

export function useFocusTimer() {
  // Selector pattern: subscribe only to primitives so this hook does NOT
  // re-render on every focus tick (only when isActive or lastStartTime changes).
  const isActive = useStore(s => s.focusSession.isActive);
  const lastStartTime = useStore(s => s.focusSession.lastStartTime);
  const updateFocusTime = useStore(s => s.updateFocusTime);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isActive) return;

    // Tick every second while the session is active
    const interval = setInterval(() => {
      updateFocusTime();
    }, 1000);

    // When the app returns to foreground after being backgrounded,
    // immediately sync the wall-clock time that elapsed while suspended.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isActive
      ) {
        // Guard against extreme elapsed times (e.g. overnight)
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
      subscription.remove();
    };
  }, [isActive, lastStartTime, updateFocusTime]);
}
