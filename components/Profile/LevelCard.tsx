import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Star } from 'lucide-react-native';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  SharedValue,
  useAnimatedStyle
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.82;
export const CARD_SPACING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

export interface LevelData {
  level: number;
  rank: string;
  xpRequired: number;
  colors: [string, string];
  icon: any;
  description: string;
}

interface LevelCardProps {
  item: LevelData;
  index: number;
  scrollX: SharedValue<number>;
  userLevel: number;
  xpProgress: number;
  xpInCurrentLevel: number;
}

export function LevelCard({ item, index, scrollX, userLevel, xpProgress, xpInCurrentLevel }: LevelCardProps) {
  const isLocked = userLevel < item.level;
  const isCurrent = userLevel === item.level;

  const animatedCardStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedParallaxStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      [
        (index - 1) * CARD_WIDTH,
        index * CARD_WIDTH,
        (index + 1) * CARD_WIDTH,
      ],
      [50, 0, -50],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX }],
    };
  });

  const IconComponent = item.icon;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, animatedCardStyle]}>
        <LinearGradient
          colors={isLocked ? ['#2A2A2A', '#1A1A1A'] : item.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Parallax Background Decor */}
          <Animated.View style={[styles.parallaxDecor, animatedParallaxStyle]}>
            <IconComponent size={180} color={isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.1)'} strokeWidth={0.5} />
          </Animated.View>

          <View style={styles.header}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelLabel}>LEVEL</Text>
              <Text style={styles.levelValue}>{item.level}</Text>
            </View>
            {isLocked ? (
              <View style={styles.statusBadgeLocked}>
                <Lock size={12} color="rgba(255,255,255,0.5)" />
                <Text style={styles.statusTextLocked}>LOCKED</Text>
              </View>
            ) : isCurrent ? (
              <View style={styles.statusBadgeCurrent}>
                <Star size={12} color="#FFF" />
                <Text style={styles.statusText}>CURRENT</Text>
              </View>
            ) : (
              <View style={styles.statusBadgeUnlocked}>
                <Text style={styles.statusText}>UNLOCKED</Text>
              </View>
            )}
          </View>

          <View style={styles.content}>
            <IconComponent size={40} color={isLocked ? 'rgba(255,255,255,0.2)' : '#FFF'} />
            <Text style={[styles.rankName, { color: isLocked ? 'rgba(255,255,255,0.4)' : '#FFF' }]}>
              {item.rank}
            </Text>
            <Text style={[styles.description, { color: isLocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)' }]}>
              {isLocked ? `Earn ${item.xpRequired} XP total to reveal` : item.description}
            </Text>
          </View>

          <View style={styles.footer}>
            {isCurrent ? (
              <View style={styles.progressContainer}>
                <View style={styles.xpRow}>
                  <Text style={styles.xpText}>{xpInCurrentLevel} / 100 XP</Text>
                  <Text style={styles.progressPerc}>{Math.round(xpProgress * 100)}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${xpProgress * 100}%` }]} />
                </View>
              </View>
            ) : isLocked ? (
              <View style={styles.lockInfo}>
                <Text style={styles.lockText}>Requires Level {item.level}</Text>
              </View>
            ) : (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>MASTERED</Text>
              </View>
            )}
          </View>

          {isLocked && (
            <View style={styles.lockOverlay} />
          )}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 240, // Increased to fit shadows
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH - 20,
    height: 225, // Increased from 200
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    flex: 1,
    padding: Spacing.lg,
  },
  parallaxDecor: {
    position: 'absolute',
    top: -20,
    right: -40,
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  levelValue: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    marginTop: -4,
  },
  statusBadgeCurrent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 6,
  },
  statusBadgeLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeUnlocked: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFF',
  },
  statusTextLocked: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  rankName: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  description: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 5,
  },
  progressContainer: {
    width: '100%',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter-Bold',
  },
  progressPerc: {
    fontSize: 11,
    color: '#FFF',
    fontFamily: 'Inter-Bold',
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 3,
  },
  lockInfo: {
    alignItems: 'center',
    paddingBottom: 5,
  },
  lockText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Inter-Bold',
    letterSpacing: 1,
  },
  completedBadge: {
    alignItems: 'center',
    paddingBottom: 5,
  },
  completedText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter-Bold',
    letterSpacing: 1.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  }
});
