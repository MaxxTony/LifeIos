import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { GlassCard } from '@/components/GlassCard';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileStats } from '@/components/ProfileStats';
import { 
  Settings, 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle, 
  Info, 
  LogOut, 
  ChevronRight, 
  ExternalLink, 
  MessageSquare,
  Sparkles,
  Edit3
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { logout } = useStore();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Account</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/edit-profile')}
          >
            <LinearGradient
              colors={['#7C5CFF20', '#5B8CFF20']}
              style={styles.editGradient}
            >
              <Edit3 size={18} color={Colors.dark.primary} />
              <Text style={styles.editText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ProfileHeader />
        
        <Text style={styles.sectionTitle}>Overview</Text>
        <ProfileStats />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingItem 
              icon={Bell} 
              label="Notifications" 
              onPress={() => router.push('/settings/notifications')} 
            />
            <SettingItem 
              icon={Moon} 
              label="Appearance" 
              value="System" 
              onPress={() => router.push('/settings/appearance')} 
            />
            <SettingItem 
              icon={Shield} 
              label="Privacy & Security" 
              onPress={() => router.push('/settings/privacy')} 
            />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingItem 
              icon={MessageSquare} 
              label="Send Feedback" 
              onPress={() => router.push('/settings/feedback')} 
            />
            <SettingItem 
              icon={HelpCircle} 
              label="Help Center" 
              onPress={() => router.push('/settings/help')} 
            />
             <SettingItem 
              icon={Info} 
              label="About LifeOS" 
              onPress={() => router.push('/settings/about')} 
            />
          </GlassCard>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color={Colors.dark.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out Account</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LifeOS v1.0.0 (Beta)</Text>
          <Text style={styles.copyrightText}>© 2024 LifeOS Team</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ 
  icon: Icon, 
  label, 
  value, 
  onPress 
}: { 
  icon: any; 
  label: string; 
  value?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconBg}>
          <Icon size={18} color={Colors.dark.text} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        <ChevronRight size={18} color={Colors.dark.tabIconDefault} />
      </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.dark.text,
  },
  editButton: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  editGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.3)',
    borderRadius: BorderRadius.full,
  },
  editText: {
    ...Typography.caption,
    marginLeft: 8,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.dark.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginRight: 8,
  },
  logoutButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.2)',
  },
  logoutText: {
    ...Typography.body,
    color: Colors.dark.danger,
    fontWeight: '700',
  },
  versionContainer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    opacity: 0.5,
  },
  versionText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  copyrightText: {
    ...Typography.labelSmall,
    fontSize: 8,
    marginTop: 4,
    color: Colors.dark.textSecondary,
  },
});
