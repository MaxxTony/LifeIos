import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getTodayLocal } from '@/utils/dateUtils';

export const QuestDashboard = React.memo(() => {
  const dailyQuests = useStore(s => s.dailyQuests);
  const colors = useThemeColors();
  const today = getTodayLocal();
  const activeQuests = dailyQuests.filter(q => q.date === today);

  if (!activeQuests || activeQuests.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={18} color={colors.primary} accessibilityLabel="Challenges icon" />
          <Text style={[styles.title, { color: colors.text }]}>Daily Challenges</Text>
        </View>
        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Complete for massive XP 💎</Text>
      </View>

      <View style={styles.questGrid}>
        {activeQuests.map((quest, index) => (
          <Animated.View 
            key={quest.id} 
            entering={FadeInDown.delay(index * 100)}
            style={[
              styles.questCard, 
              { 
                backgroundColor: colors.card, 
                borderColor: quest.completed ? colors.success + '40' : colors.border 
              }
            ]}
            accessibilityLabel={`Challenge: ${quest.title}. ${quest.completed ? 'Completed.' : 'In progress.'}`}
          >
            <View style={styles.questInfo}>
              <View style={styles.questTextContent}>
                <Text style={[
                  styles.questTitle, 
                  { color: colors.text },
                  quest.completed && { textDecorationLine: 'line-through', opacity: 0.6 }
                ]}>
                  {quest.title}
                </Text>
                <Text 
                  style={[styles.rewardText, { color: colors.primary }]}
                  accessibilityLabel={`${quest.rewardXP} XP Reward`}
                >
                  +{quest.rewardXP} XP
                </Text>
              </View>
              {quest.completed ? (
                <View 
                  style={[styles.checkCircle, { backgroundColor: colors.success }]}
                  accessibilityLabel="Quest completed"
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              ) : (
                <Text 
                  style={[styles.progressText, { color: colors.textSecondary }]}
                  accessibilityLabel={`Progress: ${quest.currentCount || 0} of ${quest.targetCount || 0}`}
                >
                  {quest.type === 'focus' 
                    ? `${Math.floor((quest.currentCount || 0) / 60)}/${Math.floor((quest.targetCount || 1) / 60)}m`
                    : `${quest.currentCount || 0}/${quest.targetCount || 0}`}
                </Text>
              )}
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <LinearGradient
                colors={quest.completed ? [colors.success, colors.success] : [colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(100, Math.max(0, quest.targetCount > 0 ? (quest.currentCount / quest.targetCount) * 100 : 0))}%` }
                ]}
              />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...Typography.h3,
    fontSize: 18,
  },
  subTitle: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  questGrid: {
    gap: 12,
  },
  questCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questTextContent: {
    flex: 1,
    gap: 2,
  },
  questTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
