import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setAuth, themePreference, accentColor, _hasHydrated, performDailyReset } = useStore();
  const systemColorScheme = useColorScheme();

  const themeMode = themePreference === 'system' 
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : themePreference;

  const isDark = themeMode === 'dark';
  
  // Create a custom theme object that injects the accent color
  const navTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: accentColor,
    }
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: accentColor,
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

        setAuth(user.uid, user.displayName || user.email?.split('@')[0] || 'User');
        
        // Fetch tasks and other data from Firestore
        try {
          await useStore.getState().hydrateFromCloud();
        } catch (err) {
          console.error('Hydration error:', err);
        }
      } else {
        setAuth(null, null);
      }
    });

    return () => unsubscribe();
  }, [setAuth]);

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
        // Logic to navigate can be added here
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)/index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            <Stack.Screen name="tasks/create" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="tasks/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="focus-detail" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="mood-history" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="mood-log" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="mood-themes" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/notifications" options={{ headerShown: true, title: 'Notifications' }} />
            <Stack.Screen name="settings/appearance" options={{ headerShown: true, title: 'Appearance' }} />
            <Stack.Screen name="settings/privacy" options={{ headerShown: true, title: 'Privacy & Security' }} />
            <Stack.Screen name="settings/feedback" options={{ headerShown: true, title: 'Send Feedback' }} />
            <Stack.Screen name="settings/help" options={{ headerShown: true, title: 'Help Center' }} />
            <Stack.Screen name="settings/about" options={{ headerShown: true, title: 'About LifeOS' }} />
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Toast />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
