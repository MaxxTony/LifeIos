import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeInUp,
  FadeOutDown,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

/**
 * SmartAIFAB — Unified AI Entry Point
 * 
 * Consolidates: DashboardAIButton + AIInsightCard + "Plan my day" chip
 * into a single, contextually-aware floating action button.
 * 
 * Behavior:
 * - Shows a persistent gradient button at bottom of scroll
 * - When a proactive insight exists, expands into a card with the insight
 * - Label changes based on time-of-day context
 * - Single tap → opens /ai-chat
 */
export const SmartAIFAB = React.memo(function SmartAIFAB() {
  const router = useRouter();
  const colors = useThemeColors();
  const proactivePrompt = useStore(s => s.proactivePrompt);
  const dismissProactive = useStore(s => s.actions.dismissProactive);
  const glow = useSharedValue(0.85);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1800 }),
        withTiming(0.85, { duration: 1800 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: (glow.value - 0.6) * 0.6,
  }));

  // Contextual label based on time of day
  const contextLabel = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'Plan my morning ☀️';
    if (hour >= 10 && hour < 14) return 'Midday check-in 🚀';
    if (hour >= 14 && hour < 18) return 'Afternoon boost 💪';
    if (hour >= 18 && hour < 22) return 'Evening wind-down 🌙';
    return 'LifeOS AI ✨';
  }, []);

  const handlePress = () => {
    router.push('/ai-chat');
  };

  // If there's a proactive insight, show the expanded card
  if (proactivePrompt) {
    const { message, trigger } = proactivePrompt;

    const getTitle = () => {
      switch (trigger) {
        case 'low_mood': return '🌿 LifeOS Care';
        case 'missed_task': return '🚀 LifeOS Insight';
        case 'habit_streak': return '🧘 Habit Coach';
        default: return '✨ AI Coach';
      }
    };

    return (
      <Animated.View
        entering={FadeInUp.duration(500)}
        exiting={FadeOutDown.duration(300)}
        layout={Layout.springify()}
        style={styles.insightContainer}
      >
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.insightCard,
            {
              backgroundColor: colors.isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              opacity: pressed ? 0.95 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={
              colors.isDark
                ? ['rgba(129, 140, 248, 0.12)', 'rgba(56, 189, 248, 0.04)']
                : ['rgba(79, 70, 229, 0.06)', 'rgba(14, 165, 233, 0.02)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.insightHeader}>
            <View style={styles.insightTitleRow}>
              <View style={[styles.insightIcon, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol name="sparkles" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.insightTitle, { color: colors.text }]}>{getTitle()}</Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                dismissProactive();
              }}
              style={styles.dismissBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.insightMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {message}
          </Text>

          <View style={styles.insightFooter}>
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.insightButton}
            >
              <IconSymbol name="sparkles" size={14} color="#FFF" />
              <Text style={styles.insightButtonText}>Discuss with AI</Text>
            </LinearGradient>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Default: compact smart button
  return (
    <View style={styles.fabContainer}>
      <Animated.View
        style={[
          styles.glowRing,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
          glowStyle,
        ]}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={[
          styles.fabButton,
          {
            borderColor: colors.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
          },
        ]}
        accessibilityLabel="Open LifeOS AI Coach"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <IconSymbol name="sparkles" size={18} color="#FFF" />
          <Text style={styles.fabText}>{contextLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  // — FAB (default state) —
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 28, // Fix: More breathing room below the button
  },
  glowRing: {
    position: 'absolute',
    width: 220,
    height: 60,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  fabButton: {
    minWidth: 200,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fabGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  fabText: {
    ...Typography.h3,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },

  // — Insight Card (proactive state) —
  insightContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  insightCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
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
  insightMessage: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  insightFooter: {
    flexDirection: 'row',
  },
  insightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  insightButtonText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
});
