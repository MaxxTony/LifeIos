import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { ChevronRight, ExternalLink, Globe, Heart } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Stack } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';

export default function AboutLifeOS() {
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'About LifeOS',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: colors.text },
          headerTintColor: colors.primary,
        }} 
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}>
        <View style={styles.brandSection}>
          <LinearGradient
            colors={[colors.primaryTransparent, 'transparent']}
            style={styles.logoBg}
          >
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderColor: colors.border }]}>
              <Heart size={40} color={colors.primary} fill={colors.primary} />
            </View>
          </LinearGradient>
          <Text style={[styles.appName, { color: colors.text }]}>LifeOS</Text>
          <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>Master your focus. Build your life.</Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.primaryTransparent, borderColor: colors.primary + '30' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>v1.0.0 (BETA)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <Globe size={18} color={colors.textSecondary} />
                <Text style={[styles.itemLabel, { color: colors.text }]}>Official Website</Text>
              </View>
              <ExternalLink size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <FontAwesome6 name="x-twitter" size={16} color={colors.textSecondary} />
                <Text style={[styles.itemLabel, { color: colors.text }]}>Follow on X / Twitter</Text>
              </View>
              <ExternalLink size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <FontAwesome6 name="github" size={16} color={colors.textSecondary} />
                <Text style={[styles.itemLabel, { color: colors.text }]}>GitHub Repository</Text>
              </View>
              <ExternalLink size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal</Text>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Terms of Service</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Privacy Policy</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Licenses</Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.creditsSection}>
          <Text style={[styles.creditsTitle, { color: colors.text }]}>Made with Passion</Text>
          <Text style={[styles.creditsText, { color: colors.textSecondary }]}>
            Built by the LifeOS team to help humans regain control of their digital presence and personal growth.
          </Text>
          <Text style={[styles.copyright, { color: colors.textSecondary }]}>© 2024 LifeOS Team. All rights reserved.</Text>
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
    padding: Spacing.md,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  appName: {
    ...Typography.h1,
    fontSize: 28,
  },
  appSubtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 12,
    borderWidth: 1,
  },
  versionText: {
    ...Typography.labelSmall,
    fontSize: 10,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    ...Typography.body,
    fontSize: 15,
  },
  creditsSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  creditsTitle: {
    ...Typography.h3,
    fontSize: 18,
    marginBottom: 8,
  },
  creditsText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  copyright: {
    ...Typography.labelSmall,
    opacity: 0.5,
    marginTop: 20,
    fontSize: 9,
  },
});
