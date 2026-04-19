import React from 'react';
import { FlexWidget, TextWidget, IconWidget } from 'react-native-android-widget';

interface StreakWidgetProps {
  globalStreak: number;
}

export function StreakWidget({ globalStreak }: StreakWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1E1E24',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text="🔥"
        style={{
          fontSize: 32,
          marginBottom: 8,
        }}
      />
      <TextWidget
        text={`${globalStreak}-Day Streak`}
        style={{
          fontSize: 16,
          color: '#FFFFFF',
          fontWeight: 'bold',
        }}
      />
      <TextWidget
        text="Keep it up!"
        style={{
          fontSize: 12,
          color: '#A0A0A0',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}
