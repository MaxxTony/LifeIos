import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Clock } from 'lucide-react-native';

export function UpcomingTasks() {
  const { tasks } = useStore();
  
  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const upcoming = tasks
    .filter(t => !t.completed && t.dueTime && t.dueTime >= now && t.dueTime <= next24h)
    .sort((a, b) => (a.dueTime || 0) - (b.dueTime || 0))
    .slice(0, 3);

  const formatDueTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Tasks</Text>
          <Clock size={12} stroke="rgba(255,255,255,0.4)" />
        </View>
        
        <View style={styles.list}>
          {upcoming.length > 0 ? upcoming.map((task) => (
            <View key={task.id} style={styles.item}>
              <View style={styles.iconContainer}>
                 <IconSymbol name="sparkles" size={12} color="#7C5CFF" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.taskText} numberOfLines={1}>{task.text}</Text>
                <Text style={styles.timeText}>{formatDueTime(task.dueTime!)}</Text>
              </View>
            </View>
          )) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>All caught up! ✨</Text>
              <Text style={styles.emptySubText}>Tasks with times appear here</Text>
            </View>
          )}
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
    borderColor: 'rgba(255,255,255,0.08)',
    height: 180,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 1,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '400',
  }
});
