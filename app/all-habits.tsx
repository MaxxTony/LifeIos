import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, ChevronLeft, Trash2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AllHabitsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { habits, toggleHabit, getStreak, removeHabit } = useStore();
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Habit',
      `Delete "${title}" and all its progress?`,
      [
        {
          text: 'Cancel', style: 'cancel',
          onPress: () => swipeableRefs.current.get(id)?.close()
        },
        {
          text: 'Delete', style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeHabit(id);
          }
        }
      ]
    );
  };

  const renderRightActions = (id: string, title: string) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      onPress={() => handleDelete(id, title)}
    >
      <Trash2 size={20} color="#FFF" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatLocalDate(d);
    });
  };

  const renderDots = (completedDays: string[]) => {
    const weekDates = getWeekDates();
    const today = getTodayLocal();
    
    return (
      <View style={styles.dotsRow}>
        {weekDates.map((dateString, i) => {
          const isCompleted = completedDays.includes(dateString);
          const isToday = dateString === today;
          const isFuture = dateString > today;

          return (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', borderColor: 'transparent' },
                isCompleted && [styles.dotCompleted, { backgroundColor: colors.success }],
                isToday && [styles.dotToday, { borderColor: colors.textSecondary }],
                isFuture && { opacity: 0.5 }
              ]}
            >
              {isCompleted && <Ionicons name="checkmark" size={6} color="#FFF" />}
            </View>
          );
        })}
      </View>
    );
  };

  const streakColor = colors.isDark ? '#FF8C42' : '#EA580C';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Glows */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.success + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Liquid Glass Header */}
        <View style={styles.headerContainer}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.headerTitle, { color: colors.text }]}>Habit Mastery</Text>
              
              <TouchableOpacity
                onPress={() => router.push('/(habits)/templates')}
                style={styles.plusBtnContainer}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.plusBtnGradient}
                >
                  <Plus size={22} color="#FFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {habits.length > 0 && (
            <View style={styles.dotsHeaderLabels}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                <Text key={i} style={[styles.dayLabelText, { color: colors.textSecondary }]}>{d}</Text>
              ))}
            </View>
          )}

          <View style={styles.list}>
            {habits.length > 0 ? habits.map((habit) => {
              const streak = getStreak(habit.id);
              const todayStr = getTodayLocal();
              const isCompletedToday = habit.completedDays.includes(todayStr);

              return (
                <Swipeable
                  key={habit.id}
                  ref={ref => swipeableRefs.current.set(habit.id, ref)}
                  renderRightActions={() => renderRightActions(habit.id, habit.title)}
                  overshootRight={false}
                  friction={2}
                >
                  <View
                    style={[
                      styles.habitCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isCompletedToday && { borderColor: colors.success + '40' }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.habitInfo}
                      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
                      activeOpacity={0.6}
                    >
                      <View style={styles.habitTitleRow}>
                        <Text style={[styles.habitTitle, { color: colors.text }, isCompletedToday && { color: colors.success }]}>
                          {habit.icon} {habit.title}
                        </Text>
                      </View>
                      <View style={styles.streakInfo}>
                        <Ionicons name="flame" size={12} color={streak > 0 ? streakColor : colors.textSecondary + '40'} />
                        <Text style={[styles.habitStreak, { color: colors.textSecondary }, streak > 0 && { color: streakColor }]}>
                          {streak} day streak
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Visual-only week dots — non-interactive */}
                    <View style={styles.dotsWrapper} pointerEvents="none">
                      {renderDots(habit.completedDays)}
                    </View>

                    {/* Dedicated toggle button — separate tap target */}
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        { borderColor: isCompletedToday ? colors.success : colors.border },
                        isCompletedToday && { backgroundColor: colors.success }
                      ]}
                      onPress={() => handleToggle(habit.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={isCompletedToday ? `${habit.title} completed — tap to undo` : `Complete ${habit.title}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompletedToday }}
                    >
                      {isCompletedToday && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </TouchableOpacity>
                  </View>
                </Swipeable>
              );
            }) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.success + '10' }]}>
                  <Ionicons name="leaf-outline" size={32} color={colors.success} />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>Plant your first habit</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Consistency is the bridge between goals and accomplishment. 🌱</Text>
              </View>
            )}
          </View>
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
      android: { elevation: 4 }
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
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBtnContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
  },
  plusBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  dotsHeaderLabels: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    paddingRight: 16, // Adjusted for cleaner alignment
    marginBottom: 8,
  },
  dayLabelText: {
    fontSize: 8,
    width: 12,
    textAlign: 'center',
    fontWeight: '800',
    opacity: 0.5,
  },
  list: { gap: 12 },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  habitInfo: { flex: 1 },
  habitTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  habitTitle: { fontSize: 16, fontWeight: '700' },
  streakInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  habitStreak: { fontSize: 11, fontWeight: '700', opacity: 0.8 },
  dotsWrapper: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  dotsRow: { flexDirection: 'row', gap: 5 },
  toggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 24,
    marginLeft: 8,
    gap: 4,
  },
  deleteActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dot: { width: 10, height: 10, borderRadius: 3.5, justifyContent: 'center', alignItems: 'center' },
  dotCompleted: { shadowOpacity: 0.2, shadowRadius: 2, elevation: 1 },
  dotToday: { borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptySubtext: { fontSize: 13, opacity: 0.7, textAlign: 'center', paddingHorizontal: 40 }
});
