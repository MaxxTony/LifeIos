import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export const WeeklyRecapModal = () => {
  const colors = useThemeColors();
  const weeklyRecaps = useStore(s => s.weeklyRecaps) ?? {};
  const markRecapAsSeen = useStore(s => s.actions.markRecapAsSeen);
  
  // Find the latest unseen recap
  const latestUnseen = Object.values(weeklyRecaps)
    .filter(r => !r.hasSeen)
    .sort((a, b) => b.generatedAt - a.generatedAt)[0];

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (latestUnseen) {
      const timer = setTimeout(() => {
        setVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [latestUnseen]);

  if (!latestUnseen) return null;

  const handleClose = () => {
    markRecapAsSeen(latestUnseen.weekId);
    setVisible(false);
  };

  const StatRow = ({ icon, label, value, color, delay }: any) => (
    <Animated.View 
      entering={FadeInDown.delay(delay).duration(600)}
      style={[styles.statCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      </View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)' }]}
        />
        
        <Animated.View 
          entering={ZoomIn.springify().damping(15)}
          style={[styles.modalContent, { backgroundColor: colors.background }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary || colors.primary]}
            style={styles.headerGradient}
          >
            <Ionicons name="trophy" size={48} color="#FFF" />
            <Text style={styles.headerTitle}>Week in Review</Text>
            <Text style={styles.headerSub}>{latestUnseen.weekId}</Text>
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>You killed it this week! 🔥</Text>
            
            <View style={styles.statsGrid}>
              <StatRow 
                icon="flash" 
                label="XP Gained" 
                value={latestUnseen.xpGained.toLocaleString()} 
                color="#FFD700" 
                delay={400}
              />
              <StatRow 
                icon="checkbox" 
                label="Tasks Done" 
                value={latestUnseen.tasksCompleted} 
                color="#4CAF50" 
                delay={500}
              />
              <StatRow 
                icon="repeat" 
                label="Habit Wins" 
                value={latestUnseen.habitCompletions} 
                color="#2196F3" 
                delay={600}
              />
              <StatRow 
                icon="timer" 
                label="Focus Time" 
                value={`${latestUnseen.focusHours}h`} 
                color="#9C27B0" 
                delay={700}
              />
            </View>

            <Animated.View 
              entering={FadeIn.delay(1000)}
              style={styles.quoteBox}
            >
              <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
                "Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort."
              </Text>
            </Animated.View>
          </ScrollView>

          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>Win the Next Week</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: height * 0.8,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  headerGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    color: '#FFF',
    marginTop: 12,
  },
  headerSub: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Outfit-Bold',
    marginTop: 4,
  },
  scrollBody: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - Spacing.lg * 2 - Spacing.xl * 2 - Spacing.md) / 2,
    padding: Spacing.md,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Outfit-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  quoteBox: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#7C5CFF',
    fontStyle: 'italic',
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  closeButton: {
    margin: Spacing.xl,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFF',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
});
