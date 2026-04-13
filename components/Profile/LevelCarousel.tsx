import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, FlatList } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Shield, Zap, Award, Trophy, Star, Crown } from 'lucide-react-native';
import { LevelCard, CARD_WIDTH, CARD_SPACING } from './LevelCard';
import { useProfileStats } from '@/hooks/useProfileStats';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LEVELS = [
  { 
    level: 1, 
    rank: 'Novice', 
    xpRequired: 0, 
    colors: ['#94A3B8', '#475569'] as [string, string], 
    icon: Shield,
    description: 'Starting the journey'
  },
  { 
    level: 2, 
    rank: 'Striker', 
    xpRequired: 100, 
    colors: ['#10B981', '#065F46'] as [string, string], 
    icon: Zap,
    description: 'Building strong momentum'
  },
  { 
    level: 3, 
    rank: 'Achiever', 
    xpRequired: 200, 
    colors: ['#3B82F6', '#1E40AF'] as [string, string], 
    icon: Award,
    description: 'Mastering the habits'
  },
  { 
    level: 4, 
    rank: 'Elite', 
    xpRequired: 400, 
    colors: ['#8B5CF6', '#4C1D95'] as [string, string], 
    icon: Trophy,
    description: 'Performance excellence'
  },
  { 
    level: 5, 
    rank: 'Champion', 
    xpRequired: 700, 
    colors: ['#F59E0B', '#92400E'] as [string, string], 
    icon: Star,
    description: 'Peak performance state'
  },
  { 
    level: 6, 
    rank: 'Legend', 
    xpRequired: 1000, 
    colors: ['#EF4444', '#7F1D1D'] as [string, string], 
    icon: Crown,
    description: 'LifeOS Mastery attained'
  },
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
        renderItem={({ item, index }) => (
          <LevelCard
            item={item}
            index={index}
            scrollX={scrollX}
            userLevel={userLevel}
            xpProgress={xpProgress}
            xpInCurrentLevel={xpInCurrentLevel}
          />
        )}
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
