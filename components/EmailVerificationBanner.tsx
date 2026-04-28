import { Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeOut, SlideInUp } from 'react-native-reanimated';

const DISMISS_KEY = 'email-verify-banner-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const EmailVerificationBanner = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    const user = authService.currentUser;
    if (!user) return;

    // Already verified — nothing to show
    if (user.emailVerified) return;

    // Google sign-in users are always verified — skip them.
    // They have no password provider.
    const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
    if (!isEmailProvider) return;

    // Check if user dismissed recently
    try {
      const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < DISMISS_DURATION_MS) return; // Still within dismiss window
      }
    } catch (_) { }

    setVisible(true);
  };

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch (_) { }
  };

  const handleVerify = () => {
    router.push('/(auth)/verify-email');
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(400).springify().damping(18)}
      exiting={FadeOut.duration(200)}
      style={[styles.container, {
        backgroundColor: colors.isDark ? 'rgba(255, 180, 0, 0.12)' : 'rgba(255, 180, 0, 0.08)',
        borderColor: 'rgba(255, 180, 0, 0.3)',
      }]}
    >
      <View style={styles.iconBox}>
        <Ionicons name="mail-unread-outline" size={20} color="#FFB400" />
      </View>

      <View style={styles.textBox}>
        <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Needed for password recovery
        </Text>
      </View>

      <TouchableOpacity
        style={styles.verifyBtn}
        onPress={handleVerify}
        activeOpacity={0.7}
        accessibilityLabel="Verify email"
        accessibilityRole="button"
      >
        <Text style={styles.verifyBtnText}>Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss email verification banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
    marginTop: 1,
  },
  verifyBtn: {
    backgroundColor: '#FFB400',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  verifyBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
});
