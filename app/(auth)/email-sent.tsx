import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail, Check, Inbox } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Typography } from '@/constants/theme';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

const { height } = Dimensions.get('window');

export default function EmailSentScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const colors = useThemeColors();

  const handleOpenEmail = () => {
    // Attempt to open general mail app
    Linking.openURL('mailto:');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg.png')}
      style={[styles.container, { backgroundColor: colors.background }]}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[colors.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)', colors.isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View entering={ZoomIn.duration(600)} style={styles.successIconOuter}>
          <LinearGradient
            colors={colors.gradient}
            style={styles.successIconInner}
          >
            <Check size={40} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.textGroup}>
          <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We've sent a password reset link to:{"\n"}
            <Text style={{ color: colors.primary, fontFamily: 'Inter-SemiBold' }}>{email}</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.buttonGroup}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleOpenEmail} style={{ width: '100%' }}>
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButton}
            >
              <Inbox size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Open Email App</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.replace('/(auth)/login')} 
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back to Login</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Didn't receive the email? Check your spam folder or{" "}
            <Text 
              style={{ color: colors.primary, fontWeight: '600' }}
              onPress={() => router.back()}
            >
              try again
            </Text>
          </Text>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIconOuter: { 
    width: 120, height: 120, borderRadius: 60, padding: 8, 
    backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  successIconInner: { flex: 1, borderRadius: 52, justifyContent: 'center', alignItems: 'center' },
  textGroup: { alignItems: 'center', marginBottom: 40 },
  title: { ...Typography.h1, fontSize: 32, marginBottom: 16 },
  subtitle: { ...Typography.body, textAlign: 'center', fontSize: 16, lineHeight: 24 },
  buttonGroup: { width: '100%', gap: 16, marginBottom: 40 },
  primaryButton: { 
    height: 58, borderRadius: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
  },
  primaryButtonText: { ...Typography.h3, color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter-SemiBold' },
  secondaryButton: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  secondaryButtonText: { ...Typography.h3, fontSize: 16, fontFamily: 'Inter-Medium' },
  footer: { position: 'absolute', bottom: 60, paddingHorizontal: 40 },
  footerText: { ...Typography.caption, textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
