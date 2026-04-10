import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { GlassCard } from '@/components/GlassCard';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { userName, userId, logout } = useStore();
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await authService.logout();
    if (!error) {
      logout();
      router.replace('/(auth)/login');
    } else {
      console.error(error);
    }
  };

  const isGuest = userName === 'Guest';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatar}>
             <Text style={styles.avatarText}>{userName?.[0] || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{userName || 'User'}</Text>
          <Text style={styles.userEmail}>{isGuest ? 'Guest Account' : authService.currentUser?.email || 'Permanent Account'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingItem icon="🔔" label="Notifications" />
            <SettingItem icon="🌙" label="Dark Mode" value="On" />
            <SettingItem icon="🔒" label="Privacy" />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingItem icon="💬" label="Feedback" />
            <SettingItem icon="ℹ️" label="About LifeOS" />
          </GlassCard>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <TouchableOpacity style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  avatarText: {
    ...Typography.h1,
    color: Colors.dark.primary,
  },
  userName: {
    ...Typography.h2,
    color: Colors.dark.text,
  },
  userEmail: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  settingsCard: {
    padding: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  settingValue: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
  },
  logoutButton: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    ...Typography.body,
    color: Colors.dark.danger,
    fontWeight: '600',
  },
});
