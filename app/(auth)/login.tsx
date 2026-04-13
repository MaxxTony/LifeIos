import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { useStore } from '@/store/useStore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const { height } = Dimensions.get('window');

// ─── Login Hero Visual ───────────────────────────────────────────────────────
function LoginHero() {
  const colors = useThemeColors();
  const glow = useSharedValue(0.6);
  const iconS = useSharedValue(0);
  const rir1 = useSharedValue(1); const rio1 = useSharedValue(0);
  const rir2 = useSharedValue(1); const rio2 = useSharedValue(0);
  const CYCLE = 3000;

  useEffect(() => {
    iconS.value = withSpring(1, { damping: 10, stiffness: 80 });
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, true
    );

    const ripS = (max: number) => withSequence(withTiming(1, { duration: 0 }), withTiming(max, { duration: CYCLE, easing: Easing.out(Easing.quad) }));
    const ripO = withSequence(withTiming(0.4, { duration: 0 }), withTiming(0, { duration: CYCLE, easing: Easing.in(Easing.ease) }));
    rir1.value = withRepeat(ripS(2.2), -1, false); rio1.value = withRepeat(ripO, -1, false);
    rir2.value = withDelay(CYCLE / 2, withRepeat(ripS(2.2), -1, false)); rio2.value = withDelay(CYCLE / 2, withRepeat(ripO, -1, false));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconS.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: rir1.value }], opacity: rio1.value }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: rir2.value }], opacity: rio2.value }));

  return (
    <View style={heroStyles.container}>
      <Animated.View style={[heroStyles.ring, { borderColor: colors.primary + '88' }, r2Style]} />
      <Animated.View style={[heroStyles.ring, { borderColor: colors.primary + '88' }, r1Style]} />
      <Animated.View style={[heroStyles.glow, { backgroundColor: colors.primary, shadowColor: colors.primary }, glowStyle]} />
      <Animated.View style={[heroStyles.iconWrap, iconStyle]}>
        <Image source={require('../../assets/images/splash-icon.png')} style={heroStyles.icon} />
      </Animated.View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 160, width: '100%', marginBottom: 10 },
  iconWrap: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', zIndex: 2 },
  icon: { width: 90, height: 90 },
  glow: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 10,
  },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5 },
});

// Configure Google Sign-In once at module scope (not inside the component)
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
  offlineAccess: true,
});

