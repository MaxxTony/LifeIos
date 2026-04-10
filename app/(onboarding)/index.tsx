import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';

const { width, height } = Dimensions.get('window');

const STRUGGLES = [
  { id: 'lost', label: 'Feeling lost' },
  { id: 'stress', label: 'Stress & anxiety' },
  { id: 'focus', label: 'No focus' },
  { id: 'routine', label: 'No routine' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [selectedStruggles, setSelectedStruggles] = useState<string[]>([]);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const router = useRouter();
  const { setOnboardingData, completeOnboarding } = useStore();

  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const handleNext = () => {
    if (step < 5) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStep(step + 1);
      });
    } else {
      completeOnboarding();
      router.replace('/(auth)/login');
    }
  };

  const toggleStruggle = (id: string) => {
    if (selectedStruggles.includes(id)) {
      setSelectedStruggles(selectedStruggles.filter(s => s !== id));
    } else {
      setSelectedStruggles([...selectedStruggles, id]);
    }
  };

  useEffect(() => {
    if (step === 4) {
      setTimeout(() => {
        setLoadingComplete(true);
      }, 2000);
    }
  }, [step]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>You are not lazy.</Text>
            <Text style={[styles.title, { color: Colors.dark.primary }]}>You are just lost.</Text>
            <Text style={styles.subtitle}>Let’s fix your life</Text>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                <Text style={styles.buttonText}>Start</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.content}>
            <Text style={styles.h2}>What are you struggling with?</Text>
            <View style={styles.optionsContainer}>
              {STRUGGLES.map((s) => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.option, selectedStruggles.includes(s.id) && styles.optionSelected]}
                  onPress={() => toggleStruggle(s.id)}
                >
                  <Text style={[styles.optionText, selectedStruggles.includes(s.id) && styles.optionTextSelected]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.button} onPress={() => {
              setOnboardingData({ struggles: selectedStruggles });
              handleNext();
            }}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                <Text style={styles.buttonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View style={styles.content}>
            <Text style={styles.h2}>Your AI Life Assistant</Text>
            <View style={styles.featureList}>
              <FeatureItem icon="⚡" text="Plan your day" />
              <FeatureItem icon="🧘" text="Reduce stress" />
              <FeatureItem icon="🎯" text="Stay focused" />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                <Text style={styles.buttonText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View style={styles.content}>
            {!loadingComplete ? (
              <>
                <Text style={styles.h2}>Creating your plan...</Text>
                <View style={styles.loadingContainer}>
                   <View style={styles.loadingBar} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.h2}>Your day is ready ⚡</Text>
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                  <LinearGradient colors={Colors.dark.gradient} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                    <Text style={styles.buttonText}>See My Plan</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      case 5:
        return (
          <View style={styles.content}>
            <Text style={styles.h2}>Save your progress and access anytime</Text>
            <Text style={styles.subtitle}>Last step to join LifeOS</Text>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.gradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                <Text style={styles.buttonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.main, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    ...Typography.h1,
    color: Colors.dark.text,
    textAlign: 'center',
  },
  h2: {
    ...Typography.h2,
    color: Colors.dark.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl * 2,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  option: {
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '10',
  },
  optionText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  optionTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  featureList: {
    width: '100%',
    marginBottom: Spacing.xl * 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  loadingContainer: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '50%',
    height: '100%',
    backgroundColor: Colors.dark.primary,
  }
});
