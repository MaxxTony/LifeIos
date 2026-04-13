import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { HabitCalendar } from '@/components/HabitCalendar';
import { formatLocalDate } from '@/utils/dateUtils';
import * as Haptics from 'expo-haptics';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { ChevronLeft, Trash2, Flame, Trophy, Calendar, Target, Bell, Info } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PremiumCard = ({ children, style }: { children: React.ReactNode, style?: any }) => {
  const colors = useThemeColors();
  return (
    <View style={[
      styles.premiumCard,
      { backgroundColor: colors.card, borderColor: colors.border },
      style
    ]}>
      {children}
    </View>
  );
};

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
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.liquidBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Not Found</Text>
        </View>
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeHabit(habit.id);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Glows */}
      <View style={[styles.glow, { top: -100, right: -100, backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.glow, { bottom: -150, left: -150, backgroundColor: colors.secondary + '10' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Liquid Glass Header */}
        <View style={styles.headerContainer}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => router.back()}
                style={[styles.liquidBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={22} color={colors.text} />
              </TouchableOpacity>
              
              <Text style={[styles.headerTitle, { color: colors.text }]}>{habit.icon} {habit.title}</Text>
              
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.liquidBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Streak Row */}
          <View style={styles.streakRow}>
            <PremiumCard style={styles.streakCard}>
               <View style={styles.cardHeader}>
                 <Flame size={16} color={colors.primary} fill={currentStreak > 0 ? colors.primary : 'transparent'} />
                 <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Current Streak</Text>
               </View>
               <Text style={[styles.streakValue, { color: colors.text }]}>{currentStreak} <Text style={styles.unitText}>days</Text></Text>
            </PremiumCard>
            
            <PremiumCard style={styles.streakCard}>
               <View style={styles.cardHeader}>
                 <Trophy size={16} color={colors.secondary} fill={bestStreak > 0 ? colors.secondary : 'transparent'} />
                 <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Best Streak</Text>
               </View>
               <Text style={[styles.streakValue, { color: colors.text }]}>{bestStreak} <Text style={styles.unitText}>days</Text></Text>
            </PremiumCard>
          </View>

          {/* Habit Calendar Section */}
          <PremiumCard style={styles.calendarContainer}>
            <View style={styles.sectionHeader}>
              <Calendar size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Tracking</Text>
            </View>
            <HabitCalendar completedDays={habit.completedDays} createdAt={habit.createdAt} />
            <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
              Joined on {new Date(habit.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </PremiumCard>

          {/* Stats Grid */}
          <View style={styles.infoGrid}>
            <PremiumCard style={styles.infoCard}>
               <View style={styles.infoHead}>
                 <Target size={14} color={colors.success} />
                 <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Consistency</Text>
               </View>
               <Text style={[styles.infoValue, { color: colors.text }]}>{completionRate}%</Text>
               <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <LinearGradient colors={[colors.success, colors.primary]} start={{x:0,y:0}} end={{x:1,y:0}} style={[styles.progressBar, { width: `${completionRate}%` }]} />
               </View>
            </PremiumCard>

            <PremiumCard style={styles.infoCard}>
               <View style={styles.infoHead}>
                 <Bell size={14} color={colors.secondary} />
                 <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reminder</Text>
               </View>
               <Text style={[styles.infoValue, { color: colors.text }]}>{habit.reminderTime || 'None set'}</Text>
            </PremiumCard>

            <PremiumCard style={styles.longInfoCard}>
               <View style={styles.infoHead}>
                 <Info size={14} color={colors.primary} />
                 <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Completions</Text>
               </View>
               <Text style={[styles.infoValue, { color: colors.text }]}>{totalCompletions} successful sessions</Text>
            </PremiumCard>
          </View>

          <TouchableOpacity 
            style={[
              styles.toggleBtn, 
              isCompletedToday ? { backgroundColor: colors.isDark ? '#1a332a' : '#f0fdf4', borderColor: colors.success + '40' } : { borderColor: 'transparent' }
            ]}
            onPress={() => {
              if (!isCompletedToday) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                toggleHabit(habit.id);
              }
            }}
            disabled={isCompletedToday}
            activeOpacity={isCompletedToday ? 1 : 0.8}
          >
            {isCompletedToday ? (
              <View style={styles.completedContent}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={[styles.toggleBtnText, { color: colors.success }]}>Completed for Today</Text>
              </View>
            ) : (
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.btnGradient}>
                <Text style={[styles.toggleBtnText, { color: '#FFF' }]}>Spark My Habit ✨</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.25, zIndex: -1 },
  headerContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  headerBlur: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  liquidBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  premiumCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
  },
  calendarContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  footerInfo: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  infoCard: {
    width: (width - Spacing.md * 2 - 12) / 2,
    padding: 16,
  },
  longInfoCard: {
    width: '100%',
    padding: 16,
  },
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  toggleBtn: {
    height: 64,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  btnGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 17,
    fontWeight: '800',
  },
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  }
});
