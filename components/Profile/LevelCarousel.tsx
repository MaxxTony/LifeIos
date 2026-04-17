import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Shield, Zap, Award, Trophy, Star, Crown, Flame, Compass, Target, Rocket, Globe, Moon, Sparkles, Brain, Mountain, Swords } from 'lucide-react-native';
import { LevelCard, CARD_WIDTH, CARD_SPACING } from './LevelCard';
import { useProfileStats } from '@/hooks/useProfileStats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LEVELS = [
  { level: 1,  rank: 'Spark',         xpRequired: 0,      colors: ['#94A3B8', '#475569'] as [string, string], icon: Shield,   description: 'The journey begins' },
  { level: 2,  rank: 'Seeker',        xpRequired: 250,    colors: ['#34D399', '#059669'] as [string, string], icon: Compass,  description: 'Curiosity ignites the path' },
  { level: 3,  rank: 'Challenger',    xpRequired: 600,    colors: ['#22D3EE', '#0891B2'] as [string, string], icon: Flame,    description: 'Rising through resistance' },
  { level: 4,  rank: 'Pathfinder',    xpRequired: 1200,   colors: ['#60A5FA', '#2563EB'] as [string, string], icon: Target,   description: 'Forging your own route' },
  { level: 5,  rank: 'Striker',       xpRequired: 2200,   colors: ['#818CF8', '#4338CA'] as [string, string], icon: Zap,      description: 'Momentum builds to force' },
  { level: 6,  rank: 'Warrior',       xpRequired: 3700,   colors: ['#A78BFA', '#7C3AED'] as [string, string], icon: Swords,   description: 'Discipline as a weapon' },
  { level: 7,  rank: 'Guardian',      xpRequired: 5700,   colors: ['#C084FC', '#9333EA'] as [string, string], icon: Shield,   description: 'Protecting the grind' },
  { level: 8,  rank: 'Architect',     xpRequired: 8200,   colors: ['#E879F9', '#C026D3'] as [string, string], icon: Brain,    description: 'Building life by design' },
  { level: 9,  rank: 'Enforcer',      xpRequired: 11500,  colors: ['#F472B6', '#BE185D'] as [string, string], icon: Mountain, description: 'Unbreakable consistency' },
  { level: 10, rank: 'Legend',        xpRequired: 15500,  colors: ['#F59E0B', '#B45309'] as [string, string], icon: Crown,    description: 'A name spoken in reverence' },
  { level: 11, rank: 'Phantom',       xpRequired: 20500,  colors: ['#64748B', '#1E293B'] as [string, string], icon: Moon,     description: 'Moves unseen, strikes true' },
  { level: 12, rank: 'Titan',         xpRequired: 26500,  colors: ['#78716C', '#292524'] as [string, string], icon: Trophy,   description: 'Immovable. Unstoppable.' },
  { level: 13, rank: 'Sovereign',     xpRequired: 33500,  colors: ['#3B82F6', '#1E3A8A'] as [string, string], icon: Globe,    description: 'Master of your domain' },
  { level: 14, rank: 'Ascendant',     xpRequired: 42000,  colors: ['#38BDF8', '#075985'] as [string, string], icon: Rocket,   description: 'Breaking through limits' },
  { level: 15, rank: 'Immortal',      xpRequired: 52000,  colors: ['#FB923C', '#9A3412'] as [string, string], icon: Flame,    description: 'Legacy that outlasts time' },
  { level: 16, rank: 'Eclipse',       xpRequired: 64000,  colors: ['#312E81', '#0F172A'] as [string, string], icon: Star,     description: 'Beyond ordinary light' },
  { level: 17, rank: 'Ethereal',      xpRequired: 78000,  colors: ['#67E8F9', '#0E7490'] as [string, string], icon: Sparkles, description: 'Transcending the physical' },
  { level: 18, rank: 'Mythic',        xpRequired: 95000,  colors: ['#FCD34D', '#92400E'] as [string, string], icon: Award,    description: 'Born from ancient legend' },
  { level: 19, rank: 'Transcendent',  xpRequired: 115000, colors: ['#C4B5FD', '#4C1D95'] as [string, string], icon: Zap,      description: 'Existence redefined' },
  { level: 20, rank: 'Apex',          xpRequired: 140000, colors: ['#F59E0B', '#DC2626'] as [string, string], icon: Crown,    description: 'The summit of all summits' },
];

export function LevelCarousel() {
  const { level: userLevel, xpProgress, xpInCurrentLevel } = useProfileStats();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Auto-scroll to current level on mount
  useEffect(() => {
    const currentIndex = Math.min(userLevel - 1, LEVELS.length - 1);
    if (currentIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentIndex,
          animated: true,
          viewPosition: 0.5
        });
      }, 500);
    }
  }, [userLevel]);

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef as any}
        data={LEVELS}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: CARD_SPACING,
        }}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.level.toString()}
        renderItem={({ item, index }) => {
          const nextLevelXpRequired = LEVELS[index + 1]?.xpRequired;
          const levelXpRange = nextLevelXpRequired !== undefined
            ? nextLevelXpRequired - item.xpRequired
            : undefined;
          return (
            <LevelCard
              item={item}
              index={index}
              scrollX={scrollX}
              userLevel={userLevel}
              xpProgress={xpProgress}
              xpInCurrentLevel={xpInCurrentLevel}
              levelXpRange={levelXpRange}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: SCREEN_WIDTH,
  },
});
