import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { HelpCircle, ChevronDown, ChevronUp, Mail, MessageSquare, BookOpen } from 'lucide-react-native';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Stack } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';

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
  const colors = useThemeColors();
  const headerHeight = useHeaderHeight();

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Help Center',
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', color: colors.text },
          headerTintColor: colors.primary,
        }} 
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: headerHeight + 8 }]}>
        <View style={styles.supportCards}>
          <TouchableOpacity style={styles.supportCard}>
            <GlassCard style={styles.glassCard}>
              <Mail size={24} color={colors.primary} />
              <Text style={[styles.supportLabel, { color: colors.text }]}>Email Us</Text>
            </GlassCard>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportCard}>
            <GlassCard style={styles.glassCard}>
              <BookOpen size={24} color={colors.secondary} />
              <Text style={[styles.supportLabel, { color: colors.text }]}>Guides</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Frequently Asked Questions</Text>
          <View style={styles.faqList}>
            {FAQS.map((faq, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[
                    styles.faqItem, 
                    { 
                      backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                      borderColor: isExpanded ? colors.primary + '30' : colors.border
                    },
                    isExpanded && { backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)' }
                  ]} 
                  onPress={() => toggle(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqHeader}>
                    <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.q}</Text>
                    {isExpanded ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
                  </View>
                  {isExpanded && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.a}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.contactSection}>
          <GlassCard style={styles.communityCard}>
            <MessageSquare size={32} color={colors.primary} />
            <Text style={[styles.communityTitle, { color: colors.text }]}>Join our Community</Text>
            <Text style={[styles.communityText, { color: colors.textSecondary }]}>
              Share tips, request features, and connect with other LifeOS users on our Discord server.
            </Text>
            <TouchableOpacity style={[styles.communityButton, { backgroundColor: colors.primaryTransparent, borderColor: colors.primary + '30' }]}>
              <Text style={[styles.communityButtonText, { color: colors.primary }]}>Join Discord</Text>
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
  },
  content: {
    padding: Spacing.md,
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
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  faqList: {
    gap: Spacing.md,
  },
  faqItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    ...Typography.caption,
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
    marginTop: 16,
    marginBottom: 8,
  },
  communityText: {
    ...Typography.caption,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  communityButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  communityButtonText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
  },
});
