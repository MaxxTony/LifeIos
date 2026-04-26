import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography, Spacing, BorderRadius } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const StreakBrokenOverlay = () => {
  const showStreakBroken = useStore(s => s.showStreakBroken);
  const dismissStreakBroken = useStore(s => s.actions.dismissStreakBroken);
  const colors = useThemeColors();

  if (!showStreakBroken) return null;

  return (
    <Animated.View 
      entering={FadeIn}
      style={StyleSheet.absoluteFill}
    >
      <BlurView intensity={80} tint={colors.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
        <View style={styles.container}>
          <Animated.View entering={SlideInUp.delay(300).duration(800)} style={styles.iconContainer}>
            <LinearGradient
              colors={['#FF4B4B', '#FF8F8F']}
              style={styles.circle}
            >
              <Ionicons name="snow" size={60} color="#FFF" />
              <View style={styles.crackContainer}>
                 <Ionicons name="close" size={40} color="rgba(255,255,255,0.8)" style={styles.crackIcon} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600)} style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Streak Broken 🧊</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              You missed a day, and your streak has melted away. It's okay to stumble, but the best time to restart is right now.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(900)} style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={dismissStreakBroken}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Restart Journey</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={dismissStreakBroken}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Dismiss</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowColor: '#FF4B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  crackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crackIcon: {
    transform: [{ rotate: '45deg' }],
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.h1Hero,
    fontSize: 32,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  actionContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  secondaryButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
  }
});
