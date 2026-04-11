import { useStore } from '@/store/useStore';
import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface MoodEmojiProps {
  level: number;
  size?: number;
  style?: ViewStyle;
  themeOverride?: 'classic' | 'panda' | 'cat';
}

// React Native requires static paths for require()
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

export function MoodEmoji({ level, size = 40, style, themeOverride }: MoodEmojiProps) {
  const { moodTheme: storeTheme } = useStore();
  const moodTheme = themeOverride || (storeTheme as any);

  // Index: level 1 is 0, level 5 is 4 for classic, but 1-5 for images
  const moodLevel = Math.max(1, Math.min(5, level));

  if (moodTheme === 'classic') {
    const emojis: Record<number, string> = {
      1: '😫',
      2: '😐',
      3: '🙂',
      4: '😊',
      5: '🤩',
    };
    return (
      <View style={[styles.classicContainer, { width: size, height: size }, style]}>
        <Text style={{ fontSize: size * 0.8 }}>{emojis[moodLevel]}</Text>
      </View>
    );
  }

  const themeImages = THEME_ASSETS[moodTheme as keyof typeof THEME_ASSETS];
  const asset = themeImages ? themeImages[moodLevel as keyof typeof themeImages] : null;

  if (!asset) {
    // Fallback to classic emoji if theme not found
    const emojis: Record<number, string> = {
      1: '😫',
      2: '😐',
      3: '🙂',
      4: '😊',
      5: '🤩',
    };
    return (
      <View style={[styles.classicContainer, { width: size, height: size }, style]}>
        <Text style={{ fontSize: size * 0.8 }}>{emojis[moodLevel]}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageContainer, { width: size, height: size }, style]}>
      <Image
        source={asset}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  classicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
