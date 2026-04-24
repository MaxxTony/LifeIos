'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

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
  const isMaxed = percent >= 100;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundGradient: colors.bgGradient,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      {/* ── LEFT COLUMN (Level Info) ── */}
      <FlexWidget style={{ flex: 1.2, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TextWidget text="⚡" style={{ fontSize: 13, marginRight: 6 }} />
          <TextWidget
            text="XP & LEVEL"
            style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
          />
        </FlexWidget>
        
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundGradient: { from: accent as any, to: hexToRgba(accent, 0.6) as any, orientation: 'TOP_BOTTOM' },
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <TextWidget text="LV" style={{ fontSize: 9, color: hexToRgba('#ffffff', 0.8) as any, fontWeight: '800' }} />
            <TextWidget text={`${level}`} style={{ fontSize: 24, color: '#ffffff' as any, fontWeight: '900', marginTop: -2 }} />
          </FlexWidget>

          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={levelName}
              style={{ fontSize: 18, color: colors.textPrimary as any, fontWeight: '800' }}
              maxLines={1}
              truncate="END"
            />
            <TextWidget
              text={isMaxed ? 'Max Level' : `${percent}% to next`}
              style={{ fontSize: 12, color: colors.textSecondary as any, fontWeight: '600', marginTop: 2 }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* ── DIVIDER ── */}
      <FlexWidget
        style={{ width: 1, height: 'match_parent', backgroundColor: colors.cardBorder as any, marginHorizontal: 12 }}
      />

      {/* ── RIGHT COLUMN (Streak & Progress) ── */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 4 }}>
        
        {/* Streak Badge */}
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'flex-end', width: 'match_parent' }}>
          <FlexWidget
            style={{
              backgroundColor: hexToRgba('#FF6B35', 0.15) as any,
              borderRadius: 16,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: hexToRgba('#FF6B35', 0.3) as any,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TextWidget text={`🔥 ${globalStreak}d Streak`} style={{ fontSize: 11, color: '#FF6B35' as any, fontWeight: '700' }} />
          </FlexWidget>
        </FlexWidget>

        {/* Progress Bar */}
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
          <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <TextWidget text="Progress" style={{ fontSize: 11, color: colors.textMuted as any, fontWeight: '600' }} />
            <TextWidget text={`${percent}%`} style={{ fontSize: 11, color: accent as any, fontWeight: '800' }} />
          </FlexWidget>
          
          <FlexWidget
            style={{
              flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden',
              backgroundColor: colors.progressEmpty as any, width: 'match_parent',
            }}
          >
            <FlexWidget
              style={{
                flex: filled, height: 8, borderRadius: 4,
                backgroundGradient: { from: accent as any, to: hexToRgba(accent, 0.55) as any, orientation: 'LEFT_RIGHT' },
              }}
            />
            <FlexWidget style={{ flex: empty }} />
          </FlexWidget>
        </FlexWidget>
        
      </FlexWidget>
    </FlexWidget>
  );
}