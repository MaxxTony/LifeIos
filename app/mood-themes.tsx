import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';
import { MoodEmoji } from '@/components/MoodEmoji';
import * as Haptics from 'expo-haptics';
import { BorderRadius, Spacing } from '@/constants/theme';
import { FadeInDown } from 'react-native-reanimated';

const THEMES = [
  { id: 'classic', name: 'Classic Beans', desc: 'Standard vector style' },
  { id: 'panda', name: 'Panda Beans', desc: 'Cute and fluffy pandas' },
  { id: 'cat', name: 'Cat Beans', desc: 'Adorable cat-eared beans' },
] as const;

export default function MoodThemesScreen() {
  const router = useRouter();
  const { moodTheme, setMoodTheme } = useStore();
  const [selected, setSelected] = useState(moodTheme);

  const handleApply = () => {
    setMoodTheme(selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B0B0F', '#1A1A2E']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mood Themes</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Select Your Theme</Text>
          <Text style={styles.sectionSub}>Change the look of your mood characters across the entire app.</Text>

          {THEMES.map((theme, index) => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeCard,
                selected === theme.id && styles.selectedCard
              ]}
              onPress={() => {
                setSelected(theme.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.themeInfo}>
                <Text style={styles.themeName}>{theme.name}</Text>
                <Text style={styles.themeDesc}>{theme.desc}</Text>
              </View>

               <View style={styles.previewRow}>
                 {[1, 2, 3, 4, 5].map((lvl) => (
                    <View key={lvl} style={styles.previewEmoji}>
                      <MoodEmoji level={lvl} themeOverride={theme.id} size={54} />
                    </View>
                 ))}
               </View>

              {selected === theme.id && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#7C5CFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <LinearGradient
              colors={['#7C5CFF', '#5B8CFF']}
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
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF' },
  scrollContent: { padding: Spacing.md },
  sectionTitle: { fontSize: 24, fontFamily: 'Outfit-Bold', color: '#FFF', marginBottom: 4 },
  sectionSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
  themeCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#7C5CFF',
    backgroundColor: 'rgba(124,92,255,0.05)',
  },
  themeInfo: { marginBottom: 16 },
  themeName: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#FFF' },
  themeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  previewRow: { flexDirection: 'row', gap: 14 },
  previewEmoji: { width: 54, height: 54 },
  checkBadge: { position: 'absolute', top: 20, right: 20 },
  footer: { padding: Spacing.md },
  applyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  applyGradient: { paddingVertical: 16, alignItems: 'center' },
  applyText: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#FFF' },
  classicPreview: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  }
});
