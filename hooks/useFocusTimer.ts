import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '@/store/useStore';

/**
 * useFocusTimer
 * Global hook to drive the focus session accumulation.
 * Running this at the root (_layout.tsx) ensures focus time is updated
 * regardless of which screen the user is on.
 */
export function useFocusTimer() {
  const { focusSession, updateFocusTime } = useStore();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let interval: any = null;

    if (focusSession.isActive) {
      // Start global interval
      interval = setInterval(() => {
        updateFocusTime();
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    // AppState listener to handle background/foreground transitions
    // This ensures that when the user comes back to the app, 
    // we immediately sync the time elapsed while backgrounded.
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        focusSession.isActive
      ) {
        // App has come to the foreground
        updateFocusTime();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (interval) clearInterval(interval);
      subscription.remove();
    };
  }, [focusSession.isActive, updateFocusTime]);
}
