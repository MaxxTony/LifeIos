import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import React, { useRef, useMemo, useCallback } from 'react';
import { Alert, Dimensions, Platform, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// P-4: Memoize the habit item to avoid re-renders during focus ticks
const HabitItem = React.memo(({ 
  habit, 
  onToggle, 
  onDelete, 
  getStreak, 
  colors, 
  router, 
  swipeableRefs 
}: any) => {
  const streak = getStreak(habit.id);
  const todayStr = getTodayLocal();
  const isCompletedToday = habit.completedDays.includes(todayStr);
  const streakColor = colors.isDark ? '#FF8C42' : '#EA580C';

  const renderDots = (completedDays: string[]) => {
    const today = getTodayLocal();
    const weekDates = useMemo(() => {
      const t = new Date();
      const day = t.getDay();
      const diff = t.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(t);
      monday.setDate(diff);

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return formatLocalDate(d);
      });
    }, []);

    return (
      <View style={styles.dotsRow}>
        {weekDates.map((dateString, i) => {
          const isCompleted = completedDays.includes(dateString);
          const isToday = dateString === today;
          const isFuture = dateString > today;

          return (
            <View key={i} style={styles.dotWrapper}>
              <View
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
            </View>
          );
        })}
      </View>
    );
  };

  const renderRightActions = () => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      onPress={() => onDelete(habit.id, habit.title)}
    >
      <Trash2 size={20} color="#FFF" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={ref => { swipeableRefs.current.set(habit.id, ref); }}
      renderRightActions={renderRightActions}
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
          style={styles.habitMain}
          onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
          activeOpacity={0.6}
        >
          <View style={styles.habitInfo}>
            <Text style={[styles.habitTitle, { color: colors.text }, isCompletedToday && { color: colors.success }]}>
              {habit.icon} {habit.title}
            </Text>
            <View style={styles.streakInfo}>
              <Ionicons name="flame" size={12} color={streak > 0 ? streakColor : colors.textSecondary + '40'} />
              <Text style={[styles.habitStreak, { color: colors.textSecondary }, streak > 0 && { color: streakColor }]}>
                {streak} day streak
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dotsContainer}
            onPress={() => onToggle(habit.id)}
            activeOpacity={0.7}
          >
            {renderDots(habit.completedDays)}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
});

export default function AllHabitsScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  // P-2 FIX: Use granular selectors to avoid heavy re-renders from focus timer ticks
  const habits = useStore(s => s.habits);
  const toggleHabit = useStore(s => s.actions.toggleHabit);
  const removeHabit = useStore(s => s.actions.removeHabit);
  const getStreak = useStore(s => s.actions.getStreak);

  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const handleToggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id);
  }, [toggleHabit]);

  const handleDelete = useCallback((id: string, title: string) => {
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
  }, [removeHabit]);

  const renderHeaderLabels = () => {
    if (habits.length === 0) return null;
    return (
      <View style={styles.dotsHeaderLabels}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <View key={i} style={styles.dayLabelContainer}>
            <Text style={[styles.dayLabelText, { color: colors.textSecondary }]}>{d}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.success + '10' }]}>
        <Ionicons name="leaf-outline" size={32} color={colors.success} />
      </View>
      <Text style={[styles.emptyText, { color: colors.text }]}>Plant your first habit</Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Consistency is the bridge between goals and accomplishment. 🌱</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.success + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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

        {/* P-3 FIX: Transition from ScrollView + map to FlatList for performance */}
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HabitItem
              habit={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
              getStreak={getStreak}
              colors={colors}
              router={router}
              swipeableRefs={swipeableRefs}
            />
          )}
          ListHeaderComponent={renderHeaderLabels}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 10 }}
        />
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
    alignSelf: 'flex-end',
    width: 150,
    marginBottom: 8,
    marginRight: 17, // Align with dots inside the padded habit card
  },
  dayLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 9,
    fontWeight: '800',
    opacity: 0.6,
  },
  habitCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 12, // Gap replaced by margin since FlatList is used
  },
  habitMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
    marginRight: 12
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  streakInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  habitStreak: { fontSize: 11, fontWeight: '700', opacity: 0.8 },
  dotsContainer: {
    width: 150,
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  dotWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 24,
    marginLeft: 8,
    gap: 4,
    marginBottom: 12, // Match habit card margin
  },
  deleteActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dot: { width: 12, height: 12, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  dotCompleted: { shadowOpacity: 0.2, shadowRadius: 2, elevation: 1 },
  dotToday: { borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: 18, fontWeight: '800' },
  emptySubtext: { fontSize: 13, opacity: 0.7, textAlign: 'center', paddingHorizontal: 40 }
});

