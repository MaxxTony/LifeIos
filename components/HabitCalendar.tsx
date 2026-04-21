import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatLocalDate, getTodayLocal } from '@/utils/dateUtils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Flame, Activity, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface HabitCalendarProps {
  completedDays: string[];
  createdAt: number;
  frequency?: 'daily' | 'weekly' | 'monthly';
  targetDays?: number[];    // for weekly: JS getDay() values [0=Sun…6=Sat]
  monthlyDay?: number;      // for monthly fixed: day of month (1–28)
  monthlyTarget?: number;   // for monthly count: how many sessions per month
  goalDays?: number;        // for monthly: number of months commitment
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────
// Shows a compact month-card grid capped to the commitment duration
// Only the selected day-of-month is shown per month
function MonthlyCalendar({ completedDays, createdAt, monthlyDay, goalDays }: {
  completedDays: string[];
  createdAt: number;
  monthlyDay: number;
  goalDays: number;
}) {
  const colors = useThemeColors();
  const today = new Date();
  const todayStr = getTodayLocal();

  // Build the list of months in the commitment window
  const startDate = new Date(createdAt);
  const months = useMemo(() => {
    const result: { year: number; month: number; targetDateStr: string; label: string }[] = [];
    for (let i = 0; i < goalDays; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      // Build the target date string for this month — e.g. "2026-04-07"
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); // last day of month
      const dayToUse = Math.min(monthlyDay, maxDay);
      const targetDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dayToUse).padStart(2, '0')}`;
      result.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        targetDateStr,
        label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return result;
  }, [createdAt, goalDays, monthlyDay]);

  const completedSet = new Set(completedDays);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <View style={[mStyles.legend, { backgroundColor: colors.success }]} />
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Completed</Text>
        <View style={[mStyles.legend, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', marginLeft: 8 }]} />
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Missed / Upcoming</Text>
      </View>

      {months.map((m) => {
        const isCompleted = completedSet.has(m.targetDateStr);
        const targetDate = new Date(m.targetDateStr);
        const isToday = m.targetDateStr === todayStr;
        const isFuture = targetDate > today && !isToday;
        const isMissed = !isCompleted && !isFuture && !isToday;

        let bgColor = colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
        if (isCompleted) bgColor = colors.success + '18';
        if (isFuture) bgColor = colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)';
        if (isToday && !isCompleted) bgColor = colors.primary + '10';

        return (
          <View
            key={m.targetDateStr}
            style={[
              mStyles.monthRow,
              { backgroundColor: bgColor, borderColor: isCompleted ? colors.success + '40' : colors.border }
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{m.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                {isToday ? 'Today · ' : ''}{monthlyDay}{monthlyDay === 1 ? 'st' : monthlyDay === 2 ? 'nd' : monthlyDay === 3 ? 'rd' : 'th'} of the month
              </Text>
            </View>

            {/* Status badge */}
            <View style={[
              mStyles.badge,
              {
                backgroundColor: isCompleted ? colors.success : isToday ? colors.primary + '25' : isFuture ? 'transparent' : colors.danger + '20',
                borderWidth: (isFuture || (isToday && !isCompleted)) ? 1 : 0,
                borderColor: isToday ? colors.primary + '40' : colors.border,
              }
            ]}>
              <Text style={{
                fontSize: 11, fontWeight: '800',
                color: isCompleted ? '#FFF' : isToday ? colors.primary : isFuture ? colors.textSecondary : colors.danger
              }}>
                {isCompleted ? '✓ Done' : isToday ? 'Due Today' : isFuture ? 'Upcoming' : '✗ Missed'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const mStyles = StyleSheet.create({
  legend: { width: 10, height: 10, borderRadius: 3 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
});

// ─── Weekly-aware Calendar ────────────────────────────────────────────────────
// Standard monthly grid but non-target days are faded/dim and don't show completions
function WeeklyCalendar({ completedDays, createdAt, targetDays }: {
  completedDays: string[];
  createdAt: number;
  targetDays: number[];
}) {
  const colors = useThemeColors();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const targetSet = new Set(targetDays);
  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const canGoPrev = true;
  const canGoNext = true;

  const handlePrev = () => {
    if (!canGoPrev) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNext = () => {
    if (!canGoNext) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = startOfMonth.getDay(); // 0 = Sunday
    const diffToMonday = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - diffToMonday);

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean; isCompleted: boolean; isFuture: boolean; isTarget: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      // Map grid column (0=Mon…6=Sun) to JS getDay (1=Mon…0=Sun)
      const colIndex = i % 7;
      const jsDay = colIndex === 6 ? 0 : colIndex + 1;
      const dateStr = formatLocalDate(d);
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: d.getMonth() === viewDate.getMonth(),
        isToday: dateStr === getTodayLocal(),
        isCompleted: completedDays.includes(dateStr),
        isFuture: d > today,
        isTarget: targetSet.has(jsDay),
      });
    }
    return days;
  }, [viewDate, completedDays, targetDays]);

  // Consistency: completions / expected in last 4 weeks
  const consistency = useMemo(() => {
    let completedCount = 0;
    let expectedCount = 0;
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const jsDay = d.getDay();
      if (targetSet.has(jsDay)) {
        expectedCount++;
        if (completedDays.includes(formatLocalDate(d))) completedCount++;
      }
    }
    if (expectedCount === 0) return 0;
    return Math.round((completedCount / expectedCount) * 100);
  }, [completedDays, targetDays]);

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Stats chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <View style={[chip.wrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Activity size={13} color={colors.primary} />
          <Text style={[chip.text, { color: colors.text }]}>{consistency}% On-Schedule</Text>
        </View>
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: colors.text }}>
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={handlePrev}
            style={[chip.navBtn, { borderColor: colors.border, opacity: canGoPrev ? 1 : 0.3 }]}
          >
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            style={[chip.navBtn, { borderColor: colors.border, opacity: canGoNext ? 1 : 0.3 }]}
          >
            <ChevronRight size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day header labels — only show target days */}
      <View style={grid.headerRow}>
        {DAY_LABELS.map((label, i) => {
          const colIndex = i;
          const jsDay = colIndex === 6 ? 0 : colIndex + 1;
          const isTarget = targetSet.has(jsDay);
          return (
            <View key={i} style={grid.headerCell}>
              <Text style={[
                grid.headerText,
                { color: isTarget ? colors.primary : colors.textSecondary + '30' }
              ]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Grid */}
      <View style={grid.body}>
        {calendarDays.map((day, i) => {
          const isNonTarget = !day.isTarget;
          return (
            <View key={i} style={grid.cellWrap}>
              <View style={[
                grid.cell,
                isNonTarget
                  ? { backgroundColor: 'transparent', opacity: 0.18 }
                  : { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                !day.isCurrentMonth && { opacity: isNonTarget ? 0.06 : 0.2 },
                !isNonTarget && day.isCompleted && { backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
                !isNonTarget && day.isToday && !day.isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
                !isNonTarget && day.isFuture && { opacity: 0.15 },
              ]}>
                <Text style={[
                  grid.cellText,
                  { color: isNonTarget
                      ? colors.textSecondary
                      : day.isCompleted ? '#FFF' : (day.isCurrentMonth ? colors.text : colors.textSecondary)
                  },
                  !isNonTarget && day.isToday && !day.isCompleted && { color: colors.primary, fontWeight: '800' },
                ]}>
                  {day.date.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Daily Calendar (original logic, unchanged) ───────────────────────────────
function DailyCalendar({ completedDays, createdAt }: { completedDays: string[]; createdAt: number }) {
  const colors = useThemeColors();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const canGoPrev = true;
  const canGoNext = true;

  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date(today);
    const todayStr = formatLocalDate(checkDate);
    if (!completedDays.includes(todayStr)) checkDate.setDate(checkDate.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const dStr = formatLocalDate(checkDate);
      if (completedDays.includes(dStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }
    return streak;
  }, [completedDays]);

  const consistency = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (completedDays.includes(formatLocalDate(d))) count++;
    }
    return Math.round((count / 30) * 100);
  }, [completedDays]);

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = startOfMonth.getDay();
    const diffToMonday = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - diffToMonday);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatLocalDate(d);
      days.push({ date: d, dateStr, isCurrentMonth: d.getMonth() === viewDate.getMonth(), isToday: dateStr === getTodayLocal(), isCompleted: completedDays.includes(dateStr), isFuture: d > today });
    }
    return days;
  }, [viewDate, completedDays]);

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <View style={[chip.wrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Flame size={13} color={colors.danger} fill={currentStreak > 0 ? colors.danger : 'transparent'} />
          <Text style={[chip.text, { color: colors.text }]}>{currentStreak} Day Streak</Text>
        </View>
        <View style={[chip.wrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Activity size={13} color={colors.primary} />
          <Text style={[chip.text, { color: colors.text }]}>{consistency}% Consistency</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: colors.text }}>
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => { if (canGoPrev) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); } }} style={[chip.navBtn, { borderColor: colors.border, opacity: canGoPrev ? 1 : 0.3 }]}><ChevronLeft size={18} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => { if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); } }} style={[chip.navBtn, { borderColor: colors.border, opacity: canGoNext ? 1 : 0.3 }]}><ChevronRight size={18} color={colors.text} /></TouchableOpacity>
        </View>
      </View>

      <View style={grid.headerRow}>
        {DAY_LABELS.map((d, i) => <View key={i} style={grid.headerCell}><Text style={[grid.headerText, { color: colors.textSecondary }]}>{d}</Text></View>)}
      </View>

      <View style={grid.body}>
        {calendarDays.map((day, i) => (
          <View key={i} style={grid.cellWrap}>
            <View style={[
              grid.cell,
              { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
              !day.isCurrentMonth && { opacity: 0.2 },
              day.isCompleted && { backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
              day.isToday && !day.isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
              day.isFuture && { opacity: 0.1 },
            ]}>
              <Text style={[grid.cellText, { color: day.isCompleted ? '#FFF' : (day.isCurrentMonth ? colors.text : colors.textSecondary) }, day.isToday && !day.isCompleted && { color: colors.primary, fontWeight: '800' }]}>
                {day.date.getDate()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Monthly Count Goal Calendar ──────────────────────────────────────────────
// For "do this X times / month, any day" - shows a regular grid where any
// logged day is green. Navigation capped to createdAt → today.
function MonthlyCountCalendar({ completedDays, createdAt, monthlyTarget }: {
  completedDays: string[];
  createdAt: number;
  monthlyTarget: number;
}) {
  const colors = useThemeColors();
  const today = new Date();
  const todayStr = getTodayLocal();
  const [viewDate, setViewDate] = useState(new Date());
  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const canGoPrev = true;
  const canGoNext = true;

  // This month completions
  const thisMonthStr = todayStr.slice(0, 7);
  const thisMonthCompletions = completedDays.filter(d => d.startsWith(thisMonthStr)).length;

  // Viewing month completions
  const viewMonthStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const viewMonthCompletions = completedDays.filter(d => d.startsWith(viewMonthStr)).length;

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = startOfMonth.getDay();
    const diffToMonday = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - diffToMonday);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatLocalDate(d);
      days.push({
        date: d, dateStr,
        isCurrentMonth: d.getMonth() === viewDate.getMonth(),
        isToday: dateStr === todayStr,
        isCompleted: completedDays.includes(dateStr),
        isFuture: d > today,
      });
    }
    return days;
  }, [viewDate, completedDays]);

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Stats chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <View style={[chip.wrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Activity size={13} color={colors.primary} />
          <Text style={[chip.text, { color: colors.text }]}>
            {thisMonthCompletions} / {monthlyTarget} this month
          </Text>
        </View>
        {thisMonthCompletions >= monthlyTarget && (
          <View style={[chip.wrap, { backgroundColor: colors.success + '20' }]}>
            <Text style={[chip.text, { color: colors.success }]}>🎉 Target Hit!</Text>
          </View>
        )}
      </View>

      {/* Month header + nav */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: colors.text }}>
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {viewMonthCompletions} / {monthlyTarget} sessions logged
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => { if (canGoPrev) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); } }} style={[chip.navBtn, { borderColor: colors.border, opacity: canGoPrev ? 1 : 0.3 }]}><ChevronLeft size={18} color={colors.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => { if (canGoNext) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); } }} style={[chip.navBtn, { borderColor: colors.border, opacity: canGoNext ? 1 : 0.3 }]}><ChevronRight size={18} color={colors.text} /></TouchableOpacity>
        </View>
      </View>

      {/* Day labels */}
      <View style={grid.headerRow}>
        {DAY_LABELS.map((d, i) => <View key={i} style={grid.headerCell}><Text style={[grid.headerText, { color: colors.textSecondary }]}>{d}</Text></View>)}
      </View>

      {/* Grid — all days clickable, any day can be a session */}
      <View style={grid.body}>
        {calendarDays.map((day, i) => (
          <View key={i} style={grid.cellWrap}>
            <View style={[
              grid.cell,
              { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
              !day.isCurrentMonth && { opacity: 0.2 },
              day.isCompleted && { backgroundColor: colors.success, shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
              day.isToday && !day.isCompleted && { borderWidth: 1.5, borderColor: colors.primary },
              day.isFuture && { opacity: 0.1 },
            ]}>
              <Text style={[
                grid.cellText,
                { color: day.isCompleted ? '#FFF' : (day.isCurrentMonth ? colors.text : colors.textSecondary) },
                day.isToday && !day.isCompleted && { color: colors.primary, fontWeight: '800' },
              ]}>
                {day.date.getDate()}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', opacity: 0.6 }}>
        Each green day = 1 logged session
      </Text>
    </View>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function HabitCalendar({ completedDays, createdAt, frequency = 'daily', targetDays = [], monthlyDay, goalDays, monthlyTarget }: HabitCalendarProps) {
  if (frequency === 'monthly') {
    // Fixed Date mode: monthlyDay is defined → show month-card list
    if (monthlyDay !== undefined && monthlyDay > 0) {
      return (
        <MonthlyCalendar
          completedDays={completedDays}
          createdAt={createdAt}
          monthlyDay={monthlyDay}
          goalDays={goalDays ?? 3}
        />
      );
    }
    // Count Goal mode: no fixed day → show regular grid with monthly count chip
    return (
      <MonthlyCountCalendar
        completedDays={completedDays}
        createdAt={createdAt}
        monthlyTarget={monthlyTarget ?? 1}
      />
    );
  }
  if (frequency === 'weekly') {
    return (
      <WeeklyCalendar
        completedDays={completedDays}
        createdAt={createdAt}
        targetDays={targetDays}
      />
    );
  }
  return <DailyCalendar completedDays={completedDays} createdAt={createdAt} />;
}

const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
  text: { fontSize: 12, fontWeight: '700' },
  navBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});

const grid = StyleSheet.create({
  headerRow: { flexDirection: 'row' },
  headerCell: { flex: 1, alignItems: 'center', paddingBottom: 6 },
  headerText: { fontSize: 10, fontWeight: '800' },
  body: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  cell: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  skipCell: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 12, fontWeight: '600' },
});
