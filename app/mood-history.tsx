import { MoodEmoji } from '@/components/MoodEmoji';
import { MOOD_LEVELS, getMoodConfig, getMoodFromLegacy } from '@/constants/moods';
import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useProGate } from '@/hooks/useProFeature';
import { useStore } from '@/store/useStore';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
// O14 FIX: Replaced outer ScrollView with FlatList so off-screen cards are
// virtualized and not rendered until they scroll into view.
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBlock } from '@/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// O14 FIX: Section keys used as FlatList data. Each key maps to one card in the UI.
const SECTION_KEYS = ['calendar', 'detail', 'distribution', 'flow', 'spacer'] as const;

// BUG-NET-2 FIX: Skeleton shown while moodLoaded === false (slow connection / first open)
function MoodHistorySkeleton() {
  const colors = useThemeColors();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1, padding: Spacing.md, gap: 16 }}>
      {/* Calendar card skeleton */}
      <View style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}>
        {/* Month nav */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <SkeletonBlock width={20} height={20} borderRadius={10} />
          <SkeletonBlock width={140} height={22} borderRadius={8} />
          <SkeletonBlock width={20} height={20} borderRadius={10} />
        </View>
        {/* Weekday labels */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {[...Array(7)].map((_, i) => (
            <SkeletonBlock key={i} width={`${100 / 7}%` as any} height={12} borderRadius={4} style={{ marginHorizontal: 1 }} />
          ))}
        </View>
        {/* Day grid — 5 rows × 7 cols */}
        {[...Array(5)].map((_, row) => (
          <View key={row} style={{ flexDirection: 'row', marginBottom: 6 }}>
            {[...Array(7)].map((_, col) => (
              <View key={col} style={{ flexBasis: '14.28%', alignItems: 'center' }}>
                <SkeletonBlock width={38} height={44} borderRadius={12} />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Day detail card skeleton */}
      <View style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}>
        <SkeletonBlock width="50%" height={14} borderRadius={6} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <SkeletonBlock width={52} height={52} borderRadius={26} />
          <View style={{ gap: 8 }}>
            <SkeletonBlock width={100} height={22} borderRadius={8} />
            <SkeletonBlock width={60} height={12} borderRadius={4} />
          </View>
        </View>
      </View>

      {/* Distribution card skeleton */}
      <View style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}>
        <SkeletonBlock width={120} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <SkeletonBlock width={36} height={36} borderRadius={18} />
              <SkeletonBlock width={28} height={12} borderRadius={4} />
            </View>
          ))}
        </View>
        <SkeletonBlock width="100%" height={10} borderRadius={5} />
      </View>
    </Animated.View>
  );
}

