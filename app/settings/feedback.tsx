import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { Send, MessageSquare, Bug, Sparkles, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import Toast from 'react-native-toast-message';

const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: Bug },
  { id: 'feature', label: 'Feature Request', icon: Sparkles },
  { id: 'general', label: 'General Feedback', icon: MessageSquare },
];

export default function FeedbackSettings() {
  const router = useRouter();
  const [category, setCategory] = useState('general');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Toast.show({
        type: 'success',
        text1: 'Feedback Sent!',
        text2: 'Thank you for helping us improve LifeOS.',
      });
      router.back();
    }, 1500);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{ 
          title: 'Send Feedback',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: colors.text },
          headerTintColor: colors.primary,
        }} 
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Your feedback helps us build the best version of LifeOS. We read every message!
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              const Icon = cat.icon;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[
                    styles.categoryItem, 
                    { 
                      backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
                      borderColor: isActive ? colors.primary + '30' : 'transparent'
                    },
                    isActive && { backgroundColor: colors.primaryTransparent }
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Icon size={20} color={isActive ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.categoryLabel, { color: colors.textSecondary }, isActive && { color: colors.primary }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Message</Text>
          <GlassCard style={styles.inputCard}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={colors.textSecondary + '60'}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={feedback}
              onChangeText={setFeedback}
            />
          </GlassCard>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, (!feedback.trim() || submitting) && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={!feedback.trim() || submitting}
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <Text style={styles.submitText}>Sending...</Text>
            ) : (
              <>
                <Text style={styles.submitText}>Send Feedback</Text>
                <Send size={18} color="#FFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <AlertCircle size={14} color={colors.textSecondary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            For urgent technical support, please head to the Help Center.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  description: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryItem: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  categoryLabel: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: Spacing.xxl,
  },
  inputCard: {
    padding: Spacing.md,
    height: 180,
  },
  textInput: {
    ...Typography.body,
    flex: 1,
    paddingTop: 0,
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 56,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    ...Typography.body,
    color: '#FFF',
    fontWeight: '700',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    gap: 8,
    opacity: 0.6,
  },
  disclaimerText: {
    ...Typography.caption,
    fontSize: 12,
  },
});
