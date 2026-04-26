import { BlurView } from 'expo-blur';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Brain, Rocket, Sparkles, Target, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, SlideInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

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

  useEffect(() => {
    let timeoutId: any;
    if (!hasSeenWalkthrough && profileLoaded) {
      timeoutId = setTimeout(() => {
        setVisible(true);
      }, 1000);
    }
    return () => clearTimeout(timeoutId);
  }, [hasSeenWalkthrough, profileLoaded]);

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
    useStore.getState().actions.completeOnboarding();
    setVisible(false);
  };

  if (!visible) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View 
          key={currentStep}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(400)}
          style={styles.content}
        >
          <View style={[styles.container, { backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.1)' }]}>
            <LinearGradient
              colors={[step.color + '30', 'transparent']}
              style={styles.cardGlow}
            />

            {currentStep < STEPS.length - 1 && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
                <Text style={[styles.skipText, { color: 'rgba(255,255,255,0.4)' }]}>Skip</Text>
              </TouchableOpacity>
            )}

            <Animated.View entering={ZoomIn.delay(100)} style={[styles.iconContainer, { backgroundColor: step.color }]}>
              <StepIcon size={48} color="#FFF" />
            </Animated.View>

            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            <View style={styles.progressRow}>
              {STEPS.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    { backgroundColor: i === currentStep ? step.color : 'rgba(255,255,255,0.2)' }
                  ]} 
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: step.color }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>
                {currentStep === STEPS.length - 1 ? "Start Journey" : "Next Step"}
              </Text>
              <Ionicons name={currentStep === STEPS.length - 1 ? "rocket" : "arrow-forward"} size={20} color="#FFF" />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    borderRadius: 40,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    height: 200,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  skipBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
  }
});
