import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { Moon, Sun, Monitor, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const ACCENTS = [
  '#7C5CFF', // Primary
  '#5B8CFF', // Secondary
  '#00D68F', // Success
  '#FF4B4B', // Danger
  '#FFB347', // Warning
];

export default function AppearanceSettings() {
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedAccent, setSelectedAccent] = useState(ACCENTS[0]);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Appearance',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => {
              const isActive = selectedTheme === theme.id;
              const Icon = theme.icon;
              return (
                <TouchableOpacity 
                  key={theme.id} 
                  style={[styles.themeItem, isActive && styles.themeItemActive]}
                  onPress={() => setSelectedTheme(theme.id)}
                >
                  <View style={[styles.themeIconCircle, isActive && styles.themeIconCircleActive]}>
                    <Icon size={24} color={isActive ? '#FFF' : Colors.dark.textSecondary} />
                  </View>
                  <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>{theme.label}</Text>
                  {isActive && <View style={styles.checkBadge}><CheckCircle2 size={14} color={Colors.dark.primary} /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accent Color</Text>
          <GlassCard style={styles.accentCard}>
            <View style={styles.accentGrid}>
              {ACCENTS.map((color) => (
                <TouchableOpacity 
                  key={color} 
                  style={[styles.accentCircle, { backgroundColor: color }]}
                  onPress={() => setSelectedAccent(color)}
                >
                  {selectedAccent === color && (
                    <View style={styles.accentInnerCircle} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <GlassCard style={styles.previewCard}>
            <LinearGradient
              colors={[selectedAccent + '20', 'transparent']}
              style={styles.previewGradient}
            >
              <View style={styles.previewHeader}>
                <View style={[styles.previewAvatar, { backgroundColor: selectedAccent }]} />
                <View style={styles.previewLines}>
                  <View style={styles.previewLineMain} />
                  <View style={styles.previewLineSub} />
                </View>
              </View>
              <View style={[styles.previewButton, { backgroundColor: selectedAccent }]}>
                <Text style={styles.previewButtonText}>Sample Button</Text>
              </View>
            </LinearGradient>
          </GlassCard>
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
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  themeItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeItemActive: {
    borderColor: 'rgba(124, 92, 255, 0.3)',
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
  },
  themeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  themeIconCircleActive: {
    backgroundColor: Colors.dark.primary,
  },
  themeLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  themeLabelActive: {
    color: '#FFF',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  accentCard: {
    padding: Spacing.lg,
  },
  accentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accentCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  previewCard: {
    padding: 0,
    height: 160,
    overflow: 'hidden',
  },
  previewGradient: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewLines: {
    gap: 6,
    flex: 1,
  },
  previewLineMain: {
    height: 8,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  previewLineSub: {
    height: 6,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
  },
  previewButton: {
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewButtonText: {
    ...Typography.body,
    color: '#FFF',
    fontWeight: '700',
  },
});
