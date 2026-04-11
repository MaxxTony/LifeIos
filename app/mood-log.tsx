import { Spacing, Typography } from '@/constants/theme';
import { MOOD_LEVELS, ACTIVITIES, EMOTIONS, getMoodConfig } from '@/constants/moods';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MoodEmoji } from '@/components/MoodEmoji';

export default function MoodLogScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { setMood } = useStore();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');

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
    router.back();
  };

  const currentConfig = selectedMood ? getMoodConfig(selectedMood) : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0B0B0F', '#1A1A2E']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Mood</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Step 1: How was your day? */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Text style={styles.sectionTitle}>How was your day?</Text>
            <View style={styles.moodRow}>
              {MOOD_LEVELS.map((m) => {
                const isSelected = selectedMood === m.level;
                return (
                  <TouchableOpacity
                    key={m.level}
                    style={[
                      styles.moodBtn,
                      isSelected && { backgroundColor: m.bgColor, borderColor: m.color }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedMood(m.level);
                    }}
                  >
                    <View style={[styles.moodFace, { backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)' }]}>
                      <MoodEmoji level={m.level} size={44} />
                    </View>
                    <Text style={[styles.moodLabel, isSelected && { color: m.color }]}>{m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Step 2: Activities */}
          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(200)}>
              <Text style={styles.sectionTitle}>Activities</Text>
              <View style={styles.chipGrid}>
                {ACTIVITIES.map((a) => {
                  const isSelected = selectedActivities.includes(a.id);
                  return (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleActivity(a.id)}
                    >
                      <Ionicons
                        name={a.icon}
                        size={20}
                        color={isSelected ? currentConfig?.color : 'rgba(255,255,255,0.4)'}
                      />
                      <Text style={[styles.chipLabel, isSelected && { color: currentConfig?.color }]}>
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Step 3: Emotions */}
          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(300)}>
              <Text style={styles.sectionTitle}>Emotions</Text>
              <View style={styles.chipGrid}>
                {EMOTIONS.map((e) => {
                  const isSelected = selectedEmotions.includes(e.id);
                  return (
                    <TouchableOpacity
                      key={e.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleEmotion(e.id)}
                    >
                      <Ionicons
                        name={e.icon}
                        size={20}
                        color={isSelected ? currentConfig?.color : 'rgba(255,255,255,0.4)'}
                      />
                      <Text style={[styles.chipLabel, isSelected && { color: currentConfig?.color }]}>
                        {e.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Step 4: Quick Note */}
          {selectedMood && (
            <Animated.View entering={FadeInDown.delay(400)}>
              <Text style={styles.sectionTitle}>Quick Note (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="What made today special?"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
              />
            </Animated.View>
          )}

          {/* Save Button */}
          {selectedMood && (
            <Animated.View entering={FadeIn.delay(500)}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={[currentConfig?.color || '#7C5CFF', '#7C5CFF']}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  closeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: 28,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#FFF',
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
    backgroundColor: 'rgba(255,255,255,0.02)',
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
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipSelected: {
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
    borderColor: 'rgba(124, 92, 255, 0.25)',
  },
  chipLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    fontSize: 15,
    color: '#FFF',
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
});
