import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { Shield, Fingerprint, Lock, Download, Trash2, ChevronRight, EyeOff } from 'lucide-react-native';

export default function PrivacySettings() {
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();
  const [settings, setSettings] = useState({
    faceId: true,
    shareData: false,
    publicProfile: false,
  });

  const toggle = (key: keyof typeof settings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Privacy & Security',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: colors.text },
          headerTintColor: colors.primary,
        }} 
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
          <GlassCard style={styles.card}>
            <View style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.primaryTransparent }]}>
                  <Fingerprint size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Face ID / Biometrics</Text>
                  <Text style={[styles.itemSublabel, { color: colors.textSecondary }]}>Require biometric to open LifeOS</Text>
                </View>
              </View>
              <Switch 
                value={settings.faceId} 
                onValueChange={() => toggle('faceId')}
                trackColor={{ false: colors.isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
                thumbColor={colors.isDark ? '#FFF' : '#FFF'}
              />
            </View>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Lock size={18} color={colors.text} />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Change App PIN</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Privacy</Text>
          <GlassCard style={styles.card}>
            <View style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <EyeOff size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Public Profile</Text>
                  <Text style={[styles.itemSublabel, { color: colors.textSecondary }]}>Allow others to see your stats</Text>
                </View>
              </View>
              <Switch 
                value={settings.publicProfile} 
                onValueChange={() => toggle('publicProfile')}
                trackColor={{ false: colors.isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
            <View style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                  <Shield size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Anonymized Analytics</Text>
                  <Text style={[styles.itemSublabel, { color: colors.textSecondary }]}>Help us improve anonymously</Text>
                </View>
              </View>
              <Switch 
                value={settings.shareData} 
                onValueChange={() => toggle('shareData')}
                trackColor={{ false: colors.isDark ? '#3A3A3C' : '#E5E5EA', true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data Management</Text>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                  <Download size={18} color={colors.text} />
                </View>
                <Text style={[styles.itemLabel, { color: colors.text }]}>Export My Data</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.danger + '15' }]}>
                  <Trash2 size={18} color={colors.danger} />
                </View>
                <Text style={[styles.itemLabel, { color: colors.danger }]}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
          LifeOS uses end-to-end encryption for all your habit and mood notes. Your data is your own.
        </Text>
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
  section: {
    marginBottom: Spacing.xxl,
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
    flex: 1,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemLabel: {
    ...Typography.body,
  },
  itemSublabel: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  footerNote: {
    ...Typography.caption,
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
    marginBottom: Spacing.xxl,
  },
});
