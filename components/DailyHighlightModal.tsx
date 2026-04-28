import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

interface DailyHighlightModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DailyHighlightModal = ({ isVisible, onClose }: DailyHighlightModalProps) => {
  const colors = useThemeColors();
  const tasks = useStore(s => s.tasks);
  const habits = useStore(s => s.habits);
  const focusSeconds = useStore(s => s.focusSession?.totalSecondsToday || 0);
  const today = new Date().toISOString().split('T')[0];
  
  const tasksDone = tasks.filter(t => t.date === today && t.completed).length;
  const habitsDone = habits.filter(h => h.completedDays.includes(today)).length;
  const focusHours = (focusSeconds / 3600).toFixed(1);

  if (!isVisible) return null;

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint={colors.isDark ? 'dark' : 'light'}>
        <View style={styles.centeredView}>
          <ConfettiCannon count={100} origin={{x: width/2, y: 0}} fadeOut />
          
          <Animated.View 
            entering={ZoomIn.duration(500)}
            style={[styles.modalView, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <LinearGradient
              colors={[colors.primary + '20', 'transparent']}
              style={styles.bgGradient}
            />

            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="sparkles" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Day Complete! 🏆</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>You've crushed your goals today.</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
                  <Ionicons name="checkbox" size={20} color={colors.secondary} />
                </View>
                <Text style={[styles.statText, { color: colors.text }]}>{tasksDone} Tasks Completed</Text>
              </View>

              <View style={styles.statRow}>
                <View style={[styles.statIcon, { backgroundColor: '#FF4B2B' + '20' }]}>
                  <Ionicons name="flame" size={20} color="#FF4B2B" />
                </View>
                <Text style={[styles.statText, { color: colors.text }]}>{habitsDone} Habits Maintained</Text>
              </View>

              <View style={styles.statRow}>
                <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="time" size={20} color={colors.success} />
                </View>
                <Text style={[styles.statText, { color: colors.text }]}>{focusHours}h Focus Time</Text>
              </View>
            </View>

            <View style={[styles.aiQuote, { backgroundColor: colors.background + '80' }]}>
              <Text style={[styles.quoteText, { color: colors.text }]}>
                "Consistency is the playground of giants. You are building a legendary life, one day at a time."
              </Text>
              <Text style={[styles.quoteAuthor, { color: colors.primary }]}>— Your AI Coach</Text>
            </View>

            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  aiQuote: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  quoteText: {
    fontSize: 15,
    fontFamily: 'Outfit-Medium',
    lineHeight: 22,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  closeButton: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
});
