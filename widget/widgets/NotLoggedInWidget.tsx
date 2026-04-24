'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function NotLoggedInWidget() {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        flex: 1,
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundGradient: {
          from: '#0D0D1A',
          to: '#141428',
          orientation: 'TOP_BOTTOM',
        },
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
      }}
    >
      {/* ── Glow ring around lock ── */}
      <FlexWidget
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#1E1E3A',
          borderWidth: 1.5,
          borderColor: '#3D3D6B',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <TextWidget
          text="🔒"
          style={{ fontSize: 28 }}
        />
      </FlexWidget>

      {/* ── App name ── */}
      <TextWidget
        text="LifeOS"
        style={{
          fontSize: 18,
          color: '#FFFFFF',
          fontWeight: '800',
          letterSpacing: 1.5,
          marginBottom: 6,
        }}
      />

      {/* ── Subtitle ── */}
      <TextWidget
        text="Open app to sync your data"
        style={{
          fontSize: 12,
          color: '#8888AA',
          fontWeight: '500',
          letterSpacing: 0.3,
          marginBottom: 20,
        }}
      />

      {/* ── CTA Button ── */}
      <FlexWidget
        style={{
          backgroundColor: '#5B5BF0',
          borderRadius: 14,
          paddingHorizontal: 22,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="Open App  →"
          style={{
            fontSize: 13,
            color: '#FFFFFF',
            fontWeight: '700',
            letterSpacing: 0.5,
          }}
        />
      </FlexWidget>

      {/* ── Bottom hint ── */}
      <TextWidget
        text="Tap anywhere to continue"
        style={{
          fontSize: 10,
          color: '#4A4A6A',
          fontWeight: '500',
          marginTop: 14,
          letterSpacing: 0.2,
        }}
      />
    </FlexWidget>
  );
}