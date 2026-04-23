import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LEVEL_NAMES } from '@/store/helpers';
import { BlurView } from '@/components/BlurView';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Sparkles, Trophy } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface LevelUpCelebrationProps {
  level: number;
  visible: boolean;
  onClose: () => void;
}

export const LevelUpCelebration = React.memo(({ level, visible, onClose }: LevelUpCelebrationProps) => {
  const colors = useThemeColors();
  const levelName = LEVEL_NAMES[level] || 'Champion';

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
          style={StyleSheet.absoluteFill}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={colors.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <ConfettiCannon
          count={200}
          origin={{ x: width / 2, y: -20 }}
          fallSpeed={3000}
          fadeOut={true}
        />

        <Animated.View
          entering={ZoomIn.delay(300).springify()}
          exiting={ZoomOut.duration(400)}
          style={[styles.content, { backgroundColor: colors.isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.6)', borderColor: colors.border }]}
        >
          <LinearGradient
            colors={colors.isDark
              ? ['rgba(129, 140, 248, 0.1)', 'rgba(56, 189, 248, 0.05)']
              : ['rgba(79, 70, 229, 0.08)', 'rgba(14, 165, 233, 0.03)']
            }
            style={styles.cardGradient}
          />

          <View style={styles.iconContainer}>
            <View style={[styles.glowCircle, { backgroundColor: colors.primary, opacity: 0.2 }]} />
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.mainIcon}
            >
              <Trophy size={48} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.subTitle, { color: colors.primary }]}>LEVEL UNLOCKED! ✨</Text>

          <View style={styles.levelRow}>
            <Text style={[styles.levelNum, { color: colors.text }]}>Level {level}</Text>
          </View>

          <View style={[styles.namePill, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <Award size={20} color={colors.secondary} style={{ marginRight: 8 }} />
            <Text style={[styles.levelName, { color: colors.text }]}>{levelName}</Text>
            <Sparkles size={16} color={colors.warning} style={{ marginLeft: 8 }} />
          </View>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Your evolution continues. You've reached a new plateau of performance!
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnText}>Let's Keep Going</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

import { Platform } from 'react-native';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    width: width * 0.85,
    borderRadius: 40,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  iconContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  mainIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  subTitle: {
    ...Typography.labelSmall,
    letterSpacing: 2.5,
    marginBottom: 8,
    fontWeight: '900',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelNum: {
    ...Typography.h1Hero,
    fontSize: 56,
    lineHeight: 64,
    textAlign: 'center',
  },
  namePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  levelName: {
    ...Typography.h3,
    fontSize: 20,
    fontWeight: '800',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  btnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
