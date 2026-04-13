import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getMoodConfig, getMoodFromLegacy, ACTIVITIES, EMOTIONS } from '@/constants/moods';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { BlurView } from 'expo-blur';
import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MoodEmoji } from './MoodEmoji';
import { History, Pencil, Plus, PlusCircle } from 'lucide-react-native';

export function MoodTrend() {
  const router = useRouter();
  const colors = useThemeColors();
  const moodHistory = useStore(s => s.moodHistory);

  const todayStr = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Sync selectedDate with today if today changes or when component mounts
  useEffect(() => {
    setSelectedDate(todayStr);
  }, [todayStr]);

  const getWeekDates = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return formatLocalDate(date);
    });
  };

  const weekDates = useMemo(() => getWeekDates(), [todayStr]);

  // Get selected day's mood entry
  const displayMood = useMemo(() => {
    const entry = moodHistory[selectedDate];
    if (!entry) return null;
    const level = typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy(entry.mood as any);
    return { ...entry, level };
  }, [moodHistory, selectedDate]);

  // Mini trend data
  const weekTrendData = useMemo(() => {
    return weekDates.map(dateStr => {
      const entry = moodHistory[dateStr];
      const level = entry 
        ? (typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy(entry.mood as any))
        : null;
      return { date: dateStr, level };
    });
  }, [moodHistory, weekDates]);

  const displayConfig = displayMood ? getMoodConfig(displayMood.level) : null;

  const getDayLabel = (dateStr: string) => {
    if (dateStr === todayStr) return "Today's Mood";
    const [y, m, d] = dateStr.split('-').map(Number);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${days[new Date(y, m - 1, d).getDay()]}'s Mood`;
  };

  const renderDetails = () => {
    if (!displayMood) return null;
    
    const activities = (displayMood.activities || []).map(id => ACTIVITIES.find(a => a.id === id)).filter(Boolean);
    const emotions = (displayMood.emotions || []).map(id => EMOTIONS.find(e => e.id === id)).filter(Boolean);
    
    const items = [...activities, ...emotions].slice(0, 4);
    
    if (items.length === 0) return null;

    return (
      <View style={styles.detailsRow}>
        {items.map((item: any, idx) => (
          <View key={idx} style={[styles.detailItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name={item.icon} size={12} color={displayConfig?.color || colors.textSecondary} />
          </View>
        ))}
        {(activities.length + emotions.length > 4) && (
          <Text style={[styles.moreText, { color: colors.textSecondary }]}>+{activities.length + emotions.length - 4}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <BlurView intensity={25} tint={colors.isDark ? "dark" : "light"} style={styles.blur}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mood</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted, borderWidth: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/mood-history');
              }}
            >
              <History size={16} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primaryTransparent, borderColor: colors.primaryMuted, borderWidth: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: '/mood-log', params: { date: selectedDate } });
              }}
            >
              {displayMood ? (
                <Pencil size={16} color={colors.primary} strokeWidth={2.5} />
              ) : (
                <Plus size={20} color={colors.primary} strokeWidth={3} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainArea}>
          {displayMood ? (
            <View style={styles.displayContent}>
              <View style={[styles.moodFaceLarge, { shadowColor: displayConfig?.color || colors.primary }]}>
                <MoodEmoji level={displayMood.level} size={52} />
              </View>
              <View style={styles.displayInfo}>
                <Text style={[styles.moodLabelLarge, { color: displayConfig?.color || colors.text }]}>
                  {displayConfig?.label}
                </Text>
                <Text style={[styles.daySub, { color: colors.textSecondary }]}>{getDayLabel(selectedDate)}</Text>
                {renderDetails()}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ctaCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: '/mood-log', params: { date: selectedDate } });
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.primaryTransparent, colors.isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)']}
                style={styles.ctaGradient}
              >
                <PlusCircle size={28} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.ctaText, { color: colors.primary }]}>How were you feeling?</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Mini 7-day trend (Monday Start) */}
        <View style={styles.trendRow}>
          {weekTrendData.map((day, i) => {
            const config = day.level ? getMoodConfig(day.level) : null;
            const isSelected = day.date === selectedDate;
            const isToday = day.date === todayStr;
            const isFuture = day.date > todayStr;

            return (
              <TouchableOpacity 
                key={i} 
                style={styles.trendDay}
                onPress={() => {
                  if (!isFuture) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(day.date);
                  }
                }}
                disabled={isFuture}
              >
                <View
                  style={[
                    styles.trendDot,
                    config ? { backgroundColor: config.color } : { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                    isSelected && [styles.dotSelected, { borderColor: config ? config.color : colors.textSecondary }],
                    isFuture && { opacity: 0.2 }
                  ]}
                />
                <Text style={[
                  styles.trendLabel, 
                  { color: colors.textSecondary + '60' }, 
                  isToday && { color: colors.primary, fontWeight: '800' },
                  isSelected && { color: colors.text, fontWeight: '800' }
                ]}>
                  {(() => {
                    const [y, m, d] = day.date.split('-').map(Number);
                    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(y, m - 1, d).getDay()];
                  })()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    height: 220,
  },
  blur: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainArea: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 10,
  },
  displayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moodFaceLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  displayInfo: {
    flex: 1,
    gap: 2,
  },
  moodLabelLarge: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  daySub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailItem: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ctaCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    borderRadius: 20,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  trendDay: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
