import { Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { analyticsService } from '@/services/analyticsService';
import { useStore } from '@/store/useStore';
import { AntDesign } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { deleteUser } from 'firebase/auth';

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
        <Image source={require('../../assets/images/splash-icon.png')} style={heroStyles.icon} resizeMode="contain" />
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

// ─── Password Strength Component ─────────────────────────────────────────────
function PasswordStrengthUI({ pass }: { pass: string }) {
  const colors = useThemeColors();
  const rules = [
    { label: '8+ Characters', met: pass.length >= 8 },
    { label: 'One Number', met: /\d/.test(pass) },
    { label: 'Special Char', met: /[^A-Za-z0-9]/.test(pass) },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.strengthContainer}>
      {rules.map((rule, i) => (
        <View key={i} style={styles.strengthRule}>
          {rule.met ? (
            <CheckCircle2 size={12} color={colors.primary} />
          ) : (
            <AlertCircle size={12} color={colors.textSecondary + '80'} />
          )}
          <Text style={[styles.strengthText, { color: rule.met ? colors.text : colors.textSecondary + '80' }]}>
            {rule.label}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

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
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [setupUser, setSetupUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasPlayServices, setHasPlayServices] = useState(true);
  const [setupSessionToken, setSetupSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const checkPlay = async () => {
      if (Platform.OS === 'android') {
        const hasPlay = await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
        setHasPlayServices(hasPlay);
      }
    };
    checkPlay();
  }, []);

  const router = useRouter();
  const colors = useThemeColors();
  const { actions: { setAuth, completeOnboarding }, onboardingData } = useStore();

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const onGoogleButtonPress = async () => {
    if (!hasPlayServices) {
      Toast.show({ 
        type: 'error', 
        text1: 'Google Play Services', 
        text2: 'Play services not available on this device.' 
      });
      return;
    }
    setLoading('google');
    try {
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
    try {
      const { user, sessionToken, error } = await authService.loginWithGoogle(idToken);
      if (user) {
        const { data: existingProfile } = await dbService.getUserProfile(user.uid);

        if (!existingProfile) {
          // C-AUTH-5 FIX: Retry profile creation 3x before calling setAuth.
          // If it fails after 3 tries, we rollback by deleting the Firebase Auth user.
          let profileCreated = false;
          const profileData = {
            email: user.email,
            userName: user.displayName || 'User',
            ...onboardingData,
            hasCompletedOnboarding: true,
            createdAt: Date.now()
          };

          for (let i = 0; i < 3; i++) {
            try {
              await dbService.saveUserProfile(user.uid, profileData);
              profileCreated = true;
              break;
            } catch (e: any) {
              console.warn(`[LifeOS] Profile creation attempt ${i + 1} failed:`, e.message);
              if (i === 2) {
                await deleteUser(user); // Rollback Firebase Auth
                throw new Error('Account setup failed (Network Error). Please try again.');
              }
              // Exponential backoff: 1s, 2s, 3s
              await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
          }

          if (!profileCreated) return;

          // Switch to setup mode to let them confirm/change their name
          setSetupUser(user);
          setFullName(user.displayName || '');
          setSetupSessionToken(sessionToken || null);
          setSetupMode(true);
          setLoading(null);
          return;
        } else if (existingProfile.userName === existingProfile.email?.split('@')[0] || existingProfile.userName === 'User') {
          // If profile exists but name is generic, we still might want to show setup
          // but for now let's just update and continue to avoid re-prompting old users too much.
          if (user.displayName) {
            await dbService.saveUserProfile(user.uid, { userName: user.displayName });
          }
        }

        analyticsService.logMilestone(user.uid, 'login_success', { method: 'google' });
        completeOnboarding();
        setAuth(user.uid, user.displayName || existingProfile?.userName || 'User', sessionToken);

        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: `Logged in as ${user.displayName || 'User'}`,
        });

        router.replace('/(tabs)');
      } else if (error?.includes('Network') || error?.includes('network')) {
        analyticsService.logEvent(null, 'login_failure', { method: 'google', reason: 'network' });
        Toast.show({
          type: 'info',
          text1: 'Poor Connection',
          text2: 'Signing in… please wait a moment.',
          visibilityTime: 5000,
        });
      } else {
        analyticsService.logEvent(null, 'login_failure', { method: 'google', error: error || 'unknown' });
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: error || 'Failed to login with Google',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Unexpected Error',
        text2: err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(null);
    }
  };



  const handleEmailAuth = async () => {
    if (!email || !password || (isSignUp && !fullName)) {
      Toast.show({ type: 'error', text1: 'Missing Details', text2: 'Please fill in all fields.' });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    if (isSignUp) {
      if (password.length < 8) {
        Toast.show({ type: 'error', text1: 'Weak Password', text2: 'Password must be at least 8 characters.' });
        return;
      }
      if (!/\d/.test(password)) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must contain at least one number.' });
        return;
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must contain a special character.' });
        return;
      }
    }
    if (isSignUp && password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Password Mismatch', text2: 'Passwords do not match.' });
      return;
    }

    setLoading('email');
    try {
      const { user, sessionToken, error, errorCode } = isSignUp
        ? await authService.signUp(email, password)
        : await authService.login(email, password);

      if (user) {
        const { data: existingProfile } = await dbService.getUserProfile(user.uid);

        if (isSignUp || !existingProfile) {
          // C-AUTH-5 FIX: Retry profile creation 3x for new email signups
          let profileCreated = false;
          const profileData = {
            email: user.email,
            userName: fullName || email.split('@')[0],
            ...onboardingData,
            hasCompletedOnboarding: true,
            createdAt: Date.now()
          };

          for (let i = 0; i < 3; i++) {
            try {
              await dbService.saveUserProfile(user.uid, profileData);
              profileCreated = true;
              break;
            } catch (e: any) {
              console.warn(`[LifeOS] Email signup profile creation attempt ${i + 1} failed:`, e.message);
              if (i === 2) {
                await deleteUser(user); // Rollback
                throw new Error('Account setup failed. Please try again.');
              }
              await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
          }

          if (!profileCreated) return;
        }

        analyticsService.logMilestone(user.uid, isSignUp ? 'signup_success' : 'login_success', { method: 'email' });
        completeOnboarding();
        setAuth(user.uid, fullName || user.email?.split('@')[0] || existingProfile?.userName || 'User', sessionToken);

        Toast.show({
          type: 'success',
          text1: isSignUp ? 'Account Created' : 'Welcome back!',
          text2: isSignUp ? 'Your journey starts now.' : 'Successfully signed in.',
        });

        router.replace('/(tabs)');
      } else if (errorCode === 'auth/network-request-failed') {
        // Network was unstable — Firebase may still complete the auth in the background.
        // onAuthStateChanged in _layout.tsx will navigate automatically if it succeeds.
        // Show a soft info toast instead of a hard error so the user isn't confused when
        // they then get logged in a moment later.
        Toast.show({
          type: 'info',
          text1: 'Poor Connection',
          text2: 'Signing in… please wait a moment.',
          visibilityTime: 5000,
        });
      } else {
        analyticsService.logEvent(null, isSignUp ? 'signup_failure' : 'login_failure', { method: 'email', reason: error || 'unknown' });
        Toast.show({
          type: 'error',
          text1: isSignUp ? 'Registration Error' : 'Login Error',
          text2: error || 'Authentication failed',
        });
      }
    } catch (err: any) {
      analyticsService.logEvent(null, isSignUp ? 'signup_failure' : 'login_failure', { method: 'email', error: err?.message || 'unexpected' });
      Toast.show({
        type: 'error',
        text1: 'Unexpected Error',
        text2: err?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleFinishSetup = async () => {
    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Name Required', text2: 'Please enter a name to continue.' });
      return;
    }

    setLoading('google');
    try {
      if (setupUser) {
        await dbService.saveUserProfile(setupUser.uid, { userName: fullName.trim() });
        completeOnboarding();
        setAuth(setupUser.uid, fullName.trim(), setupSessionToken);

        Toast.show({
          type: 'success',
          text1: 'Perfect!',
          text2: `Welcome aboard, ${fullName.trim()}!`,
        });

        router.replace('/(tabs)');
      }
    } catch (err: any) {
      if (err.message?.includes('Network') || err.message?.includes('network')) {
        Toast.show({
          type: 'info',
          text1: 'Poor Connection',
          text2: 'Finalizing setup… please wait.',
          visibilityTime: 5000,
        });
      } else {
        Toast.show({ type: 'error', text1: 'Setup Error', text2: err.message });
      }
    } finally {
      setLoading(null);
    }
  };

  if (setupMode) {
    return (
      <ImageBackground
        source={require('../../assets/images/login-bg.png')}
        style={[styles.container, { backgroundColor: colors.background }]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[colors.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)', colors.isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.setupContainer}>
          <Animated.View entering={FadeInDown.springify()} style={styles.setupCard}>
            <View style={styles.setupHeader}>
              <Text style={styles.setupEmoji}>👋</Text>
              <Text style={[styles.setupTitle, { color: colors.text }]}>Almost there!</Text>
              <Text style={[styles.setupSub, { color: colors.textSecondary }]}>What should we call you? Your coach will use this to personalize your journey.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Preferred Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderColor: colors.border, color: colors.text }]}
                placeholder="John Doe"
                placeholderTextColor={colors.textSecondary + '60'}
                value={fullName}
                onChangeText={setFullName}
                autoFocus
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleFinishSetup}
              disabled={loading !== null}
            >
              <LinearGradient
                colors={colors.gradient}
                style={styles.primaryButton}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Finish Setup →</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    );
  }

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
            <BlurView intensity={90} tint={colors.isDark ? "dark" : "light"} style={[styles.card, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.form}>
                {isSignUp && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderColor: colors.border, color: colors.text }]}
                      placeholder="John Doe"
                      placeholderTextColor={colors.textSecondary + '60'}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

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

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderColor: colors.border, color: colors.text }]}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textSecondary + '60'}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      {!showPassword ? (
                        <EyeOff size={20} color={colors.textSecondary} />
                      ) : (
                        <Eye size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {isSignUp && password.length > 0 && <PasswordStrengthUI pass={password} />}
                </View>

                {isSignUp && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
                    <View style={styles.passwordInputWrap}>
                      <TextInput
                        style={[styles.input, styles.passwordInput, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderColor: confirmPassword && confirmPassword !== password ? colors.danger : colors.border, color: colors.text }]}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary + '60'}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeBtn}
                        activeOpacity={0.7}
                      >
                        {!showConfirmPassword ? (
                          <EyeOff size={20} color={colors.textSecondary} />
                        ) : (
                          <Eye size={20} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
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
                    <AntDesign name="google" size={20} color="#DB4437" />
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
  passwordInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  strengthRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
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
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  setupCard: {
    borderRadius: 32,
    padding: 32,
    backgroundColor: 'transparent',
  },
  setupHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  setupEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  setupTitle: {
    ...Typography.h1,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSub: {
    ...Typography.body,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  }
});


