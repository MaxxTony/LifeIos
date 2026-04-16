import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text, TouchableOpacity, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const _hasHydrated = useStore(s => s._hasHydrated);
  const { tasksLoaded, habitsLoaded } = useStore(s => s.syncStatus);
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const hasCompletedOnboarding = useStore(s => s.hasCompletedOnboarding);
  const tasks = useStore(s => s.tasks);
  
  const setHasHydrated = useStore(s => s.actions.setHasHydrated);
  const retrySync = useStore(s => s.actions.retrySync);
  const colors = useThemeColors();
  const [showWatchdog, setShowWatchdog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [forceContinue, setForceContinue] = useState(false);

  // C-14: Watchdog for both hydration (local) and sync (cloud)
  useEffect(() => {
    let timer: any;
    if (!_hasHydrated || (isAuthenticated && !tasksLoaded && !forceContinue)) {
      timer = setTimeout(() => {
        setShowWatchdog(true);
      }, 10000); // 10s timeout
    } else {
      setShowWatchdog(false);
    }
    return () => clearTimeout(timer);
  }, [_hasHydrated, isAuthenticated, tasksLoaded, forceContinue]);

  const handleManualHydration = () => {
    if (!_hasHydrated) {
      setHasHydrated(true);
    } else {
      setForceContinue(true);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retrySync();
    } catch (e) {
      Alert.alert("Sync Failed", "Could not connect to cloud. Using local data only.");
      setForceContinue(true);
    } finally {
      setIsRetrying(false);
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
            await AsyncStorage.removeItem('lifeos-storage');
            setHasHydrated(true);
            setForceContinue(true);
          } 
        }
      ]
    );
  };

  // 1. Wait for Local Hydration
  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 13 }}>Waking up LifeOS...</Text>
        
        {showWatchdog && (
          <View style={{ marginTop: 40, alignItems: 'center', width: '100%' }}>
            <TouchableOpacity 
              onPress={handleManualHydration}
              style={{ padding: 14, backgroundColor: colors.primary, borderRadius: 12, marginBottom: 12, width: '80%' }}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', textAlign: 'center' }}>Force Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEmergencyReset}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>Reset Local Cache</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // 2. Wait for Cloud Sync (if authenticated)
  // We only block if we have 0 tasks. If we have local tasks, we can show them while syncing.
  const isSyncingInitial = isAuthenticated && !tasksLoaded && tasks.length === 0 && !forceContinue;
  
  if (isSyncingInitial) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.text, marginTop: 16, fontFamily: 'Outfit-Bold', fontSize: 18 }}>Syncing your LifeOS...</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Fetching your latest tasks and habits from the cloud.</Text>
        
        {showWatchdog && (
          <View style={{ marginTop: 40, alignItems: 'center', width: '100%' }}>
             <TouchableOpacity 
              onPress={handleRetry}
              disabled={isRetrying}
              style={{ padding: 14, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 12, width: '80%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}
            >
              {isRetrying && <ActivityIndicator size="small" color={colors.primary} />}
              <Text style={{ color: colors.text, fontWeight: 'bold' }}>{isRetrying ? 'Retrying...' : 'Retry Sync'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setForceContinue(true)}
              style={{ padding: 12 }}
            >
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Skip & Work Offline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // 3. Routing Logic
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
