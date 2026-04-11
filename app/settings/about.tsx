import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { ChevronRight, ExternalLink, Globe, Heart } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function AboutLifeOS() {
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'About LifeOS',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandSection}>
          <LinearGradient
            colors={['rgba(124, 92, 255, 0.2)', 'transparent']}
            style={styles.logoBg}
          >
            <View style={styles.logoPlaceholder}>
              <Heart size={40} color={Colors.dark.primary} fill={Colors.dark.primary} />
            </View>
          </LinearGradient>
          <Text style={styles.appName}>LifeOS</Text>
          <Text style={styles.appSubtitle}>Master your focus. Build your life.</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v1.0.0 (BETA)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <Globe size={18} color={Colors.dark.textSecondary} />
                <Text style={styles.itemLabel}>Official Website</Text>
              </View>
              <ExternalLink size={16} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <FontAwesome6 name="x-twitter" size={16} color={Colors.dark.textSecondary} />
                <Text style={styles.itemLabel}>Follow on X / Twitter</Text>
              </View>
              <ExternalLink size={16} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <FontAwesome6 name="github" size={16} color={Colors.dark.textSecondary} />
                <Text style={styles.itemLabel}>GitHub Repository</Text>
              </View>
              <ExternalLink size={16} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={styles.item}>
              <Text style={styles.itemLabel}>Terms of Service</Text>
              <ChevronRight size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
              <Text style={styles.itemLabel}>Privacy Policy</Text>
              <ChevronRight size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
              <Text style={styles.itemLabel}>Licenses</Text>
              <ChevronRight size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.creditsSection}>
          <Text style={styles.creditsTitle}>Made with Passion</Text>
          <Text style={styles.creditsText}>
            Built by the LifeOS team to help humans regain control of their digital presence and personal growth.
          </Text>
          <Text style={styles.copyright}>© 2024 LifeOS Team. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 120,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appName: {
    ...Typography.h1,
    color: '#FFF',
    fontSize: 28,
  },
  appSubtitle: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  versionBadge: {
    backgroundColor: 'rgba(124, 92, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.3)',
  },
  versionText: {
    ...Typography.labelSmall,
    color: Colors.dark.primary,
    fontSize: 10,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    ...Typography.body,
    color: '#FFF',
    fontSize: 15,
  },
  creditsSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  creditsTitle: {
    ...Typography.h3,
    color: '#FFF',
    fontSize: 18,
    marginBottom: 8,
  },
  creditsText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  copyright: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
    opacity: 0.5,
    marginTop: 20,
    fontSize: 9,
  },
});
