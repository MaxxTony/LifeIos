import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Compass,
  Heart,
  Layers,
  Layout,
  MessageSquare,
  Sparkles,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  Layout as ReanimatedLayout
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const GUIDES = [
  {
    title: "LifeOS Vision",
    icon: Compass,
    color: '#7C5CFF',
    content: "LifeOS is more than just a list app—it's a companion for intentional living. We bridge the gap between where you are and where you want to be by combining behavioral science with seamless design."
  },
  {
    title: "How it Works",
    icon: Zap,
    color: '#FFD700',
    steps: [
      { t: "Plan", d: "Add your tasks and let the system organize your day.", icon: Layout },
      { t: "Act", d: "Execute with focus using dedicated timers and habit trackers.", icon: Zap },
      { t: "Reflect", d: "Record your mood to understand what truly moves you.", icon: Heart }
    ]
  }
];

const AI_SECTION = {
  title: "Meet your AI Brain",
  desc: "The LifeOS AI isn't just a chatbot—it's an assistant that lives inside your schedule. It analyzes your patterns to help you work smarter, not harder.",
  capabilities: [
    "Identify gaps in your busy schedule",
    "Suggest the best times for Deep Work",
    "Find correlations between tasks & mood",
    "Generate personalized productivity tips"
  ]
};

const FEATURES = [
  { id: 'tasks', title: 'Smart Tasks', icon: Layout, desc: 'Auto-categorized lists with AI scheduling.' },
  { id: 'habits', title: 'Atomic Habits', icon: CircleCheck, desc: 'Consistency tracking with streak protection.' },
  { id: 'mood', title: 'Mood Insights', icon: Heart, desc: 'Daily reflection that reveals personal patterns.' },
  { id: 'focus', title: 'Deep Work', icon: Clock, desc: 'Focused sessions with distraction-free timers.' },
];

const FAQS = [
  {
    q: "How does the AI optimize my time?",
    a: "The AI looks at your current load and historical productivity to suggest the 'Best Time to Start' for tasks, helping you avoid burnout."
  },
  {
    q: "What are 'Atomic Habits'?",
    a: "These are small, consistent actions that compound. We use streak protection to keep you motivated even on off-days."
  },
  {
    q: "How is my data handled?",
    a: "Your data is yours. We use high-grade encryption and a local-first sync model via Firebase to keep your history private and safe."
  },
];

interface FAQItemProps {
  faq: { q: string; a: string };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function FAQItem({ faq, index, isExpanded, onToggle }: FAQItemProps) {
  const colors = useThemeColors();

  return (
    <Animated.View entering={FadeInDown.delay(600 + index * 100)}>
      <TouchableOpacity
        style={[
          styles.faqItem,
          { backgroundColor: colors.isDark ? '#111827' : '#FFFFFF', borderColor: isExpanded ? colors.primary : colors.isDark ? '#1F2937' : '#F1F5F9' }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        activeOpacity={0.9}
      >
        <View style={styles.faqHeader}>
          <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.q}</Text>
          {isExpanded ? (
            <ChevronUp size={18} color={colors.primary} />
          ) : (
            <ChevronDown size={18} color={colors.textSecondary} />
          )}
        </View>
        {isExpanded && (
          <Animated.View layout={ReanimatedLayout.springify()}>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{faq.a}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HelpCenter() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const colors = useThemeColors();

  const cardBg = colors.isDark ? '#111827' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1F2937' : '#F1F5F9';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.heroSection}>
          <View style={[styles.surfaceCard, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.heroText, { color: colors.textSecondary }]}>
              {GUIDES[0].content}
            </Text>
          </View>
        </Animated.View>

        {/* Section 2: AI Brain */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.primary }]}>AI INTELLIGENCE</Text>
          </View>
          <Animated.View entering={FadeInDown.delay(200)} style={[styles.surfaceCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.aiHeader}>
              <View style={[styles.aiIcon, { backgroundColor: colors.primary + '20' }]}>
                <Brain size={20} color={colors.primary} />
              </View>
              <Text style={[styles.aiTitle, { color: colors.text }]}>{AI_SECTION.title}</Text>
            </View>
            <Text style={[styles.aiDesc, { color: colors.textSecondary }]}>{AI_SECTION.desc}</Text>
            <View style={styles.capabilitiesList}>
              {AI_SECTION.capabilities.map((cap, i) => (
                <View key={i} style={styles.capabilityItem}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.capabilityText, { color: colors.text }]}>{cap}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Section 3: The Flow */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Zap size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>CORE FLOW</Text>
          </View>
          <View style={styles.loopContainer}>
            {GUIDES[1].steps?.map((step, i) => {
              const StepIcon = step.icon;
              return (
                <Animated.View
                  key={i}
                  entering={FadeInRight.delay(200 + i * 150)}
                  style={[styles.surfaceCard, { backgroundColor: cardBg, borderColor, padding: 16, flexDirection: 'row', alignItems: 'center' }]}
                >
                  <View style={[styles.stepIconContainer, { backgroundColor: colors.isDark ? '#1F2937' : '#F8FAFC' }]}>
                    <StepIcon size={20} color={colors.primary} />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepTitle, { color: colors.text }]}>{step.t}</Text>
                    <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.d}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Section 4: Feature Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Layers size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>TOOLS & FEATURES</Text>
          </View>
          <View style={styles.featureGrid}>
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Animated.View
                  key={feat.id}
                  entering={FadeInDown.delay(400 + i * 100)}
                  style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}
                >
                  <View style={[styles.featIconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Icon size={20} color={colors.text} />
                  </View>
                  <Text style={[styles.featTitle, { color: colors.text }]}>{feat.title}</Text>
                  <Text style={[styles.featDesc, { color: colors.textSecondary }]}>{feat.desc}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Section 5: FAQs */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <MessageSquare size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>COMMON QUESTIONS</Text>
          </View>
          <View style={styles.faqList}>
            {FAQS.map((faq, i) => (
              <FAQItem
                key={i}
                index={i}
                faq={faq}
                isExpanded={expandedIndex === i}
                onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
              />
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.communitySection}>
          <TouchableOpacity
            style={[styles.communityButton, { backgroundColor: colors.primary }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Sparkles size={18} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.communityButtonText}>Talk to the Community</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emailButton}>
            <Text style={[styles.footerSub, { color: colors.textSecondary }]}>Need official support? Reach out via Email</Text>
          </TouchableOpacity>
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
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  iconLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
    marginBottom: 24,
  },
  surfaceCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 15,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 4,
    gap: 10,
  },
  sectionHeading: {
    ...Typography.labelSmall,
    letterSpacing: 2,
    fontWeight: '800',
    fontSize: 11,
    opacity: 0.6,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTitle: {
    fontWeight: '800',
    fontSize: 18,
  },
  aiDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  capabilitiesList: {
    gap: 12,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  capabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loopContainer: {
    gap: 12,
  },
  stepIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (width - 48 - 12) / 2,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  featIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 8,
  },
  featDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  communitySection: {
    alignItems: 'center',
    marginTop: 20,
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  communityButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  emailButton: {
    marginTop: 16,
  },
  footerSub: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
});
