import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const _hasHydrated = useStore(s => s._hasHydrated);
  const _authStateResolved = useStore(s => s._authStateResolved);
  const { tasksLoaded, habitsLoaded, profileLoaded } = useStore(s => s.syncStatus);
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const hasCompletedOnboarding = useStore(s => s.hasCompletedOnboarding);
  const tasks = useStore(s => s.tasks);
  
  const setHasHydrated = useStore(s => s.actions.setHasHydrated);
  const retrySync = useStore(s => s.actions.retrySync);
  const colors = useThemeColors();
  const [showWatchdog, setShowWatchdog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [forceContinue, setForceContinue] = useState(false);

  // C-14: Watchdog for hydration (local), Firebase auth resolution, and cloud sync
  useEffect(() => {
    let timer: any;
    if (!_hasHydrated || !_authStateResolved || (isAuthenticated && !tasksLoaded && !forceContinue)) {
      // BUG-NET-1 FIX: 5s threshold instead of 10s — users on slow connections
      // should see recovery options sooner, not wait a full 10 seconds.
      timer = setTimeout(() => {
        setShowWatchdog(true);
      }, 5000);
    } else {
      setShowWatchdog(false);
    }
    return () => clearTimeout(timer);
  }, [_hasHydrated, _authStateResolved, isAuthenticated, tasksLoaded, forceContinue]);

  const handleManualHydration = () => {
    if (!_hasHydrated) {
      setHasHydrated(true);
    }
    if (!_authStateResolved) {
      useStore.setState({ _authStateResolved: true });
    }
    setForceContinue(true);
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await retrySync();
    setIsRetrying(false);
    const syncError = useStore.getState().syncError;
    if (syncError) {
      Alert.alert("Sync Failed", "Could not connect to cloud. Using local data only.");
      setForceContinue(true);
    }
  };

  const handleEmergencyReset = () => {
    Alert.alert(
      "App Fix",
      "If the app is stuck, we can clear the local cache and restart. You may need to log in again.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear & Restart", 
          style: "destructive", 
          onPress: async () => {
            await (AsyncStorage as any).multiRemove([
              'lifeos-storage',
              'lifeos-storage:core',
              'lifeos-storage:tasks',
              'lifeos-storage:hist',
            ]);
            setHasHydrated(true);
            useStore.setState({ _authStateResolved: true });
            setForceContinue(true);
          }
        }
      ]
    );
  };

  // 1. Core Hydration Check
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 13 }}>Waking up LifeOS...</Text>
      </View>
    );
  }

  // 2. Instant Routing Logic
  // We trust the local cache (AsyncStorage) for the fastest possible boot.
  if (isAuthenticated) {
    console.log('[LifeOS Index] Authenticated in cache. Instant-On to Dashboard.');
    return <Redirect href="/(tabs)" />;
  }

  // 3. If NOT authenticated in cache, wait for Firebase to be 100% sure.
  if (!_authStateResolved) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 13 }}>Checking Session...</Text>
      </View>
    );
  }

  // 4. Final Fallback (Unauthenticated)
  if (hasCompletedOnboarding) {
    console.log('[LifeOS Index] Not authenticated. -> Login');
    return <Redirect href="/(auth)/login" />;
  }
  
  console.log('[LifeOS Index] New user. -> Onboarding');
  return <Redirect href="/(onboarding)" />;
}
