import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TermsOfService() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Terms of Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>Last Updated: April 14, 2026</Text>
        
        <Section title="1. Acceptance of Terms">
          By accessing or using LifeOS, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application.
        </Section>

        <Section title="2. Description of Service">
          LifeOS is an AI-powered productivity platform designed to help users manage tasks, track habits, and reflect on their daily mood. The service includes local-first data management and cloud synchronization.
        </Section>

        <Section title="3. AI Assistant usage">
          The AI features in LifeOS are intended to provide suggestions and insights based on your data. While we strive for accuracy, AI-generated content should be used as a guide and not as professional advice.
        </Section>

        <Section title="4. User Data & Responsibility">
          You are responsible for the data you input into LifeOS. While we take measures to secure your data, you should maintain your own backups for critical information.
        </Section>

        <Section title="5. Prohibited Conduct">
          You agree not to misuse the LifeOS services or help anyone else do so. This includes any attempt to reverse engineer the application or bypass security measures.
        </Section>

        <Section title="6. Limitation of Liability">
          LifeOS is provided "as is" without any warranties. The LifeOS Team will not be liable for any data loss, service interruptions, or direct/indirect damages arising from the use of the app.
        </Section>
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Questions about our Terms? Contact us through the Help Center.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginTop: 40,
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: 60,
  },
  lastUpdated: {
    ...Typography.caption,
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
  },
  sectionText: {
    ...Typography.body,
    lineHeight: 24,
    fontSize: 15,
  },
  footer: {
    marginTop: 20,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
