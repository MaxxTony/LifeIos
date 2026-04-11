import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useStore } from '@/store/useStore';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from './GlassCard';
import { MapPin, Briefcase } from 'lucide-react-native';

export function ProfileHeader() {
  const { userName, avatarUrl, bio, location, occupation } = useStore();

  return (
    <GlassCard style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.avatarBorder}>
          <LinearGradient
            colors={Colors.dark.gradient as any}
            style={styles.avatarGradient}
          >
            <View style={styles.avatarInner}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" transition={300} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{userName?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.userName}>{userName || 'User'}</Text>
          {occupation ? (
            <View style={styles.metaRow}>
              <Briefcase size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.metaText}>{occupation}</Text>
            </View>
          ) : null}
          {location ? (
            <View style={styles.metaRow}>
              <MapPin size={14} color={Colors.dark.textSecondary} />
              <Text style={styles.metaText}>{location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {bio ? (
        <View style={styles.bioContainer}>
          <Text style={styles.bioText} numberOfLines={3}>{bio}</Text>
        </View>
      ) : (
        <View style={styles.bioContainer}>
           <Text style={[styles.bioText, { opacity: 0.5 }]}>No bio added yet. Tell us about yourself!</Text>
        </View>
      )}
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    shadowColor: Colors.dark.primary,
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
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
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
    color: Colors.dark.primary,
    fontSize: 42,
    fontWeight: '800',
  },
  infoContainer: {
    marginLeft: Spacing.lg,
    flex: 1,
  },
  userName: {
    ...Typography.h2,
    color: Colors.dark.text,
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
    color: Colors.dark.textSecondary,
  },
  bioContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bioText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
