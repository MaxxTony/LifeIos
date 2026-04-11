import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { Shield, Fingerprint, Lock, Download, Trash2, ChevronRight, EyeOff } from 'lucide-react-native';

export default function PrivacySettings() {
  const [settings, setSettings] = useState({
    faceId: true,
    shareData: false,
    publicProfile: false,
  });

  const toggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Privacy & Security',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <GlassCard style={styles.card}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(124, 92, 255, 0.1)' }]}>
                  <Fingerprint size={18} color={Colors.dark.primary} />
                </View>
                <View>
                  <Text style={styles.itemLabel}>Face ID / Biometrics</Text>
                  <Text style={styles.itemSublabel}>Require biometric to open LifeOS</Text>
                </View>
              </View>
              <Switch 
                value={settings.faceId} 
                onValueChange={() => toggle('faceId')}
                trackColor={{ false: '#3A3A3C', true: Colors.dark.primary }}
              />
            </View>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBg}>
                  <Lock size={18} color={Colors.dark.text} />
                </View>
                <Text style={styles.itemLabel}>Change App PIN</Text>
              </View>
              <ChevronRight size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <GlassCard style={styles.card}>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBg}>
                  <EyeOff size={18} color={Colors.dark.text} />
                </View>
                <View>
                  <Text style={styles.itemLabel}>Public Profile</Text>
                  <Text style={styles.itemSublabel}>Allow others to see your stats</Text>
                </View>
              </View>
              <Switch 
                value={settings.publicProfile} 
                onValueChange={() => toggle('publicProfile')}
                trackColor={{ false: '#3A3A3C', true: Colors.dark.primary }}
              />
            </View>
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBg}>
                  <Shield size={18} color={Colors.dark.text} />
                </View>
                <View>
                  <Text style={styles.itemLabel}>Anonymized Analytics</Text>
                  <Text style={styles.itemSublabel}>Help us improve anonymously</Text>
                </View>
              </View>
              <Switch 
                value={settings.shareData} 
                onValueChange={() => toggle('shareData')}
                trackColor={{ false: '#3A3A3C', true: Colors.dark.primary }}
              />
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <GlassCard style={styles.card}>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBg}>
                  <Download size={18} color={Colors.dark.text} />
                </View>
                <Text style={styles.itemLabel}>Export My Data</Text>
              </View>
              <ChevronRight size={18} color={Colors.dark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.item}>
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: 'rgba(255, 75, 75, 0.1)' }]}>
                  <Trash2 size={18} color={Colors.dark.danger} />
                </View>
                <Text style={[styles.itemLabel, { color: Colors.dark.danger }]}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <Text style={styles.footerNote}>
          LifeOS uses end-to-end encryption for all your habit and mood notes. Your data is your own.
        </Text>
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
  section: {
    marginBottom: Spacing.xxl,
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
    flex: 1,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemLabel: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  itemSublabel: {
    ...Typography.caption,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  footerNote: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.dark.textSecondary,
    opacity: 0.6,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
    marginBottom: Spacing.xxl,
  },
});
