import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeOutUp, 
  Layout, 
  withTiming, 
  withSequence, 
  withDelay,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { useStore } from '@/store/useStore';
import { Typography, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

export const XPPopUp = () => {
  const recentXP = useStore(s => s.recentXP);
  const dismissXP = useStore(s => s.dismissXP);
  const colors = useThemeColors();
  
  const [activeXPs, setActiveXPs] = useState<{ id: number; amount: number }[]>([]);

  useEffect(() => {
    if (recentXP) {
      const id = recentXP.timestamp;
      setActiveXPs(prev => [...prev, { id, amount: recentXP.amount }]);
      
      const timer = setTimeout(() => {
        setActiveXPs(prev => prev.filter(x => x.id !== id));
        dismissXP();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [recentXP]);

  return (
    <Animated.View 
      style={styles.container} 
      pointerEvents="none"
      layout={Layout.springify()}
    >
      {activeXPs.map((xp) => (
        <Animated.View
          key={xp.id}
          entering={FadeInUp.duration(600)}
          exiting={FadeOutUp.duration(600)}
          style={[styles.xpTextContainer, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
        >
          <Animated.Text style={[styles.xpText, { color: colors.primary }]}>
            +{xp.amount} XP! 🔥
          </Animated.Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  xpTextContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  xpText: {
    ...Typography.h3,
    fontWeight: '900',
  },
});
