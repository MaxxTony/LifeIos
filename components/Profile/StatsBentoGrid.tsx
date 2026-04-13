import { Spacing, Typography } from '@/constants/theme';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Brain, Flame, Target, Timer } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function StatsBentoGrid() {
  const colors = useThemeColors();
  const { 
    totalHabitCompletions, 
    totalFocusHours, 
    totalMoodLogs, 
    maxStreak,
    moodColor,
    moodEmoji,
    moodStatus
  } = useProfileStats();

  return (
    <View style={styles.container}>
      {/* Top Row: Focus Mastery (Large) */}
      <View style={[styles.card, styles.largeCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <View style={[styles.cardIconWrapper, { backgroundColor: colors.primary + '20' }]}>
          <Timer size={24} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>LIFETIME FOCUS</Text>
          <Text style={[styles.cardValue, { color: colors.text }]}>{totalFocusHours}<Text style={styles.unitText}> hrs</Text></Text>
        </View>
      </View>

      <View style={styles.gridRow}>
         <View style={[styles.card, styles.halfCard, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary + '30' }]}>
           <Flame size={20} color={colors.secondary} />
           <Text style={[styles.cardValueSmall, { color: colors.text }]}>{maxStreak}</Text>
           <Text style={[styles.cardLabelSmall, { color: colors.textSecondary }]}>BEST STREAK</Text>
         </View>
         
         <View style={[styles.card, styles.halfCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
           <Target size={20} color={colors.success} />
           <Text style={[styles.cardValueSmall, { color: colors.text }]}>{totalHabitCompletions}</Text>
           <Text style={[styles.cardLabelSmall, { color: colors.textSecondary }]}>HABITS DONE</Text>
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  largeCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    height: 100,
  },
  halfCard: {
    flex: 1,
  },
  cardIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
  },
  unitText: {
    fontSize: 14,
    opacity: 0.6,
  },
  cardLabel: {
    ...Typography.labelSmall,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  cardValueSmall: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    marginTop: 8,
  },
  cardLabelSmall: {
    ...Typography.labelSmall,
    fontSize: 9,
    marginTop: 2,
  }
});
