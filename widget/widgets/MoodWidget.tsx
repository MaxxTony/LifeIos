import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { hexToRgba, getThemeColors, ThemeMode } from './utils';

const MOOD_EMOJI = ['', '😔', '😕', '😐', '🙂', '😄'];
const MOOD_LABEL = ['', 'Tough day', 'Not great', 'Neutral', 'Feeling good', 'Amazing!'];
const MOOD_HEX = ['#555570', '#FF4B4B', '#FF8B4B', '#FFB347', '#7EC8E3', '#10B981'];

interface Props {
  todayMood: number | null;
  last5Days: number[];
  accent: string;
  theme: ThemeMode;
}

export function MoodWidget({ todayMood, last5Days, accent, theme }: Props) {
  const colors = getThemeColors(theme);
  const hasMood = todayMood !== null && todayMood > 0;
  const moodColor = hasMood ? (MOOD_HEX[todayMood!] ?? accent) : colors.textSecondary;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'lifeos:///mood-log' }}
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
        <TextWidget
          text="MOOD"
          style={{ fontSize: 13, color: colors.textSecondary as any, fontWeight: '800', letterSpacing: 1.5 }}
        />
        {hasMood && (
          <FlexWidget
            style={{
              backgroundColor: hexToRgba(moodColor, 0.15) as any,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <TextWidget
              text={MOOD_LABEL[todayMood!] ?? ''}
              style={{ fontSize: 11, color: moodColor as any, fontWeight: '700' }}
            />
          </FlexWidget>
        )}
      </FlexWidget>

      {/* ── Main Content ── */}
      <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <TextWidget text={hasMood ? (MOOD_EMOJI[todayMood!] ?? '😐') : '➕'} style={{ fontSize: 48 }} />
          {!hasMood && (
            <TextWidget
              text="Log Mood"
              style={{ fontSize: 13, color: accent as any, fontWeight: '700', marginTop: 8 }}
            />
          )}
        </FlexWidget>

        {/* ── 5-day mini bar chart ── */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end', flexGap: 6, paddingLeft: 12 }}>
          {last5Days.map((mood, i) => {
            const barH = mood > 0 ? Math.max(6, Math.round((mood / 5) * 40)) : 6;
            const barColor = (mood > 0 ? (MOOD_HEX[mood] ?? accent) : colors.progressEmpty) as any;
            return (
              <FlexWidget
                key={i}
                style={{
                  width: 12,
                  height: 40,
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <FlexWidget
                  style={{
                    width: 12,
                    height: barH,
                    backgroundColor: barColor,
                    borderRadius: 6,
                  }}
                />
              </FlexWidget>
            );
          })}
        </FlexWidget>
      </FlexWidget>

      {/* ── Footer ── */}
      <FlexWidget style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder as any, paddingTop: 10 }}>
        <TextWidget
          text={hasMood ? "Keep it up!" : "How are you feeling today?"}
          style={{ fontSize: 11, color: colors.textSecondary as any, fontWeight: '600' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
