import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { ShieldCheck, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data — tasks, habits, mood history, XP, and streaks. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            
            // 1. Clear local state immediately WITHOUT saving (since we are deleting everything)
            const { useStore } = await import('@/store/useStore');
            await useStore.getState().actions.logout({ shouldSaveFocus: false });

            // 2. Perform deep cleanup and delete auth account
            const { error } = await authService.deleteAccount();
            setDeleting(false);
            
            if (error === 'requires-recent-login') {
              Alert.alert(
                'Security Check',
                'For security, you must have logged in recently to delete your account. Please log out and log back in, then try again.',
                [{ text: 'OK' }]
              );
            } else if (error) {
              Alert.alert('Error', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>


        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          <View style={[styles.dangerZone, { borderColor: '#FF3B30' }]}>
            <Text style={[styles.sectionTitle, { color: '#FF3B30', marginTop: 0 }]}>Delete Account</Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              Permanently deletes your account and all associated data including tasks, habits, mood history, and progress. This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: '#FF3B30' }]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete My Account</Text>
                </>
              )}
            </TouchableOpacity>
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
  iconContainer: { alignItems: 'center', marginVertical: 10 },
  sectionTitle: { ...Typography.h3, marginTop: 24, marginBottom: 8 },
  paragraph: { ...Typography.body, lineHeight: 24, marginBottom: 16 },
  footer: { marginTop: 40, alignItems: 'center', paddingBottom: 16 },
  footerText: { fontSize: 12, opacity: 0.6 },
  dangerZone: { marginTop: 32, marginBottom: 48, padding: Spacing.md, borderWidth: 1, borderRadius: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10, marginTop: 8 },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
