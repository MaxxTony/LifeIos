import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Bell, Calendar, Clock, MessageSquare, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function NotificationsSettings() {
  const notificationSettings = useStore(s => s.notificationSettings);
  const updateNotificationSettings = useStore(s => s.actions.updateNotificationSettings);
  const colors = useThemeColors();

  const toggle = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({ [key]: !notificationSettings[key] });
  };

  const isMasterOff = !notificationSettings.push;

  // Premium Surface Background Colors
  const cardBg = colors.isDark ? '#111827' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1F2937' : '#F1F5F9';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Personalize how LifeOS keeps you updated and focused on your journey.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Master Control</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <ToggleItem
              icon={Bell}
              label="Push Notifications"
              description="Allow LifeOS to send alerts to your device"
              value={notificationSettings.push}
              onToggle={() => toggle('push')}
              accentColor={colors.primary}
              isLast
            />
          </View>
        </View>

        <View style={[styles.section, isMasterOff && styles.disabledSection]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Categories</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <ToggleItem
              icon={Calendar}
              label="Habit Reminders"
              description="Nudges for your daily routines"
              value={notificationSettings.habits}
              onToggle={() => toggle('habits')}
              disabled={isMasterOff}
              accentColor="#FF6B6B"
            />
            <ToggleItem
              icon={Clock}
              label="Task Alerts"
              description="Coming up tasks & missed alerts"
              value={notificationSettings.tasks}
              onToggle={() => toggle('tasks')}
              disabled={isMasterOff}
              accentColor="#4DABF7"
            />
            <ToggleItem
              icon={MessageSquare}
              label="Mood In-app Nudges"
              description="Evening check-ins & reflections"
              value={notificationSettings.mood}
              onToggle={() => toggle('mood')}
              disabled={isMasterOff}
              accentColor="#FCC419"
              isLast
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.infoBox, { 
            backgroundColor: colors.isDark ? 'rgba(124, 92, 255, 0.08)' : 'rgba(124, 92, 255, 0.05)', 
            borderColor: colors.primary + '20' 
          }]}>
            <ShieldCheck size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your notification preferences are securely synced across all your devices.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleItem({ 
  icon: Icon, 
  label, 
  description, 
  value, 
  onToggle, 
  disabled, 
  accentColor,
  isLast 
}: any) {
  const colors = useThemeColors();
  
  return (
    <View style={[
      styles.item, 
      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.isDark ? '#1F2937' : '#F8FAFC' },
      disabled && { opacity: 0.4 }
    ]}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: accentColor + (colors.isDark ? '25' : '15') }]}>
          <Icon size={20} color={accentColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.isDark ? '#374151' : '#E5E7EB', true: accentColor }}
        thumbColor="#FFF"
        ios_backgroundColor={colors.isDark ? '#374151' : '#E5E7EB'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  description: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    opacity: 0.5,
  },
  disabledSection: {
    opacity: 0.6,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    // Add subtle shadow for light mode
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  itemLabel: {
    ...Typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  itemDescription: {
    ...Typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: Spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 18,
  },
});
