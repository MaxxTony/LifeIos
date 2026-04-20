
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

import { useEffect, useRef } from 'react';
import { AppState, useColorScheme, View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import ConfettiCannon from 'react-native-confetti-cannon';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerAllBackgroundTasks } from '@/services/backgroundService';
import { analyticsService } from '@/services/analyticsService';
import { initCrashAnalytics } from '@/services/crashAnalytics';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_700Bold } from '@expo-google-fonts/outfit';



import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '../widget/WidgetTaskHandler';

if (!__DEV__) initCrashAnalytics();

// Register the Android Widget background handler (ignored on iOS)
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

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
  const globalConfetti = useStore(s => s.globalConfetti);
  const checkMissedTasks = useStore(s => s.actions.checkMissedTasks);
  const systemColorScheme = useColorScheme();
  const appState = useRef(AppState.currentState);
  const wasAuthenticated = useRef(false);
  const isValidatingSession = useRef(false); // C-AUTH-6 FIX: Guard against double-fires
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
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,  // ADD
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,       // ADD
    'Outfit-Bold': Outfit_700Bold,
  });

  // Watchdog for hydration stuck
  useEffect(() => {
    if (!_hasHydrated) {
      const timer = setTimeout(() => {
        if (!useStore.getState()._hasHydrated) {
          console.error('[LifeOS Watchdog] Hydration stuck for 10s. Forcing reset/logout.');
          useStore.getState().actions.logout();
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [_hasHydrated]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // FIX C-4: Trigger daily reset once store has hydrated from AsyncStorage
  useEffect(() => {
    if (_hasHydrated) {
      performDailyReset();
      useStore.getState().actions.generateDailyQuests();
      analyticsService.initAnalyticsService();

      // BUG-NET-4 FIX: Replace google.com with cloudflare's lightweight trace endpoint.
      // google.com is blocked in China / many corporate networks → app always shows offline.
      // cloudflare.com/cdn-cgi/trace is a neutral ~500B text endpoint available globally.
      const checkConnection = async () => {
        try {
          const resp = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { method: 'GET', cache: 'no-store' });
          useStore.setState(s => ({ syncStatus: { ...s.syncStatus, isOffline: !resp.ok } }));
        } catch {
          useStore.setState(s => ({ syncStatus: { ...s.syncStatus, isOffline: true } }));
        }
      };
      const connInterval = setInterval(checkConnection, 15000);
      checkConnection();
      return () => clearInterval(connInterval);
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
        const { isAuthenticated } = useStore.getState();
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

      // Schedule all re-engagement notifications on every hydration.
      // Each function cancels its old notification before re-scheduling so content stays fresh.
      import('@/services/notificationService').then(({ notificationService }) => {
        notificationService.scheduleComebackNotifications();
        notificationService.scheduleStreakWarningNotification();
        notificationService.scheduleMorningBrief();
        notificationService.scheduleQuestFOMO();
      });

      // Weekly leaderboard alert — schedule with live rank so copy is personalised.
      // Fetch rank only on Sunday to avoid unnecessary Firestore reads every app open.
      const leaderboardUserId = useStore.getState().userId;
      if (leaderboardUserId) {
        const todayDay = new Date().getDay(); // 0 = Sunday
        import('@/services/notificationService').then(({ notificationService }) => {
          if (todayDay === 0) {
            // It's Sunday — fetch actual rank from leaderboard for personalised copy
            import('@/services/socialService').then(({ socialService }) => {
              socialService.getLeaderboard(leaderboardUserId).then(profiles => {
                const sorted = [...profiles].sort((a, b) => (b.weeklyXP || 0) - (a.weeklyXP || 0));
                const rank = sorted.findIndex(p => p.userId === leaderboardUserId) + 1;
                notificationService.scheduleWeeklyLeaderboardAlert(rank > 0 ? rank : undefined);
              }).catch(() => {
                notificationService.scheduleWeeklyLeaderboardAlert();
              });
            });
          } else {
            // Not Sunday — schedule without rank (no Firestore read needed)
            notificationService.scheduleWeeklyLeaderboardAlert();
          }
        });
      }

      // BUG-AUTH-3 FIX: Reschedule ALL habit notifications after reinstall.
      // After an OS reinstall or app cache clear, all locally-scheduled notifications
      // are gone. We re-register them on every hydration when the user is authenticated,
      // which is cheap since scheduleHabitReminder() is idempotent (cancels old → reschedules).
      const { isAuthenticated: authed, habits, userId: uid } = useStore.getState();
      if (authed && uid && habits.length > 0) {
        import('@/services/notificationService').then(({ notificationService }) => {
          notificationService.requestPermissions().then(granted => {
            if (!granted) return;
            habits.forEach(habit => {
              if (habit.reminderTime && habit.targetDays && habit.targetDays.length > 0) {
                notificationService.scheduleHabitReminder(
                  habit.id,
                  habit.title,
                  habit.icon || '📅',
                  habit.reminderTime,
                  habit.frequency || 'daily',
                  habit.targetDays,
                  habit.monthlyDay
                );
              }
            });
          });
        });
      }

      // Phase 4: Register Background Services
      registerAllBackgroundTasks();
    }
  }, [_hasHydrated]);

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
      // C-AUTH-6 FIX: Guard against double-fires during signup flows
      if (isValidatingSession.current) {
        console.log('[LifeOS] onAuthStateChanged ignored - already validating session.');
        return;
      }
      isValidatingSession.current = true;

      try {
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
      } finally {
        isValidatingSession.current = false;
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

      // C-AUTH-3 FIX: Proactive auth refresh on network recovery
      // This catches users whose tokens expired or were revoked while offline.
      if (authService.currentUser) {
        authService.currentUser.getIdToken(true).catch(e => {
          if (
            e.code === 'auth/user-not-found' || 
            e.code === 'auth/id-token-revoked'
          ) {
            console.warn('[LifeOS] Auth token invalid on reconnect - logging out.');
            authService.logout(); // Ensure Firebase is also signed out
            setAuth(null, null);
          }
        });
      }
    }
  }, [isOffline, hasHydrated, retrySync, setAuth]);

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
        // C-22 FIX: Use explicit params for reliable Expo Router dynamic route matching.
        router.push({ pathname: '/tasks/[id]', params: { id: data.taskId } } as any);
      } else if (data?.type === 'PROACTIVE_AI') {
        router.push('/ai-chat');
      } else if (data?.type === 'MORNING_BRIEF') {
        router.replace('/(tabs)');
      } else if (data?.type === 'QUEST_FOMO') {
        router.replace('/(tabs)');
      } else if (data?.type === 'WEEKLY_LEADERBOARD') {
        router.push('/social-leaderboard');
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
            <Stack.Screen name="social-leaderboard" options={{ presentation: 'modal', headerShown: false }} />
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
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
          {globalConfetti && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ConfettiCannon
                count={150}
                origin={{ x: -10, y: 0 }}
                autoStart={true}
                fadeOut={true}
                fallSpeed={3000}
                explosionSpeed={350}
                colors={['#7C5CFF', '#00D1FF', '#FF00B8', '#FFD700', '#10B981']}
              />
            </View>
          )}
          <Toast />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
