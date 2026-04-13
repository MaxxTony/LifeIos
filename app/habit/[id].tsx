import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { HabitHeatmap } from '@/components/HabitHeatmap';
import { formatLocalDate } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  const { habits, removeHabit, getStreak, toggleHabit } = useStore();
  
  const habit = habits.find(h => h.id === id);
  const isCompletedToday = habit?.completedDays.includes(formatLocalDate(new Date()));
  
  if (!habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Habit not found</Text>
      </SafeAreaView>
    );
  }

  const currentStreak = getStreak(habit.id);
  const bestStreak = habit.bestStreak || currentStreak;
  const totalCompletions = habit.completedDays.length;
  
  const daysSinceCreation = Math.max(1, Math.ceil((Date.now() - habit.createdAt) / (1000 * 60 * 60 * 24)));
  const completionRate = Math.round((totalCompletions / daysSinceCreation) * 100);

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit and all its progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            removeHabit(habit.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{habit.icon} {habit.title}</Text>
        <TouchableOpacity 
          onPress={handleDelete} 
          style={[styles.moreBtn, { backgroundColor: colors.danger + '15' }]}
        >
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.streakRow}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.streakCard, { borderColor: colors.border }]}>
             <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Current Streak</Text>
             <View style={styles.streakValueContainer}>
                <Text style={[styles.streakValue, { color: colors.text }]}>{currentStreak}</Text>
                <Ionicons name="flame" size={24} color={colors.primary} />
             </View>
          </BlurView>
          
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.streakCard, { borderColor: colors.border }]}>
             <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Best Streak</Text>
             <View style={styles.streakValueContainer}>
                <Text style={[styles.streakValue, { color: colors.text }]}>{bestStreak}</Text>
                <Ionicons name="flame" size={24} color={colors.primary} />
             </View>
          </BlurView>
        </View>

        <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.statsCard, { borderColor: colors.border }]}>
           <Text style={[styles.sectionTitle, { color: colors.text }]}>Total Completions</Text>
           <Text style={[styles.sinceText, { color: colors.textSecondary }]}>Since {new Date(habit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
           <Text style={[styles.totalValue, { color: colors.text }]}>{totalCompletions}</Text>
           
           <View style={[styles.heatmapWrapper, { borderTopColor: colors.border }]}>
             <HabitHeatmap completedDays={habit.completedDays} createdAt={habit.createdAt} />
           </View>
        </BlurView>

        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
             <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{completionRate}%</Text>
             <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={[styles.progressBar, { width: `${completionRate}%`, backgroundColor: colors.success }]} />
             </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
             <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Frequency</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
             <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reminder</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{habit.reminderTime || 'Off'}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
             <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Habit created on</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{new Date(habit.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.toggleBtn, 
            { 
              backgroundColor: isCompletedToday ? (colors.isDark ? '#1a332a' : '#f0fdf4') : colors.primary,
              borderColor: isCompletedToday ? colors.success + '40' : colors.primary
            },
            isCompletedToday && { shadowOpacity: 0 }
          ]}
          onPress={() => {
            if (!isCompletedToday) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleHabit(habit.id);
            }
          }}
          disabled={isCompletedToday}
          activeOpacity={isCompletedToday ? 1 : 0.8}
        >
          <Text style={[
            styles.toggleBtnText, 
            { color: isCompletedToday ? colors.success : '#FFF' }
          ]}>
            {isCompletedToday ? 'Completed for Today ✅' : 'Mark as Done'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  streakCard: {
    flex: 1,
    padding: 18,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statsCard: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sinceText: {
    fontSize: 12,
    marginBottom: 15,
  },
  totalValue: {
    fontSize: 42,
    fontWeight: '800',
    marginBottom: 25,
  },
  heatmapWrapper: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  infoCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  toggleBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  toggleBtnText: {
    fontSize: 16,
    fontWeight: '800',
  }
});
