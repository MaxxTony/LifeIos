
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef } from 'react';
import { AppState, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
// Importing the service registers the background task definition at module load time.
import { OfflineBanner } from '@/components/OfflineBanner';
import { AI_COACH_TASK, registerAICoachTask, runAICoachTask } from '@/services/aiCoachService';
import { initCrashAnalytics } from '@/services/crashAnalytics';


initCrashAnalytics();

// C-8: Redundant definition to ensure Expo Router handles background wake-ups correctly.
TaskManager.defineTask(AI_COACH_TASK, runAICoachTask);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Granular selectors: each field re-renders the layout only when it changes.
  // focusSession.isActive is selected as a primitive to avoid re-renders every tick.
  const setAuth = useStore(s => s.actions.setAuth);
  const themePreference = useStore(s => s.themePreference);
  const accentColor = useStore(s => s.accentColor);
  const _hasHydrated = useStore(s => s._hasHydrated);
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const performDailyReset = useStore(s => s.actions.performDailyReset);
  const focusIsActive = useStore(s => s.focusSession.isActive);
  const checkMissedTasks = useStore(s => s.actions.checkMissedTasks);
  const systemColorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);
  const wasAuthenticated = useRef(false);
  const router = useRouter();

  // Start the global focus timer
  useFocusTimer();

  // Keep screen awake while a focus session is active (must be in root layout, not a modal)
  useEffect(() => {
    if (focusIsActive) {
      activateKeepAwakeAsync().catch(() => { });
    } else {
      deactivateKeepAwake();
    }
  }, [focusIsActive]);

  // Redirect to login when the user is deleted server-side or their session is invalidated.
  // We only redirect if the user was previously authenticated (avoids spurious redirects
  // on initial load before Firebase resolves the session).
  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      wasAuthenticated.current = true;
    } else if (wasAuthenticated.current) {
      wasAuthenticated.current = false;
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, _hasHydrated]);

  const themeMode = themePreference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const isDark = themeMode === 'dark';

  // Create a custom theme object that injects the accent color
  const navTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: accentColor || '#7C5CFF',
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: accentColor || '#7C5CFF',
    }
  };

  const [loaded, error] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // FIX C-4: Trigger daily reset once store has hydrated from AsyncStorage
  useEffect(() => {
    if (_hasHydrated) {
      performDailyReset();
    }
  }, [_hasHydrated]);

  // Global missed-task checker: runs at root level so it fires on all screens
  useEffect(() => {
    checkMissedTasks();
    const missedInterval = setInterval(checkMissedTasks, 60_000);

    // Also re-check when app returns to foreground
    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        performDailyReset();
        checkMissedTasks();

        // TEST A-1 & A-3: Foreground Session Validation
        const { isAuthenticated, userId } = useStore.getState();
        if (isAuthenticated && authService.currentUser) {
          const isValid = await authService.validateSession(authService.currentUser);
          if (!isValid) {
            console.warn('[LifeOS] Foreground session invalid - logging out.');
            await authService.logout();
            setAuth(null, null);
          }
        }
      }
      appState.current = next;
    });

    return () => {
      clearInterval(missedInterval);
      sub.remove();
    };
  }, []);

  // Phase 2: Re-engagement & Proactive Logic
  useEffect(() => {
    if (_hasHydrated) {
      const { setLastActive } = useStore.getState().actions;
      setLastActive();

      // Schedule comeback notifications for when user closes app
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.scheduleComebackNotifications();
      });

      // Phase 4: Register Background AI Coach
      registerAICoachTask();
    }
  }, [_hasHydrated]);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
      if (user) {
        // Double check session validity (handles server-side deletion)
        const isValid = await authService.validateSession(user);

        if (!isValid) {
          await authService.logout();
          setAuth(null, null);
          return;
        }

        // setAuth already calls subscribeToCloud() which sets up real-time listeners
        // for tasks, habits, mood, focus and the root profile — no separate
        // hydrateFromCloud() call needed (would race with the real-time listeners).
        setAuth(user.uid, user.displayName || user.email?.split('@')[0] || 'User');
      } else {
        setAuth(null, null);
      }
    });

    return () => unsubscribe();
  }, [setAuth]);

  // C-5: Automatic Sync on Network Recovery
  const isOffline = useStore(s => s.syncStatus.isOffline);
  const retrySync = useStore(s => s.actions.retrySync);
  const hasHydrated = useStore(s => s._hasHydrated);
  // Track the previous offline state so we only trigger on a genuine offline→online
  // transition, not on initial mount or hydration (which would log "Connection restored"
  // every cold start even when there was never an outage).
  const prevIsOffline = useRef<boolean | null>(null);

  useEffect(() => {
    const wasOffline = prevIsOffline.current;
    prevIsOffline.current = isOffline;

    // Only sync when we just recovered from an actual offline state
    if (!isOffline && hasHydrated && wasOffline === true) {
      console.log('[LifeOS] Connection restored. Triggering automatic sync engine...');
      retrySync();
    }
  }, [isOffline, hasHydrated, retrySync]);

  useEffect(() => {
    // Listen for foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const { title, body } = notification.request.content;
      Toast.show({
        type: 'info',
        text1: title || 'LifeOS Notification',
        text2: body || '',
        position: 'top',
        visibilityTime: 5000,
        autoHide: true,
        onPress: () => {
          // Handle navigation if needed
          Toast.hide();
        }
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification click when app is in background/closed
      const data = response.notification.request.content.data;
      if (data?.habitId) {
        router.push(`/habit/${data.habitId}`);
      } else if (data?.taskId) {
        router.push(`/tasks/${data.taskId}`);
      } else if (data?.type === 'PROACTIVE_AI') {
        router.push('/ai-chat');
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <ThemeProvider value={navTheme}>
          <OfflineBanner />
          <Stack screenOptions={{
            headerTintColor: accentColor || '#7C5CFF',
            headerShown: false
          }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)/index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(habits)" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="tasks/create" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="tasks/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="focus-detail" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="mood-history" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="mood-log" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="mood-themes" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="all-habits" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="all-tasks" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="settings/notifications" options={{ headerShown: true, title: 'Notifications', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="settings/appearance" options={{ headerShown: true, title: 'Appearance', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="settings/privacy" options={{ headerShown: true, title: 'Privacy & Security', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="settings/feedback" options={{ headerShown: true, title: 'Send Feedback', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="settings/help" options={{ headerShown: true, title: 'Help Center', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="settings/about" options={{ headerShown: true, title: 'About LifeOS', headerBackButtonDisplayMode: "generic" }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Toast />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
