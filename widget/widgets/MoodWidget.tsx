'use no memo';
import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

const MOOD_EMOJI = ['', '😫', '😐', '🙂', '😊', '🤩'];
const MOOD_LABEL = ['', 'Awful', 'Meh', 'Okay', 'Good', 'Amazing!'];
const MOOD_HEX = ['#555570', '#5B8CFF', '#9B8EC4', '#00D68F', '#FFB347', '#FF6B6B'];
const DAY_LABELS = ['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'];

const THEME_ASSETS: Record<string, Record<number, any>> = {
  panda: {
    1: require('@/assets/moods/panda/panda1.png'),
    2: require('@/assets/moods/panda/panda2.png'),
    3: require('@/assets/moods/panda/panda3.png'),
    4: require('@/assets/moods/panda/panda4.png'),
    5: require('@/assets/moods/panda/panda5.png'),
  },
  cat: {
    1: require('@/assets/moods/cat/cat1.png'),
    2: require('@/assets/moods/cat/cat2.png'),
    3: require('@/assets/moods/cat/cat3.png'),
    4: require('@/assets/moods/cat/cat4.png'),
    5: require('@/assets/moods/cat/cat5.png'),
  },
};

interface Props {
  todayMood: number | null;
  last5Days: number[];
  moodTheme?: string;
  accent: string;
  theme: ThemeMode;
}

export function MoodWidget({ todayMood, last5Days, moodTheme = 'classic', accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const hasMood = todayMood !== null && todayMood > 0;
  const moodColor = hasMood ? (MOOD_HEX[todayMood!] ?? accent) : accent;

  // Pad last5Days to always have 5 entries
  const days = [...Array(5)].map((_, i) => last5Days[i] ?? 0);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///mood-log' }}
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
          marginBottom: 14,
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget text="💭" style={{ fontSize: 13, marginRight: 6 }} />
          <TextWidget
            text="MOOD"
            style={{
              fontSize: 12,
              color: colors.textSecondary as any,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          />
        </FlexWidget>

        {hasMood && (
          <FlexWidget
            style={{
              backgroundColor: hexToRgba(moodColor, 0.15) as any,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: hexToRgba(moodColor, 0.35) as any,
            }}
          >
            <TextWidget
              text={MOOD_LABEL[todayMood!] ?? ''}
              style={{
                fontSize: 11,
                color: moodColor as any,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* ── Main: emoji + bar chart side by side ── */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Left — emoji/image + label */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {/* Mood bubble */}
          <FlexWidget
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: hasMood
                ? hexToRgba(moodColor, 0.12) as any
                : hexToRgba(accent, 0.08) as any,
              borderWidth: 1.5,
              borderColor: hasMood
                ? hexToRgba(moodColor, 0.35) as any
                : hexToRgba(accent, 0.2) as any,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            {hasMood && moodTheme !== 'classic' && THEME_ASSETS[moodTheme]?.[todayMood!] ? (
              <ImageWidget
                image={THEME_ASSETS[moodTheme][todayMood!]}
                imageWidth={48}
                imageHeight={48}
              />
            ) : (
              <TextWidget
                text={hasMood ? (MOOD_EMOJI[todayMood!] ?? '😐') : '➕'}
                style={{ fontSize: 40 }}
              />
            )}
          </FlexWidget>

          <TextWidget
            text={hasMood ? (MOOD_LABEL[todayMood!] ?? '') : 'Log Mood'}
            style={{
              fontSize: 12,
              color: hasMood ? moodColor as any : accent as any,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          />
        </FlexWidget>

        {/* Divider */}
        <FlexWidget
          style={{
            width: 1,
            height: 70,
            backgroundColor: colors.cardBorder as any,
            marginHorizontal: 14,
          }}
        />

        {/* Right — 5-day bar chart */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="5-DAY TREND"
            style={{
              fontSize: 9,
              color: colors.textMuted as any,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 10,
            }}
          />

          {/* Bars */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              width: 'match_parent',
            }}
          >
            {days.map((mood, i) => {
              const MAX_H = 44;
              const barH = mood > 0 ? Math.max(8, Math.round((mood / 5) * MAX_H)) : 8;
              const barColor = mood > 0
                ? (MOOD_HEX[mood] ?? accent)
                : colors.progressEmpty;
              const isToday = i === days.length - 1;

              return (
                <FlexWidget
                  key={i}
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    marginHorizontal: 5,
                    height: MAX_H + 16,
                  }}
                >
                  {/* Bar */}
                  <FlexWidget
                    style={{
                      width: isToday ? 14 : 11,
                      height: barH,
                      backgroundColor: mood > 0 ? barColor as any : colors.progressEmpty as any,
                      borderRadius: 6,
                      // Today's bar gets accent outline
                      borderWidth: isToday ? 1.5 : 0,
                      borderColor: isToday ? moodColor as any : 'transparent' as any,
                    }}
                  />
                  {/* Day dot — today highlighted */}
                  <FlexWidget
                    style={{
                      width: isToday ? 6 : 4,
                      height: isToday ? 6 : 4,
                      borderRadius: 3,
                      backgroundColor: isToday
                        ? moodColor as any
                        : colors.textMuted as any,
                      marginTop: 4,
                    }}
                  />
                </FlexWidget>
              );
            })}
          </FlexWidget>
        </FlexWidget>
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
          text={hasMood ? '✨ Logged today' : '🌤 How are you feeling?'}
          style={{
            fontSize: 11,
            color: colors.textSecondary as any,
            fontWeight: '600',
          }}
        />
        <TextWidget
          text="Tap to log →"
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