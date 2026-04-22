import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Alert, Dimensions, FlatList, Platform,
  StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function HabitsSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3, 4].map((_, i) => (
        <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SkeletonBlock width={38} height={38} borderRadius={12} />
            <View style={{ gap: 6, flex: 1 }}>
              <SkeletonBlock width={120} height={14} borderRadius={6} />
              <SkeletonBlock width={80} height={10} borderRadius={4} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
            {[...Array(7)].map((_, j) => (
              <SkeletonBlock key={j} width={22} height={22} borderRadius={7} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Daily Row ────────────────────────────────────────────────────────────────
function DailyRow({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, date: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const day = todayObj.getDay();
  const diff = todayObj.getDate() - day;
  const sunday = new Date(todayObj); sunday.setDate(diff);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i); return formatLocalDate(d);
  });
  const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // T-26 FIX: Filter completions to only show if frequency is daily
  const habitCompletions = new Set(habit.completedDays);
  return (
    <View style={row.wrapper}>
      {weekDates.map((dateStr, i) => {
        const isCompleted = habit.frequency === 'daily' && habitCompletions.has(dateStr);
        const isToday = dateStr === today;
        const isFuture = dateStr > today;
        return (
          <View key={i} style={row.dayCol}>
            <Text style={[row.label, { color: isToday ? colors.primary : colors.textSecondary + '55' }]}>{LABELS[i]}</Text>
            <TouchableOpacity
              onPress={() => { if (!isFuture) onToggle(habit.id, dateStr); }}
              disabled={isFuture}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[
                row.dot,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                isCompleted && { backgroundColor: colors.success },
                isToday && !isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
                isFuture && { opacity: 0.2 },
              ]}
            >
              {isCompleted && <Ionicons name="checkmark" size={8} color="#FFF" />}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ─── Weekly Row ───────────────────────────────────────────────────────────────
function WeeklyRow({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, date: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const day = todayObj.getDay();
  const diff = todayObj.getDate() - day;
  const sunday = new Date(todayObj); sunday.setDate(diff);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i); return formatLocalDate(d);
  });
  const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const ALL_DAYS_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scheduledDays = (habit.targetDays || []).map((d: number) => ALL_DAYS_LABELS[d]);
  const targetSet = new Set((habit.targetDays ?? []) as number[]);

  return (
    <View style={row.wrapper}>
      {weekDates.map((dateStr, i) => {
        const jsDay = i; // 0 is Sunday, 1 is Monday ... etc.
        const isTarget = targetSet.has(jsDay);
        // T-26 FIX: Filter completions to only show if frequency is weekly
        const isCompleted = habit.frequency === 'weekly' && habit.completedDays.includes(dateStr);
        const isToday = dateStr === today;
        const isFuture = dateStr > today;
        return (
          <View key={i} style={row.dayCol}>
            <Text style={[row.label, { color: isTarget ? (isToday ? colors.primary : colors.textSecondary + '55') : colors.textSecondary + '20' }]}>{LABELS[i]}</Text>
            {isTarget ? (
              <TouchableOpacity
                onPress={() => { if (!isFuture) onToggle(habit.id, dateStr); }}
                disabled={isFuture}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={[
                  row.dot,
                  { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                  isCompleted && { backgroundColor: colors.success },
                  isToday && !isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
                  isFuture && { opacity: 0.2 },
                ]}
              >
                {isCompleted && <Ionicons name="checkmark" size={8} color="#FFF" />}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  import('react-native-toast-message').then(Toast => {
                    Toast.default.show({
                      type: 'info',
                      text1: 'Not Scheduled',
                      text2: `Only scheduled for ${scheduledDays.join(', ')}`,
                      position: 'bottom'
                    });
                  });
                }}
                style={[row.dot, { opacity: 0.12, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Monthly Block ────────────────────────────────────────────────────────────
function MonthlyBlock({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, date: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const currentMonth = today.slice(0, 7);
  const monthCompletions = (habit.completedDays as string[]).filter((d: string) => d.startsWith(currentMonth)).length;
  const target = habit.monthlyTarget || 1;
  const progress = Math.min(monthCompletions / target, 1);
  const isLoggedToday = habit.completedDays.includes(today);

  // ── Due-Day Validation Logic (Summary) ──
  const isFixed = habit.monthlyDay && habit.monthlyDay > 0;
  const isLocked = !isLoggedToday && (
    (isFixed && todayObj.getDate() !== habit.monthlyDay) || // Not the target date
    (!isFixed && monthCompletions >= target)               // Target reached
  );
  
  const lockMessage = isFixed 
    ? `Only on the ${habit.monthlyDay}${habit.monthlyDay === 1 ? 'st' : habit.monthlyDay === 2 ? 'nd' : habit.monthlyDay === 3 ? 'rd' : 'th'}`
    : 'Target reached';

  const goalMonths = habit.goalDays || 3;

  return (
    <View style={monthly.block}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <View style={[monthly.pill, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[monthly.pillText, { color: colors.primary }]}>
              {habit.monthlyDay ? `📅 Fixed · ${habit.monthlyDay}${habit.monthlyDay === 1 ? 'st' : habit.monthlyDay === 2 ? 'nd' : habit.monthlyDay === 3 ? 'rd' : 'th'} · ${goalMonths}mo` : `📅 Monthly · ${goalMonths}mo`}
            </Text>
          </View>
        </View>
        <View style={monthly.barTrack}>
          <LinearGradient
            colors={progress >= 1 ? [colors.success, colors.success] : [colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[monthly.barFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <Text style={[monthly.label, { color: colors.textSecondary }]}>{monthCompletions} / {target} this month</Text>
          {progress >= 1 && <Text style={[monthly.label, { color: colors.success, fontWeight: '800' }]}>✓ Done!</Text>}
        </View>
      </View>
      <TouchableOpacity
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
          onToggle(habit.id, today);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[
          monthly.logBtn,
          isLoggedToday
            ? { backgroundColor: colors.success }
            : isLocked
              ? { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border, opacity: 0.5 }
              : { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 1.5, borderColor: colors.primary + '50' }
        ]}
      >
        {isLoggedToday
          ? <Ionicons name="checkmark" size={16} color="#FFF" />
          : isLocked 
            ? <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            : <Ionicons name="add" size={18} color={colors.primary} />}
      </TouchableOpacity>
    </View>
  );
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak, frequency, colors }: { streak: number; frequency: string; colors: any }) {
  const unit = frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
      <Ionicons name="flame" size={10} color={streak > 0 ? '#FF8C42' : colors.textSecondary + '35'} />
      <Text style={{ fontSize: 10, fontWeight: '600', color: streak > 0 ? '#FF8C42' : colors.textSecondary + '50' }}>
        {streak} {unit} streak
      </Text>
    </View>
  );
}

// ─── Single Habit Card (same design as HabitGrid) ─────────────────────────────
const HabitItem = React.memo(({ habit, onToggle, onDelete, getStreak, colors, router, swipeableRefs }: any) => {
  const streak = getStreak(habit.id);
  const today = getTodayLocal();
  const isCompletedToday = habit.completedDays.includes(today);
  const isMonthly = habit.frequency === 'monthly';

  const renderRight = () => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      onPress={() => onDelete(habit.id, habit.title)}
    >
      <Trash2 size={18} color="#FFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={ref => { swipeableRefs.current.set(habit.id, ref); }}
      renderRightActions={renderRight}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
        style={[
          styles.card,
          { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)', borderColor: colors.border },
          isCompletedToday && { borderColor: colors.success + '50', backgroundColor: colors.success + '06' },
        ]}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={[styles.iconBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={styles.icon}>{habit.icon}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10, overflow: 'hidden', flexShrink: 1 }}>
            <Text style={[styles.title, { color: isCompletedToday ? colors.success : colors.text }]} numberOfLines={1}>
              {habit.title}
            </Text>
            <StreakBadge streak={streak} frequency={habit.frequency} colors={colors} />
          </View>
          {!isMonthly && (
            <View style={[styles.freqTag, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.freqTagText, { color: colors.primary }]}>
                {habit.frequency === 'daily' ? '📆 Daily' : '🗓 Weekly'}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom section */}
        {habit.frequency === 'daily' && <DailyRow habit={habit} colors={colors} onToggle={onToggle} />}
        {habit.frequency === 'weekly' && <WeeklyRow habit={habit} colors={colors} onToggle={onToggle} />}
        {habit.frequency === 'monthly' && <MonthlyBlock habit={habit} colors={colors} onToggle={onToggle} />}
      </TouchableOpacity>
    </Swipeable>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, colors }: { title: string; count: number; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 10, paddingHorizontal: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary + '60' }}>{count}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AllHabitsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  useIsFocused();

  const habits = useStore(s => s.habits);
  const habitsLoaded = useStore(s => s.syncStatus.habitsLoaded);
  const toggleHabit = useStore(s => s.actions.toggleHabit);
  const removeHabit = useStore(s => s.actions.removeHabit);
  const getStreak = useStore(s => s.actions.getStreak);

  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());
  const toggleLockRef = useRef<Set<string>>(new Set());

  const handleToggle = useCallback((id: string, dateStr: string) => {
    if (toggleLockRef.current.has(id)) return;
    toggleLockRef.current.add(id);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id, dateStr);

    setTimeout(() => {
      toggleLockRef.current.delete(id);
    }, 500);
  }, [toggleHabit]);

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Delete Habit', `Delete "${title}" and all its progress?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => swipeableRefs.current.get(id)?.close() },
      { text: 'Delete', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); removeHabit(id); } }
    ]);
  }, [removeHabit]);

  // Build flat FlatList data with section headers interspersed
  const listData = useMemo(() => {
    const daily = habits.filter(h => h.frequency === 'daily');
    const weekly = habits.filter(h => h.frequency === 'weekly');
    const monthly = habits.filter(h => h.frequency === 'monthly');
    const items: any[] = [];
    if (daily.length) {
      items.push({ type: 'header', title: '📆 Daily', count: daily.length });
      daily.forEach(h => items.push({ type: 'habit', habit: h }));
    }
    if (weekly.length) {
      items.push({ type: 'header', title: '🗓 Weekly', count: weekly.length });
      weekly.forEach(h => items.push({ type: 'habit', habit: h }));
    }
    if (monthly.length) {
      items.push({ type: 'header', title: '📅 Monthly', count: monthly.length });
      monthly.forEach(h => items.push({ type: 'habit', habit: h }));
    }
    return items;
  }, [habits]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title} count={item.count} colors={colors} />;
    }
    return (
      <HabitItem
        habit={item.habit}
        onToggle={handleToggle}
        onDelete={handleDelete}
        getStreak={getStreak}
        colors={colors}
        router={router}
        swipeableRefs={swipeableRefs}
      />
    );
  }, [colors, handleToggle, handleDelete, getStreak, router]);

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.success + '12' }]}>
        <Ionicons name="leaf-outline" size={32} color={colors.success} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Plant your first habit</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Consistency is the bridge between goals and accomplishment 🌱</Text>
      <TouchableOpacity
        onPress={() => router.push('/(habits)/templates')}
        style={{ marginTop: 20 }}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtn}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>Add First Habit</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Glows */}
      <View style={[styles.glow, { top: -100, right: -80, backgroundColor: colors.primary + '14' }]} />
      <View style={[styles.glow, { bottom: -120, left: -100, backgroundColor: colors.success + '0E' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.headerContainer}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint={colors.isDark ? 'dark' : 'light'} style={styles.headerBlur}>
              <HeaderContent colors={colors} router={router} />
            </BlurView>
          ) : (
            <View style={[styles.headerBlur, { backgroundColor: colors.card }]}>
              <HeaderContent colors={colors} router={router} />
            </View>
          )}
        </View>

        {(() => {
          const [timedOut, setTimedOut] = React.useState(false);
          React.useEffect(() => {
            if (habitsLoaded) return;
            const t = setTimeout(() => setTimedOut(true), 5000);
            return () => clearTimeout(t);
          }, [habitsLoaded]);

          if (!habitsLoaded && !timedOut) {
            return (
              <View style={{ padding: Spacing.md, paddingTop: 16 }}>
                <HabitsSkeleton />
              </View>
            );
          }
          
          if (!habitsLoaded && timedOut) {
            return (
              <View style={{ padding: 20, alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="cloud-offline-outline" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 12 }}>Working with local cache only...</Text>
              </View>
            );
          }

          return (
            <FlatList
              data={listData}
              keyExtractor={(item, i) => item.type === 'header' ? `header-${i}` : item.habit.id}
              renderItem={renderItem}
              ListEmptyComponent={<EmptyState />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              windowSize={5}
              maxToRenderPerBatch={6}
              removeClippedSubviews={Platform.OS === 'android'}
            />
          );
        })()}
      </SafeAreaView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push('/(habits)/templates')}
        style={styles.fab}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function HeaderContent({ colors, router }: { colors: any; router: any }) {
  const habits = useStore(s => s.habits);
  const today = getTodayLocal();
  const todayDayOfWeek = new Date().getDay();   // 0=Sun … 6=Sat
  const todayDayOfMonth = new Date().getDate(); // 1–31

  // Only count habits that are actually due today
  const dueToday = habits.filter(h => {
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'weekly') return (h.targetDays || []).includes(todayDayOfWeek);
    if (h.frequency === 'monthly') {
      if (h.monthlyDay && h.monthlyDay > 0) return todayDayOfMonth === h.monthlyDay;
      return true; // count-goal mode: any day is valid
    }
    return true;
  });
  const doneToday = dueToday.filter(h => h.completedDays.includes(today)).length;
  return (
    <View style={styles.headerContent}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <ChevronLeft size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Habits</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 1 }}>
          {doneToday} / {dueToday.length} due today
        </Text>
      </View>

      {/* spacer to balance the back button */}
      <View style={{ width: 40 }} />
    </View>
  );
}

const row = StyleSheet.create({
  wrapper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  dot: { width: 22, height: 22, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
});

const monthly = StyleSheet.create({
  block: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 10, fontWeight: '700' },
  barTrack: { height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.15)', width: '100%' },
  barFill: { height: '100%', borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '600' },
  logBtn: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', width: 280, height: 280, borderRadius: 140, opacity: 0.25, zIndex: -1 },

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
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, fontWeight: '700' },
  liquidBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  listContent: { padding: Spacing.md, paddingBottom: 100 },

  // Card (same as HabitGrid)
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconBubble: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 20 },
  title: { fontSize: 14, fontWeight: '700' },
  freqTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 6 },
  freqTagText: { fontSize: 9, fontWeight: '800' },

  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 76, borderRadius: 20, marginLeft: 8, gap: 4, marginBottom: 10 },
  deleteText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 13, opacity: 0.7, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 18 },

  fab: {
    position: 'absolute', bottom: 32, right: 20,
    width: 56, height: 56, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
