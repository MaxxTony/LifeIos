import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ArrowRight, Database, Download, ShieldCheck, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Dimensions, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function PrivacySettings() {
  const colors = useThemeColors();
  const logout = useStore(s => s.logout);
  const router = useRouter();

  const handleExport = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const state = useStore.getState();
    const data = {
      habits: state.habits,
      tasks: state.tasks,
      moodHistory: state.moodHistory,
      focusHistory: state.focusHistory,
      userName: state.userName,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    try {
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'LifeOS Data Export'
      });
    } catch (error: any) {
      Alert.alert('Export Failed', 'We couldn\'t generate the export right now.');
    }
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account?',
      'This will permanently remove your account and all data from LifeOS. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const { error } = await authService.deleteAccount();
            if (!error) {
              logout();
              router.replace('/(auth)/login');
              Alert.alert('Account Deleted', 'Your data has been permanently removed.');
            } else {
              Alert.alert('Error', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Database size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>DATA MANAGEMENT</Text>
          </View>

          <View style={[styles.premiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={handleExport}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Download size={18} color={colors.text} />
                </View>
                <View>
                  <Text style={[styles.itemLabel, { color: colors.text }]}>Export My Data</Text>
                  <Text style={[styles.itemSublabel, { color: colors.textSecondary }]}>Download full JSON backup</Text>
                </View>
              </View>
              <ArrowRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.item}
              onPress={handleDeleteAccount}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBg, { backgroundColor: colors.danger + '15' }]}>
                  <Trash2 size={18} color={colors.danger} />
                </View>
                <View>
                  <Text style={[styles.itemLabel, { color: colors.danger, fontWeight: '700' }]}>Delete Account</Text>
                  <Text style={[styles.itemSublabel, { color: colors.danger, opacity: 0.7 }]}>Irreversible action</Text>
                </View>
              </View>
              <ArrowRight size={16} color={colors.danger} opacity={0.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerInfo}>
          <ShieldCheck size={14} color={colors.success} style={{ marginRight: 6 }} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            LifeOS is built with a focus on local-first privacy.
          </Text>
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
    padding: Spacing.lg,
    paddingTop: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 48,
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
    marginBottom: 12,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
    opacity: 0.8,
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
  },
  premiumCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '600',
  },
  itemSublabel: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    opacity: 0.7,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  hiddenCardContainer: {
    position: 'absolute',
    opacity: 0,
    left: -width * 2,
  }
});
