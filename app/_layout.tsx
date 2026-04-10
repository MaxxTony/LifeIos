import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

export default function RootLayout() {
  const { setAuth } = useStore();

  useEffect(() => {
    // Subscribe to Firebase Auth state changes
    const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
      if (user) {
        setAuth(user.uid, user.displayName || user.email?.split('@')[0] || 'User');
        // Fetch tasks and other data from Firestore
        await useStore.getState().hydrateFromCloud();
      } else {
        setAuth(null, null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai-chat" options={{ headerShown: true, title: 'AI Assistant', headerBackButtonDisplayMode: "generic" }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
