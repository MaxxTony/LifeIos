import { BlurView } from '@/components/BlurView';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ─── Daily Habit Row ──────────────────────────────────────────────────────────
// Shows 7 day-of-week checkboxes in a row with M T W T F S S labels
function DailyHabitRow({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, dateStr: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const day = todayObj.getDay();
  const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(todayObj);
  monday.setDate(diff);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatLocalDate(d);
  });
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={row.wrapper}>
      {weekDates.map((dateStr, i) => {
        const isCompleted = habit.completedDays.includes(dateStr);
        const isToday = dateStr === today;
        const isFuture = dateStr > today;
        return (
          <View key={i} style={row.dayCol}>
            <Text style={[row.dayLabel, { color: isToday ? colors.primary : colors.textSecondary + '60' }]}>
              {DAY_LABELS[i]}
            </Text>
            <TouchableOpacity
              onPress={() => { if (!isFuture) onToggle(habit.id, dateStr); }}
              disabled={isFuture}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                row.dot,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                isCompleted && { backgroundColor: colors.success },
                isToday && !isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
                isFuture && { opacity: 0.25 },
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

// ─── Weekly Habit Row ─────────────────────────────────────────────────────────
// Shows only scheduled days with checkboxes; skipped days show a dash
function WeeklyHabitRow({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, dateStr: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const day = todayObj.getDay();
  const diff = todayObj.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(todayObj);
  monday.setDate(diff);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatLocalDate(d);
  });
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const ALL_DAYS_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scheduledDays = (habit.targetDays || []).map((d: number) => ALL_DAYS_LABELS[d]);
  const targetSet = new Set((habit.targetDays ?? []) as number[]);

  return (
    <View style={row.wrapper}>
      {weekDates.map((dateStr, i) => {
        const jsDay = i === 6 ? 0 : i + 1;
        const isTarget = targetSet.has(jsDay);
        const isCompleted = habit.completedDays.includes(dateStr);
        const isToday = dateStr === today;
        const isFuture = dateStr > today;

        if (!isTarget) {
          return (
            <View key={i} style={row.dayCol}>
              <Text style={[row.dayLabel, { color: colors.textSecondary + '30' }]}>{DAY_LABELS[i]}</Text>
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
                style={row.dash}
              >
                <Text style={{ color: colors.textSecondary + '30', fontSize: 11, fontWeight: '800' }}>–</Text>
              </TouchableOpacity>
            </View>
          );
        }

        return (
          <View key={i} style={row.dayCol}>
            <Text style={[row.dayLabel, { color: isToday ? colors.primary : colors.textSecondary + '60' }]}>
              {DAY_LABELS[i]}
            </Text>
            <TouchableOpacity
              onPress={() => { if (!isFuture) onToggle(habit.id, dateStr); }}
              disabled={isFuture}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                row.dot,
                { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                isCompleted && { backgroundColor: colors.success },
                isToday && !isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
                isFuture && { opacity: 0.25 },
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

// ─── Monthly Habit Block ──────────────────────────────────────────────────────
// Shows a progress bar for this month's completions vs target
// plus a tap-to-log button to record a completion for today
function MonthlyHabitBlock({ habit, colors, onToggle }: { habit: any; colors: any; onToggle: (id: string, dateStr: string) => void }) {
  const today = getTodayLocal();
  const todayObj = new Date();
  const currentMonth = today.slice(0, 7);
  const isFixed = habit.monthlyDay && habit.monthlyDay > 0;

  // T-32: For Fixed Mode, only count the specific target date as a completion for the progress bar
  const monthCompletions = (habit.completedDays as string[]).filter(d => {
    if (!d.startsWith(currentMonth)) return false;
    if (isFixed) {
      const dayNum = parseInt(d.split('-')[2], 10);
      return dayNum === habit.monthlyDay;
    }
    return true;
  }).length;
  const target = habit.monthlyTarget || 1;
  const progress = Math.min(monthCompletions / target, 1);
  const isLoggedToday = habit.completedDays.includes(today);

  const isDueToday = isFixed ? todayObj.getDate() === habit.monthlyDay : monthCompletions < target;
  const isLocked = !isLoggedToday && !isDueToday;

  const lockMessage = isFixed
    ? `Only on the ${habit.monthlyDay}${habit.monthlyDay === 1 ? 'st' : habit.monthlyDay === 2 ? 'nd' : habit.monthlyDay === 3 ? 'rd' : 'th'}`
    : 'Monthly target reached';

  const goalMonths = habit.goalDays || 3;
  const monthLabel = goalMonths === 1 ? '1 month' : `${goalMonths} months`;

  return (
    <View style={monthly.block}>
      {/* Left — progress info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <View style={[monthly.pill, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[monthly.pillText, { color: colors.primary }]}>📅 Monthly · {monthLabel}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={monthly.barTrack}>
          <View style={[
            monthly.barFill,
            { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.success : colors.primary }
          ]} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <Text style={[monthly.progressText, { color: colors.textSecondary }]}>
            {monthCompletions} / {target} this month
          </Text>
          {progress >= 1 && (
            <Text style={[monthly.progressText, { color: colors.success, fontWeight: '800' }]}>✓ Done!</Text>
          )}
        </View>
      </View>

      {/* Right — tap to log */}
      <TouchableOpacity
        accessibilityLabel={isLoggedToday ? 'Logged today' : isLocked ? 'Habit locked' : 'Log today'}
        accessibilityRole="button"
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
              ? { backgroundColor: 'rgba(0,0,0,0.03)', borderColor: colors.border, opacity: 0.5 }
              : { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderWidth: 1.5, borderColor: colors.primary + '50' }
        ]}
      >
        {isLoggedToday
          ? <Ionicons name="checkmark" size={16} color="#FFF" />
          : isLocked
            ? <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            : <Ionicons name="add" size={18} color={colors.primary} />
        }
      </TouchableOpacity>
    </View>
  );
}

const row = StyleSheet.create({
  wrapper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  dot: {
    width: 22, height: 22, borderRadius: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  dash: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
});

const monthly = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  pillText: { fontSize: 10, fontWeight: '700' },
  barTrack: {
    height: 7, borderRadius: 4, overflow: 'hidden',
    backgroundColor: 'rgba(128,128,128,0.15)',
    width: '100%',
  },
  barFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 10, fontWeight: '600' },
  logBtn: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
});

// ─── Streak badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak, frequency, colors }: { streak: number; frequency: string; colors: any }) {
  const unit = frequency === 'daily' ? 'day' : frequency === 'weekly' ? 'week' : 'month';
  const hasStreak = streak > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
      <Ionicons name="flame" size={10} color={hasStreak ? colors.secondary : colors.textSecondary + '40'} />
      <Text style={{ fontSize: 10, fontWeight: '600', color: hasStreak ? colors.secondary : colors.textSecondary + '50' }}>
        {streak} {unit} streak
      </Text>
    </View>
  );
}

// ─── Single Habit Card ────────────────────────────────────────────────────────
interface HabitCardProps {
  habit: any;
  streak: number;
  colors: any;
  onToggle: (id: string, dateStr: string) => void;
  isSyncing: boolean;
}

const HabitCard = React.memo(({ habit, streak, colors, onToggle, isSyncing }: HabitCardProps) => {
  const router = useRouter();
  const today = getTodayLocal();
  const isCompletedToday = habit.completedDays.includes(today);
  const isMonthly = habit.frequency === 'monthly';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      accessibilityLabel={`${habit.title} habit${isCompletedToday ? ', completed today' : ''}`}
      accessibilityRole="button"
      style={[
        styles.card,
        { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)', borderColor: colors.border },
        isCompletedToday && { borderColor: colors.success + '50', backgroundColor: colors.success + '06' },
      ]}
    >
      {/* ── Top row: icon + title + sync indicator ── */}
      <View style={styles.topRow}>
        <View style={[styles.iconBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={styles.icon}>{habit.icon}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[styles.title, { color: isCompletedToday ? colors.success : colors.text }]} numberOfLines={1}>
              {habit.title}
            </Text>
            {isSyncing && <Ionicons name="cloud-upload-outline" size={11} color={colors.textSecondary + '60'} />}
          </View>
          <StreakBadge streak={streak} frequency={habit.frequency} colors={colors} />
        </View>

        {/* Frequency tag top-right — only for daily/weekly (monthly has its own inline pill) */}
        {!isMonthly && (
          <View style={[styles.freqTag, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.freqTagText, { color: colors.primary }]}>
              {habit.frequency === 'daily' ? '📆 Daily' : '🗓 Weekly'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Bottom section: depends on frequency ── */}
      {habit.frequency === 'daily' && (
        <DailyHabitRow habit={habit} colors={colors} onToggle={onToggle} />
      )}
      {habit.frequency === 'weekly' && (
        <WeeklyHabitRow habit={habit} colors={colors} onToggle={onToggle} />
      )}
      {habit.frequency === 'monthly' && (
        <MonthlyHabitBlock habit={habit} colors={colors} onToggle={onToggle} />
      )}
    </TouchableOpacity>
  );
});

// ─── HabitGrid ────────────────────────────────────────────────────────────────
export const HabitGrid = React.memo(function HabitGrid() {
  const habits = useStore(s => s.habits);
  const toggleHabit = useStore(s => s.actions.toggleHabit);
  const getStreak = useStore(s => s.actions.getStreak);
  const pendingActions = useStore(s => s.pendingActions);
  const colors = useThemeColors();
  const router = useRouter();

  const toggleLockRef = React.useRef<Set<string>>(new Set());

  const handleToggle = React.useCallback((id: string, dateStr: string) => {
    if (toggleLockRef.current.has(id)) return;
    toggleLockRef.current.add(id);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleHabit(id, dateStr);

    setTimeout(() => {
      toggleLockRef.current.delete(id);
    }, 500);
  }, [toggleHabit]);

  return (
    <View style={[container.wrap, { borderColor: colors.border }]}>
      <BlurView intensity={25} tint={colors.isDark ? 'dark' : 'light'} style={container.blur}>
        {/* Header */}
        <View style={container.header}>
          <Text style={[container.sectionTitle, { color: colors.text }]}>Habit Streaks</Text>
          <TouchableOpacity
            onPress={() => router.push('/(habits)/templates')}
            style={[container.addBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primary + '40' }]}
            accessibilityLabel="Add new habit"
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* List */}
        <View style={{ gap: 10 }}>
          {habits.length > 0 ? habits.slice(0, 5).map((habit) => {
            const streak = getStreak(habit.id);
            const isSyncing = pendingActions.some(a => a.id === habit.id);
            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                streak={streak}
                colors={colors}
                onToggle={handleToggle}
                isSyncing={isSyncing}
              />
            );
          }) : (
            <TouchableOpacity
              onPress={() => router.push('/(habits)/templates')}
              style={[container.empty, { borderColor: colors.border }]}
              accessibilityLabel="Add habits to track streaks"
              accessibilityRole="button"
            >
              <View style={[container.emptyIcon, { backgroundColor: colors.secondary + '15' }]}>
                <Ionicons name="sparkles" size={24} color={colors.secondary} />
              </View>
              <Text style={[container.emptyTitle, { color: colors.text }]}>Build Your Rituals</Text>
              <Text style={[container.emptySub, { color: colors.textSecondary }]}>
                Small wins every day lead to massive results over time.
              </Text>
              <View style={[container.emptyAction, { backgroundColor: colors.secondary }]}>
                <Plus size={16} color="#FFF" strokeWidth={3} />
                <Text style={container.emptyActionText}>Start a Habit</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {habits.length > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/all-habits')}
            style={[container.viewMore, { borderTopColor: colors.border }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
              +{habits.length - 5} more habits
            </Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </View>
  );
});

const container = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 180,
  },
  blur: { flex: 1, padding: Spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderStyle: 'dashed', borderWidth: 1, borderRadius: 24,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  viewMore: {
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  iconBubble: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 20 },
  title: { fontSize: 13, fontWeight: '700' },
  freqTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, marginLeft: 6,
  },
  freqTagText: { fontSize: 9, fontWeight: '800' },
});
