import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChevronRight, Heart, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AboutLifeOS() {
  const colors = useThemeColors();
  const router = useRouter();

  // Premium Surface Background Colors
  const cardBg = colors.isDark ? '#111827' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1F2937' : '#F1F5F9';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
            <Image 
              source={require('@/assets/images/icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>LifeOS</Text>
          <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>The Operating System for your Reality.</Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.0.0 (BETA)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal & Compliance</Text>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <TouchableOpacity 
              style={[styles.item, { borderBottomWidth: 1, borderBottomColor: borderColor }]}
              onPress={() => router.push('/settings/terms')}
            >
              <Text style={[styles.itemLabel, { color: colors.text }]}>Terms of Service</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.item}
              onPress={() => router.push('/settings/privacy')}
            >
              <Text style={[styles.itemLabel, { color: colors.text }]}>Privacy Policy</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.creditsSection}>
          <View style={[styles.missionIcon, { backgroundColor: colors.primary + '10' }]}>
            <ShieldCheck size={24} color={colors.primary} />
          </View>
          <Text style={[styles.creditsTitle, { color: colors.text }]}>Our Mission</Text>
          <Text style={[styles.creditsText, { color: colors.textSecondary }]}>
            LifeOS was built with a singular focus: to help humans reclaim their time and energy through intentional design and intelligent assistance. We believe productivity should be effortless and growth should be consistent.
          </Text>
          <View style={styles.teamContainer}>
            <Text style={[styles.teamLabel, { color: colors.textSecondary }]}>Handcrafted with ❤️ by</Text>
            <Text style={[styles.teamName, { color: colors.text }]}>The LifeOS Team</Text>
          </View>
          <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2026 LifeOS Team. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 20,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  logo: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    marginBottom: 4,
  },
  appSubtitle: {
    ...Typography.body,
    fontSize: 14,
    opacity: 0.7,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    opacity: 0.5,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  itemLabel: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  creditsSection: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 40,
  },
  missionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  creditsTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    marginBottom: 12,
  },
  creditsText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    paddingHorizontal: 20,
    opacity: 0.8,
  },
  teamContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  teamLabel: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  copyright: {
    ...Typography.labelSmall,
    opacity: 0.4,
    marginTop: 24,
    fontSize: 10,
  },
});
