'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

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

const PRIORITY_COLOR: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#6B7280',
};



export function TasksWidget({ tasks, accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const total = tasks.length;
  const doneCount = tasks.filter(t => t.completed || t.status === 'completed').length;
  const pending = tasks.filter(
    t => !t.completed && t.status !== 'completed' && t.status !== 'missed'
  );
  const rawProgress = total > 0 ? doneCount / total : 0;
  const filled = Math.max(0.001, rawProgress);
  const empty = Math.max(0.001, 1 - rawProgress);
  const allDone = total > 0 && doneCount === total;
  const progressPercent = Math.round(rawProgress * 100);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///all-tasks' }}
      style={{
        // ✅ KEY: flex: 1 + match_parent on both axes fills the widget slot completely
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: colors.bgGradient,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
      }}
    >
      {/* ── Header ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          width: 'match_parent', // ✅ explicitly fill row
        }}
      >
        {/* Left: icon + title */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="✅"
            style={{ fontSize: 14, marginRight: 6 }}
          />
          <TextWidget
            text="TASKS"
            style={{
              fontSize: 12,
              color: colors.textSecondary as any,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          />
        </FlexWidget>

        {/* Right: progress pill */}
        <FlexWidget
          style={{
            backgroundColor: hexToRgba(accent, 0.18) as any,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={total === 0 ? '—' : `${doneCount}/${total}`}
            style={{ fontSize: 12, color: accent as any, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Progress bar with percentage label ── */}
      {total > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'column',
            marginBottom: 16,
            width: 'match_parent',
          }}
        >
          {/* Track */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              backgroundColor: colors.progressEmpty as any,
              width: 'match_parent',
            }}
          >
            <FlexWidget
              style={{
                flex: filled,
                height: 6,
                backgroundGradient: {
                  from: accent as any,
                  to: hexToRgba(accent, 0.5) as any,
                  orientation: 'LEFT_RIGHT',
                },
                borderRadius: 3,
              }}
            />
            <FlexWidget style={{ flex: empty }} />
          </FlexWidget>

          {/* Percentage label */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 4,
            }}
          >
            <TextWidget
              text={`${progressPercent}%`}
              style={{
                fontSize: 10,
                color: hexToRgba(accent, 0.8) as any,
                fontWeight: '700',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      )}

      {/* ── Task list ── */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          width: 'match_parent',
        }}
      >
        {allDone && (
          <FlexWidget
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <TextWidget
              text="🎉  All tasks done!"
              style={{ fontSize: 16, color: '#10B981' as any, fontWeight: '800' }}
            />
            <TextWidget
              text="Great job today"
              style={{
                fontSize: 12,
                color: colors.textSecondary as any,
                fontWeight: '500',
                marginTop: 4,
              }}
            />
          </FlexWidget>
        )}

        {!allDone && total === 0 && (
          <FlexWidget
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <TextWidget
              text="No tasks yet"
              style={{ fontSize: 14, color: colors.textMuted as any, fontWeight: '600' }}
            />
          </FlexWidget>
        )}

        {!allDone &&
          pending.slice(0, 3).map((t, i) => (
            <FlexWidget
              key={t.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                // ✅ card-style rows with subtle separator
                paddingVertical: 8,
                borderBottomWidth: i < Math.min(pending.length, 3) - 1 ? 1 : 0,
                borderBottomColor: colors.cardBorder as any,
                width: 'match_parent',
              }}
            >
              {/* Priority dot */}
              <FlexWidget
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: (PRIORITY_COLOR[t.priority] ?? '#6B7280') as any,
                  marginRight: 10,
                }}
              />
              {/* Task text — takes remaining width */}
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={t.text}
                  style={{
                    fontSize: 14,
                    color: colors.textPrimary as any,
                    fontWeight: '600',
                  }}
                  maxLines={1}
                  truncate="END"
                />
              </FlexWidget>
            </FlexWidget>
          ))}

        {pending.length > 3 && (
          <TextWidget
            text={`+${pending.length - 3} more`}
            style={{
              fontSize: 11,
              color: colors.textSecondary as any,
              marginTop: 6,
              marginLeft: 18,
            }}
          />
        )}
      </FlexWidget>

      {/* ── Footer ── */}
      <FlexWidget
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder as any,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={allDone ? '🌟 Great job today!' : `${pending.length} task${pending.length !== 1 ? 's' : ''} remaining`}
          style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '600' }}
        />
        {/* Tap hint */}
        {!allDone && total > 0 && (
          <TextWidget
            text="Tap to open →"
            style={{ fontSize: 10, color: hexToRgba(accent, 0.6) as any, fontWeight: '500' }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}