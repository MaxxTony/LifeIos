import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export const AIInsightCard = () => {
  const proactivePrompt = useStore(s => s.proactivePrompt);
  const dismissProactive = useStore(s => s.actions.dismissProactive);
  const colors = useThemeColors();
  const router = useRouter();

  if (!proactivePrompt) return null;

  const { message, trigger } = proactivePrompt;

  const getTitle = () => {
    switch (trigger) {
      case 'low_mood': return 'LifeOS Care 🌿';
      case 'missed_task': return 'LifeOS Insight 🚀';
      case 'habit_streak': return 'LifeOS Habit 🧘‍♂️';
      default: return 'LifeOS Assistant ✨';
    }
  };

  const handlePress = () => {
    router.push('/ai-chat');
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(600)}
      exiting={FadeOutDown.duration(400)}
      layout={Layout.springify()}
      style={[styles.container, Shadows.md]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
      >
        <LinearGradient
          colors={colors.isDark 
            ? ['rgba(129, 140, 248, 0.15)', 'rgba(56, 189, 248, 0.05)']
            : ['rgba(79, 70, 229, 0.08)', 'rgba(14, 165, 233, 0.03)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <IconSymbol name="sparkles" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={dismissProactive}
            style={styles.dismissBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
          {message}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.tapAction, { color: colors.primary }]}>Tap to discuss with AI</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.bodyBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapAction: {
    ...Typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
  }
});
