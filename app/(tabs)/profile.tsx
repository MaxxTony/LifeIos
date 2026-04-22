import { ProfileHero } from '@/components/Profile/ProfileHero';
import { ProfileMenuItem } from '@/components/Profile/ProfileMenuItem';
import { StatsBentoGrid } from '@/components/Profile/StatsBentoGrid';
import { TrophyCabinet } from '@/components/Profile/TrophyCabinet';
import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  Bell,
  HelpCircle,
  History,
  Info,
  LogOut,
  MessageSquare,
  Moon,
  Settings2,
  Shield,
  User
} from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function ProfileScreen() {
  const logout = useStore(s => s.actions.logout);
  const themePreference = useStore(s => s.themePreference);
  const colors = useThemeColors();
  const router = useRouter();

  const [notifStatus, setNotifStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const checkStatus = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifStatus(status);
    };
    checkStatus();
  }, []);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Save progress and clear local state
              await logout({ shouldSaveFocus: true });
              
              // 2. Sign out of Firebase
              const { error } = await authService.logout();
              
              if (!error) {
                router.replace('/(auth)/login');
              } else {
                Alert.alert('Logout Error', 'We couldn\'t log you out completely. Please check your connection.');
              }
            } catch (e) {
              Alert.alert('Unexpected Error', 'Something went wrong during logout.');
            }
          },
        },
      ]
    );
  };

  const getAppearanceValue = () => {
    if (themePreference === 'system') return 'System';
    return themePreference.charAt(0).toUpperCase() + themePreference.slice(1);
  };

  const cardBg = colors.isDark ? '#111827' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1F2937' : '#F1F5F9';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* New Hero Section */}
        <ProfileHero />

        <View style={styles.mainContent}>
          {/* Stats Section */}
          <Animated.View entering={FadeIn.delay(400).duration(600)}>
            <View style={styles.sectionTitleRow}>
              <History size={16} color={colors.textSecondary} />
              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginBottom: 0 }]}>YOUR PROGRESS</Text>
            </View>
            <StatsBentoGrid />
          </Animated.View>

          {/* Gamification Badges */}
          <TrophyCabinet />

          {/* Preferences Section */}
          <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Settings2 size={16} color={colors.textSecondary} />
              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginBottom: 0 }]}>PREFERENCES</Text>
            </View>
            <View style={[styles.menuList, { backgroundColor: cardBg, borderColor }]}>
              <ProfileMenuItem
                icon={History}
                label="Weekly Review"
                accentColor={colors.primary}
                onPress={() => router.push('/weekly-review')}
              />
              <ProfileMenuItem
                icon={User}
                label="Edit Profile"
                accentColor="#38BDF8"
                onPress={() => router.push('/edit-profile')}
              />
              <ProfileMenuItem
                icon={Bell}
                label="Notifications"
                accentColor="#F87171"
                onPress={() => router.push('/settings/notifications')}
              />
              <ProfileMenuItem
                icon={Moon}
                label="Appearance"
                accentColor="#FBBF24"
                value={getAppearanceValue()}
                onPress={() => router.push('/settings/appearance')}
              />
              <ProfileMenuItem
                icon={Shield}
                label="Privacy & Security"
                accentColor="#34D399"
                isLast
                onPress={() => router.push('/settings/privacy')}
              />
            </View>
          </Animated.View>

          {/* Support Section */}
          <Animated.View entering={FadeIn.delay(600).duration(600)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <HelpCircle size={16} color={colors.textSecondary} />
              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginBottom: 0 }]}>SUPPORT</Text>
            </View>
            <View style={[styles.menuList, { backgroundColor: cardBg, borderColor }]}>
              <ProfileMenuItem
                icon={MessageSquare}
                label="Send Feedback"
                accentColor="#F472B6"
                onPress={() => router.push('/settings/feedback')}
              />
              <ProfileMenuItem
                icon={HelpCircle}
                label="Help Center"
                accentColor="#A78BFA"
                onPress={() => router.push('/settings/help')}
              />
              <ProfileMenuItem
                icon={Info}
                label="About LifeOS"
                accentColor="#94A3B8"
                isLast
                onPress={() => router.push('/settings/about')}
              />
            </View>
          </Animated.View>

          {/* System Permissions Check (T-29 FIX) */}
          {notifStatus === 'denied' && (
            <Animated.View entering={FadeIn.delay(800)} style={[styles.permissionAlert, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}>
              <View style={styles.permissionIcon}>
                <Ionicons name="notifications-off-outline" size={20} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.permissionTitle, { color: colors.text }]}>Notifications Disabled</Text>
                <Text style={[styles.permissionSub, { color: colors.textSecondary }]}>You're missing out on habit and task reminders.</Text>
              </View>
              <TouchableOpacity onPress={openSettings} style={[styles.settingsBtn, { backgroundColor: colors.danger }]}>
                <Text style={styles.settingsBtnText}>Fix</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Account Actions */}
          <Animated.View entering={FadeIn.delay(700).duration(600)} style={styles.section}>
            <View style={[styles.menuList, { backgroundColor: cardBg, borderColor }]}>
              <ProfileMenuItem
                icon={LogOut}
                label="Log Out Account"
                destructive
                isLast
                onPress={handleLogout}
              />
            </View>
          </Animated.View>

          {/* Version Footer */}
          <View style={styles.footer}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>LifeOS v1.0.0 (Beta)</Text>
            <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>© {new Date().getFullYear()} LifeOS Team</Text>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainContent: {
    paddingHorizontal: Spacing.md,
    marginTop: -10,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionHeader: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 0,
    opacity: 0.5,
  },
  menuList: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    opacity: 0.6,
  },
  versionText: {
    ...Typography.caption,
    fontSize: 12,
  },
  copyrightText: {
    ...Typography.labelSmall,
    fontSize: 9,
    marginTop: 4,
  },
  permissionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: 12,
  },
  permissionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  permissionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  settingsBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  settingsBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  }
});
