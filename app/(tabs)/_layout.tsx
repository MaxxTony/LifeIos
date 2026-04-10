import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
/** @ts-ignore - experimental API */
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Android-specific Tab Bar implementation with Solid Premium Design.
 * Respects SafeArea insets to avoid system navigation overlap.
 */
function AndroidTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#A78BFF', // Light purple for active
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 10,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: '#12121A', // Deep dark purple/black
          borderTopWidth: 1,
          borderTopColor: 'rgba(124, 92, 255, 0.2)', // Subtle purple glow on top
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          elevation: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * iOS-specific implementation using Native Apple Tab Bar and SF Symbols.
 */
function IOSTabs() {
  return (
    <NativeTabs tintColor={Colors.dark.primary}>
      <NativeTabs.Trigger name="index">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <Icon sf="chart.bar.fill" />
        <Label>Progress</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  // Use Native iOS tabs on iPhone, and Solid Premium Tabs on Android
  return Platform.OS === 'ios' ? <IOSTabs /> : <AndroidTabs />;
}
