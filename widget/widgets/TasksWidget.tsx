import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { hexToRgba, getThemeColors, ThemeMode } from './utils';

interface Task {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  status: string;
}

interface Props {
  tasks: Task[];
  accent: string;
  theme: ThemeMode;
}

const PRIORITY_DOT: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '⚪',
};

export function TasksWidget({ tasks, accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const total = tasks.length;
  const doneCount = tasks.filter(t => t.completed || t.status === 'completed').length;
  const pending = tasks.filter(t => !t.completed && t.status !== 'completed' && t.status !== 'missed');
  const rawProgress = total > 0 ? doneCount / total : 0;
  const filled = Math.max(0.001, rawProgress);
  const empty = Math.max(0.001, 1 - rawProgress);
  const allDone = total > 0 && doneCount === total;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///all-tasks' }}
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
          text="TASKS"
          style={{ fontSize: 13, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
        />
        <FlexWidget
          style={{
            backgroundColor: hexToRgba(accent, 0.15) as any,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <TextWidget
            text={total === 0 ? '—' : `${doneCount}/${total}`}
            style={{ fontSize: 11, color: accent as any, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Progress bar ── */}
      {total > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: colors.progressEmpty as any,
            marginBottom: 16,
          }}
        >
          <FlexWidget
            style={{
              flex: filled,
              height: 8,
              backgroundGradient: { 
                from: accent as any, 
                to: hexToRgba(accent, 0.6) as any, 
                orientation: 'LEFT_RIGHT' 
              },
            }}
          />

          <FlexWidget style={{ flex: empty }} />
        </FlexWidget>
      )}

      {/* ── Task list ── */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 10 }}>
        {allDone && (
          <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget
              text="🎉 All done!"
              style={{ fontSize: 16, color: '#10B981' as any, fontWeight: '800' }}
            />
          </FlexWidget>
        )}
        {!allDone && pending.length === 0 && total === 0 && (
          <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget
              text="No tasks scheduled"
              style={{ fontSize: 14, color: colors.textMuted as any, fontWeight: '600' }}
            />
          </FlexWidget>
        )}
        {!allDone && pending.slice(0, 3).map(t => (
          <FlexWidget key={t.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={PRIORITY_DOT[t.priority] ?? '⚪'}
              style={{ fontSize: 12 }}
            />
            <TextWidget
              text={` ${t.text}`}
              style={{ fontSize: 14, color: colors.textPrimary as any, fontWeight: '600', marginLeft: 6 }}
              maxLines={1}
              truncate="END"
            />
          </FlexWidget>
        ))}
        {pending.length > 3 && (
          <TextWidget
            text={`+${pending.length - 3} more...`}
            style={{ fontSize: 12, color: colors.textSecondary as any, marginLeft: 22, marginTop: 4 }}
          />
        )}
      </FlexWidget>

      {/* ── Footer ── */}
      <FlexWidget style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder as any }}>
        <TextWidget
          text={allDone ? "Great job today!" : `${pending.length} tasks remaining`}
          style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '600' }}
        />
      </FlexWidget>

    </FlexWidget>
  );

}
