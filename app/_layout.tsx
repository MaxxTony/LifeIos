import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setAuth } = useStore();
  
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

  if (!loaded && !error) {
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)/index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai-chat" options={{ headerShown: true, title: 'AI Assistant', headerBackButtonDisplayMode: "generic" }} />
        <Stack.Screen name="tasks/create" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="tasks/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
      <Toast />
    </ThemeProvider>
  );
}
