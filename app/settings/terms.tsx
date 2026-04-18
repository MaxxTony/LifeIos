import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ChevronLeft, FileText } from 'lucide-react-native';

export default function TermsOfServiceScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconContainer}>
            <FileText size={48} color={colors.secondary} />
          </View>
          
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptance of Terms</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            By accessing or using LifeOS, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you do not have permission to use the service.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Description of Service</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            LifeOS is a productivity and lifestyle management platform. Features include habit tracking, task management, mood journaling, and AI-powered coaching.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. User Responsibilities</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to use the service only for lawful purposes.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Limitations of Liability</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            LifeOS and its AI features are provided for informational and productivity purposes only. The app is not a substitute for professional mental health or medical advice.
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
