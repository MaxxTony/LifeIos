import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStore } from '@/store/useStore';
import { MoodEmoji } from '@/components/MoodEmoji';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

const THEMES = [
  { id: 'classic', name: 'Classic Beans', desc: 'Standard vector style' },
  { id: 'panda', name: 'Panda Beans', desc: 'Cute and fluffy pandas' },
  { id: 'cat', name: 'Cat Beans', desc: 'Adorable cat-eared beans' },
] as const;

export default function MoodThemesScreen() {
  const router = useRouter();
  const { moodTheme, actions: { setMoodTheme } } = useStore();
  const [selected, setSelected] = useState(moodTheme);
  const colors = useThemeColors();

  const handleApply = () => {
    setMoodTheme(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={colors.isDark ? ['#0B0B0F', colors.background] : ['#FFFFFF', colors.background]} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mood Themes</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Your Theme</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary + '80' }]}>Change the look of your mood characters across the entire app.</Text>

          {THEMES.map((theme, index) => {
            const isSelected = selected === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.themeCard,
                  { 
                    backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: isSelected ? colors.primary : colors.border
                  },
                  isSelected && { backgroundColor: colors.primary + '08' }
                ]}
                onPress={() => {
                  setSelected(theme.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeInfo}>
                  <Text style={[styles.themeName, { color: colors.text }]}>{theme.name}</Text>
                  <Text style={[styles.themeDesc, { color: colors.textSecondary + '60' }]}>{theme.desc}</Text>
                </View>

                 <View style={styles.previewRow}>
                   {[1, 2, 3, 4, 5].map((lvl) => (
                      <View key={lvl} style={styles.previewEmoji}>
                        <MoodEmoji level={lvl} themeOverride={theme.id} size={48} />
                      </View>
                   ))}
                 </View>

                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.applyGradient}
            >
              <Text style={styles.applyText}>Apply Theme</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold' },
  scrollContent: { padding: Spacing.md },
  sectionTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  sectionSub: { fontSize: 14, marginBottom: 24 },
  themeCard: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: 'relative',
  },
  themeInfo: { marginBottom: 16 },
  themeName: { fontSize: 18, fontFamily: 'Outfit-Bold' },
  themeDesc: { fontSize: 12, marginTop: 2 },
  previewRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  previewEmoji: { 
    width: 48, 
    height: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkBadge: { position: 'absolute', top: 20, right: 20 },
  footer: { padding: Spacing.md },
  applyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  applyGradient: { paddingVertical: 16, alignItems: 'center' },
  applyText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },
});
