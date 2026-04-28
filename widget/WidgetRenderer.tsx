import React from 'react';
import { FocusTimerWidget } from './widgets/FocusTimerWidget';
import { HabitsWidget } from './widgets/HabitsWidget';
import { MoodWidget } from './widgets/MoodWidget';
import { NotLoggedInWidget } from './widgets/NotLoggedInWidget';
import { TasksWidget } from './widgets/TasksWidget';
import { XPLevelWidget } from './widgets/XPLevelWidget';
import { FlexWidget } from 'react-native-android-widget';
import { resolveAccent, getLevelInfo, getToday, getDateOffset, ThemeMode } from './widgets/utils';

export function WidgetRenderer({ widgetName, state, widgetInfo }: { widgetName: string, state: any, widgetInfo?: any }) {
  // Handle both raw state and mapped WidgetData
  const isLoggedIn = state?.userId || state?.isLoggedIn;
  if (!isLoggedIn) {
    return <NotLoggedInWidget />;
  }

  const themePref = state.theme || 'dark';
  // Avoid using useColorScheme hook in background tasks as it may be unreliable or cause crashes.
  // Default to 'dark' if 'system' is requested but environment is ambiguous.
  const theme: ThemeMode = themePref === 'system' ? 'dark' : themePref as ThemeMode;
  const accent = resolveAccent(state.accentColor);
  const today = getToday();

  // Normalize data access
  const stats = state.stats || state || {};
  const totalXP = stats.totalXP ?? 0;
  const globalStreak = stats.streak ?? stats.globalStreak ?? 0;
  const level = stats.level ?? 1;

  let inner: React.ReactNode;

  switch (widgetName) {
    case 'FocusTimerWidget': {
      const focus = state.focus || state.focusSession || {};
      inner = (
        <FocusTimerWidget
          totalSeconds={focus.totalSecondsToday ?? 0}
          goalHours={state.focusGoalHours ?? (state.focus?.goalSeconds ? state.focus.goalSeconds / 3600 : 2)}
          isActive={focus.isActive ?? false}
          lastUpdated={state.lastUpdated}
          accent={accent}
          theme={theme}
        />
      );
      break;
    }

    case 'HabitsWidget': {
      const habits = state.habits ?? [];
      const isMapped = habits.length > 0 && 'isDoneToday' in habits[0];
      
      const dayOfWeek = new Date().getDay();
      const todayHabits = isMapped ? habits : habits.filter((h: any) => {
        if (h.pausedUntil && h.pausedUntil >= today) return false;
        if (h.frequency === 'daily' || h.frequency === 'weekly') {
          return (h.targetDays ?? []).includes(dayOfWeek);
        }
        return false;
      });

      inner = (
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
      break;
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

      inner = <TasksWidget tasks={todayTasks} accent={accent} theme={theme} />;
      break;
    }

    case 'XPLevelWidget': {
      const levelInfo = state.stats ? state.stats : getLevelInfo(totalXP);
      inner = (
        <XPLevelWidget
          level={levelInfo.level ?? level}
          levelName={levelInfo.levelName ?? 'Spark'}
          xpProgress={levelInfo.xpProgress ?? 0}
          globalStreak={globalStreak}
          accent={accent}
          theme={theme}
        />
      );
      break;
    }

    case 'MoodWidget': {
      const moodData = state.mood || {};
      const last5 = moodData.last5Days ?? Array.from({ length: 5 }, (_, i) => {
        const date = getDateOffset(4 - i);
        return state.moodHistory?.[date]?.mood ?? 0;
      });
      const todayMood = state.moodHistory?.[today]?.mood ?? moodData.today ?? null;

      inner = (
        <MoodWidget
          todayMood={todayMood}
          last5Days={last5}
          moodTheme={state.moodTheme || 'classic'}
          accent={accent}
          theme={theme}
        />
      );
      break;
    }

    default:
      inner = <NotLoggedInWidget />;
      break;
  }

  return (
    <FlexWidget
      style={{
        width: widgetInfo?.width ?? 'match_parent',
        height: widgetInfo?.height ?? 'match_parent',
      }}
    >
      {inner}
    </FlexWidget>
  );
}

