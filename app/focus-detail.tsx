import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeInDown, SlideInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { getFocusQuote } from '@/services/ai';
import { ActivityIndicator } from 'react-native';

export default function FocusDetailScreen() {
  useKeepAwake();
  const router = useRouter();
  const { focusSession, focusGoalHours, toggleFocusSession, updateFocusTime } = useStore();
  
  const [mounted, setMounted] = useState(false);
  const [aiQuote, setAiQuote] = useState<string | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Fetch AI Quote
    const fetchQuote = async () => {
      setIsLoadingQuote(true);
      const quote = await getFocusQuote();
      if (quote) setAiQuote(quote);
      setIsLoadingQuote(false);
    };

    fetchQuote();

    let interval: any;
    if (focusSession.isActive) {
      interval = setInterval(() => {
        updateFocusTime();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusSession.isActive]);

  const formatTimeParts = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return {
      h: String(hrs).padStart(2, '0'),
      m: String(mins).padStart(2, '0'),
      s: String(secs).padStart(2, '0')
    };
  };

  const timeParts = formatTimeParts(focusSession.totalSecondsToday);
  const goalSeconds = focusGoalHours * 3600;
  const progress = Math.min(1, focusSession.totalSecondsToday / goalSeconds);

  const handleToggle = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleFocusSession();
  };

  const quotes = [
    "Focus is the key to all success.",
    "Your focus determines your reality.",
    "Stay focused, stay humble, always work hard.",
    "The successful warrior is the average man, with laser-like focus.",
    "Energy flows where attention goes."
  ];

  const fallbackQuote = quotes[Math.floor((focusSession.totalSecondsToday / 60) % quotes.length)];
  const displayQuote = aiQuote || fallbackQuote;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B0B0F', '#1A1A2E']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Glows */}
      <View style={[styles.glow, { top: '20%', left: '-10%', backgroundColor: Colors.dark.primary + '15' }]} />
      <View style={[styles.glow, { bottom: '10%', right: '-10%', backgroundColor: Colors.dark.secondary + '10' }]} />

      <SafeAreaViewHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.heroSection}>
          <Text style={styles.sessionStatus}>
            {focusSession.isActive ? 'DEEP WORK IN PROGRESS' : 'SESSION PAUSED'}
          </Text>
          
          <View style={styles.timerContainer}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeDigit}>{timeParts.h}</Text>
              <Text style={styles.timeLabel}>HRS</Text>
            </View>
            <Text style={styles.separator}>:</Text>
            <View style={styles.timeBlock}>
              <Text style={styles.timeDigit}>{timeParts.m}</Text>
              <Text style={styles.timeLabel}>MINS</Text>
            </View>
            <Text style={styles.separator}>:</Text>
            <View style={styles.timeBlock}>
              <Text style={styles.timeDigit}>{timeParts.s}</Text>
              <Text style={styles.timeLabel}>SECS</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View 
                style={[styles.progressBarFill, { width: `${progress * 100}%` }]} 
              />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Daily Goal: {focusGoalHours}h</Text>
              <Text style={styles.progressValue}>{Math.floor(progress * 100)}%</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.quoteSection}>
          <View style={styles.quoteIconRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.dark.primary} />
            {isLoadingQuote && <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginLeft: 10 }} />}
          </View>
          <Text style={styles.quoteText}>{displayQuote}</Text>
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(600)} style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.mainButton, focusSession.isActive && styles.stopButton]} 
            onPress={handleToggle}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={focusSession.isActive ? "stop" : "play"} 
              size={28} 
              color="#FFF" 
            />
            <Text style={styles.buttonText}>
              {focusSession.isActive ? 'Stop Session' : 'Resume Focus'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SafeAreaViewHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-down" size={30} color="#FFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Focus Dashboard</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 32,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sessionStatus: {
    ...Typography.labelSmall,
    color: Colors.dark.primary,
    letterSpacing: 2,
    marginBottom: 20,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  timeBlock: {
    alignItems: 'center',
    width: 70,
  },
  timeDigit: {
    ...Typography.h1Hero,
    fontSize: 48,
    color: '#FFF',
    lineHeight: 54,
  },
  timeLabel: {
    ...Typography.labelSmall,
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  separator: {
    ...Typography.h1Hero,
    fontSize: 40,
    color: 'rgba(255,255,255,0.2)',
    paddingBottom: 15,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.caption,
    fontSize: 12,
  },
  progressValue: {
    ...Typography.caption,
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  quoteSection: {
    marginTop: 30,
    padding: 24,
    backgroundColor: 'rgba(124, 92, 255, 0.05)',
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
  },
  quoteIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteText: {
    ...Typography.body,
    fontStyle: 'italic',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
  },
  actionSection: {
    marginTop: 40,
    width: '100%',
  },
  mainButton: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#FF4B4B',
    shadowColor: '#FF4B4B',
  },
  buttonText: {
    ...Typography.h3,
    color: '#FFF',
  }
});
