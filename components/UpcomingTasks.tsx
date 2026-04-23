import { BlurView } from '@/components/BlurView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Clock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function UpcomingTasks() {
  const tasks = useStore(s => s.tasks);
  const colors = useThemeColors();

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
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={30} tint={colors.isDark ? 'dark' : 'light'} style={styles.blur}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>Upcoming Tasks</Text>
          <Clock size={12} color={colors.textSecondary} />
        </View>

        <View style={styles.list}>
          {upcoming.length > 0 ? upcoming.map((task) => (
            <View key={task.id} style={[styles.item, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryTransparent }]}>
                <IconSymbol name="sparkles" size={12} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{task.text}</Text>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatDueTime(task.dueTime!)}</Text>
              </View>
            </View>
          )) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All caught up! ✨</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary, opacity: 0.5 }]}>Tasks with times appear here</Text>
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  taskText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
    fontFamily: 'Outfit-SemiBold',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 11,
    fontWeight: '400',
  }
});
