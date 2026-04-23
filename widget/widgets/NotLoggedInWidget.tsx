import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function NotLoggedInWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundGradient: { from: '#0D0D1A', to: '#141428', orientation: 'TOP_BOTTOM' },
        borderRadius: 20,
        padding: 16,
      }}
    >
      <TextWidget text="🔒" style={{ fontSize: 28, textAlign: 'center' }} />
      <TextWidget
        text="LifeOS"
        style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700', marginTop: 8, textAlign: 'center' }}
      />
      <TextWidget
        text="Open app to login"
        style={{ fontSize: 12, color: '#8888AA', marginTop: 4, textAlign: 'center' }}
      />
    </FlexWidget>
  );
}
