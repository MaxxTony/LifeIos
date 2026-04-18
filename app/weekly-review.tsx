import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Trophy, Target, Zap, Brain, TrendingUp, ChevronLeft, Sparkles, Calendar, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { ShareCard } from '@/components/ShareCard';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';

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

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const focusHistory = useStore(s => s.focusHistory);
  const moodHistory = useStore(s => s.moodHistory);
  const userName = useStore(s => s.userName);

  const shareCardRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  const flashOpacity = useSharedValue(0);

  const triggerShutter = () => {
    flashOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 400 })
    );
  };

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Visual Shutter Effect
      triggerShutter();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Delay for snapshot to feel like a camera capture
      await new Promise(resolve => setTimeout(resolve, 200));

      const uri = await shareCardRef.current?.capture?.();
      
      if (uri) {
        try {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your Weekly Progress',
            UTI: 'public.png',
          });
        } catch (nativeError) {
          console.warn('Native sharing failed, falling back to text:', nativeError);
          const message = `🚀 Leveling Up! My LifeOS Weekly Report:\n\n` +
            `✅ Tasks Done: ${stats.completedTasks}/${stats.totalTasks}\n` +
            `🔥 Habits Kept: ${stats.completedHabits}\n` +
            `🧠 Deep Work: ${stats.focusHours}h\n` +
            `✨ Avg Mood: ${stats.avgMood}\n` +
            `📈 Consistency: ${stats.habitRate}%\n\n` +
            `Check out LifeOS to track your growth!`;
            
          await Share.share({
            message,
            title: 'Weekly Progress Report',
          });
        }
      }
    } catch (error) {
      console.error('Sharing logic failed', error);
    } finally {
      setIsSharing(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return formatLocalDate(d);
    }).reverse();

    let completedTasks = 0;
    let totalTasks = 0;
    let completedHabits = 0;
    let totalHabitSlots = habits.length * 7;
    let totalFocusSeconds = 0;
    let moodSum = 0;
    let moodCount = 0;

    last7Days.forEach(date => {
      const dayTasks = tasks.filter(t => t.date === date);
      totalTasks += dayTasks.length;
      completedTasks += dayTasks.filter(t => t.completed).length;

      habits.forEach(h => {
        if (h.completedDays.includes(date)) completedHabits++;
      });

      totalFocusSeconds += focusHistory[date] || 0;

      const mood = moodHistory[date];
      if (mood) {
        moodSum += mood.mood;
        moodCount++;
      }
    });

    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const habitRate = totalHabitSlots > 0 ? Math.round((completedHabits / totalHabitSlots) * 100) : 0;
    const avgMood = moodCount > 0 ? (moodSum / moodCount).toFixed(1) : '—';
    const focusHours = (totalFocusSeconds / 3600).toFixed(1);

    return { completedTasks, totalTasks, taskRate, completedHabits, habitRate, focusHours, avgMood, last7Days };
  }, [tasks, habits, focusHistory, moodHistory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={[colors.primary + '10', 'transparent']} 
        style={StyleSheet.absoluteFill} 
      />

      {/* SHUTTER FLASH OVERLAY */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: '#FFF', zIndex: 9999 }, 
          animatedFlashStyle
        ]} 
        pointerEvents="none"
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly Review</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Trophy size={40} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Stellar Week! 🚀</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>You've moved significantly closer to your goals.</Text>
          </View>

          <PremiumCard style={styles.mainStatsCard}>
            <View style={styles.statsRow}>
              <StatItem 
                icon={<Target size={20} color={colors.secondary} />} 
                label="Tasks" 
                value={`${stats.completedTasks}/${stats.totalTasks}`} 
                subtext={`${stats.taskRate}% completion`}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatItem 
                icon={<Zap size={20} color={colors.danger} />} 
                label="Habits" 
                value={`${stats.completedHabits}`} 
                subtext={`${stats.habitRate}% consistency`}
              />
            </View>
            <View style={[styles.horizontalDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statsRow}>
              <StatItem 
                icon={<Brain size={20} color={colors.success} />} 
                label="Focus" 
                value={`${stats.focusHours}h`} 
                subtext="Deep work hours"
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <StatItem 
                icon={<Sparkles size={20} color={colors.warning} />} 
                label="Mood" 
                value={`${stats.avgMood}`} 
                subtext="Average feel"
              />
            </View>
          </PremiumCard>

          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Day-by-Day Pulse</Text>
          </View>

          <ViewShot options={{ format: 'png', quality: 0.9 }}>
            <PremiumCard style={styles.chartCard}>
              <View style={styles.chartDots}>
                {stats.last7Days.map((date, i) => {
                  const dayTasks = tasks.filter(t => t.date === date);
                  const done = dayTasks.filter(t => t.completed).length;
                  const perc = dayTasks.length > 0 ? (done / dayTasks.length) : 0;
                  return (
                    <View key={i} style={styles.chartCol}>
                      <View style={[styles.chartBarBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <LinearGradient 
                          colors={[colors.primary, colors.secondary]} 
                          style={[styles.chartBar, { height: `${perc * 100}%` }]} 
                        />
                      </View>
                      <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
                        {new Date(date).toLocaleDateString([], { weekday: 'narrow' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </PremiumCard>
          </ViewShot>

          {/* Off-screen high-quality share card */}
          <View style={styles.hiddenCardContainer} pointerEvents="none">
             <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1.0 }}>
                <ShareCard stats={stats} userName={userName} />
             </ViewShot>
          </View>

          <TouchableOpacity 
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            disabled={isSharing}
          >
            <View style={styles.shareBtnContent}>
               {!isSharing && <Camera size={20} color="#FFF" style={{ marginRight: 10 }} />}
               <Text style={styles.shareBtnText}>
                 {isSharing ? 'Capturing Snapshot...' : 'Snap & Share Progress'}
               </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatItem({ icon, label, value, subtext }: { icon: any, label: string, value: string, subtext: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.statItem}>
      <View style={styles.statIconHeader}>
        {icon}
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statSub, { color: colors.textSecondary }]}>{subtext}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.lg, gap: 24, paddingBottom: 60 },
  heroSection: { alignItems: 'center', marginVertical: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  heroSub: { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 },
  premiumCard: { borderRadius: 32, borderWidth: 1, padding: 24 },
  mainStatsCard: { gap: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  divider: { width: 1, height: '80%', alignSelf: 'center' },
  horizontalDivider: { height: 1, width: '100%', marginVertical: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statIconHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statSub: { fontSize: 9, fontWeight: '600', opacity: 0.6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  chartCard: { padding: 20 },
  chartDots: { flexDirection: 'row', justifyContent: 'space-between', height: 120, alignItems: 'flex-end' },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBarBg: { width: 12, height: 100, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 8 },
  chartBar: { width: '100%', borderRadius: 6 },
  chartLabel: { fontSize: 10, fontWeight: '700' },
  shareBtn: { height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  shareBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  shareBtnContent: { flexDirection: 'row', alignItems: 'center' },
  hiddenCardContainer: {
    position: 'absolute',
    opacity: 0,
    left: -width * 2,
  }
});
