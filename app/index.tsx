import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '@/store/useStore';

export default function Index() {
  const { _hasHydrated, hasCompletedOnboarding, isAuthenticated } = useStore();

  // Wait for AsyncStorage to hydrate the store before deciding where to navigate
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" />
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
