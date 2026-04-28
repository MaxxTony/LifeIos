import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

export const StreakProtectionBanner = () => {
  const colors = useThemeColors();
  const router = useRouter();

  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const focusSeconds = useStore(s => s.focusSession?.totalSecondsToday || 0);
  const lastMoodLog = useStore(s => s.lastMoodLog);
  const today = new Date().toISOString().split('T')[0];

  const tasksDone = tasks.filter(t => t.date === today && t.completed).length;
  const habitsDone = habits.filter(h => h.completedDays.includes(today)).length;
  const moodLogged = lastMoodLog && new Date(lastMoodLog.timestamp).toISOString().split('T')[0] === today;

  const isDayComplete = tasksDone >= 1 || habitsDone >= 1 || focusSeconds >= 600 || moodLogged;

  // Show after 6 PM if not complete
  const currentHour = new Date().getHours();
  const shouldShow = !isDayComplete && currentHour >= 18;

  if (!shouldShow) return null;

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutDown}
      style={styles.container}
    >
      <LinearGradient
        colors={['#FF4B2B', '#FF416C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="flame" size={24} color="#FFF" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Streak at Risk! 🔥</Text>
          <Text style={styles.subtitle}>Complete 1 task or 10m focus to save it.</Text>
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/all-tasks')}
        >
          <Text style={styles.actionText}>DO IT</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF416C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionText: {
    color: '#FF416C',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
});
