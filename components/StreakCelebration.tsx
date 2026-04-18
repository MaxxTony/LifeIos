import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Toast from 'react-native-toast-message';
import { useStore } from '@/store/useStore';

export const StreakCelebration = () => {
  const streakMilestone = useStore(s => s.streakMilestones[0] ?? null);
  const dismissMilestone = useStore(s => s.actions.dismissMilestone);
  const explosionRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (streakMilestone) {
      // Trigger toast
      Toast.show({
        type: 'success',
        text1: 'Streak Milestone! 🔥',
        text2: `You hit a ${streakMilestone.streak}-day streak on ${streakMilestone.habitTitle}!`,
        visibilityTime: 5000,
        autoHide: true,
      });

      // Trigger confetti
      explosionRef.current?.start();

      // Dismiss from store after a delay to allow for the animation/toast
      const timer = setTimeout(() => {
        dismissMilestone();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [streakMilestone]);

  if (!streakMilestone) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConfettiCannon
        ref={explosionRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
      />
    </View>
  );
};
