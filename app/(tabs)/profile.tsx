import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { GlassCard } from '@/components/GlassCard';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { ProfileHeader } from '@/components/ProfileHeader';
import { ProfileStats } from '@/components/ProfileStats';
import { 
  Bell, 
  Moon, 
  Shield, 
  HelpCircle, 
  Info, 
  LogOut, 
  ChevronRight, 
  MessageSquare,
  Edit3
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { logout, themePreference } = useStore();
  const colors = useThemeColors();
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

  const getAppearanceValue = () => {
    if (themePreference === 'system') return 'System';
    return themePreference.charAt(0).toUpperCase() + themePreference.slice(1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Account</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/edit-profile')}
          >
            <LinearGradient
              colors={[colors.primaryTransparent, colors.secondary + '20']}
              style={[styles.editGradient, { borderColor: colors.primary + '30' }]}
            >
              <Edit3 size={18} color={colors.primary} />
              <Text style={[styles.editText, { color: colors.primary }]}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ProfileHeader />
        
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Overview</Text>
        <ProfileStats />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingItem 
              icon={Bell} 
              label="Notifications" 
              onPress={() => router.push('/settings/notifications')} 
            />
            <SettingItem 
              icon={Moon} 
              label="Appearance" 
              value={getAppearanceValue()} 
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
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
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

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]} 
          onPress={handleLogout}
        >
          <LogOut size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out Account</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>LifeOS v1.0.0 (Beta)</Text>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>© {new Date().getFullYear()} LifeOS Team</Text>
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
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBg, { backgroundColor: colors.isDark ? (colors.background + '60') : 'rgba(0,0,0,0.03)' }]}>
          <Icon size={18} color={colors.isDark ? colors.text : colors.text} />
        </View>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
        <ChevronRight size={18} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: BorderRadius.full,
  },
  editText: {
    ...Typography.caption,
    marginLeft: 8,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
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
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...Typography.body,
    marginRight: 8,
  },
  logoutButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  logoutText: {
    ...Typography.body,
    fontWeight: '700',
  },
  versionContainer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    opacity: 0.5,
  },
  versionText: {
    ...Typography.caption,
  },
  copyrightText: {
    ...Typography.labelSmall,
    fontSize: 8,
    marginTop: 4,
  },
});
