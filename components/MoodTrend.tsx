import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

const EMOJIS = ['😔', '😐', '🙂', '😊', '🔥'];

export function MoodTrend() {
  const { moodHistory, setMood } = useStore();

  const getMoodHeight = (m: string) => {
    switch (m) {
      case '🔥': return '90%';
      case '😊': return '75%';
      case '🙂': return '60%';
      case '😐': return '45%';
      case '😔': return '30%';
      default: return '50%';
    }
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>Mood</Text>
            <Text style={styles.status} numberOfLines={1}>Flow</Text>
          </View>
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => {
              // Cycle through moods for quick log or we could show a real selector
              const nextMood = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
              setMood(nextMood);
            }}
          >
            <IconSymbol name="sparkles" size={14} color="#7C5CFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.barsContainer}>
            {moodHistory.slice(-7).map((entry, i) => (
              <View key={i} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    { height: getMoodHeight(entry.mood) },
                    i === moodHistory.length - 1 && styles.activeBar
                  ]}
                />
              </View>
            ))}
            {moodHistory.length === 0 && (
              <Text style={styles.emptyText}>No data yet</Text>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 180,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    fontSize: 12,
  },
  status: {
    fontSize: 10,
    color: '#7C5CFF',
    fontWeight: 'bold',
  },
  logBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    flex: 1,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  barWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(124, 92, 255, 0.2)',
  },
  activeBar: {
    backgroundColor: '#7C5CFF',
    shadowColor: '#7C5CFF',
    shadowRadius: 5,
    elevation: 3,
  },
  emptyText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    width: '100%',
  }
});