type LoadingType = 'email' | 'google' | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [loading, setLoading] = useState<LoadingType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const router = useRouter();
  const colors = useThemeColors();
  const { setAuth, onboardingData } = useStore();

  const handleForgotPassword = async () => {
    if (!EMAIL_REGEX.test(email)) {
      Toast.show({ type: 'error', text1: 'Enter Email First', text2: 'Please enter your email address above.' });
      return;
    }
    const { error } = await authService.resetPassword(email);
    if (error) {
      Toast.show({ type: 'error', text1: 'Reset Failed', text2: error });
    } else {
      Toast.show({ type: 'success', text1: 'Email Sent', text2: 'Check your inbox for a password reset link.' });
    }
  };

  const onGoogleButtonPress = async () => {
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (idToken) {
        await handleGoogleLogin(idToken);
      } else {
        throw new Error('No ID Token received');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setLoading(null);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Toast.show({ type: 'error', text1: 'Play Services', text2: 'Play services not available' });
      } else {
        Toast.show({ type: 'error', text1: 'Login Error', text2: error.message });
      }
    }
  };

  const handleGoogleLogin = async (idToken: string) => {
    const { user, error } = await authService.loginWithGoogle(idToken);
    if (user) {
      // Check if profile already exists
      const { data: existingProfile } = await dbService.getUserProfile(user.uid);

      if (!existingProfile) {
        // Only save onboarding data for brand new users
        await dbService.saveUserProfile(user.uid, {
          email: user.email,
          userName: user.displayName || 'User',
          ...onboardingData,
          hasCompletedOnboarding: true, // Mark as complete in Cloud
          createdAt: Date.now()
        });
      }

      // Ensure local store also knows onboarding is done
      useStore.getState().completeOnboarding();

      // setAuth triggers subscribeToCloud() which handles real-time data sync.
      // No need for a separate hydrateFromCloud() call — that would race with the listener.
      setAuth(user.uid, user.displayName || existingProfile?.userName || 'User');

      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: `Logged in as ${user.displayName || 'User'}`,
      });

      router.replace('/(tabs)');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error || 'Failed to login with Google',
      });
    }
    setLoading(null);
  };



  const handleEmailAuth = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Missing Details', text2: 'Please enter both email and password.' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    if (isSignUp && password.length < 8) {
      Toast.show({ type: 'error', text1: 'Weak Password', text2: 'Password must be at least 8 characters.' });
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Password Mismatch', text2: 'Passwords do not match.' });
      return;
    }

    setLoading('email');
    const { user, error } = isSignUp
      ? await authService.signUp(email, password)
      : await authService.login(email, password);

    if (user) {
      const { data: existingProfile } = await dbService.getUserProfile(user.uid);

      if (isSignUp || !existingProfile) {
        await dbService.saveUserProfile(user.uid, {
          email: user.email,
          userName: email.split('@')[0],
          ...onboardingData,
          hasCompletedOnboarding: true, // Mark as complete in Cloud
          createdAt: Date.now()
        });
      }

      // Ensure local store also knows onboarding is done
      useStore.getState().completeOnboarding();

      // setAuth triggers subscribeToCloud() — no separate hydrateFromCloud() needed
      setAuth(user.uid, user.email?.split('@')[0] || existingProfile?.userName || 'User');

      Toast.show({
        type: 'success',
        text1: isSignUp ? 'Account Created' : 'Welcome back!',
        text2: isSignUp ? 'Your journey starts now.' : 'Successfully signed in.',
      });

      router.replace('/(tabs)');
    } else {
      Toast.show({
        type: 'error',
        text1: isSignUp ? 'Registration Error' : 'Login Error',
        text2: error || 'Authentication failed',
      });
    }
    setLoading(null);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/login-bg.png')}
      style={[styles.container, { backgroundColor: colors.background }]}
      resizeMode="cover"
    >
      <LinearGradient
        colors={[colors.isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', colors.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Area */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <LoginHero />
            <Text style={[styles.logo, { color: colors.text }]}>LifeOS</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Level up your daily reality ✨</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.cardWrap, { borderColor: colors.border }]}>
            <BlurView intensity={35} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border, color: colors.text }]}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border, color: colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textSecondary + '60'}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                {isSignUp && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: confirmPassword && confirmPassword !== password ? colors.danger : colors.border, color: colors.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textSecondary + '60'}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleEmailAuth}
                  disabled={loading !== null}
                >
                  <LinearGradient
                    colors={colors.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryButton}
                  >
                    {loading === 'email' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {!isSignUp && (
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                    <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => { setIsSignUp(!isSignUp); setConfirmPassword(''); }}
                  style={styles.toggleBtn}
                >
                  <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                    {isSignUp ? 'Already joined? ' : 'New to LifeOS? '}
                    <Text style={[styles.toggleTextBold, { color: colors.primary }]}>
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          {/* Footer Social Area */}
          <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.footer}>
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary + '80' }]}>OR CONTINUE WITH</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.googleButton, { backgroundColor: colors.isDark ? '#FFFFFF' : '#F3F4F6' }]}
                onPress={onGoogleButtonPress}
                disabled={loading !== null}
              >
                {loading === 'google' ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Text style={styles.socialIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Google</Text>
                  </>
                )}
              </TouchableOpacity>


            </View>

            <Text style={[styles.terms, { color: colors.textSecondary + '60' }]}>
              By signing in, you agree to our Terms & Privacy Policy.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    ...Typography.h1,
    fontSize: 42,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: -1,
  },
  tagline: {
    ...Typography.body,
    marginTop: 4,
    fontSize: 15,
  },
  cardWrap: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  card: {
    padding: 24,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...Typography.caption,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  input: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    ...Typography.h3,
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    ...Typography.body,
    fontSize: 14,
  },
  toggleTextBold: {
    fontFamily: 'Inter-SemiBold',
  },
  forgotBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotText: {
    ...Typography.caption,
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    opacity: 0.5,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.caption,
    marginHorizontal: 16,
    fontSize: 11,
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
  },
  googleButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  googleButtonText: {
    ...Typography.h3,
    color: '#000',
    fontSize: 15,
  },
  terms: {
    ...Typography.caption,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  }
});


