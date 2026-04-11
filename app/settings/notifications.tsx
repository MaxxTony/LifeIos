import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { Bell, Clock, Calendar, MessageSquare, Info } from 'lucide-react-native';

export default function NotificationsSettings() {
  const [settings, setSettings] = useState({
    push: true,
    habits: true,
    tasks: true,
    mood: false,
    marketing: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Notifications',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Manage how and when you receive alerts from LifeOS to stay on track with your goals.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Main Settings</Text>
          <GlassCard style={styles.card}>
            <ToggleItem 
              icon={Bell} 
              label="Push Notifications" 
              value={settings.push} 
              onToggle={() => toggle('push')} 
            />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <GlassCard style={styles.card}>
            <ToggleItem 
              icon={Calendar} 
              label="Habit Reminders" 
              value={settings.habits} 
              onToggle={() => toggle('habits')} 
            />
            <ToggleItem 
              icon={Clock} 
              label="Task Alerts" 
              value={settings.tasks} 
              onToggle={() => toggle('tasks')} 
            />
            <ToggleItem 
              icon={MessageSquare} 
              label="Mood Check-ins" 
              value={settings.mood} 
              onToggle={() => toggle('mood')} 
            />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <GlassCard style={styles.card}>
            <ToggleItem 
              icon={Info} 
              label="Product Updates" 
              value={settings.marketing} 
              onToggle={() => toggle('marketing')} 
            />
          </GlassCard>
        </View>

        <View style={styles.infoBox}>
          <Info size={16} color={Colors.dark.textSecondary} />
          <Text style={styles.infoText}>
            Priority alerts for habits will override silent mode if configured in your device settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleItem({ icon: Icon, label, value, onToggle }: any) {
  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.iconBg}>
          <Icon size={18} color={Colors.dark.text} />
        </View>
        <Text style={styles.itemLabel}>{label}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: '#3A3A3C', true: Colors.dark.primary }}
        thumbColor="#FFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 120, // Space for header
  },
  description: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemLabel: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 12,
    marginTop: Spacing.md,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
});
