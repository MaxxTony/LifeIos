'use no memo';
import React from 'react';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { getThemeColors, hexToRgba, ThemeMode } from './utils';

const MOOD_EMOJI = ['', '😫', '😐', '🙂', '😊', '🤩'];
const MOOD_LABEL = ['', 'Awful', 'Meh', 'Okay', 'Good', 'Amazing!'];
const MOOD_HEX = ['#555570', '#5B8CFF', '#9B8EC4', '#00D68F', '#FFB347', '#FF6B6B'];

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

  const days = [...Array(5)].map((_, i) => last5Days[i] ?? 0);

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///mood-log' }}
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
      {/* ── LEFT COLUMN (Today's Mood) ── */}
      <FlexWidget style={{ flex: 1.1, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TextWidget text="💭" style={{ fontSize: 13, marginRight: 6 }} />
          <TextWidget
            text="DAILY MOOD"
            style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: hasMood ? hexToRgba(moodColor, 0.12) as any : hexToRgba(accent, 0.08) as any,
              borderWidth: 1.5,
              borderColor: hasMood ? hexToRgba(moodColor, 0.35) as any : hexToRgba(accent, 0.2) as any,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            {hasMood && moodTheme !== 'classic' && THEME_ASSETS[moodTheme]?.[todayMood!] ? (
              <ImageWidget image={THEME_ASSETS[moodTheme][todayMood!]} imageWidth={40} imageHeight={40} />
            ) : (
              <TextWidget text={hasMood ? (MOOD_EMOJI[todayMood!] ?? '😐') : '➕'} style={{ fontSize: 32 }} />
            )}
          </FlexWidget>

          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={hasMood ? (MOOD_LABEL[todayMood!] ?? '') : 'Log Mood'}
              style={{ fontSize: 16, color: hasMood ? moodColor as any : accent as any, fontWeight: '800' }}
            />
            <TextWidget
              text={hasMood ? 'Logged today' : 'How are you?'}
              style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '600', marginTop: 2 }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      {/* ── DIVIDER ── */}
      <FlexWidget
        style={{ width: 1, height: 'match_parent', backgroundColor: colors.cardBorder as any, marginHorizontal: 12 }}
      />

      {/* ── RIGHT COLUMN (5-Day Trend) ── */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget
          text="5-DAY TREND"
          style={{ fontSize: 10, color: colors.textMuted as any, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}
        />
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: 'match_parent', flex: 1, paddingBottom: 4 }}>
          {days.map((mood, i) => {
            const MAX_H = 40;
            const barH = mood > 0 ? Math.max(8, Math.round((mood / 5) * MAX_H)) : 8;
            const barColor = mood > 0 ? (MOOD_HEX[mood] ?? accent) : colors.progressEmpty;
            const isToday = i === days.length - 1;

            return (
              <FlexWidget key={i} style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: 4, height: MAX_H + 16 }}>
                <FlexWidget
                  style={{
                    width: isToday ? 14 : 10,
                    height: barH,
                    backgroundColor: mood > 0 ? barColor as any : colors.progressEmpty as any,
                    borderRadius: 6,
                    borderWidth: isToday ? 1.5 : 0,
                    borderColor: isToday ? moodColor as any : 'transparent' as any,
                  }}
                />
                <FlexWidget
                  style={{
                    width: isToday ? 6 : 4,
                    height: isToday ? 6 : 4,
                    borderRadius: 3,
                    backgroundColor: isToday ? moodColor as any : colors.textMuted as any,
                    marginTop: 4,
                  }}
                />
              </FlexWidget>
            );
          })}
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}