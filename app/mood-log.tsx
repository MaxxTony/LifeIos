import { Spacing, Typography } from '@/constants/theme';
import { MOOD_LEVELS, ACTIVITIES, EMOTIONS, getMoodConfig, getMoodFromLegacy } from '@/constants/moods';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MoodEmoji } from '@/components/MoodEmoji';
import { useEffect } from 'react';

export default function MoodLogScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { moodHistory, setMood } = useStore();
  const colors = useThemeColors();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (date && moodHistory[date]) {
      const entry = moodHistory[date];
      setSelectedMood(typeof entry.mood === 'number' ? entry.mood : getMoodFromLegacy?.(entry.mood) || 3);
      setSelectedActivities(entry.activities || []);
      setSelectedEmotions(entry.emotions || []);
      setNote(entry.note || '');
      setIsEditing(true);
    }
  }, [date, moodHistory]);

  const toggleActivity = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedActivities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleEmotion = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmotions(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!selectedMood) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMood(selectedMood, {
      activities: selectedActivities.length > 0 ? selectedActivities : undefined,
      emotions: selectedEmotions.length > 0 ? selectedEmotions : undefined,
      note: note.trim() || undefined,
    }, date);

    if (selectedMood <= 2) {
      // Brief haptic pause then a second gentle tap to signal care
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 300);
    }

    router.back();
  };

  const currentConfig = selectedMood ? getMoodConfig(selectedMood) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={colors.isDark ? ['#0B0B0F', colors.background] : ['#FFFFFF', colors.background]} 
        style={StyleSheet.absoluteFill} 
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.closeBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditing ? 'Edit Mood' : 'Log Mood'}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How was your day?</Text>
            <View style={styles.moodRow}>
              {MOOD_LEVELS.map((m) => {
                const isSelected = selectedMood === m.level;
                return (
                  <TouchableOpacity
                    key={m.level}
                    style={[
                      styles.moodBtn,
                      { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' },
                      isSelected && { backgroundColor: m.bgColor, borderColor: m.color }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMood(m.level);
                    }}
                  >
                    <View style={[
                      styles.moodFace, 
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : (colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }
                    ]}>
                      <MoodEmoji level={m.level} size={44} />
                    </View>
                    <Text style={[styles.moodLabel, { color: colors.textSecondary }, isSelected && { color: m.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {selectedMood !== null && selectedMood <= 2 && (
            <Animated.View entering={FadeInDown.delay(150)} style={[styles.empathyCard, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
              <Text style={styles.empathyEmoji}>💙</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.empathyTitle, { color: colors.text }]}>Tough day?</Text>
                <Text style={[styles.empathyBody, { color: colors.textSecondary }]}>
                  It's okay — every hard day passes. Be kind to yourself today.
                </Text>
              </View>
            </Animated.View>
          )}

          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(200)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Activities</Text>
              <View style={styles.chipGrid}>
                {ACTIVITIES.map((a) => {
                  const isSelected = selectedActivities.includes(a.id);
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.chip, 
                        { 
                          backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                          borderColor: colors.border
                        },
                        isSelected && { 
                          backgroundColor: currentConfig?.color + '15',
                          borderColor: currentConfig?.color + '40'
                        }
                      ]}
                      onPress={() => toggleActivity(a.id)}
                    >
                      <Ionicons
                        name={a.icon}
                        size={20}
                        color={isSelected ? currentConfig?.color : colors.textSecondary + '60'}
                      />
                      <Text style={[styles.chipLabel, { color: colors.textSecondary }, isSelected && { color: currentConfig?.color }]}>
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(300)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Emotions</Text>
              <View style={styles.chipGrid}>
                {EMOTIONS.map((e) => {
                  const isSelected = selectedEmotions.includes(e.id);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[
                        styles.chip, 
                        { 
                          backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                          borderColor: colors.border
                        },
                        isSelected && { 
                          backgroundColor: currentConfig?.color + '15',
                          borderColor: currentConfig?.color + '40'
                        }
                      ]}
                      onPress={() => toggleEmotion(e.id)}
                    >
                      <Ionicons
                        name={e.icon}
                        size={20}
                        color={isSelected ? currentConfig?.color : colors.textSecondary + '60'}
                      />
                      <Text style={[styles.chipLabel, { color: colors.textSecondary }, isSelected && { color: currentConfig?.color }]}>
                        {e.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(400)}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Note (Optional)</Text>
              <TextInput
                style={[
                  styles.noteInput, 
                  { 
                    backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: colors.border,
                    color: colors.text
                  }
                ]}
                placeholder="What made today special?"
                placeholderTextColor={colors.textSecondary + '40'}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
              />
            </Animated.View>
          )}

          {selectedMood && (
            <Animated.View entering={FadeIn.delay(500)}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={[currentConfig?.color || colors.primary, currentConfig?.color || colors.secondary]}
                  style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  headerTitle: {
    ...Typography.h3,
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginBottom: 16,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  moodFace: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 56,
    marginTop: 8,
  },
  saveBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  empathyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  empathyEmoji: {
    fontSize: 28,
  },
  empathyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  empathyBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
