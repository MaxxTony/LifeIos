import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getFocusQuote } from '@/services/ai';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FocusDetailScreen() {
  useKeepAwake();
  const router = useRouter();
  const { focusSession, focusGoalHours, toggleFocusSession, updateFocusTime } = useStore();
  const colors = useThemeColors();
  
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
  }, []);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.isDark ? ['#0B0B0F', '#1A1A2E'] : ['#F8FAFC', '#F1F5F9']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Background Glows */}
      <View style={[styles.glow, { top: '20%', left: '-10%', backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: '10%', right: '-10%', backgroundColor: colors.secondary + '10' }]} />

      <SafeAreaViewHeader onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          entering={FadeInDown.delay(200)} 
          style={[
            styles.heroSection, 
            { backgroundColor: colors.isDark ? (colors.background + '40') : 'rgba(255, 255, 255, 0.7)', borderColor: colors.border }
          ]}
        >
          <Text style={[styles.sessionStatus, { color: colors.primary }]}>
            {focusSession.isActive ? 'DEEP WORK IN PROGRESS' : 'SESSION PAUSED'}
          </Text>
          
          <View style={styles.timerContainer}>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeDigit, { color: colors.text }]}>{timeParts.h}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>HRS</Text>
            </View>
            <Text style={[styles.separator, { color: colors.textSecondary + '20' }]}>:</Text>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeDigit, { color: colors.text }]}>{timeParts.m}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>MINS</Text>
            </View>
            <Text style={[styles.separator, { color: colors.textSecondary + '20' }]}>:</Text>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeDigit, { color: colors.text }]}>{timeParts.s}</Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>SECS</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Animated.View 
                style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} 
              />
            </View>
            <View style={styles.progressTextRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Daily Goal: {focusGoalHours}h</Text>
              <Text style={[styles.progressValue, { color: colors.text }]}>{Math.floor(progress * 100)}%</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400)} 
          style={[styles.quoteSection, { backgroundColor: colors.primaryTransparent }]}
        >
          <View style={styles.quoteIconRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
            {isLoadingQuote && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
          </View>
          <Text style={[styles.quoteText, { color: colors.textSecondary }]}>{displayQuote}</Text>
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(600)} style={styles.actionSection}>
          <TouchableOpacity 
            style={[
              styles.mainButton, 
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              focusSession.isActive && [styles.stopButton, { backgroundColor: colors.danger, shadowColor: colors.danger }]
            ]} 
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
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Ionicons name="chevron-down" size={30} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Focus Dashboard</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
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
    borderRadius: 32,
    padding: 30,
    borderWidth: 1,
  },
  sessionStatus: {
    ...Typography.labelSmall,
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
    lineHeight: 54,
  },
  timeLabel: {
    ...Typography.labelSmall,
    fontSize: 8,
    marginTop: 4,
  },
  separator: {
    ...Typography.h1Hero,
    fontSize: 40,
    paddingBottom: 15,
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
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
    fontWeight: '700',
  },
  quoteSection: {
    marginTop: 30,
    padding: 24,
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
    lineHeight: 24,
  },
  actionSection: {
    marginTop: 40,
    width: '100%',
  },
  mainButton: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
