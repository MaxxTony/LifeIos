import { GlassCard } from '@/components/GlassCard';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useHeaderHeight } from '@react-navigation/elements';
import { Bell, Calendar, Clock, Info, MessageSquare } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function NotificationsSettings() {
  const [settings, setSettings] = useState({
    push: true,
    habits: true,
    tasks: true,
    mood: false,
    marketing: false,
  });
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Manage how and when you receive alerts from LifeOS to stay on track with your goals.
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Main Settings</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Reminders</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
          <GlassCard style={styles.card}>
            <ToggleItem
              icon={Info}
              label="Product Updates"
              value={settings.marketing}
              onToggle={() => toggle('marketing')}
            />
          </GlassCard>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.isDark ? colors.primary + '10' : colors.primary + '05', borderColor: colors.primary + '20', borderWidth: 1 }]}>
          <Info size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Priority alerts for habits will override silent mode if configured in your device settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleItem({ icon: Icon, label, value, onToggle }: any) {
  const colors = useThemeColors();
  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Icon size={18} color={colors.text} />
        </View>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
        thumbColor="#FFF"
        ios_backgroundColor={colors.isDark ? '#3A3A3C' : '#E5E5EA'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  description: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
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
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemLabel: {
    ...Typography.body,
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 12,
    marginTop: Spacing.md,
  },
  infoText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
});
