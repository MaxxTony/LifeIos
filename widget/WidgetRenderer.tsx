import React from 'react';
import { FocusTimerWidget } from './widgets/FocusTimerWidget';
import { HabitsWidget } from './widgets/HabitsWidget';
import { MoodWidget } from './widgets/MoodWidget';
import { NotLoggedInWidget } from './widgets/NotLoggedInWidget';
import { TasksWidget } from './widgets/TasksWidget';
import { XPLevelWidget } from './widgets/XPLevelWidget';
import { resolveAccent, getLevelInfo, getToday, getDateOffset, ThemeMode } from './widgets/utils';

export function renderWidgetByName(widgetName: string, state: any) {
  // Handle both raw state and mapped WidgetData
  const isLoggedIn = state?.userId || state?.isLoggedIn;
  if (!isLoggedIn) {
    return <NotLoggedInWidget />;
  }

  const theme: ThemeMode = state.theme || 'dark';
  const accent = resolveAccent(state.accentColor);
  const today = getToday();

  // Normalize data access
  const stats = state.stats || state;
  const totalXP = stats.totalXP ?? 0;
  const globalStreak = stats.streak ?? stats.globalStreak ?? 0;
  const level = stats.level ?? 1;

  switch (widgetName) {
    case 'FocusTimerWidget': {
      const focus = state.focus || state.focusSession || {};
      return (
        <FocusTimerWidget
          totalSeconds={focus.totalSecondsToday ?? 0}
          goalHours={state.focusGoalHours ?? (state.focus?.goalSeconds ? state.focus.goalSeconds / 3600 : 8)}
          isActive={focus.isActive ?? false}
          lastUpdated={state.lastUpdated}
          accent={accent}
          theme={theme}
        />
      );
    }

    case 'HabitsWidget': {
      const habits = state.habits ?? [];
      // If habits are already mapped (isDoneToday exists), use them directly
      const isMapped = habits.length > 0 && 'isDoneToday' in habits[0];
      
      const dayOfWeek = new Date().getDay();
      const todayHabits = isMapped ? habits : habits.filter((h: any) => {
        if (h.pausedUntil && h.pausedUntil >= today) return false;
        if (h.frequency === 'daily' || h.frequency === 'weekly') {
          return (h.targetDays ?? []).includes(dayOfWeek);
        }
        return false;
      });

      return (
        <HabitsWidget
          habits={todayHabits.map((h: any) => ({
            ...h,
            isDoneToday: h.isDoneToday ?? (h.completedDays ?? []).includes(today)
          }))}
          today={today}
          globalStreak={globalStreak}
          accent={accent}
          theme={theme}
        />
      );
    }

    case 'TasksWidget': {
      const tasks = state.tasks ?? [];
      const isMapped = tasks.length > 0 && 'completed' in tasks[0] && !('date' in tasks[0]);
      
      const todayTasks = isMapped ? tasks : tasks
        .filter((t: any) => t.date === today && !t.completed)
        .sort((a: any, b: any) => {
          const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
          return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
        });

      return <TasksWidget tasks={todayTasks} accent={accent} theme={theme} />;
    }

    case 'XPLevelWidget': {
      const levelInfo = state.stats ? state.stats : getLevelInfo(totalXP);
      return (
        <XPLevelWidget
          level={levelInfo.level ?? level}
          levelName={levelInfo.levelName ?? 'Spark'}
          xpProgress={levelInfo.xpProgress ?? 0}
          globalStreak={globalStreak}
          accent={accent}
          theme={theme}
        />
      );
    }

    case 'MoodWidget': {
      const moodData = state.mood || {};
      const last5 = moodData.last5Days ?? Array.from({ length: 5 }, (_, i) => {
        const date = getDateOffset(4 - i);
        return state.moodHistory?.[date]?.mood ?? 0;
      });
      // Prioritize moodHistory for today to prevent stale past moods
      const todayMood = state.moodHistory?.[today]?.mood ?? moodData.today ?? null;

      return (
        <MoodWidget
          todayMood={todayMood}
          last5Days={last5}
          accent={accent}
          theme={theme}
        />
      );
    }

    default:
      return <NotLoggedInWidget />;
  }
}

