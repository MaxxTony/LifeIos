import { BlurView } from '@/components/BlurView';
import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Dimensions, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const { height } = Dimensions.get('window');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colors = useThemeColors();

  const handleReset = async () => {
    if (!EMAIL_REGEX.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    const { error } = await authService.resetPassword(email);
    setLoading(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Reset Failed', text2: error });
    } else {
      router.push({
        pathname: '/(auth)/email-sent',
        params: { email }
      });
    }
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color={colors.text} />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Mail size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              No worries! Enter your email and we'll send you a link to reset your account.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.cardWrap, { borderColor: colors.border }]}>
            <BlurView intensity={90} tint={colors.isDark ? "dark" : "light"} style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderColor: colors.border, color: colors.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textSecondary + '60'}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={handleReset} disabled={loading} style={loading && { opacity: 0.5 }}>
                <LinearGradient
                  colors={colors.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButton}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Reset Link</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { ...Typography.h1, fontSize: 32, marginBottom: 12 },
  subtitle: { ...Typography.body, textAlign: 'center', fontSize: 16, lineHeight: 24, paddingHorizontal: 20 },
  cardWrap: { borderRadius: 28, overflow: 'hidden', borderWidth: 1 },
  card: { padding: 24 },
  inputGroup: { marginBottom: 24 },
  inputLabel: { ...Typography.caption, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 },
  input: { height: 58, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  primaryButton: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  primaryButtonText: { ...Typography.h3, color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter-SemiBold' },
});
