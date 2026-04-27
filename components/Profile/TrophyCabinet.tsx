import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Flame, Lock, ShieldCheck, Smile, Star, Target, Trophy, Wind, Zap } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

// ─── Achievement Definitions ─────────────────────────────────────────────────
// req() returns a 0–1 float (progress) or boolean.
// earns() is the final unlock condition.
const ACHIEVEMENTS = [
  {
    id: 'early_bird',
    title: 'Early Bird',
    desc: 'Start your LifeOS journey',
    icon: Star,
    gradient: ['#3B82F6', '#6366F1'] as [string, string],
    earn: (s: any) => s.totalXP > 0,
    progress: (s: any) => s.totalXP > 0 ? 1 : 0,
  },
  {
    id: 'focus_pro',
    title: 'Focus Pro',
    desc: 'Log your first focus session',
    icon: Clock,
    gradient: ['#06B6D4', '#0EA5E9'] as [string, string],
    earn: (s: any) => Object.keys(s.focusHistory || {}).length > 0,
    progress: (s: any) => Math.min(Object.keys(s.focusHistory || {}).length, 1),
  },
  {
    id: 'streak_3',
    title: 'Warming Up',
    desc: '3-day global streak',
    icon: Flame,
    gradient: ['#F97316', '#EF4444'] as [string, string],
    earn: (s: any) => s.globalStreak >= 3,
    progress: (s: any) => Math.min((s.globalStreak || 0) / 3, 1),
  },
  {
    id: 'streak_7',
    title: 'On Fire 🔥',
    desc: '7-day global streak',
    icon: Flame,
    gradient: ['#EF4444', '#DC2626'] as [string, string],
    earn: (s: any) => s.globalStreak >= 7,
    progress: (s: any) => Math.min((s.globalStreak || 0) / 7, 1),
  },
  {
    id: 'mood_master',
    title: 'Mood Master',
    desc: 'Log mood 7 days in a row',
    icon: Smile,
    gradient: ['#EC4899', '#F43F5E'] as [string, string],
    earn: (s: any) => Object.keys(s.moodHistory || {}).length >= 7,
    progress: (s: any) => Math.min((Object.keys(s.moodHistory || {}).length) / 7, 1),
  },
  {
    id: 'task_crusher',
    title: 'Task Crusher',
    desc: 'Complete 25 tasks',
    icon: Target,
    gradient: ['#10B981', '#059669'] as [string, string],
    earn: (s: any) => (s.tasks || []).filter((t: any) => t.completed).length >= 25,
    progress: (s: any) => Math.min((s.tasks || []).filter((t: any) => t.completed).length / 25, 1),
  },
  {
    id: 'level_5',
    title: 'Rising Star',
    desc: 'Reach Level 5',
    icon: Zap,
    gradient: ['#8B5CF6', '#A855F7'] as [string, string],
    earn: (s: any) => s.level >= 5,
    progress: (s: any) => Math.min((s.level || 1) / 5, 1),
  },
  {
    id: 'xp_10k',
    title: '10K Club',
    desc: 'Earn 10,000 total XP',
    icon: Trophy,
    gradient: ['#EAB308', '#F59E0B'] as [string, string],
    earn: (s: any) => s.totalXP >= 10000,
    progress: (s: any) => Math.min((s.totalXP || 0) / 10000, 1),
  },
  {
    id: 'deep_breather',
    title: 'Deep Worker',
    desc: 'Accumulate 10 hours of focus',
    icon: Wind,
    gradient: ['#14B8A6', '#0D9488'] as [string, string],
    earn: (s: any) => Object.values(s.focusHistory || {}).reduce((a: number, b: any) => a + b, 0) >= 36000,
    progress: (s: any) => Math.min(Object.values(s.focusHistory || {}).reduce((a: number, b: any) => a + b, 0) / 36000, 1),
  },
  {
    id: 'level_10',
    title: 'Titan',
    desc: 'Reach Level 10',
    icon: ShieldCheck,
    gradient: ['#F43F5E', '#E11D48'] as [string, string],
    earn: (s: any) => s.level >= 10,
    progress: (s: any) => Math.min((s.level || 1) / 10, 1),
  },
];

