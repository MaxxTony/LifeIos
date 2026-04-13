import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import React from 'react';

export default function Index() {
  const _hasHydrated = useStore(s => s._hasHydrated);
  const hasCompletedOnboarding = useStore(s => s.hasCompletedOnboarding);
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const colors = useThemeColors();

  // Wait for AsyncStorage to hydrate the store before deciding where to navigate
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
