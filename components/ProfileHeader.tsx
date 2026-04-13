import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import { MapPin, Briefcase } from 'lucide-react-native';

export function ProfileHeader() {
  const userName = useStore(s => s.userName);
  const avatarUrl = useStore(s => s.avatarUrl);
  const bio = useStore(s => s.bio);
  const location = useStore(s => s.location);
  const occupation = useStore(s => s.occupation);
  const colors = useThemeColors();

  return (
    <GlassCard style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.avatarBorder, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', shadowColor: colors.primaryTransparent }]}>
          <LinearGradient
            colors={colors.gradient}
            style={styles.avatarGradient}
          >
            <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={300} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={[styles.avatarInitial, { color: colors.primary }]}>{userName?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.userName, { color: colors.text }]}>{userName || 'User'}</Text>
          {occupation ? (
            <View style={styles.metaRow}>
              <Briefcase size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{occupation}</Text>
            </View>
          ) : null}
          {location ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.bioContainer, { borderTopColor: colors.border }]}>
        {bio ? (
          <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={3}>{bio}</Text>
        ) : (
          <Text style={[styles.bioText, { color: colors.textSecondary, opacity: 0.5 }]}>
            No bio added yet. Tell us about yourself!
          </Text>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.full,
    padding: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: BorderRadius.full,
    padding: 2,
    overflow: 'hidden',
  },
  avatarInner: {
    flex: 1,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Typography.h1,
    fontSize: 42,
    fontWeight: '800',
  },
  infoContainer: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  userName: {
    ...Typography.h2,
    fontSize: 26,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    ...Typography.caption,
    marginLeft: 6,
  },
  bioContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  bioText: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
});
