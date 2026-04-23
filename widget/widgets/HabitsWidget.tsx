'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

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
  const doneCount = habits.filter(
    h => (h as any).isDoneToday ?? h.completedDays?.includes(today)
  ).length;
  const allDone = total > 0 && doneCount === total;
  const visible = habits.slice(0, 3);
  const rawProgress = total > 0 ? doneCount / total : 0;
  const filled = Math.max(0.001, rawProgress);
  const empty = Math.max(0.001, 1 - rawProgress);
  const percent = Math.round(rawProgress * 100);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///all-habits' }}
      style={{
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
          marginBottom: 12,
          width: 'match_parent',
        }}
      >
        {/* Left: icon + title */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="🌿"
            style={{ fontSize: 14, marginRight: 6 }}
          />
          <TextWidget
            text="HABITS"
            style={{
              fontSize: 12,
              color: colors.textSecondary as any,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          />
        </FlexWidget>

        {/* Right: streak badge */}
        <FlexWidget
          style={{
            backgroundColor: hexToRgba(accent, 0.15) as any,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: hexToRgba(accent, 0.3) as any,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`🔥 ${globalStreak}d streak`}
            style={{
              fontSize: 11,
              color: accent as any,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Progress bar + stats row ── */}
      {total > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'column',
            marginBottom: 14,
            width: 'match_parent',
          }}
        >
          {/* Stats row */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 7,
              width: 'match_parent',
            }}
          >
            <TextWidget
              text={
                allDone
                  ? '🎉 All done!'
                  : `${doneCount} of ${total} completed`
              }
              style={{
                fontSize: 13,
                color: (allDone ? '#10B981' : colors.textPrimary) as any,
                fontWeight: '700',
              }}
            />
            <TextWidget
              text={`${percent}%`}
              style={{
                fontSize: 12,
                color: hexToRgba(accent, 0.9) as any,
                fontWeight: '700',
              }}
            />
          </FlexWidget>

          {/* Progress track */}
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
                  from: allDone ? '#10B981' : accent as any,
                  to: allDone
                    ? hexToRgba('#10B981', 0.5) as any
                    : hexToRgba(accent, 0.5) as any,
                  orientation: 'LEFT_RIGHT',
                },
                borderRadius: 3,
              }}
            />
            <FlexWidget style={{ flex: empty }} />
          </FlexWidget>
        </FlexWidget>
      )}

      {/* ── Habit rows ── */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          width: 'match_parent',
        }}
      >
        {total === 0 && (
          <FlexWidget
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <TextWidget
              text="No habits scheduled"
              style={{
                fontSize: 13,
                color: colors.textMuted as any,
                fontWeight: '600',
              }}
            />
          </FlexWidget>
        )}

        {visible.map((h, i) => {
          const done =
            (h as any).isDoneToday ?? h.completedDays?.includes(today);
          const isLast = i === Math.min(visible.length, 3) - 1;

          return (
            <FlexWidget
              key={h.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 9,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: colors.cardBorder as any,
                width: 'match_parent',
              }}
            >
              {/* Icon + title */}
              <FlexWidget
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 10,
                }}
              >
                {/* Icon bubble */}
                <FlexWidget
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: (
                      done
                        ? hexToRgba(accent, 0.12)
                        : hexToRgba('#ffffff', 0.06)
                    ) as any,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10,
                  }}
                >
                  <TextWidget
                    text={h.icon || '●'}
                    style={{ fontSize: 15 }}
                  />
                </FlexWidget>

                {/* Title + streak */}
                <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
                  <TextWidget
                    text={h.title}
                    style={{
                      fontSize: 13,
                      color: (
                        done ? colors.textMuted : colors.textPrimary
                      ) as any,
                      fontWeight: '600',
                    }}
                    maxLines={1}
                    truncate="END"
                  />
                  {h.currentStreak > 0 && (
                    <TextWidget
                      text={`${h.currentStreak}d streak`}
                      style={{
                        fontSize: 10,
                        color: hexToRgba(accent, 0.7) as any,
                        fontWeight: '600',
                        marginTop: 1,
                      }}
                    />
                  )}
                </FlexWidget>
              </FlexWidget>

              {/* Check circle */}
              <FlexWidget
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: done ? 0 : 2,
                  borderColor: hexToRgba(accent, 0.4) as any,
                  backgroundColor: (
                    done ? accent : hexToRgba('#000000', 0)
                  ) as any,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {done && (
                  <TextWidget
                    text="✓"
                    style={{
                      fontSize: 13,
                      color: '#ffffff' as any,
                      fontWeight: '900',
                    }}
                  />
                )}
              </FlexWidget>
            </FlexWidget>
          );
        })}

        {total > 3 && (
          <FlexWidget
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={`+${total - 3} more habits`}
              style={{
                fontSize: 11,
                color: colors.textSecondary as any,
                fontWeight: '600',
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* ── Footer ── */}
      <FlexWidget
        style={{
          marginTop: 10,
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
          text={allDone ? '🌟 Perfect day!' : `${total - doneCount} habit${total - doneCount !== 1 ? 's' : ''} remaining`}
          style={{
            fontSize: 11,
            color: colors.textSecondary as any,
            fontWeight: '600',
          }}
        />
        <TextWidget
          text="Tap to open →"
          style={{
            fontSize: 10,
            color: hexToRgba(accent, 0.5) as any,
            fontWeight: '500',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}