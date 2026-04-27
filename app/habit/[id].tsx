import { BlurView } from '@/components/BlurView';
import { HabitCalendar } from '@/components/HabitCalendar';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useProGate } from '@/hooks/useProFeature';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Calendar, Check, ChevronLeft, Coffee, Flame, Info, Lock, Pencil, Plus, Target, Trash2, Trophy } from 'lucide-react-native';
import React from 'react';
import { Alert, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PremiumCard = ({ children, style }: { children: React.ReactNode, style?: any }) => {
  const colors = useThemeColors();
  return (
    <View style={[
      styles.premiumCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      style
    ]}>
      {children}
    </View>
  );
};

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const habits = useStore(s => s.habits);
  const removeHabit = useStore(s => s.actions.removeHabit);
  const getStreak = useStore(s => s.actions.getStreak);
  const toggleHabit = useStore(s => s.actions.toggleHabit);
  const pauseHabit = useStore(s => s.actions.pauseHabit);
  const { isPro, openPaywall } = useProGate();

  const [showPausePicker, setShowPausePicker] = React.useState(false);
  const isTogglingRef = React.useRef(false);

  const habit = habits.find(h => h.id === id);
  const isCompletedToday = habit?.completedDays.includes(getTodayLocal());

  // Weekly-specific: scheduled day names (moved up to fix "used before declaration" error)
  const ALL_DAYS_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const scheduledDays = (habit?.targetDays || []).map((d: number) => ALL_DAYS_LABELS[d]);

  // ── Due-Day Validation Logic ──
  const { isDueToday, lockMessage } = React.useMemo(() => {
    if (!habit) return { isDueToday: true, lockMessage: '' };
    const todayDate = new Date();

    if (habit.frequency === 'daily') return { isDueToday: true, lockMessage: '' };

    if (habit.frequency === 'weekly') {
      const isDue = (habit.targetDays || []).includes(todayDate.getDay());
      return {
        isDueToday: isDue,
        lockMessage: isDue ? '' : `Only scheduled for ${scheduledDays.join(', ')}`
      };
    }

    if (habit.frequency === 'monthly') {
      const isFixed = habit.monthlyDay && habit.monthlyDay > 0;
      if (isFixed) {
        const isTargetDate = todayDate.getDate() === habit.monthlyDay;
        return {
          isDueToday: isTargetDate,
          lockMessage: isTargetDate ? '' : `Only available on the ${habit.monthlyDay}${habit.monthlyDay === 1 ? 'st' : habit.monthlyDay === 2 ? 'nd' : habit.monthlyDay === 3 ? 'rd' : 'th'} of each month`
        };
      } else {
        const currentMonthStr = getTodayLocal().slice(0, 7);
        const isFixedMode = habit.monthlyDay && habit.monthlyDay > 0;
        const thisMonthCount = habit.completedDays.filter(d => {
          if (!d.startsWith(currentMonthStr)) return false;
          if (isFixedMode) {
            const dayNum = parseInt(d.split('-')[2], 10);
            return dayNum === habit.monthlyDay;
          }
          return true;
        }).length;
        const reached = thisMonthCount >= (habit.monthlyTarget || 1);
        return {
          isDueToday: !reached,
          lockMessage: reached ? 'Monthly target already reached! 🎉' : ''
        };
      }
    }
    return { isDueToday: true, lockMessage: '' };
  }, [habit, scheduledDays]);

  const isLocked = !isDueToday && !isCompletedToday;

  // H-4 FIX: Auto-navigate back if habit is deleted (prevents being stuck in "Not Found")
  React.useEffect(() => {
    if (!habit) {
      const timer = setTimeout(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [habit]);

  if (!habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.liquidBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStreak = getStreak(habit.id);
  const bestStreak = habit.bestStreak || currentStreak;
  const totalCompletions = habit.completedDays.length;

  const streakUnit = habit.frequency === 'daily' ? 'days' : habit.frequency === 'weekly' ? 'weeks' : 'months';

  // Consistency rate adapted per frequency
  const daysSinceCreation = Math.max(1, Math.ceil((Date.now() - habit.createdAt) / (1000 * 60 * 60 * 24)));
  let completionRate = 0;
  if (habit.frequency === 'daily') {
    completionRate = Math.min(100, Math.round((totalCompletions / daysSinceCreation) * 100));
  } else if (habit.frequency === 'weekly') {
    // count weeks since creation, multiply by targetDays per week
    const weeksSinceCreation = Math.max(1, Math.ceil(daysSinceCreation / 7));
    const expectedPerWeek = habit.targetDays?.length || 1;
    const totalExpected = weeksSinceCreation * expectedPerWeek;
    completionRate = Math.min(100, Math.round((totalCompletions / totalExpected) * 100));
  } else {
    // monthly: months since creation × monthlyTarget
    const monthsSinceCreation = Math.max(1, Math.ceil(daysSinceCreation / 30));
    const expectedTotal = monthsSinceCreation * (habit.monthlyTarget || 1);
    completionRate = Math.min(100, Math.round((totalCompletions / expectedTotal) * 100));
  }

  // Monthly-specific: this month's progress
  const today = getTodayLocal();
  const currentMonth = today.slice(0, 7);
  const isFixedMode = habit.monthlyDay && habit.monthlyDay > 0;
  const monthCompletions = habit.completedDays.filter(d => {
    if (!d.startsWith(currentMonth)) return false;
    if (isFixedMode) {
      const dayNum = parseInt(d.split('-')[2], 10);
      return dayNum === habit.monthlyDay;
    }
    return true;
  }).length;
  const monthTarget = habit.monthlyTarget || 1;
  const monthProgress = Math.min(1, monthCompletions / monthTarget);

  // Weekly-specific: scheduled day names moved up to avoid TDZ error


  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit and all its progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeHabit(habit.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Glows */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.secondary + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Liquid Glass Header */}
        <View style={styles.headerContainer}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.headerBlur}>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={22} color={colors.text} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>{habit.icon} {habit.title}</Text>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(habits)/config', params: { habitId: habit.id, title: habit.title, icon: habit.icon, category: habit.category, color: habit.color, frequency: habit.frequency, selectedDays: JSON.stringify(habit.targetDays), goalDays: String(habit.goalDays), monthlyTarget: habit.monthlyTarget != null ? String(habit.monthlyTarget) : '', monthlyDay: habit.monthlyDay != null ? String(habit.monthlyDay) : '', reminderEnabled: habit.reminderTime ? 'true' : 'false', reminderTime: habit.reminderTime || '' } })}
                    style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                    activeOpacity={0.7}
                  >
                    <Pencil size={18} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[styles.liquidBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.headerBlur, { backgroundColor: colors.card }]}>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={22} color={colors.text} />
                </TouchableOpacity>

                <Text style={[styles.headerTitle, { color: colors.text }]}>{habit.icon} {habit.title}</Text>

                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(habits)/config', params: { habitId: habit.id, title: habit.title, icon: habit.icon, category: habit.category, color: habit.color, frequency: habit.frequency, selectedDays: JSON.stringify(habit.targetDays), goalDays: String(habit.goalDays), monthlyTarget: habit.monthlyTarget != null ? String(habit.monthlyTarget) : '', monthlyDay: habit.monthlyDay != null ? String(habit.monthlyDay) : '', reminderEnabled: habit.reminderTime ? 'true' : 'false', reminderTime: habit.reminderTime || '' } })}
                    style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                    activeOpacity={0.7}
                  >
                    <Pencil size={18} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[styles.liquidBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Streak Row */}
          <View style={styles.streakRow}>
            <PremiumCard style={styles.streakCard}>
              <View style={styles.cardHeader}>
                <Flame size={16} color={colors.primary} fill={currentStreak > 0 ? colors.primary : 'transparent'} />
                <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Current Streak</Text>
              </View>
              <Text style={[styles.streakValue, { color: colors.text }]}>{currentStreak} <Text style={styles.unitText}>{streakUnit}</Text></Text>
            </PremiumCard>

            <PremiumCard style={styles.streakCard}>
              <View style={styles.cardHeader}>
                <Trophy size={16} color={colors.secondary} fill={bestStreak > 0 ? colors.secondary : 'transparent'} />
                <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Best Streak</Text>
              </View>
              <Text style={[styles.streakValue, { color: colors.text }]}>{bestStreak} <Text style={styles.unitText}>{streakUnit}</Text></Text>
            </PremiumCard>
          </View>

          {/* Weekly Schedule Summary Card */}
          {habit.frequency === 'weekly' && (
            <PremiumCard style={{ marginBottom: 16, padding: 16 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15 }]}>Weekly Schedule</Text>
              </View>
              <Text style={[{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }]}>Active on {habit.targetDays?.length || 0} day{(habit.targetDays?.length || 0) !== 1 ? 's' : ''} a week</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ALL_DAYS_LABELS.map((label, i) => {
                  const isActive = habit.targetDays?.includes(i);
                  return (
                    <View
                      key={i}
                      style={[
                        { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
                        isActive
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#FFF' : colors.textSecondary + '50' }}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </PremiumCard>
          )}

          {/* Monthly Progress Card */}
          {habit.frequency === 'monthly' && (
            <PremiumCard style={{ marginBottom: 16, padding: 16 }}>
              <View style={styles.sectionHeader}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15 }]}>This Month's Progress</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Target: <Text style={{ color: colors.text, fontWeight: '700' }}>{monthTarget} sessions/month</Text>
                </Text>
                <Text style={{ color: monthProgress >= 1 ? colors.success : colors.primary, fontWeight: '800', fontSize: 13 }}>
                  {monthCompletions} / {monthTarget}
                </Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <LinearGradient
                  colors={monthProgress >= 1 ? [colors.success, colors.success] : [colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: `${monthProgress * 100}%`, height: '100%', borderRadius: 5 }}
                />
              </View>
              {monthProgress >= 1 && (
                <Text style={{ color: colors.success, fontWeight: '800', fontSize: 13, marginTop: 8, textAlign: 'center' }}>🎉 Monthly target hit!</Text>
              )}
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8 }}>
                Commitment: {habit.goalDays} month{habit.goalDays !== 1 ? 's' : ''}
              </Text>
            </PremiumCard>
          )}

          {/* Habit Calendar Section */}
          <PremiumCard style={styles.calendarContainer}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Tracking</Text>
            </View>
            <HabitCalendar
              completedDays={habit.completedDays}
              createdAt={habit.createdAt}
              frequency={habit.frequency}
              targetDays={habit.targetDays}
              monthlyDay={habit.monthlyDay}
              monthlyTarget={habit.monthlyTarget}
              goalDays={habit.goalDays}
            />
            <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
              Joined on {new Date(habit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </PremiumCard>

          {/* Stats Grid */}
          <View style={styles.infoGrid}>
            <PremiumCard style={styles.infoCard}>
              <View style={styles.infoHead}>
                <Target size={14} color={colors.success} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Consistency</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{completionRate}%</Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <LinearGradient colors={[colors.success, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBar, { width: `${completionRate}%` }]} />
              </View>
            </PremiumCard>

            <PremiumCard style={styles.infoCard}>
              <View style={styles.infoHead}>
                <Bell size={14} color={colors.secondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reminder</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{habit.reminderTime || 'None set'}</Text>
            </PremiumCard>

            <PremiumCard style={styles.longInfoCard}>
              <View style={styles.infoHead}>
                <Info size={14} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Completions</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{totalCompletions} successful sessions</Text>
            </PremiumCard>

            {/* F-2: Pause Habit Section (Specialized per frequency) */}
            {!(habit.frequency === 'monthly' && !(habit.monthlyDay && habit.monthlyDay > 0)) && (
              <PremiumCard style={styles.longInfoCard}>
                <View style={styles.infoHead}>
                  <Coffee size={14} color={colors.warning} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Habit Status</Text>
                </View>
                <View style={styles.pauseContent}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {habit.pausedUntil
                        ? `Paused until ${new Date(habit.pausedUntil).toLocaleDateString()}`
                        : 'Active'}
                    </Text>
                    <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                      {habit.pausedUntil
                        ? 'Streak is frozen and won\'t break.'
                        : habit.frequency === 'monthly'
                          ? 'Skip this month if you can\'t make it.'
                          : 'Keep showing up to grow your streak!'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pauseBtn, { backgroundColor: habit.pausedUntil ? colors.success + '15' : colors.warning + '15' }]}
                    onPress={() => {
                      // Gate 4: Habit pause is Pro-only
                      if (!isPro && !habit.pausedUntil) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        openPaywall();
                        return;
                      }
                      if (habit.pausedUntil) {
                        pauseHabit(habit.id, null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } else {
                        if (habit.frequency === 'monthly') {
                          const now = new Date();
                          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                          pauseHabit(habit.id, formatLocalDate(lastDay));
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } else {
                          setShowPausePicker(true);
                        }
                      }
                    }}
                  >
                    <Text style={[styles.pauseBtnText, { color: habit.pausedUntil ? colors.success : colors.warning }]}>
                      {habit.pausedUntil ? 'Resume' : (habit.frequency === 'monthly' ? 'Skip Month' : 'Pause')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            )}
          </View>

          {Platform.OS === 'ios' ? (
            <Modal
              visible={showPausePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowPausePicker(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setShowPausePicker(false)}
              >
                <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              </Pressable>

              <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.sheetHandle, { backgroundColor: colors.textSecondary + '40' }]} />
                  <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Select Pause Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPausePicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.doneBtn, { backgroundColor: colors.primaryTransparent }]}
                  >
                    <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onValueChange={(_, date) => {
                      if (date) {
                        pauseHabit(habit.id, formatLocalDate(date));
                        setShowPausePicker(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    }}
                    textColor={colors.text}
                    themeVariant={colors.isDark ? "dark" : "light"}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            showPausePicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onValueChange={(_, date) => {
                  setShowPausePicker(false);
                  if (date) {
                    pauseHabit(habit.id, formatLocalDate(date));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                onDismiss={() => setShowPausePicker(false)}
              />
            )
          )}

          {/* ── Bottom CTA — adapts to frequency ── */}
          {habit.frequency === 'monthly' ? (
            // Monthly: big log-session button with today's count shown
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                isCompletedToday
                  ? { backgroundColor: colors.isDark ? '#1a332a' : '#f0fdf4', borderColor: colors.success + '40' }
                  : isLocked
                    ? { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border, opacity: 0.6 }
                    : { borderColor: 'transparent' }
              ]}
              onPress={() => {
                if (isLocked) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  import('react-native-toast-message').then(Toast => {
                    Toast.default.show({
                      type: 'info',
                      text1: 'Habit Locked',
                      text2: lockMessage,
                      position: 'bottom'
                    });
                  });
                  return;
                }
                if (isTogglingRef.current) return;
                isTogglingRef.current = true;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                toggleHabit(habit.id);
                setTimeout(() => { isTogglingRef.current = false; }, 500);
              }}
              activeOpacity={0.8}
            >
              {isCompletedToday ? (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                    <Check size={20} color="#FFF" strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.success }]}>Completed Today</Text>
                    <Text style={[styles.toggleSub, { color: colors.success + '80' }]}>Well done! Keep it up tomorrow.</Text>
                  </View>
                </View>
              ) : isLocked ? (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.textSecondary + '20', borderWidth: 1, borderColor: colors.border }]}>
                    <Lock size={18} color={colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.textSecondary }]}>Not Scheduled</Text>
                    <Text style={[styles.toggleSub, { color: colors.textSecondary + '80' }]}>{lockMessage}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Plus size={20} color="#FFF" strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Log Session</Text>
                    <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Tap to record today's session</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            // Daily / Weekly: standard today toggle
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                isCompletedToday
                  ? { backgroundColor: colors.isDark ? '#1a332a' : '#f0fdf4', borderColor: colors.success + '40' }
                  : isLocked
                    ? { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border, opacity: 0.6 }
                    : { borderColor: 'transparent' }
              ]}
              onPress={() => {
                if (isLocked) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  import('react-native-toast-message').then(Toast => {
                    Toast.default.show({
                      type: 'info',
                      text1: 'Habit Locked',
                      text2: lockMessage,
                      position: 'bottom'
                    });
                  });
                  return;
                }
                if (isTogglingRef.current) return;
                isTogglingRef.current = true;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                toggleHabit(habit.id);
                setTimeout(() => { isTogglingRef.current = false; }, 500);
              }}
              activeOpacity={0.8}
            >
              {isCompletedToday ? (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                    <Check size={20} color="#FFF" strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.success }]}>Completed Today</Text>
                    <Text style={[styles.toggleSub, { color: colors.success + '80' }]}>Well done! Keep it up tomorrow.</Text>
                  </View>
                </View>
              ) : isLocked ? (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.textSecondary + '20', borderWidth: 1, borderColor: colors.border }]}>
                    <Lock size={18} color={colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.textSecondary }]}>Not Scheduled</Text>
                    <Text style={[styles.toggleSub, { color: colors.textSecondary + '80' }]}>{lockMessage}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.toggleContent}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Plus size={20} color="#FFF" strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.text }]}>Log Session</Text>
                    <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
                      {habit.frequency === 'weekly' ? 'Tap to mark today done 🗓' : 'Tap to record today\'s session ✨'}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.25, zIndex: -1 },
  headerContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 3, borderColor: 'rgba(255,255,255,0.08)' }
    })
  },
  headerBlur: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  liquidBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  premiumCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
  },
  calendarContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  footerInfo: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  infoCard: {
    width: (width - Spacing.md * 2 - 12) / 2,
    padding: 16,
  },
  longInfoCard: {
    width: '100%',
    padding: 16,
  },
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  toggleBtn: {
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  btnGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 17,
    fontWeight: '800',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  pauseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pauseBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: '50%',
    marginLeft: -20,
    top: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerWrapper: {
    paddingVertical: 10,
    alignItems: 'center',
  }
});