export default function MoodHistoryScreen() {
  const router = useRouter();
  const moodHistory = useStore(s => s.moodHistory);
  const focusHistory = useStore(s => s.focusHistory);
  const focusSecondsToday = useStore(s => s.focusSession.totalSecondsToday);
  // BUG-NET-2 FIX: Gate the full render on moodLoaded so we show skeleton
  // instead of a blank/zero-filled screen on first open or slow connection.
  const moodLoaded = useStore(s => s.syncStatus.moodLoaded);
  const colors = useThemeColors();
  const { isPro } = useProGate();

  // Gate 10: Free users only see calendar + detail; distribution + flow are Pro-only
  const visibleSections = useMemo(() => {
    if (isPro) return SECTION_KEYS;
    return SECTION_KEYS.filter(k => k !== 'distribution' && k !== 'flow');
  }, [isPro]);

  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1); // Set to 1st to avoid overflow issues
    return d;
  });

  // MIN-04 FIX: Detect timezone offset changes mid-session and force calendar re-render
  const [tzOffset, setTzOffset] = useState(() => new Date().getTimezoneOffset());
  useEffect(() => {
    const interval = setInterval(() => {
      const currentOffset = new Date().getTimezoneOffset();
      setTzOffset(prev => prev !== currentOffset ? currentOffset : prev);
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

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
    const isToday = selectedDate === getTodayLocal();
    const focusSeconds = isToday ? focusSecondsToday : (focusHistory[selectedDate] || 0);

    if (!entry) return { entry: null, focusSeconds };
    const level = getMoodLevel(entry);
    return { entry: { ...entry, level }, focusSeconds };
  }, [selectedDate, moodHistory, focusHistory, focusSecondsToday]);

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthEntries = Object.values(moodHistory).filter(m => {
      const d = new Date(m.timestamp);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const counts = [0, 0, 0, 0, 0];
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
    
    // M-14 FIX: Month navigation bounds (3 years past, no future)
    const now = new Date();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(now.getFullYear() - 3);
    
    if (newMonth > now) return; // Can't go to future months
    if (newMonth < threeYearsAgo) return; // Can't go earlier than 3 years
    
    setCurrentMonth(newMonth);
  };

  const formatHours = (s: number) => (s / 3600).toFixed(1);

  const handleDayPress = (dateStr: string) => {
    const today = getTodayLocal();
    if (dateStr > today) return; // Future dates are disabled in UI
    setSelectedDate(dateStr);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colors.isDark ? ['#0B0B0F', colors.background] : ['#F8FAFC', colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mood History</Text>
          <TouchableOpacity
            onPress={() => router.push('/mood-themes')}
            style={[styles.logBtn, { backgroundColor: colors.primaryTransparent }]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* BUG-NET-2 FIX: Show skeleton while Firestore snapshot hasn't resolved yet */}
        {!moodLoaded ? (
          <MoodHistorySkeleton />
        ) : (
          // O14 FIX: FlatList replaces outer ScrollView. Each card is a separate
          // list item so React Native virtualizes off-screen cards.
          // We pass selectedEntry / monthStats / moodFlowData via extraData so
          // FlatList re-renders items only when relevant data changes.
          <FlatList
            data={visibleSections}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.scrollContent}
            extraData={[selectedDate, currentMonth, moodHistory]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: section }) => {
              if (section === 'calendar') return (
                <Animated.View
                  key={`calendar-tz-${tzOffset}`}
                  entering={FadeInDown.delay(100)}
                  style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
                >
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => navigateMonth(-1)}>
                      <Ionicons name="chevron-back" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.monthLabel, { color: colors.text }]}>{monthName}</Text>
                    <TouchableOpacity onPress={() => navigateMonth(1)}>
                      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.weekdayRow}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <Text key={i} style={[styles.weekdayText, { color: colors.textSecondary + '60' }]}>{d}</Text>
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
                          style={[styles.dayCell, isFuture && { opacity: 0.5 }]}
                          onPress={() => handleDayPress(dateStr)}
                          activeOpacity={isFuture ? 1 : 0.6}
                          disabled={isFuture}
                        >
                          <View style={[
                            styles.dayCellInner,
                            { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' },
                            config && { backgroundColor: config.bgColor },
                            isSelected && { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryTransparent },
                            isToday && !isSelected && { borderWidth: 1, borderColor: colors.primary + '40' },
                          ]}>
                            {moodLevel ? (
                              <MoodEmoji level={moodLevel} size={22} />
                            ) : (
                              <View style={[styles.emptyDayDot, { backgroundColor: colors.textSecondary + '20' }]} />
                            )}
                            <Text style={[
                              styles.dayNum,
                              { color: colors.textSecondary + '60' },
                              isToday && { color: colors.text },
                              isSelected && { color: colors.primary },
                            ]}>
                              {new Date(dateStr + 'T12:00:00').getDate()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              );

              if (section === 'detail') return (
                <Animated.View
                  entering={FadeInDown.delay(200)}
                  style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
                >
                  <View style={styles.detailHeader}>
                    <Text style={[styles.detailDate, { color: colors.textSecondary + '80' }]}>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    {selectedEntry.entry && (
                      <TouchableOpacity
                        style={[styles.smallEditBtn, { backgroundColor: colors.primaryTransparent }]}
                        onPress={() => router.push({ pathname: '/mood-log', params: { date: selectedDate } })}
                      >
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                        <Text style={[styles.smallEditBtnText, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
                          <Text style={[styles.detailFocus, { color: colors.textSecondary + '60' }]}>{formatHours(selectedEntry.focusSeconds)}h focus</Text>
                        </View>
                      </View>
                      {selectedEntry.entry.activities && selectedEntry.entry.activities.length > 0 && (
                        <View style={styles.tagRow}>
                          {selectedEntry.entry.activities.map((a: string) => (
                            <View key={a} style={[styles.tag, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{a}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {selectedEntry.entry.emotions && selectedEntry.entry.emotions.length > 0 && (
                        <View style={styles.tagRow}>
                          {selectedEntry.entry.emotions.map((e: string) => (
                            <View key={e} style={[styles.tag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                              <Text style={[styles.tagText, { color: colors.primary }]}>{e}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {selectedEntry.entry.note && (
                        <Text style={[styles.noteText, { color: colors.textSecondary }]}>"{selectedEntry.entry.note}"</Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.emptyDetail}>
                      <Ionicons name="sparkles-outline" size={32} color={colors.textSecondary + '20'} />
                      <Text style={[styles.emptyDetailText, { color: colors.textSecondary + '40' }]}>Empty Emotion</Text>
                      <TouchableOpacity
                        style={[styles.logNowBtn, { backgroundColor: colors.primaryTransparent }]}
                        onPress={() => router.push({ pathname: '/mood-log', params: { date: selectedDate } })}
                      >
                        <Text style={[styles.logNowText, { color: colors.primary }]}>Register Your Emotion</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              );

              if (section === 'distribution') return (
                <Animated.View
                  entering={FadeInDown.delay(300)}
                  style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
                >
                  <Text style={[styles.cardTitle, { color: colors.textSecondary + '60' }]}>Mood Distribution</Text>
                  <View style={styles.moodBarContainer}>
                    {monthStats.map((stat) => (
                      <View key={stat.level} style={styles.moodBarItem}>
                        <View style={[styles.moodBarFace, { backgroundColor: stat.bgColor }]}>
                          <MoodEmoji level={stat.level} size={18} />
                        </View>
                        <Text style={[styles.moodBarPct, { color: stat.count > 0 ? stat.color : colors.textSecondary + '40' }]}>
                          {stat.percentage}%
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.stackedBar, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    {monthStats.map((stat) => (
                      stat.percentage > 0 ? (
                        <View key={stat.level} style={[styles.stackedSegment, { flex: stat.percentage, backgroundColor: stat.color }]} />
                      ) : null
                    ))}
                  </View>
                </Animated.View>
              );

              if (section === 'flow') return (
                <Animated.View
                  entering={FadeInDown.delay(400)}
                  style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: colors.border }]}
                >
                  <Text style={[styles.cardTitle, { color: colors.textSecondary + '60' }]}>Mood Flow</Text>
                  <View style={styles.flowGraph}>
                    <View style={styles.flowYAxis}>
                      {[5, 4, 3, 2, 1].map(l => (
                        <View key={l} style={styles.flowYLabel}>
                          <MoodEmoji level={l} size={14} />
                        </View>
                      ))}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flowBars}>
                      {moodFlowData.map((d) => {
                        const config = d.level ? getMoodConfig(d.level) : null;
                        return (
                          <View key={d.day} style={styles.flowBarCol}>
                            <View style={[styles.flowBarTrack, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
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
                            <Text style={[styles.flowBarDate, { color: colors.textSecondary + '40' }]}>{d.day}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                </Animated.View>
              );

              // 'spacer' section
              return <View style={{ height: 40 }} />;
            }}
          />
        )}

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold' },
  closeBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    borderRadius: 22,
  },
  logBtn: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    borderRadius: 22,
  },
  scrollContent: { padding: Spacing.md, gap: 16 },

  // Card
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 14,
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
  monthLabel: { ...Typography.h3, fontSize: 18 },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: {
    flexBasis: '14.28%',
    textAlign: 'center',
    fontSize: 10,
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
  },
  emptyDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dayNum: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    marginTop: 2,
  },

  // Detail
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailDate: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  smallEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  smallEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  detailMoodFace: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  detailMoodInfo: { gap: 2 },
  detailMoodLabel: { fontSize: 22, fontFamily: 'Outfit-Bold' },
  detailFocus: { fontSize: 11, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '600' },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 6,
  },
  emptyDetail: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyDetailText: { fontSize: 12 },
  logNowBtn: {
    marginTop: 6,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 12,
  },
  logNowText: { fontSize: 13, fontWeight: '700' },

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
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  flowBarFill: { width: '100%', borderRadius: 4 },
  flowBarDate: { fontSize: 7, marginTop: 3 },
});
