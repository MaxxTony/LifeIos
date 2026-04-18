import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useStore } from '@/store/useStore';
import { Typography, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

/**
 * Individual Floating XP Item
 * Handles its own animation lifecycle from entrance to floating exit.
 */
const XPFloatingItem = ({ amount, onFinish }: { amount: number; onFinish: () => void }) => {
  const colors = useThemeColors();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Entrance & Continuous Float
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withTiming(1, { 
      duration: 500, 
      easing: Easing.out(Easing.back(1.5)) 
    });
    
    translateY.value = withTiming(-120, { 
      duration: 2500, 
      easing: Easing.linear 
    }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    });

    // Fade out before the float finishes
    const fadeOutTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
    }, 1800);

    return () => clearTimeout(fadeOutTimer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View 
      style={[
        styles.xpItem, 
        animatedStyle, 
        { 
          backgroundColor: colors.isDark ? 'rgba(50, 50, 80, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: colors.primary,
          shadowColor: colors.primary,
        }
      ]}
    >
      <Text style={[styles.xpText, { color: colors.isDark ? '#FFF' : colors.primary }]}>
        +{amount} XP! 🔥
      </Text>
    </Animated.View>
  );
};

const MAX_ACTIVE_POPUPS = 3;

export const XPPopUp = () => {
  const recentXP = useStore(s => s.recentXP);
  const dismissXP = useStore(s => s.actions.dismissXP);
  const [activeXPs, setActiveXPs] = useState<{ id: number; amount: number }[]>([]);

  useEffect(() => {
    if (recentXP) {
      const id = recentXP.timestamp;
      // C-05 FIX: Cap active popups to prevent animation queue freeze on rapid XP events.
      setActiveXPs(prev => {
        if (prev.length >= MAX_ACTIVE_POPUPS) return prev;
        return [...prev, { id, amount: recentXP.amount }];
      });
      dismissXP();
    }
  }, [recentXP]);

  const removeItem = (id: number) => {
    setActiveXPs(prev => prev.filter(item => item.id !== id));
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {activeXPs.map((xp) => (
        <XPFloatingItem 
          key={xp.id} 
          amount={xp.amount} 
          onFinish={() => removeItem(xp.id)} 
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '45%', // Centered vertically relative to the dashboard area
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  xpItem: {
    position: 'absolute',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // High visibility shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 140,
  },
  xpText: {
    ...Typography.h3,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
