import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { hexToRgba, getThemeColors, ThemeMode } from './utils';

interface Props {
  totalSeconds: number;
  goalHours: number;
  isActive: boolean;
  accent: string;
  theme: ThemeMode;
  lastUpdated?: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FocusTimerWidget({ totalSeconds, goalHours, isActive, accent, theme, lastUpdated }: Props) {
  const colors = getThemeColors(theme);
  const goalSeconds = Math.max(0.1, goalHours) * 3600;
  const rawProgress = Math.min(1, totalSeconds / goalSeconds);
  const filled = Math.max(0.001, rawProgress);
  const empty = Math.max(0.001, 1 - rawProgress);
  const percent = Math.floor(rawProgress * 100);

  const syncText = lastUpdated ? (() => {
    const d = new Date(lastUpdated);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; 
    return `Synced ${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  })() : 'Today';

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///focus-detail' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundGradient: colors.bgGradient,
        borderRadius: 24,
        padding: 20,
      }}
    >
      {/* ── Header ── */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="🔥"
            style={{ fontSize: 14, marginRight: 6 }}
          />
          <TextWidget
            text="FOCUS"
            style={{ fontSize: 13, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            backgroundColor: (isActive ? hexToRgba('#FF4B4B', 0.15) : colors.cardBorder) as any,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: (isActive ? '#FF4B4B' : hexToRgba('#000000', 0)) as any,
          }}
        >
          <TextWidget
            text={isActive ? '● LIVE' : syncText}
            style={{ fontSize: 10, color: (isActive ? '#FF4B4B' : colors.textMuted) as any, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Big Timer ── */}
      <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text={formatTime(totalSeconds)}
          style={{
            fontSize: 46,
            color: colors.textPrimary as any,
            fontWeight: '800',
            textShadowColor: (isActive ? hexToRgba(accent, 0.4) : hexToRgba('#000000', 0)) as any,
            textShadowRadius: isActive ? 16 : 0,
            textShadowOffset: { width: 0, height: 0 },
            letterSpacing: 2,
          }}
        />
        {isActive && (
          <TextWidget
            text="Session Active"
            style={{ fontSize: 11, color: accent as any, fontWeight: '600', marginTop: 4 }}
          />
        )}
      </FlexWidget>

      {/* ── Progress ── */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <TextWidget text={`${percent}%`} style={{ fontSize: 14, color: colors.textPrimary as any, fontWeight: '700' }} />
          <TextWidget text={`Goal: ${goalHours}h`} style={{ fontSize: 12, color: colors.textSecondary as any, fontWeight: '600' }} />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: colors.progressEmpty as any,
          }}
        >
          <FlexWidget
            style={{
              flex: filled,
              height: 8,
              backgroundGradient: { from: accent as any, to: hexToRgba(accent, 0.6) as any, orientation: 'LEFT_RIGHT' },
            }}
          />
          <FlexWidget style={{ flex: empty }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
