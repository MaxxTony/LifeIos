import { BlurView } from '@/components/BlurView';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Brain, Rocket, Sparkles, Target, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    title: "Welcome to LifeOS",
    description: "Your new personal operating system for habits, tasks, and deep focus.",
    icon: Sparkles,
    color: '#6366f1',
  },
  {
    title: "Habit Streaks",
    description: "Track your habits daily. Use the 'Pause' feature to freeze your streak when you need a break.",
    icon: Zap,
    color: '#f59e0b',
  },
  {
    title: "Smart Tasks",
    description: "Break down goals into subtasks and set recurring schedules (daily, weekly, or monthly).",
    icon: Target,
    color: '#ef4444',
  },
  {
    title: "Focus Mode",
    description: "Timer-based deep work sessions to help you reach your daily productivity goals.",
    icon: Brain,
    color: '#10b981',
  },
  {
    title: "AI Assistant",
    description: "Just tell the AI what you want to do. It can now edit and delete tasks or habits for you!",
    icon: Bot,
    color: '#8b5cf6',
  },
  {
    title: "Ready to Start?",
    description: "Export your data anytime or check your performance in the Weekly Review screen.",
    icon: Rocket,
    color: '#ec4899',
  }
];

export function OnboardingWalkthrough() {
  const colors = useThemeColors();
  const hasSeenWalkthrough = useStore(s => s.hasSeenWalkthrough);
  const setHasSeenWalkthrough = useStore(s => s.actions.setHasSeenWalkthrough);
  const profileLoaded = useStore(s => s.syncStatus.profileLoaded);

  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    let timeoutId: any;
    // Wait for the cloud profile to confirm hasSeenWalkthrough before showing.
    // Without this guard, the walkthrough flashes for ~1-2s on every fresh
    // login because the local default is false before the profile syncs.
    if (!hasSeenWalkthrough && profileLoaded) {
      timeoutId = setTimeout(() => {
        setVisible(true);
      }, 1200);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [hasSeenWalkthrough, profileLoaded]);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      scaleAnim.setValue(0.75);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
      ]).start();
    }
  }, [currentStep, visible]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setHasSeenWalkthrough(true);
    // C-ONB-1 FIX: Also trigger completeOnboarding so the app doesn't treat 
    // them as a new user next time (suppresses the loop).
    useStore.getState().actions.completeOnboarding();
    setVisible(false);
  };

  if (!visible) return null;

  const StepIcon = STEPS[currentStep].icon;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <LinearGradient
            colors={[STEPS[currentStep].color + '20', 'transparent']}
            style={styles.cardGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />

          {currentStep < STEPS.length - 1 && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
          )}

          <Animated.View style={[styles.iconContainer, { backgroundColor: STEPS[currentStep].color + '15', transform: [{ scale: scaleAnim }] }]}>
            <StepIcon size={56} color={STEPS[currentStep].color} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>{STEPS[currentStep].title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{STEPS[currentStep].description}</Text>

          {/* Step progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.textSecondary + '20' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: STEPS[currentStep].color,
                  width: `${((currentStep + 1) / STEPS.length) * 100}%`,
                }
              ]}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
              {currentStep + 1} / {STEPS.length}
            </Text>

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: STEPS[currentStep].color }]}
              onPress={handleNext}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === STEPS.length - 1 ? "Let's Go!" : "Next"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width - 48,
    borderRadius: 36,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...Typography.h2,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...Typography.body,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    gap: 8,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    position: 'absolute',
    top: 20,
    right: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.5,
  }
});
