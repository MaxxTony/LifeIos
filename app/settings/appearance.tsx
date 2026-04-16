import { Colors, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Heart, MessageSquare, Monitor, Moon, Settings, Sun } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';


const THEMES = [
  { id: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
  { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { id: 'system', label: 'System', icon: Monitor, description: 'Follows device' },
];

const ACCENTS = [
  { color: '#7C5CFF', name: 'Royal' },
  { color: '#5B8CFF', name: 'Azure' },
  { color: '#00D68F', name: 'Neo' },
  { color: '#FF4B4B', name: 'Coral' },
  { color: '#FFB347', name: 'Sunset' },
  { color: '#FF69B4', name: 'Candy' },
  { color: '#00CED1', name: 'Cyber' },
  { color: '#10B981', name: 'Emerald' },
  { color: '#8B5CF6', name: 'Violet' },
  { color: '#DC2626', name: 'Crimson' },
  { color: '#D97706', name: 'Amber' },
  { color: '#E11D48', name: 'Rose' },
];

function ThemeCard({ theme, isActive, onSelect }: any) {
  const colors = useThemeColors();
  const themeColors = Colors[theme.id as 'light' | 'dark'] || (colors.isDark ? Colors.dark : Colors.light);

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.8}
      style={[
        styles.themeCard,
        {
          borderColor: isActive ? colors.primary : colors.border,
          borderWidth: isActive ? 2 : 1,
          backgroundColor: themeColors.background,
        },
        isActive && {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 15,
          elevation: 8,
        }
      ]}
    >
      <View style={styles.themePreview}>
        {/* Mock Header */}
        <View style={[styles.previewBar, { backgroundColor: themeColors.card }]}>
          <View style={[styles.previewDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.previewLine, { backgroundColor: themeColors.border, width: '50%' }]} />
        </View>

        {/* Mock Content */}
        <View style={styles.previewContent}>
          <View style={[styles.previewCircle, { borderColor: colors.primary, borderStyle: 'solid' }]} />
          <View style={styles.previewLines}>
            <View style={[styles.previewLineShort, { backgroundColor: themeColors.textSecondary + '40' }]} />
            <View style={[styles.previewLineLong, { backgroundColor: themeColors.textSecondary + '20' }]} />
          </View>
        </View>

        {/* Mock Nav */}
        <View style={[styles.previewNav, { borderTopColor: themeColors.border }]}>
          <View style={[styles.previewNavDot, { backgroundColor: colors.primary }]} />
          <View style={[styles.previewNavDot, { backgroundColor: themeColors.textSecondary + '20' }]} />
          <View style={[styles.previewNavDot, { backgroundColor: themeColors.textSecondary + '20' }]} />
        </View>
      </View>

      <View style={[styles.themeInfo, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <View style={styles.themeLabelRow}>
          <theme.icon size={12} color={isActive ? colors.primary : colors.textSecondary} />
          <Text style={[styles.themeLabel, { color: colors.text }]}>{theme.label}</Text>
        </View>
        <Text style={[styles.themeDescription, { color: colors.textSecondary }]} numberOfLines={1}>
          {theme.description}
        </Text>
      </View>

      {isActive && (
        <View style={[styles.themeCheck, { backgroundColor: colors.primary }]}>
          <CheckCircle2 size={10} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AppearanceSettings() {
  const { themePreference, accentColor, userName, actions: { setThemePreference, setAccentColor } } = useStore();
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();

  // Background animation values
  const blob1Scale = useSharedValue(1);
  const blob2Scale = useSharedValue(1);

  useEffect(() => {
    blob1Scale.value = withRepeat(withTiming(1.3, { duration: 6000 }), -1, true);
    blob2Scale.value = withDelay(1000, withRepeat(withTiming(1.4, { duration: 8000 }), -1, true));
    
    return () => {
      // U-H1: Setting a value stops any running withRepeat animations on unmount.
      // This prevents background CPU drain when the user leaves this screen.
      blob1Scale.value = 0;
      blob2Scale.value = 0;
    };
  }, []);

  const blob1Style = useAnimatedStyle(() => ({ transform: [{ scale: blob1Scale.value }] }));
  const blob2Style = useAnimatedStyle(() => ({ transform: [{ scale: blob2Scale.value }] }));

  const handleSetTheme = (theme: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setThemePreference(theme);
  };

  const handleSetAccent = (color: string) => {
    Haptics.selectionAsync();
    setAccentColor(color);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Atmosphere Blobs */}
      {/* <Animated.View style={[styles.glowBlob, blob1Style, { top: -80, right: -80, backgroundColor: colors.primary + '25' }]} /> */}
      {/* <Animated.View style={[styles.glowBlob, blob2Style, { bottom: '20%', left: -80, backgroundColor: colors.secondary + '20' }]} /> */}

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme Mode</Text>
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={themePreference === theme.id}
                onSelect={() => handleSetTheme(theme.id as any)}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>The Accent Palette</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accentScroll}
            decelerationRate="fast"
          >
            {ACCENTS.map((item) => {
              const isSelected = accentColor === item.color;
              return (
                <TouchableOpacity
                  key={item.color}
                  activeOpacity={0.8}
                  style={styles.accentItem}
                  onPress={() => handleSetAccent(item.color)}
                >
                  <View
                    style={[
                      styles.accentCircle,
                      { backgroundColor: item.color },
                      isSelected && {
                        shadowColor: item.color,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.6,
                        shadowRadius: 12,
                        elevation: 10,
                        transform: [{ scale: 1.15 }]
                      }
                    ]}
                  >
                    {isSelected && <View style={styles.accentInnerCircle} />}
                  </View>
                  <Text style={[
                    styles.accentName,
                    { color: isSelected ? colors.text : colors.textSecondary },
                    isSelected && { fontFamily: 'Outfit-Bold' }
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Live Preview</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[colors.primaryTransparent, 'transparent']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.mockInner}>
              {/* Mock Header */}
              <View style={styles.mockHeader}>
                <View style={styles.mockUserInfo}>
                  <View style={[styles.mockAvatar, { backgroundColor: colors.primary }]} />
                  <View>
                    <Text style={[styles.mockTitle, { color: colors.text }]}>Dashboard</Text>
                    <Text style={[styles.mockSub, { color: colors.textSecondary }]}>Good Morning, {userName || 'Explorer'}</Text>
                  </View>
                </View>
                <View style={[styles.mockIcon, { backgroundColor: colors.primaryVeryTransparent }]}>
                  <Ionicons name="notifications" size={16} color={colors.primary} />
                </View>
              </View>

              {/* Main Content Area */}
              <View style={[styles.mockContent, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: colors.border }]}>
                <View style={styles.mockContentLeft}>
                  <Text style={[styles.mockLabel, { color: colors.textSecondary }]}>Daily Goal</Text>
                  <Text style={[styles.mockValue, { color: colors.text }]}>Progress</Text>
                  <View style={[styles.mockProgressBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <LinearGradient
                      colors={colors.gradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.mockProgressFill, { width: '70%' }]}
                    />
                  </View>
                </View>
                <View style={[styles.mockCircleProgress, { borderColor: colors.primary }]}>
                  <Ionicons name="flash" size={18} color={colors.primary} />
                </View>
              </View>

              {/* Actions */}
              <View style={styles.mockActions}>
                <LinearGradient
                  colors={colors.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.mockAIButton}
                >
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={styles.mockAIButtonText}>LifeOS AI</Text>
                </LinearGradient>
                <View style={[styles.mockTaskItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, borderWidth: 1 }]}>
                  <View style={[styles.mockCheckbox, { borderColor: colors.primary }]} />
                  <View style={[styles.mockTaskLine, { backgroundColor: colors.textSecondary, opacity: 0.3 }]} />
                </View>
              </View>

              {/* Mock Nav */}
              <View style={[styles.mockNav, { borderTopColor: colors.border }]}>
                {[Monitor, MessageSquare, Heart, Settings].map((Icon, idx) => (
                  <Icon key={idx} size={15} color={idx === 0 ? colors.primary : colors.textSecondary} />
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
    zIndex: -1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.6,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeCard: {
    flex: 1,
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  themePreview: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  previewBar: {
    height: 18,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  previewDot: { width: 6, height: 6, borderRadius: 3 },
  previewLine: { height: 3, borderRadius: 1.5 },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  previewLines: { flex: 1, gap: 4 },
  previewLineShort: { height: 3, width: '40%', borderRadius: 1.5 },
  previewLineLong: { height: 3, width: '80%', borderRadius: 1.5 },
  previewNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  previewNavDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  themeInfo: {
    padding: 12,
    gap: 2,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  themeDescription: {
    fontSize: 9,
    fontWeight: '500',
  },
  themeCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentScroll: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 15,
  },
  accentItem: {
    alignItems: 'center',
    gap: 8,
  },
  accentCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentName: {
    fontSize: 10,
    fontWeight: '700',
  },
  accentInnerCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
  },
  previewCard: {
    height: 320,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 8 }
    })
  },
  mockInner: {
    flex: 1,
    padding: 24,
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
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  mockTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  mockSub: {
    fontSize: 11,
  },
  mockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  mockContentLeft: {
    flex: 1,
  },
  mockLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mockValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Outfit-Bold',
    marginBottom: 8,
  },
  mockProgressBg: {
    height: 6,
    borderRadius: 3,
    width: '80%',
  },
  mockProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  mockCircleProgress: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  mockAIButton: {
    flex: 1.3,
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mockAIButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  mockTaskItem: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  mockCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  mockTaskLine: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  mockNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
});
