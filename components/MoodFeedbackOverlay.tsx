import { BlurView } from '@/components/BlurView';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

export const MoodFeedbackOverlay = React.memo(function MoodFeedbackOverlay() {
  const lastMoodLog = useStore(s => s.lastMoodLog);
  const dismissMoodLog = useStore(s => s.actions.dismissMoodLog);
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastMoodLog && Date.now() - lastMoodLog.timestamp < 5000) {
      setVisible(true);
      // C-08 FIX: Auto-dismiss after 5s so overlay can never get stuck.
      const t = setTimeout(() => handleClose(), 5000);
      return () => clearTimeout(t);
    }
  }, [lastMoodLog]);

  if (!lastMoodLog) return null;

  const mood = lastMoodLog.mood;
  let title = "Mood Logged";
  let prompt = "How are you feeling now?";
  let icon = "sparkles";
  let iconColor = colors.primary;

  if (mood >= 4) {
    title = "Energetic & Great!";
    prompt = "You're in great shape — want to push your focus goal today? 🔥";
    icon = "trending-up";
    iconColor = "#10B981";
  } else if (mood <= 2) {
    title = "Sending Support";
    prompt = "Tough day. What's one small thing you can do for yourself right now? 💙";
    icon = "heart";
    iconColor = "#F43F5E";
  } else {
    title = "Balance is Key";
    prompt = "Steady and focused. You're doing great keeping your consistency.";
    icon = "leaf";
    iconColor = colors.primary;
  }

  const handleClose = () => {
    setVisible(false);
    dismissMoodLog();
  };

  return (
    <View style={styles.fullScreenOverlay} pointerEvents="box-none">
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={colors.isDark ? 'dark' : 'light'} />
      </Animated.View>

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleClose}
        activeOpacity={1}
        accessible={false}
      />

      <Animated.View
        entering={ZoomIn}
        exiting={ZoomOut}
        style={[styles.modalView, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={icon as any} size={32} color={iconColor} />
        </View>

        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.modalText, { color: colors.textSecondary }]}>{prompt}</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleClose}
        >
          <Text style={styles.textStyle}>Got it</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    width: '90%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Typography.h3,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
    elevation: 2,
    width: '100%',
  },
  textStyle: {
    color: 'white',
    ...Typography.h3,
    textAlign: 'center',
  },
});
