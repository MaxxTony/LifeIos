import React from 'react';
import { Platform, View, ViewProps, StyleSheet } from 'react-native';
import { BlurView as ExpoBlurView } from 'expo-blur';

export interface BlurViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  children?: React.ReactNode;
}

/**
 * A safe wrapper around ExpoBlurView that handles the Android "Native view manager not found" error
 * by falling back to a semi-transparent background.
 */
export const BlurView = (props: BlurViewProps) => {
  const { intensity = 50, tint = 'default', style, children, ...rest } = props;

  if (Platform.OS === 'android') {
    // On Android, expo-blur often has issues with the New Architecture or missing native modules.
    // We fall back to a semi-transparent background that mimics the tint.
    const opacity = Math.min(intensity / 100, 0.9);
    let backgroundColor = 'rgba(255, 255, 255, 0.7)'; // Default light
    
    if (tint === 'dark') {
      backgroundColor = `rgba(15, 15, 20, ${opacity})`;
    } else if (tint === 'light') {
      backgroundColor = `rgba(255, 255, 255, ${opacity})`;
    } else {
      // default/none
      backgroundColor = `rgba(255, 255, 255, ${opacity * 0.5})`;
    }

    return (
      <View {...rest} style={[style, { backgroundColor }]}>
        {children}
      </View>
    );
  }

  // On iOS, we use the real BlurView
  return <ExpoBlurView {...props} />;
};
