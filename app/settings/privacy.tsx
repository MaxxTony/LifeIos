import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';

export default function PrivacyPolicyScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={48} color={colors.primary} />
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Information We Collect</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            LifeOS collects minimal data required for synchronization and AI features. This includes your tasks, habits, mood entries, and focus session statistics.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. How We Use Data</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Your data is used to provide real-time cloud synchronization, generate productivity insights via the AI coach, and maintain your experience levels (XP) and streaks.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Data Security</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            We use industry-standard encryption (AES-256) and Firebase's secure authentication to protect your information. Your health and mood data are treated with extra care and are never shared with third parties.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. AI Processing</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Anonymous task and mood data may be processed by AI models to provide coaching advice. We truncate and filter PII wherever possible before processing.
          </Text>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Last updated: April 18, 2026</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, height: 60 },
  headerTitle: { ...Typography.h3, fontSize: 18 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.lg },
  iconContainer: { alignItems: 'center', marginVertical: 30 },
  sectionTitle: { ...Typography.h3, marginTop: 24, marginBottom: 8 },
  paragraph: { ...Typography.body, lineHeight: 24, marginBottom: 16 },
  footer: { marginTop: 40, alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 12, opacity: 0.6 }
});
