import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Step {
  title: string;
  description: string;
  icon: string;
  color: string;
}

const STEPS: Step[] = [
  {
    title: 'Your Growth Engine',
    description: 'Track your progress through levels and XP. Complete tasks to level up and unlock exclusive rewards.',
    icon: 'flash',
    color: '#7C5CFF',
  },
  {
    title: 'Consistency is King',
    description: 'Build streaks by completing habits daily. Use Streak Freezes to protect your progress when life gets busy.',
    icon: 'flame',
    color: '#FF4B4B',
  },
  {
    title: 'AI-Powered Quests',
    description: 'Our AI coach generates daily quests tailored to your goals. Talk to it anytime for advice and task management.',
    icon: 'sparkles',
    color: '#00D1FF',
  }
];

export const GuidedOnboarding = ({ visible, onFinish }: { visible: boolean, onFinish: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  if (!visible) return null;

  const step = STEPS[currentStep];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View 
          key={currentStep}
          entering={FadeIn.duration(400)} 
          exiting={FadeOut.duration(400)}
          style={styles.content}
        >
          <View style={styles.card}>
            <LinearGradient
              colors={[step.color + '40', 'transparent']}
              style={styles.gradient}
            />
            
            <View style={[styles.iconContainer, { backgroundColor: step.color }]}>
              <Ionicons name={step.icon as any} size={42} color="#FFF" />
            </View>

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
              style={[styles.button, { backgroundColor: step.color }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {currentStep === STEPS.length - 1 ? 'Start My Journey' : 'Next Step'}
              </Text>
              <Ionicons 
                name={currentStep === STEPS.length - 1 ? 'rocket' : 'arrow-forward'} 
                size={20} 
                color="#FFF" 
                style={{ marginLeft: 8 }} 
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
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
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
  },
});
