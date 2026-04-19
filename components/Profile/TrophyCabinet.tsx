import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Flame, Star, Trophy, Zap, Clock, ShieldCheck } from 'lucide-react-native';

const ACHIEVEMENTS = [
  { id: 'first_login', title: 'Early Bird', desc: 'Started the journey', icon: Star, color: '#3B82F6', req: (s: any) => s.totalXP > 0 },
  { id: 'streak_3', title: 'Warming Up', desc: '3-Day Streak', icon: Flame, color: '#F97316', req: (s: any) => s.globalStreak >= 3 },
  { id: 'streak_7', title: 'Unstoppable', desc: '7-Day Streak', icon: Flame, color: '#EF4444', req: (s: any) => s.globalStreak >= 7 },
  { id: 'xp_10k', title: '10K Club', desc: 'Earned 10,000 XP', icon: Trophy, color: '#EAB308', req: (s: any) => s.totalXP >= 10000 },
  { id: 'level_5', title: 'Rising Star', desc: 'Reached Level 5', icon: Zap, color: '#8B5CF6', req: (s: any) => s.level >= 5 },
  { id: 'level_10', title: 'Titan', desc: 'Reached Level 10', icon: ShieldCheck, color: '#10B981', req: (s: any) => s.level >= 10 },
  { id: 'focus_pro', title: 'Focus Pro', desc: 'Logged a focus session', icon: Clock, color: '#06B6D4', req: (s: any) => Object.keys(s.focusHistory || {}).length > 0 },
];

export function TrophyCabinet() {
  const colors = useThemeColors();
  const state = useStore(s => s);
  
  const earned = ACHIEVEMENTS.filter(a => a.req(state));
  
  if (earned.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>TROPHY CABINET</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {earned.map((achieve, i) => {
          const Icon = achieve.icon;
          return (
            <Animated.View 
              key={achieve.id} 
              entering={FadeInRight.delay(i * 100).springify()}
              style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: achieve.color + '20' }]}>
                <Icon size={24} color={achieve.color} />
              </View>
              <Text style={[styles.badgeTitle, { color: colors.text }]} numberOfLines={1}>{achieve.title}</Text>
              <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>{achieve.desc}</Text>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    paddingHorizontal: Spacing.lg,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  badge: {
    width: 110,
    padding: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  }
});
