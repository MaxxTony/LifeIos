import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { Send, MessageSquare, Bug, Sparkles, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    // Mock submission
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
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen 
        options={{ 
          title: 'Send Feedback',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Your feedback helps us build the best version of LifeOS. We read every message!
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              const Icon = cat.icon;
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.categoryItem, isActive && styles.categoryItemActive]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Icon size={20} color={isActive ? '#FFF' : Colors.dark.textSecondary} />
                  <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Message</Text>
          <GlassCard style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={Colors.dark.textSecondary}
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
            colors={Colors.dark.gradient as any}
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
          <AlertCircle size={14} color={Colors.dark.textSecondary} />
          <Text style={styles.disclaimerText}>
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
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 120,
  },
  description: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemActive: {
    borderColor: 'rgba(124, 92, 255, 0.3)',
    backgroundColor: 'rgba(124, 92, 255, 0.08)',
  },
  categoryLabel: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#FFF',
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
    color: '#FFF',
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
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
});
