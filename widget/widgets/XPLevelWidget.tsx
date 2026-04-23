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
        flexDirection: 'column',
        backgroundGradient: colors.bgGradient,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
      }}
    >
      {/* ── Header: label + streak badge ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="⚡" style={{ fontSize: 13, marginRight: 6 }} />
          <TextWidget
            text="XP & LEVEL"
            style={{
              fontSize: 12,
              color: colors.textSecondary as any,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          />
        </FlexWidget>

        {/* Streak badge */}
        <FlexWidget
          style={{
            backgroundColor: hexToRgba('#FF6B35', 0.15) as any,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: hexToRgba('#FF6B35', 0.35) as any,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={`🔥 ${globalStreak}d`}
            style={{
              fontSize: 11,
              color: '#FF6B35' as any,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── Level card ── */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 16,
        }}
      >
        {/* Level number bubble */}
        <FlexWidget
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundGradient: {
              from: accent as any,
              to: hexToRgba(accent, 0.6) as any,
              orientation: 'TOP_BOTTOM',
            },
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
          }}
        >
          <TextWidget
            text="LV"
            style={{
              fontSize: 9,
              color: hexToRgba('#ffffff', 0.7) as any,
              fontWeight: '800',
              letterSpacing: 1.5,
            }}
          />
          <TextWidget
            text={`${level}`}
            style={{
              fontSize: 26,
              color: '#ffffff' as any,
              fontWeight: '900',
              letterSpacing: 0,
            }}
          />
        </FlexWidget>

        {/* Level name + subtitle */}
        <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
          <TextWidget
            text={levelName}
            style={{
              fontSize: 20,
              color: colors.textPrimary as any,
              fontWeight: '800',
              letterSpacing: 0.5,
              textShadowColor: hexToRgba(accent, 0.4) as any,
              textShadowRadius: 10,
              textShadowOffset: { width: 0, height: 0 },
            }}
            maxLines={1}
            truncate="END"
          />
          <TextWidget
            text={isMaxed ? '🏆 Max level reached!' : `⭐ ${percent}% to next level`}
            style={{
              fontSize: 12,
              color: isMaxed
                ? '#FFD700' as any
                : colors.textSecondary as any,
              fontWeight: '600',
              marginTop: 4,
              letterSpacing: 0.2,
            }}
          />

          {/* Mini milestone dots */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              marginTop: 8,
            }}
          >
            {[25, 50, 75, 100].map((milestone, i) => {
              const reached = percent >= milestone;
              return (
                <FlexWidget
                  key={i}
                  style={{
                    width: reached ? 8 : 6,
                    height: reached ? 8 : 6,
                    borderRadius: 4,
                    backgroundColor: reached
                      ? accent as any
                      : hexToRgba(accent, 0.2) as any,
                    marginRight: 5,
                  }}
                />
              );
            })}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* ── XP progress bar ── */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        {/* Label row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="XP Progress"
            style={{
              fontSize: 11,
              color: colors.textMuted as any,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}
          />
          <TextWidget
            text={`${percent}%`}
            style={{
              fontSize: 12,
              color: accent as any,
              fontWeight: '800',
            }}
          />
        </FlexWidget>

        {/* Track */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: colors.progressEmpty as any,
            width: 'match_parent',
            marginBottom: 10,
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

        {/* Footer */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder as any,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text={isMaxed ? '🌟 Legendary!' : `Keep going, ${100 - percent}% left!`}
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
    </FlexWidget>
  );
}