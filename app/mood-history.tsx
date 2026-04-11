import { MoodEmoji } from '@/components/MoodEmoji';
import { MOOD_LEVELS, getMoodConfig, getMoodFromLegacy } from '@/constants/moods';
import { Spacing, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MoodHistoryScreen() {
  const router = useRouter();
  const { moodHistory, focusHistory } = useStore();

  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper to normalize mood level
  const getMoodLevel = (entry: any): number => {
    return typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy(entry.mood);
  };

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = [];
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) {
      days.push(formatLocalDate(new Date(year, month, i)));
    }
    return days;
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const getMoodForDate = (dateStr: string) => {
    return moodHistory[dateStr];
  };

  const selectedEntry = useMemo(() => {
    const entry = getMoodForDate(selectedDate);
    const focusSeconds = focusHistory[selectedDate] || 0;
    if (!entry) return { entry: null, focusSeconds };
    const level = getMoodLevel(entry);
    return { entry: { ...entry, level }, focusSeconds };
  }, [selectedDate, moodHistory, focusHistory]);

  // Monthly stats
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthEntries = Object.values(moodHistory).filter(m => {
      const d = new Date(m.timestamp);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const counts = [0, 0, 0, 0, 0]; // levels 1-5
    monthEntries.forEach(e => {
      const level = getMoodLevel(e);
      if (level >= 1 && level <= 5) counts[level - 1]++;
    });

    const total = monthEntries.length || 1;
    return MOOD_LEVELS.map((m, i) => ({
      ...m,
      count: counts[i],
      percentage: Math.round((counts[i] / total) * 100),
    }));
  }, [currentMonth, moodHistory]);

  // Mood flow data for mini graph
  const moodFlowData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const data: { day: number; level: number | null }[] = [];
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = formatLocalDate(new Date(year, month, i));
      const entry = getMoodForDate(dateStr);
      data.push({ day: i, level: entry ? getMoodLevel(entry) : null });
    }
    return data;
  }, [currentMonth, moodHistory]);

  const navigateMonth = (dir: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + dir);
    setCurrentMonth(newMonth);
  };

  const formatHours = (s: number) => (s / 3600).toFixed(1);

  const handleDayPress = (dateStr: string) => {
    const today = getTodayLocal();
    if (dateStr > today) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Invalid Date",
        "You cannot log your mood for the future! Please live in the present. 😊",
        [{ text: "Okay" }]
      );
      return;
    }
    setSelectedDate(dateStr);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B0B0F', '#1A1A2E']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mood History</Text>
          <TouchableOpacity
            onPress={() => router.push('/mood-themes')}
            style={styles.logBtn}
          >
            <Ionicons name="settings-outline" size={18} color="#7C5CFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ===== CALENDAR ===== */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color="#7C5CFF" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{monthName}</Text>
              <TouchableOpacity onPress={() => navigateMonth(1)}>
                <Ionicons name="chevron-forward" size={20} color="#7C5CFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <Text key={i} style={styles.weekdayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {daysInMonth.map((dateStr, i) => {
                if (!dateStr) return <View key={`e-${i}`} style={styles.dayCell} />;

                const entry = getMoodForDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === getTodayLocal();
                const isFuture = dateStr > getTodayLocal();
                const moodLevel = entry ? getMoodLevel(entry) : null;
                const config = moodLevel ? getMoodConfig(moodLevel) : null;

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.dayCell, isFuture && { opacity: 0.2 }]}
                    onPress={() => handleDayPress(dateStr)}
                    activeOpacity={isFuture ? 1 : 0.6}
                  >
                    <View style={[
                      styles.dayCellInner,
                      config && { backgroundColor: config.bgColor },
                      isSelected && { borderWidth: 2, borderColor: '#7C5CFF' },
                      isToday && !isSelected && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
                    ]}>
                      {moodLevel ? (
                        <MoodEmoji level={moodLevel} size={22} />
                      ) : (
                        <View style={styles.emptyDayDot} />
                      )}
                      <Text style={[
                        styles.dayNum,
                        isToday && styles.dayNumToday,
                        isSelected && { color: '#7C5CFF' },
                      ]}>
                        {new Date(dateStr + 'T12:00:00').getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* ===== DAY DETAIL ===== */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <Text style={styles.detailDate}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>

            {selectedEntry.entry ? (
              <View>
                <View style={styles.detailTop}>
                  <View style={[styles.detailMoodFace, { backgroundColor: getMoodConfig(selectedEntry.entry.level).color }]}>
                    <MoodEmoji level={selectedEntry.entry.level} size={32} />
                  </View>
                  <View style={styles.detailMoodInfo}>
                    <Text style={[styles.detailMoodLabel, { color: getMoodConfig(selectedEntry.entry.level).color }]}>
                      {getMoodConfig(selectedEntry.entry.level).label}
                    </Text>
                    <Text style={styles.detailFocus}>{formatHours(selectedEntry.focusSeconds)}h focus</Text>
                  </View>
                </View>

                {/* Activities */}
                {selectedEntry.entry.activities && selectedEntry.entry.activities.length > 0 && (
                  <View style={styles.tagRow}>
                    {selectedEntry.entry.activities.map((a: string) => (
                      <View key={a} style={styles.tag}>
                        <Text style={styles.tagText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Emotions */}
                {selectedEntry.entry.emotions && selectedEntry.entry.emotions.length > 0 && (
                  <View style={styles.tagRow}>
                    {selectedEntry.entry.emotions.map((e: string) => (
                      <View key={e} style={[styles.tag, styles.emotionTag]}>
                        <Text style={[styles.tagText, styles.emotionTagText]}>{e}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Note */}
                {selectedEntry.entry.note && (
                  <Text style={styles.noteText}>"{selectedEntry.entry.note}"</Text>
                )}
              </View>
            ) : (
              <View style={styles.emptyDetail}>
                <Ionicons name="sparkles-outline" size={32} color="rgba(255,255,255,0.08)" />
                <Text style={styles.emptyDetailText}>Empty Emotion</Text>
                <TouchableOpacity
                  style={styles.logNowBtn}
                  onPress={() => router.push({ pathname: '/mood-log', params: { date: selectedDate } })}
                >
                  <Text style={styles.logNowText}>Register Your Emotion</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* ===== MOOD BAR (Distribution) ===== */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
            <Text style={styles.cardTitle}>Mood Distribution</Text>
            <View style={styles.moodBarContainer}>
              {monthStats.map((stat) => (
                <View key={stat.level} style={styles.moodBarItem}>
                  <View style={[styles.moodBarFace, { backgroundColor: stat.bgColor }]}>
                    <MoodEmoji level={stat.level} size={18} />
                  </View>
                  <Text style={[styles.moodBarPct, { color: stat.count > 0 ? stat.color : 'rgba(255,255,255,0.2)' }]}>
                    {stat.percentage}%
                  </Text>
                </View>
              ))}
            </View>
            {/* Stacked bar */}
            <View style={styles.stackedBar}>
              {monthStats.map((stat) => (
                stat.percentage > 0 ? (
                  <View
                    key={stat.level}
                    style={[styles.stackedSegment, { flex: stat.percentage, backgroundColor: stat.color }]}
                  />
                ) : null
              ))}
              {monthStats.every(s => s.percentage === 0) && (
                <View style={[styles.stackedSegment, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
              )}
            </View>
          </Animated.View>

          {/* ===== MOOD FLOW GRAPH ===== */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
            <Text style={styles.cardTitle}>Mood Flow</Text>
            <View style={styles.flowGraph}>
              {/* Y-axis labels */}
              <View style={styles.flowYAxis}>
                {[5, 4, 3, 2, 1].map(l => (
                  <View key={l} style={styles.flowYLabel}>
                    <MoodEmoji level={l} size={14} />
                  </View>
                ))}
              </View>
              {/* Bars */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flowBars}>
                {moodFlowData.map((d) => {
                  const config = d.level ? getMoodConfig(d.level) : null;
                  return (
                    <View key={d.day} style={styles.flowBarCol}>
                      <View style={styles.flowBarTrack}>
                        <View
                          style={[
                            styles.flowBarFill,
                            {
                              height: d.level ? `${(d.level / 5) * 100}%` : '0%',
                              backgroundColor: config?.color || 'transparent',
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.flowBarDate}>{d.day}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  headerTitle: { ...Typography.h3, color: '#FFF', fontSize: 18, fontFamily: 'Outfit-Bold' },
  closeBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22,
  },
  logBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(124,92,255,0.1)', borderRadius: 22,
  },
  scrollContent: { padding: Spacing.md, gap: 16 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Calendar
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  monthLabel: { ...Typography.h3, color: '#FFF', fontSize: 18 },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: {
    flexBasis: '14.28%',
    textAlign: 'center',
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { flexBasis: '14.28%', alignItems: 'center', marginVertical: 3 },
  dayCellInner: {
    width: 42,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dayNum: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },
  dayNumToday: { color: '#FFF' },

  // Detail
  detailDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 14,
  },
  detailTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  detailMoodFace: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  detailMoodInfo: { gap: 2 },
  detailMoodLabel: { fontSize: 22, fontFamily: 'Outfit-Bold' },
  detailFocus: { fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tagText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  emotionTag: { backgroundColor: 'rgba(124,92,255,0.08)', borderColor: 'rgba(124,92,255,0.15)' },
  emotionTagText: { color: '#9B8EC4' },
  noteText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 6,
  },
  emptyDetail: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyDetailText: { fontSize: 12, color: 'rgba(255,255,255,0.2)' },
  logNowBtn: {
    marginTop: 6,
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderRadius: 12,
  },
  logNowText: { color: '#7C5CFF', fontSize: 13, fontWeight: '700' },

  // Mood Bar Distribution
  moodBarContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  moodBarItem: { alignItems: 'center', gap: 6 },
  moodBarFace: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  moodBarPct: { fontSize: 12, fontFamily: 'Outfit-Bold' },
  stackedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  stackedSegment: { borderRadius: 5 },

  // Flow Graph
  flowGraph: { flexDirection: 'row', height: 120 },
  flowYAxis: {
    width: 20,
    justifyContent: 'space-between',
    paddingBottom: 18,
  },
  flowYLabel: { alignItems: 'center' },
  flowBars: { flex: 1, marginLeft: 6 },
  flowBarCol: { alignItems: 'center', width: 18, marginHorizontal: 1 },
  flowBarTrack: {
    flex: 1,
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  flowBarFill: { width: '100%', borderRadius: 4 },
  flowBarDate: { fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 3 },
});
