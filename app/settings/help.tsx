import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  CircleCheck, 
  Clock, 
  Compass, 
  Heart, 
  Layers, 
  Layout, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Zap 
} from 'lucide-react-native';
import React, { useState } from 'react';
import { 
  Dimensions, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  StatusBar
} from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  FadeInUp,
  Layout as ReanimatedLayout 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const GUIDES = [
  {
    title: "The LifeOS Vision",
    icon: Compass,
    color: '#7C5CFF',
    content: "LifeOS isn't just a list app—it's an operating system for your reality. We combine AI intelligence with behavioral science to help you master your time, energy, and happiness."
  },
  {
    title: "How it Works",
    icon: Zap,
    color: '#FFD700',
    steps: [
      { t: "Plan", d: "Add tasks and let AI help you schedule them effectively." },
      { t: "Act", d: "Track habits and stay focused with integrated timers." },
      { t: "Reflect", d: "Log your mood to see how your actions affect your mind." }
    ]
  }
];

const FEATURES = [
  { id: 'tasks', title: 'Smart Tasks', icon: Layout, desc: 'Auto-categorized lists with AI scheduling.' },
  { id: 'habits', title: 'Atomic Habits', icon: CircleCheck, desc: 'Consistency tracking with streak protection.' },
  { id: 'mood', title: 'Mood Insights', icon: Heart, desc: 'Daily reflection that reveals personal patterns.' },
  { id: 'focus', title: 'Deep Work', icon: Clock, desc: 'Focused sessions with distraction-free timers.' },
];

const FAQS = [
  {
    q: "Is my data safe and private?",
    a: "Yes. LifeOS follows a local-first privacy model. Your data is synced securely via Firebase, but we never sell or share your personal history."
  },
  {
    q: "How does AI planning work?",
    a: "The AI observes your task due dates and descriptions to suggest optimal times for you to start working, based on your typical productivity patterns."
  },
  {
    q: "Can I use LifeOS offline?",
    a: "Absolutely. Most features work offline and will automatically sync to your other devices once you're back online."
  },
  {
    q: "What are 'Atomic Habits'?",
    a: "Inspired by James Clear, these are tiny actions that compound over time to create massive personal change."
  },
];

interface FAQItemType {
  q: string;
  a: string;
}

interface FAQItemProps {
  faq: FAQItemType;
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
          { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary : colors.border }
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section 1: Hero Guide */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
          <View style={[styles.iconLarge, { backgroundColor: colors.primary + '15' }]}>
            <Compass size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>What is LifeOS?</Text>
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heroText, { color: colors.textSecondary }]}>
              {GUIDES[0].content}
            </Text>
          </View>
        </Animated.View>

        {/* Section 2: The Loop */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Zap size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>HOW IT WORKS</Text>
          </View>
          <View style={styles.loopContainer}>
            {GUIDES[1].steps?.map((step, i) => (
              <Animated.View 
                key={i} 
                entering={FadeInRight.delay(200 + i * 150)} 
                style={[styles.loopStep, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.stepNumber, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>{i + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{step.t}</Text>
                  <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.d}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Section 3: Feature Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Layers size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>KEY FEATURES</Text>
          </View>
          <View style={styles.featureGrid}>
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Animated.View 
                  key={feat.id} 
                  entering={FadeInDown.delay(400 + i * 100)} 
                  style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.featIconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Icon size={20} color={colors.text} />
                  </View>
                  <Text style={[styles.featTitle, { color: colors.text }]}>{feat.title}</Text>
                  <Text style={[styles.featDesc, { color: colors.textSecondary }]}>{feat.desc}</Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Section 4: Privacy */}
        <Animated.View entering={FadeInUp.delay(500)} style={[styles.privacyBanner, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
          <ShieldCheck size={18} color={colors.success} />
          <Text style={[styles.privacyText, { color: colors.success }]}>Your data is yours—end-to-end local privacy.</Text>
        </Animated.View>

        {/* Section 5: FAQs */}
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <MessageSquare size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>GENERAL FAQ</Text>
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

        {/* Community Button */}
        <Animated.View entering={FadeInUp.delay(800)} style={styles.communitySection}>
          <TouchableOpacity 
            style={[styles.communityButton, { backgroundColor: colors.primary }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Sparkles size={18} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.communityButtonText}>Talk to the Community</Text>
          </TouchableOpacity>
          <Text style={[styles.footerSub, { color: colors.textSecondary }]}>Need official support? Reach out via Email</Text>
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
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...Typography.h2,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 24,
    width: '100%',
  },
  heroText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 15,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 4,
    gap: 8,
  },
  sectionHeading: {
    ...Typography.labelSmall,
    letterSpacing: 1.5,
    fontWeight: '800',
    fontSize: 10,
  },
  loopContainer: {
    gap: 12,
  },
  loopStep: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontWeight: '800',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
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
    width: (width - 40 - 12) / 2, // 2 columns with gaps
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
  },
  featIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featTitle: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  featDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 40,
    gap: 10,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  communitySection: {
    alignItems: 'center',
    marginTop: 20,
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    width: '100%',
    justifyContent: 'center',
  },
  communityButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
  footerSub: {
    fontSize: 11,
    marginTop: 12,
    opacity: 0.6,
  },
});
