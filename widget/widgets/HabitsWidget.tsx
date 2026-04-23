import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { hexToRgba, getThemeColors, ThemeMode } from './utils';

interface Habit {
  id: string;
  title: string;
  icon: string;
  currentStreak: number;
  completedDays: string[];
  pausedUntil: string | null;
}

interface Props {
  habits: Habit[];
  today: string;
  globalStreak: number;
  accent: string;
  theme: ThemeMode;
}

export function HabitsWidget({ habits, today, globalStreak, accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const total = habits.length;
  const doneCount = habits.filter(h => (h as any).isDoneToday ?? h.completedDays?.includes(today)).length;
  const allDone = total > 0 && doneCount === total;
  const visible = habits.slice(0, 3);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///all-habits' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: colors.bgGradient,
        borderRadius: 24,
        padding: 20,
      }}
    >
      {/* ── Header ── */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <TextWidget
          text="HABITS"
          style={{ fontSize: 13, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
        />
        <FlexWidget
          style={{
            backgroundColor: hexToRgba(accent, 0.15) as any,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <TextWidget
            text={`🔥 ${globalStreak}d`}
            style={{ fontSize: 11, color: accent as any, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Completion pill ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (allDone ? hexToRgba(accent, 0.15) : colors.cardBg) as any,
          borderRadius: 16,
          paddingVertical: 12,
          borderWidth: 1.5,
          borderColor: (allDone ? accent : colors.cardBorder) as any,
          marginBottom: 16,
        }}
      >
        <TextWidget
          text={total === 0 ? 'No habits scheduled' : `${doneCount}/${total} Completed`}
          style={{ fontSize: 14, color: (allDone ? accent : colors.textPrimary) as any, fontWeight: '800' }}
        />
      </FlexWidget>

      {/* ── Habit rows ── */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 12 }}>
        {visible.length === 0 && total === 0 && (
          <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget
              text="Set your daily goals"
              style={{ fontSize: 14, color: colors.textMuted as any, fontWeight: '600' }}
            />
          </FlexWidget>
        )}
        {visible.map(h => {
          const done = (h as any).isDoneToday ?? h.completedDays?.includes(today);
          return (
            <FlexWidget
              key={h.id}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TextWidget text={h.icon || '●'} style={{ fontSize: 16, marginRight: 10 }} />
                <TextWidget
                  text={h.title}
                  style={{ fontSize: 14, color: (done ? colors.textMuted : colors.textPrimary) as any, fontWeight: '600' }}
                  maxLines={1}
                  truncate="END"
                />
              </FlexWidget>
              <FlexWidget
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: done ? 0 : 2,
                  borderColor: colors.cardBorder as any,
                  backgroundColor: (done ? accent : hexToRgba('#000000', 0)) as any,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {done && <TextWidget text="✓" style={{ fontSize: 12, color: colors.cardBg as any, fontWeight: '900' }} />}
              </FlexWidget>
            </FlexWidget>
          );
        })}

        {total > 3 && (
          <FlexWidget style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder as any, paddingTop: 10, marginTop: 4 }}>
             <TextWidget
              text={`+ ${total - 3} more habits`}
              style={{ fontSize: 12, color: colors.textSecondary as any, fontWeight: '600' }}
             />
          </FlexWidget>
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
