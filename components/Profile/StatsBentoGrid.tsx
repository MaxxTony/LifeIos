import { Spacing } from '@/constants/theme';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain, Flame, Smile, Timer } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';

// ─── Mini sparkline bar for visual texture ───────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const bars = 8;
  const filled = Math.round((value / Math.max(max, 1)) * bars);
  return (
    <View style={spark.row}>
      {Array.from({ length: bars }).map((_, i) => (
        <View
          key={i}
          style={[
            spark.bar,
            {
              backgroundColor: i < filled ? color : color + '18',
              height: 4 + (i % 3) * 3, // subtle height variation for visual richness
            },
          ]}
        />
      ))}
    </View>
  );
}

const spark = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 },
  bar: { width: 6, borderRadius: 2 },
});

// ─── Large Hero Card (Lifetime Focus) ────────────────────────────────────────
function HeroCard({ totalFocusHours }: { totalFocusHours: number }) {
  const colors = useThemeColors();
  return (
    <Animated.View entering={FadeInDown.delay(0).springify()} style={hero.wrap}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={hero.grad}
      >
        {/* Decorative circles */}
        <View style={hero.circle1} />
        <View style={hero.circle2} />

        {/* Top row */}
        <View style={hero.topRow}>
          <View style={hero.iconWrap}>
            <Timer size={18} color="#FFF" strokeWidth={2.5} />
          </View>
          <Text style={hero.subtitle}>LIFETIME FOCUS</Text>
        </View>

        {/* Value */}
        <Text style={hero.value}>
          {totalFocusHours}
          <Text style={hero.unit}> hrs</Text>
        </Text>

        {/* Mini bar */}
        <MiniBar value={Math.min(totalFocusHours, 100)} max={100} color="rgba(255,255,255,0.7)" />
      </LinearGradient>
    </Animated.View>
  );
}

const hero = StyleSheet.create({
  wrap: { width: '100%' },
  grad: {
    borderRadius: 26,
    padding: 22,
    overflow: 'hidden',
    minHeight: 130,
    justifyContent: 'space-between',
  },
  circle1: {
    position: 'absolute', right: -30, top: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circle2: {
    position: 'absolute', right: 30, bottom: -40,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  subtitle: {
    fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2,
  },
  value: { fontSize: 38, fontFamily: 'Outfit-Bold', color: '#FFF', lineHeight: 44 },
  unit: { fontSize: 16, fontWeight: '400', opacity: 0.7 },
});

// ─── Small Stat Card (half-width) ────────────────────────────────────────────
interface SmallCardProps {
  label: string;
  value: number | string;
  icon: any;
  gradient: [string, string];
  barValue: number;
  barMax: number;
  suffix?: string;
  delay?: number;
  entering?: any;
}

function SmallCard({ label, value, icon: Icon, gradient, barValue, barMax, suffix, delay = 0, entering }: SmallCardProps) {
  const colors = useThemeColors();
  return (
    <Animated.View
      entering={(entering ?? FadeInDown).delay(delay).springify()}
      style={small.wrap}
    >
      <LinearGradient
        colors={[gradient[0] + (colors.isDark ? '22' : '15'), gradient[1] + (colors.isDark ? '10' : '05')] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[small.grad, { borderColor: gradient[0] + (colors.isDark ? '30' : '20') }]}
      >
        {/* Icon */}
        <View style={[small.iconWrap, { backgroundColor: gradient[0] + (colors.isDark ? '25' : '15') }]}>
          <Icon size={16} color={gradient[0]} strokeWidth={2.5} />
        </View>

        {/* Number */}
        <Text style={[small.value, { color: colors.text }]}>
          {value}
          {suffix && <Text style={small.suffix}>{suffix}</Text>}
        </Text>

        {/* Label */}
        <Text style={[small.label, { color: gradient[0] }]}>{label}</Text>

        {/* Mini bar */}
        <MiniBar value={barValue} max={barMax} color={gradient[0]} />
      </LinearGradient>
    </Animated.View>
  );
}

const small = StyleSheet.create({
  wrap: { flex: 1 },
  grad: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    lineHeight: 30,
  },
  suffix: { fontSize: 13, fontWeight: '400', opacity: 0.6, color: '#888' },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export function StatsBentoGrid() {
  const {
    totalHabitCompletions,
    totalFocusHours,
    totalMoodLogs,
    maxStreak,
  } = useProfileStats();

  return (
    <View style={styles.container}>
      {/* Row 1: Hero — Focus */}
      <HeroCard totalFocusHours={totalFocusHours} />

      {/* Row 2: Streak + Habits */}
      <View style={styles.row}>
        <SmallCard
          label="BEST STREAK"
          value={maxStreak}
          suffix=" days"
          icon={Flame}
          gradient={['#F97316', '#EF4444']}
          barValue={maxStreak}
          barMax={30}
          delay={120}
          entering={FadeInLeft}
        />
        <SmallCard
          label="HABITS DONE"
          value={totalHabitCompletions}
          icon={Brain}
          gradient={['#10B981', '#059669']}
          barValue={Math.min(totalHabitCompletions, 100)}
          barMax={100}
          delay={200}
          entering={FadeInRight}
        />
      </View>

      {/* Row 3: Mood logs */}
      <SmallCard
        label="MOOD LOGS"
        value={totalMoodLogs}
        icon={Smile}
        gradient={['#EC4899', '#F43F5E']}
        barValue={Math.min(totalMoodLogs, 30)}
        barMax={30}
        delay={280}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
