import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { 
  Bell, 
  Calendar, 
  Clock, 
  MessageSquare, 
  ShieldCheck, 
  Zap, 
  Target, 
  Trophy, 
  Sparkles, 
  Timer, 
  History, 
  Sunrise, 
  AlertCircle 
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

export default function NotificationsSettings() {
  const notificationSettings = useStore(s => s.notificationSettings);
  const updateNotificationSettings = useStore(s => s.actions.updateNotificationSettings);
  const colors = useThemeColors();

  const toggle = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({ [key]: !notificationSettings[key] });
  };

  const isMasterOff = !notificationSettings.masterEnabled;

  // Premium Surface Colors - More subtle but crisp
  const cardBg = colors.isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)';
  const borderColor = colors.isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.8)';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Master your attention. Control how LifeOS keeps you updated and focused.
          </Text>
        </Animated.View>

        {/* Master Control - Compact Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Master Control</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
            <ToggleItem
              icon={Bell}
              label="All Notifications"
              description="Global toggle for all system alerts"
              value={notificationSettings.masterEnabled}
              onToggle={() => toggle('masterEnabled')}
              accentColor={colors.primary}
              isLast
              isMaster
            />
          </View>
        </Animated.View>

        {/* Habits & Tasks */}
        <Section title="Habits & Tasks" delay={300} disabled={isMasterOff}>
          <ToggleItem
            icon={Calendar}
            label="Habit Reminders"
            description="Nudges for your routines"
            value={notificationSettings.habitReminders}
            onToggle={() => toggle('habitReminders')}
            accentColor="#FF6B6B"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Clock}
            label="Task Reminders"
            description="5min before start"
            value={notificationSettings.taskReminders}
            onToggle={() => toggle('taskReminders')}
            accentColor="#4DABF7"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={AlertCircle}
            label="Missed Alerts"
            description="Passed end time nudges"
            value={notificationSettings.missedTaskAlert}
            onToggle={() => toggle('missedTaskAlert')}
            accentColor="#FF922B"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Sunrise}
            label="Morning Brief"
            description="8:00 AM daily overview"
            value={notificationSettings.morningBrief}
            onToggle={() => toggle('morningBrief')}
            accentColor="#FCC419"
            disabled={isMasterOff}
            isLast
          />
        </Section>

        {/* Streaks & XP */}
        <Section title="Streaks & XP" delay={400} disabled={isMasterOff}>
          <ToggleItem
            icon={Zap}
            iconSize={16}
            label="Streak Warning"
            description="10 PM panic alert"
            value={notificationSettings.streakWarning}
            onToggle={() => toggle('streakWarning')}
            accentColor="#7950F2"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Target}
            label="Quest Progress"
            description="9 PM FOMO reminder"
            value={notificationSettings.questCompleted}
            onToggle={() => toggle('questCompleted')}
            accentColor="#22B8CF"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Trophy}
            label="Leaderboard"
            description="Sunday Night alerts"
            value={notificationSettings.weeklyLeaderboard}
            onToggle={() => toggle('weeklyLeaderboard')}
            accentColor="#FAB005"
            disabled={isMasterOff}
            isLast
          />
        </Section>

        {/* Wellness & Focus */}
        <Section title="Wellness & Focus" delay={500} disabled={isMasterOff}>
           <ToggleItem
            icon={MessageSquare}
            label="Mood Check-in"
            description="8 PM daily reflections"
            value={notificationSettings.dailyMoodCheckin}
            onToggle={() => toggle('dailyMoodCheckin')}
            accentColor="#FF8787"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Sparkles}
            label="AI Coach"
            description="Supportive progress insights"
            value={notificationSettings.aiCoachNudge}
            onToggle={() => toggle('aiCoachNudge')}
            accentColor="#20C997"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Timer}
            label="Pomodoro"
            description="Phase completion alerts"
            value={notificationSettings.pomodoroAlert}
            onToggle={() => toggle('pomodoroAlert')}
            accentColor="#5C7CFA"
            disabled={isMasterOff}
            isLast
          />
        </Section>

        {/* Retention */}
        <Section title="System" delay={600} disabled={isMasterOff}>
          <ToggleItem
            icon={History}
            label="Comeback (48h)"
            description="2-day inactivity nudge"
            value={notificationSettings.comeback48h}
            onToggle={() => toggle('comeback48h')}
            accentColor="#AE3EC9"
            disabled={isMasterOff}
          />
          <ToggleItem
            icon={Bell}
            label="Weekly Recaps"
            description="7-day summary alert"
            value={notificationSettings.comeback7d}
            onToggle={() => toggle('comeback7d')}
            accentColor="#94A3B8"
            disabled={isMasterOff}
            isLast
          />
        </Section>

        <Animated.View entering={FadeInUp.delay(800)} style={styles.footer}>
          <View style={[styles.infoBox, { 
            backgroundColor: colors.isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)', 
            borderColor: borderColor 
          }]}>
            <ShieldCheck size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Preferences are encrypted and synced to your LifeOS account.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, delay, disabled }: any) {
  const colors = useThemeColors();
  const cardBg = colors.isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)';
  const borderColor = colors.isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(226, 232, 240, 0.8)';

  return (
    <Animated.View 
      entering={FadeInDown.delay(delay)} 
      layout={Layout.springify().damping(15)}
      style={[styles.section, disabled && styles.disabledSection]}
    >
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
        {children}
      </View>
    </Animated.View>
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
  isLast,
  isMaster
}: any) {
  const colors = useThemeColors();
  
  return (
    <Pressable 
      onPress={!disabled || isMaster ? onToggle : undefined}
      style={({ pressed }) => [
        styles.item, 
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)' },
        pressed && !disabled && { backgroundColor: 'rgba(0,0,0,0.02)' }
      ]}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: accentColor + (colors.isDark ? '25' : '15') }]}>
          <Icon size={18} color={accentColor} />
        </View>
        <View style={styles.textContainer}>
          <Text 
            style={[
              isMaster ? styles.itemLabelMaster : styles.itemLabel, 
              { color: colors.text }
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text 
            style={[styles.itemDescription, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled && !isMaster}
        trackColor={{ false: colors.isDark ? '#1E293B' : '#E2E8F0', true: accentColor }}
        thumbColor="#FFF"
        ios_backgroundColor={colors.isDark ? '#1E293B' : '#E2E8F0'}
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} // Slightly smaller switch
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  header: {
    marginBottom: Spacing.lg,
    paddingHorizontal: 4,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    fontSize: 11,
    opacity: 0.5,
  },
  disabledSection: {
    opacity: 0.4,
  },
  card: {
    borderRadius: 16, // Reduced border radius as requested
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, // Reduced vertical spacing
    paddingHorizontal: Spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconContainer: {
    width: 36, // Smaller icon container
    height: 36,
    borderRadius: 10, // Matching smaller border radius
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15, // Reduced font size
    marginBottom: 0,
  },
  itemLabelMaster: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 0,
  },
  itemDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11, // Smaller description
    opacity: 0.6,
  },
  footer: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
    width: '100%',
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    flex: 1,
    lineHeight: 16,
  },
});
