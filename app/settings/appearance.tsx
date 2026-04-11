import { GlassCard } from '@/components/GlassCard';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Bell, CheckCircle2, Heart, MessageSquare, Monitor, Moon, Settings, Sun } from 'lucide-react-native';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
  { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { id: 'system', label: 'System', icon: Monitor, description: 'Follows device' },
];

const ACCENTS = [
  '#7C5CFF', // Purple (Vibrant)
  '#5B8CFF', // Blue (Azure)
  '#00D68F', // Teal (Fresh)
  '#FF4B4B', // Red (Energetic)
  '#FFB347', // Orange (Warm)
  '#FF69B4', // Pink (Playful)
  '#00CED1', // Cyan (Calm)
];

/**
 * Theme Card Component
 * A premium card showing a glimpse of the theme's colors
 */
function ThemeCard({ theme, isActive, onSelect }: any) {
  const colors = useThemeColors();
  const themeColors = Colors[theme.id as 'light' | 'dark'] || Colors.dark;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.themeCard,
        isActive && { borderColor: colors.primary, borderWidth: 2 }
      ]}
    >
      <View style={[styles.themePreview, { backgroundColor: themeColors.background }]}>
        <View style={[styles.previewBar, { backgroundColor: themeColors.card }]}>
          <View style={[styles.previewDot, { backgroundColor: theme.id === 'light' ? '#E0E0E0' : '#2A2A3A' }]} />
          <View style={[styles.previewLine, { backgroundColor: theme.id === 'light' ? '#E0E0E0' : '#2A2A3A' }]} />
        </View>
        <View style={styles.previewContent}>
          <View style={[styles.previewCircle, { backgroundColor: colors.primary }]} />
          <View style={styles.previewLines}>
            <View style={[styles.previewLineShort, { backgroundColor: themeColors.textSecondary }]} />
            <View style={[styles.previewLineLong, { backgroundColor: themeColors.text || (theme.id === 'light' ? '#333' : '#FFF') }]} />
          </View>
        </View>
      </View>
      <View style={styles.themeInfo}>
        <View style={styles.themeLabelRow}>
          <theme.icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
          <Text style={[styles.themeLabel, isActive && { color: colors.primary }]}>{theme.label}</Text>
        </View>
        <Text style={styles.themeDescription}>{theme.description}</Text>
      </View>
      {isActive && (
        <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
          <CheckCircle2 size={12} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AppearanceSettings() {
  const { themePreference, accentColor, setThemePreference, setAccentColor } = useStore();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Appearance',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: colors.text },
          headerTintColor: colors.primary,
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme</Text>
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={themePreference === theme.id}
                onSelect={() => setThemePreference(theme.id as any)}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Accent Color</Text>
          <GlassCard style={styles.accentCard}>
            <View style={styles.accentGrid}>
              {ACCENTS.map((color, index) => {
                const isSelected = accentColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    activeOpacity={0.7}
                    style={[
                      styles.accentCircle,
                      { backgroundColor: color },
                      isSelected && {
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.6,
                        shadowRadius: 10,
                        elevation: 10,
                        transform: [{ scale: 1.15 }]
                      }
                    ]}
                    onPress={() => setAccentColor(color)}
                  >
                    {isSelected && (
                      <View style={styles.accentInnerCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Live Preview</Text>
          <GlassCard style={styles.previewCard}>
            <LinearGradient
              colors={[colors.primary + '15', 'transparent']}
              style={styles.previewGradient}
            >
              <View style={styles.mockInner}>
                {/* Header */}
                <View style={styles.mockHeader}>
                  <View style={styles.mockUserInfo}>
                    <View style={[styles.mockAvatar, { backgroundColor: colors.primary }]} />
                    <View>
                      <Text style={[styles.mockTitle, { color: colors.text }]}>Dashboard</Text>
                      <Text style={[styles.mockSub, { color: colors.textSecondary }]}>Good Morning, Maxx</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.mockIcon}>
                    <Bell size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.mockStats}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.mockStatCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <View style={[styles.mockStatBar, { height: 12 + i * 8, backgroundColor: colors.primary }]} />
                    </View>
                  ))}
                </View>

                {/* Actions */}
                <View style={styles.mockActions}>
                  <View style={[styles.mockBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.mockBtnText}>Main Action</Text>
                  </View>
                  <View style={[styles.mockBtnOutline, { borderColor: colors.primary }]}>
                    <Text style={[styles.mockBtnTextOutline, { color: colors.primary }]}>Secondary</Text>
                  </View>
                </View>

                {/* Bottom Nav */}
                <View style={[styles.mockNav, { borderTopColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  {[Monitor, MessageSquare, Heart, Settings].map((Icon, idx) => (
                    <Icon key={idx} size={16} color={idx === 0 ? colors.primary : colors.textSecondary} />
                  ))}
                </View>
              </View>
            </LinearGradient>
          </GlassCard>
        </Animated.View>
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
    paddingTop: 130,
    paddingBottom: 40,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  themeCard: {
    flex: 1,
    height: 180,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  themePreview: {
    height: 100,
    padding: 10,
    gap: 8,
  },
  previewBar: {
    height: 20,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewLine: { flex: 1, height: 4, borderRadius: 2 },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewCircle: { width: 32, height: 32, borderRadius: 16 },
  previewLines: { flex: 1, gap: 4 },
  previewLineShort: { height: 4, width: '40%', borderRadius: 2 },
  previewLineLong: { height: 6, width: '90%', borderRadius: 3 },
  themeInfo: {
    padding: 12,
    gap: 4,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: '#FFF',
  },
  themeDescription: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentCard: {
    padding: Spacing.lg,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  accentCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentInnerCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    opacity: 0.9,
  },
  previewCard: {
    padding: 0,
    height: 300,
    overflow: 'hidden',
  },
  previewGradient: {
    flex: 1,
  },
  mockInner: {
    flex: 1,
    padding: 20,
  },
  mockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mockUserInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  mockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mockTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  mockSub: {
    fontSize: 11,
  },
  mockIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  mockStatCard: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    justifyContent: 'flex-end',
    padding: 10,
  },
  mockStatBar: {
    width: '100%',
    borderRadius: 4,
  },
  mockActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  mockBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mockBtnOutline: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  mockBtnTextOutline: {
    fontWeight: '600',
    fontSize: 12,
  },
  mockNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
});
