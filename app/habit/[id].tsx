import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { HabitHeatmap } from '@/components/HabitHeatmap';
import { formatLocalDate } from '@/utils/dateUtils';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { habits, removeHabit, getStreak, toggleHabit } = useStore();
  
  const habit = habits.find(h => h.id === id);
  
  if (!habit) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{color: '#FFF'}}>Habit not found</Text>
      </SafeAreaView>
    );
  }

  const currentStreak = getStreak(habit.id);
  const bestStreak = habit.bestStreak || currentStreak;
  const totalCompletions = habit.completedDays.length;
  
  // Calculate completion rate (simplistic: since creation)
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{habit.icon} {habit.title}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.moreBtn}>
          <Ionicons name="trash-outline" size={22} color="#FF4B4B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Streak Hero */}
        <View style={styles.streakRow}>
          <BlurView intensity={20} tint="dark" style={styles.streakCard}>
             <Text style={styles.streakLabel}>Current Streak</Text>
             <View style={styles.streakValueContainer}>
                <Text style={styles.streakValue}>{currentStreak}</Text>
                <Ionicons name="flame" size={24} color="#FF8C42" />
             </View>
          </BlurView>
          
          <BlurView intensity={20} tint="dark" style={styles.streakCard}>
             <Text style={styles.streakLabel}>Best Streak</Text>
             <View style={styles.streakValueContainer}>
                <Text style={styles.streakValue}>{bestStreak}</Text>
                <Ionicons name="flame" size={24} color="#FF8C42" />
             </View>
          </BlurView>
        </View>

        {/* Stats Section */}
        <BlurView intensity={20} tint="dark" style={styles.statsCard}>
           <Text style={styles.sectionTitle}>Total Completions</Text>
           <Text style={styles.sinceText}>Since {new Date(habit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
           <Text style={styles.totalValue}>{totalCompletions}</Text>
           
           <View style={styles.heatmapWrapper}>
             <HabitHeatmap completedDays={habit.completedDays} createdAt={habit.createdAt} />
           </View>
        </BlurView>

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
             <Text style={styles.infoLabel}>Completion Rate</Text>
             <Text style={styles.infoValue}>{completionRate}%</Text>
             <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${completionRate}%` }]} />
             </View>
          </View>

          <View style={styles.infoCard}>
             <Text style={styles.infoLabel}>Frequency</Text>
             <Text style={styles.infoValue}>{habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}</Text>
          </View>

          <View style={styles.infoCard}>
             <Text style={styles.infoLabel}>Reminder</Text>
             <Text style={styles.infoValue}>{habit.reminderTime || 'Off'}</Text>
          </View>

          <View style={styles.infoCard}>
             <Text style={styles.infoLabel}>Habit created on</Text>
             <Text style={styles.infoValue}>{new Date(habit.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.toggleBtn}
          onPress={() => toggleHabit(habit.id)}
        >
          <Text style={styles.toggleBtnText}>
            {habit.completedDays.includes(formatLocalDate(new Date())) ? 'Completed for Today ✅' : 'Mark as Done'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,75,75,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
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
    color: '#FFF',
  },
  statsCard: {
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  sinceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 15,
  },
  totalValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 25,
  },
  heatmapWrapper: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  infoCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00D68F',
    borderRadius: 2,
  },
  toggleBtn: {
    backgroundColor: '#FFF',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  toggleBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  }
});
