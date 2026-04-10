import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs 
      tintColor={Colors.dark.primary} 
      // "liquid glass" effect is achieved via the native iOS tab bar behavior
    >
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
