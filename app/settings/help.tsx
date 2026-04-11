import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { GlassCard } from '@/components/GlassCard';
import { HelpCircle, ChevronDown, ChevronUp, Mail, MessageSquare, BookOpen } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
  {
    q: "How do I track a new habit?",
    a: "Navigate to the Habits tab and tap the '+' icon in the top right. You can choose a category, set frequency, and configure reminders."
  },
  {
    q: "Can I sync my data across devices?",
    a: "Yes! Since LifeOS uses a cloud-based account system, your data automatically syncs across any device where you log in with the same credentials."
  },
  {
    q: "Is my mood data private?",
    a: "Absolutely. All personal data, including mood logs and notes, is stored securely and accessible only by you. We do not sell your personal data."
  },
  {
    q: "How do I use the AI Assistant?",
    a: "Head to the AI Chat screen and type or speak to 'LifeOS'. You can ask it to add tasks, explain trends, or help you plan your day."
  },
];

export default function HelpCenter() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Help Center',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: '#FFF' },
          headerTintColor: Colors.dark.primary,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.supportCards}>
          <TouchableOpacity style={styles.supportCard}>
            <GlassCard style={styles.glassCard}>
              <Mail size={24} color={Colors.dark.primary} />
              <Text style={styles.supportLabel}>Email Us</Text>
            </GlassCard>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportCard}>
            <GlassCard style={styles.glassCard}>
              <BookOpen size={24} color={Colors.dark.secondary} />
              <Text style={styles.supportLabel}>Guides</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {FAQS.map((faq, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.faqItem, isExpanded && styles.faqItemExpanded]} 
                  onPress={() => toggle(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    {isExpanded ? <ChevronUp size={18} color={Colors.dark.primary} /> : <ChevronDown size={18} color={Colors.dark.textSecondary} />}
                  </View>
                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.contactSection}>
          <GlassCard style={styles.communityCard}>
            <MessageSquare size={32} color={Colors.dark.primary} />
            <Text style={styles.communityTitle}>Join our Community</Text>
            <Text style={styles.communityText}>
              Share tips, request features, and connect with other LifeOS users on our Discord server.
            </Text>
            <TouchableOpacity style={styles.communityButton}>
              <Text style={styles.communityButtonText}>Join Discord</Text>
            </TouchableOpacity>
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
  supportCards: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  supportCard: {
    flex: 1,
  },
  glassCard: {
    alignItems: 'center',
    gap: 12,
    padding: Spacing.lg,
  },
  supportLabel: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
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
  faqList: {
    gap: Spacing.md,
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  faqItemExpanded: {
    borderColor: 'rgba(124, 92, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  contactSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  communityCard: {
    alignItems: 'center',
    textAlign: 'center',
    padding: Spacing.xl,
  },
  communityTitle: {
    ...Typography.h3,
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  communityText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  communityButton: {
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.3)',
  },
  communityButtonText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
});