// ─── Progress Arc (simple bar-based for RN) ──────────────────────────────────
function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const colors = useThemeColors();
  const pct = Math.round(progress * 100);
  return (
    <View style={ring.wrap}>
      <View style={[ring.track, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={[ring.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[ring.label, { color }]}>{pct}%</Text>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { width: '100%', marginTop: 10, alignItems: 'center' },
  track: { width: '90%', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  label: { fontSize: 9, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
});

// ─── Single Badge ─────────────────────────────────────────────────────────────
function Badge({ achieve, index, earned, progress }: { achieve: typeof ACHIEVEMENTS[0], index: number, earned: boolean, progress: number }) {
  const colors = useThemeColors();
  const Icon = achieve.icon;
  const mainColor = achieve.gradient[0];

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).springify()}
      style={[
        badge.card, 
        { 
          backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : colors.card,
          borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : colors.border
        },
        !earned && [
          badge.locked,
          { 
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : colors.background,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.05)' : colors.border 
          }
        ]
      ]}
    >
      {/* Glow behind icon for earned */}
      {earned && (
        <View style={[badge.glow, { backgroundColor: mainColor + '30' }]} />
      )}

      {/* Icon Area */}
      <View style={badge.iconArea}>
        {earned ? (
          <LinearGradient
            colors={achieve.gradient}
            style={badge.iconGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon size={20} color="#FFF" strokeWidth={2.5} />
          </LinearGradient>
        ) : (
          <View style={[badge.iconLockedWrap, { 
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : colors.border
          }]}>
            <Lock size={16} color={colors.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeWidth={2} />
          </View>
        )}
      </View>

      {/* Text */}
      <Text style={[
          badge.title, 
          { color: colors.text },
          !earned && { color: colors.textSecondary, opacity: 0.5 }
        ]} 
        numberOfLines={1}
      >
        {achieve.title}
      </Text>
      <Text style={[
          badge.desc, 
          { color: colors.textSecondary },
          !earned && { opacity: 0.7 }
        ]} 
        numberOfLines={2}
      >
        {achieve.desc}
      </Text>

      {/* Progress bar for locked items */}
      {!earned && progress > 0 && (
        <ProgressRing progress={progress} color={mainColor} />
      )}

      {/* Earned checkmark */}
      {earned && (
        <View style={[badge.tick, { backgroundColor: mainColor }]}>
          <Text style={badge.tickText}>✓</Text>
        </View>
      )}
    </Animated.View>
  );
}

const badge = StyleSheet.create({
  card: {
    width: 140,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  locked: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  glow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconArea: { marginBottom: 10 },
  iconGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconLockedWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  titleLocked: { color: 'rgba(255,255,255,0.25)' },
  desc: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 13,
  },
  tick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { fontSize: 9, color: '#FFF', fontWeight: '900' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export function TrophyCabinet({ isPro, onLockPress }: { isPro: boolean; onLockPress: () => void }) {
  const colors = useThemeColors();
  const state = useStore(s => s);

  const earnedCount = ACHIEVEMENTS.filter(a => a.earn(state)).length;
  const total = ACHIEVEMENTS.length;

  const displayAchievements = isPro 
    ? ACHIEVEMENTS 
    : ACHIEVEMENTS.slice(0, 3);

  const lockedRemaining = !isPro && ACHIEVEMENTS.length > 3;

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.container}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Trophy size={18} color={colors.primary} strokeWidth={2.5} />
          <Text style={[styles.title, { color: colors.text }]}>ACHIEVEMENTS</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.pillText, { color: colors.primary }]}>
            {earnedCount} / {total}
          </Text>
        </View>
      </View>

      {/* Scroll Row — earned first, locked after */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Earned first */}
        {displayAchievements
          .filter(a => a.earn(state))
          .map((achieve, i) => (
            <Badge
              key={achieve.id}
              achieve={achieve}
              index={i}
              earned={true}
              progress={1}
            />
          ))}

        {/* Locked second */}
        {displayAchievements
          .filter(a => !a.earn(state))
          .sort((a, b) => b.progress(state) - a.progress(state))
          .map((achieve, i) => (
            <Badge
              key={achieve.id}
              achieve={achieve}
              index={earnedCount + i}
              earned={false}
              progress={achieve.progress(state)}
            />
          ))}

        {/* Pro Lock Placeholder */}
        {lockedRemaining && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={onLockPress}
            style={[
              badge.card, 
              { 
                backgroundColor: colors.primary + '10',
                borderColor: colors.primary + '30',
                justifyContent: 'center',
                borderStyle: 'dashed'
              }
            ]}
          >
            <View style={[badge.iconLockedWrap, { backgroundColor: colors.primary + '20', borderColor: 'transparent' }]}>
              <Lock size={18} color={colors.primary} />
            </View>
            <Text style={[badge.title, { color: colors.primary, marginTop: 8 }]}>PRO ONLY</Text>
            <Text style={[badge.desc, { color: colors.primary + '80' }]}>Unlock 7+ more trophies</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    // paddingHorizontal: Spacing.lg,
    gap: 10,
    paddingBottom: 4,
  },
});
