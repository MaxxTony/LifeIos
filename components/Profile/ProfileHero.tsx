import { Spacing, Typography } from '@/constants/theme';
import { useProfileStats } from '@/hooks/useProfileStats';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LevelCarousel } from './LevelCarousel';

export function ProfileHero() {
  const { userName, avatarUrl, bio } = useStore();
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {/* Banner Area */}
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      />

      <View style={styles.content}>
        {/* Avatar Section */}
        <Animated.View entering={FadeIn.duration(800)} style={styles.avatarWrapper}>
          <View style={[styles.avatarBorder, { backgroundColor: colors.background, shadowColor: colors.primary }]}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{userName?.[0]?.toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>

        </Animated.View>

        {/* User Identity */}
        <View style={styles.identity}>
          <Text style={[styles.userName, { color: colors.text }]}>{userName || 'Explorer'}</Text>
          <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
            {bio || "Redefining limits, one habit at a time."}
          </Text>
        </View>

        {/* Level Section - New Premium Carousel */}
        <Animated.View 
          entering={SlideInDown.delay(300).duration(800)} 
          style={styles.carouselWrapper}
        >
          <LevelCarousel />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  banner: {
    height: 120,
    width: '100%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  content: {
    paddingHorizontal: Spacing.md,
    marginTop: -55,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  avatarBorder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 12, // Increased padding for logo comfort
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: 'Outfit-Bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  identity: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  userName: {
    ...Typography.h2,
    fontSize: 28,
    marginBottom: 4,
  },
  bio: {
    ...Typography.body,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: Spacing.xl,
  },
  carouselWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: -Spacing.xs,
  },
});
