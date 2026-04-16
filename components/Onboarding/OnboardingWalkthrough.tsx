import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/useStore';
import { Sparkles, Zap, Target, Brain, Bot, Rocket } from 'lucide-react-native';

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
  
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    let timeoutId: any;
    if (!hasSeenWalkthrough) {
      timeoutId = setTimeout(() => {
        setVisible(true);
      }, 1200);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [hasSeenWalkthrough]);

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true })
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

          <View style={[styles.iconContainer, { backgroundColor: STEPS[currentStep].color + '15' }]}>
            <StepIcon size={48} color={STEPS[currentStep].color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{STEPS[currentStep].title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{STEPS[currentStep].description}</Text>

          <View style={styles.footer}>
            <View style={styles.pagination}>
              {STEPS.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.dot, 
                    { backgroundColor: i === currentStep ? STEPS[currentStep].color : colors.textSecondary + '20' },
                    i === currentStep && { width: 24 }
                  ]} 
                />
              ))}
            </View>

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

          {currentStep < STEPS.length - 1 && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleClose}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip Tour</Text>
            </TouchableOpacity>
          )}
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
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagination: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
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
    marginTop: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
  }
});
