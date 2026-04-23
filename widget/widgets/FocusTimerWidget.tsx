'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

interface Props {
  totalSeconds: number;
  goalHours: number;
  isActive: boolean;
  accent: string;
  theme: ThemeMode;
  lastUpdated?: number;
}

function formatTimeParts(seconds: number): { hm: string; sec: string; hasHours: boolean } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const sec = String(s).padStart(2, '0');

  if (h > 0) {
    return {
      hm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      sec,
      hasHours: true,
    };
  }
  return {
    hm: String(m).padStart(2, '0'),
    sec,
    hasHours: false,
  };
}

function getSyncText(lastUpdated?: number): string {
  if (!lastUpdated) return 'Today';
  const d = new Date(lastUpdated);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `Synced ${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function FocusTimerWidget({
  totalSeconds,
  goalHours,
  isActive,
  accent,
  theme,
  lastUpdated,
}: Props) {
  const colors = getThemeColors(theme);
  const goalSeconds = Math.max(0.1, goalHours) * 3600;
  const rawProgress = Math.min(1, totalSeconds / goalSeconds);
  const filled = Math.max(0.001, rawProgress);
  const empty = Math.max(0.001, 1 - rawProgress);
  const percent = Math.floor(rawProgress * 100);
  const { hm, sec, hasHours } = formatTimeParts(totalSeconds);
  const syncText = getSyncText(lastUpdated);
  const isGoalReached = rawProgress >= 1;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///focus-detail' }}
      style={{
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundGradient: colors.bgGradient,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 18,
      }}
    >
      {/* ── Header ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Left: icon + label */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="🔥" style={{ fontSize: 14, marginRight: 6 }} />
          <TextWidget
            text="FOCUS"
            style={{
              fontSize: 12,
              color: colors.textSecondary as any,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          />
        </FlexWidget>

        {/* Right: LIVE badge or sync time */}
        <FlexWidget
          style={{
            backgroundColor: (
              isActive
                ? hexToRgba('#FF4B4B', 0.15)
                : hexToRgba(accent, 0.1)
            ) as any,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: (isActive ? '#FF4B4B' : hexToRgba(accent, 0.3)) as any,
          }}
        >
          <TextWidget
            text={isActive ? '● LIVE' : syncText}
            style={{
              fontSize: 10,
              color: (isActive ? '#FF4B4B' : colors.textMuted) as any,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Big Centered Timer ── */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* HH:MM or MM — large */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={hm}
            style={{
              fontSize: hasHours ? 52 : 64,
              color: colors.textPrimary as any,
              fontWeight: '800',
              letterSpacing: hasHours ? 1 : 2,
              textShadowColor: (
                isActive ? hexToRgba(accent, 0.5) : 'transparent'
              ) as any,
              textShadowRadius: isActive ? 20 : 0,
              textShadowOffset: { width: 0, height: 0 },
            }}
          />

          {/* Seconds — slightly smaller, aligned to bottom of HH:MM */}
          <FlexWidget
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              marginLeft: 4,
              marginBottom: hasHours ? 6 : 8,
            }}
          >
            <TextWidget
              text="s"
              style={{
                fontSize: 11,
                color: hexToRgba(accent, 0.7) as any,
                fontWeight: '700',
                letterSpacing: 0.5,
                marginBottom: 1,
              }}
            />
            <TextWidget
              text={sec}
              style={{
                fontSize: hasHours ? 28 : 36,
                color: accent as any,
                fontWeight: '800',
                letterSpacing: 1,
                textShadowColor: (
                  isActive ? hexToRgba(accent, 0.6) : 'transparent'
                ) as any,
                textShadowRadius: isActive ? 12 : 0,
                textShadowOffset: { width: 0, height: 0 },
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Status label */}
        <TextWidget
          text={
            isGoalReached
              ? '🎯 Goal Reached!'
              : isActive
                ? '● Session Active'
                : 'Tap to start focusing'
          }
          style={{
            fontSize: 12,
            color: (
              isGoalReached
                ? '#10B981'
                : isActive
                  ? accent
                  : colors.textMuted
            ) as any,
            fontWeight: '700',
            marginTop: 8,
            letterSpacing: 0.5,
          }}
        />
      </FlexWidget>

      {/* ── Progress section ── */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        {/* % and goal label */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            width: 'match_parent',
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={`${percent}%`}
              style={{
                fontSize: 15,
                color: colors.textPrimary as any,
                fontWeight: '800',
              }}
            />
            {isGoalReached && (
              <TextWidget
                text="  ✅"
                style={{ fontSize: 13 }}
              />
            )}
          </FlexWidget>

          <TextWidget
            text={`Goal  ${goalHours}h`}
            style={{
              fontSize: 11,
              color: colors.textSecondary as any,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>

        {/* Progress bar — segmented look */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: colors.progressEmpty as any,
            width: 'match_parent',
          }}
        >
          <FlexWidget
            style={{
              flex: filled,
              height: 8,
              backgroundGradient: {
                from: accent as any,
                to: hexToRgba(accent, 0.55) as any,
                orientation: 'LEFT_RIGHT',
              },
              borderRadius: 4,
            }}
          />
          <FlexWidget style={{ flex: empty }} />
        </FlexWidget>

        {/* Time remaining */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 6,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={
              isGoalReached
                ? 'Goal complete 🎉'
                : `${Math.ceil((goalSeconds - totalSeconds) / 60)} min left`
            }
            style={{
              fontSize: 10,
              color: hexToRgba(accent, 0.7) as any,
              fontWeight: '600',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}