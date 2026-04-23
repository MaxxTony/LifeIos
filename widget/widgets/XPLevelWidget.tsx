import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { hexToRgba, getThemeColors, ThemeMode } from './utils';

interface Props {
  level: number;
  levelName: string;
  xpProgress: number;
  globalStreak: number;
  accent: string;
  theme: ThemeMode;
}

export function XPLevelWidget({ level, levelName, xpProgress, globalStreak, accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const filled = Math.max(0.001, Math.min(1, xpProgress));
  const empty = Math.max(0.001, 1 - filled);
  const percent = Math.floor(xpProgress * 100);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
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
      {/* ── Level badge ── */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          style={{
            backgroundColor: accent as any,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <TextWidget
            text={`Lv. ${level}`}
            style={{ fontSize: 14, color: '#FFFFFF' as any, fontWeight: '800' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Level name ── */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={levelName}
          style={{
            fontSize: 22,
            color: colors.textPrimary as any,
            fontWeight: '800',
            textShadowColor: hexToRgba(accent, 0.5) as any,
            textShadowRadius: 12,
            textShadowOffset: { width: 0, height: 0 },
            letterSpacing: 1,
          }}
        />
        <TextWidget
          text={`⭐ ${percent}% to next`}
          style={{ fontSize: 12, color: colors.textSecondary as any, marginTop: 4, fontWeight: '600' }}
        />
      </FlexWidget>

      {/* ── XP bar + streak ── */}
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: colors.progressEmpty as any,
            marginBottom: 8,
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
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="🔥 "
            style={{ fontSize: 12 }}
          />
          <TextWidget
            text={`${globalStreak}-day streak`}
            style={{ fontSize: 13, color: colors.textPrimary as any, fontWeight: '700' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
