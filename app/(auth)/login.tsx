import { Typography } from '@/constants/theme';
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

const { width, height } = Dimensions.get('window');

// ─── Login Hero Visual ───────────────────────────────────────────────────────
function LoginHero() {
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
      <Animated.View style={[heroStyles.ring, r2Style]} />
      <Animated.View style={[heroStyles.ring, r1Style]} />
      <Animated.View style={[heroStyles.glow, glowStyle]} />
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
    backgroundColor: '#7C5CFF', shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 40, elevation: 20, zIndex: 1,
  },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: '#7C5CFF88' },
});

type LoadingType = 'email' | 'google' | 'guest' | null;

export default function LoginScreen() {
  const [loading, setLoading] = useState<LoadingType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const router = useRouter();
  const { setAuth, onboardingData } = useStore();


  GoogleSignin.configure({
    webClientId: '191144362794-llbrvs0nlnsvfvumadefl58teuufpv8c.apps.googleusercontent.com',
    iosClientId: '191144362794-8k90o6dbsd0vghai83k7fj12opanvfms.apps.googleusercontent.com',
    offlineAccess: true,
  });


  const onGoogleButtonPress = async () => {
    setLoading('google');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        throw new Error('No ID Token received');
      }
    } catch (error: any) {
      console.log(error, "google login error ")
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
    setLoading('google');
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

      setAuth(user.uid, user.displayName || existingProfile?.userName || 'User');

      // Immediately restore cloud data to the store
      await useStore.getState().hydrateFromCloud();

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

  const handleGuestLogin = async () => {
    setLoading('guest');
    const { user, error } = await authService.loginAsGuest();
    if (user) {
      const { data: existingProfile } = await dbService.getUserProfile(user.uid);

      if (!existingProfile) {
        await dbService.saveUserProfile(user.uid, {
          userName: 'Guest',
          createdAt: Date.now(),
          isGuest: true,
          hasCompletedOnboarding: true // Guest login after current onboarding logic counts as complete
        });
      }

      useStore.getState().completeOnboarding();

      setAuth(user.uid, existingProfile?.userName || 'Guest');

      Toast.show({
        type: 'success',
        text1: 'Guest Session Started',
        text2: 'Progress will be synced to this device.',
      });

      // If it's a new guest, send them to onboarding
      if (!existingProfile && !useStore.getState().hasCompletedOnboarding) {
        router.replace('/(onboarding)');
      } else {
        await useStore.getState().hydrateFromCloud();
        router.replace('/(tabs)');
      }
    } else {
      Toast.show({
        type: 'error',
        text1: 'Guest Login Failed',
        text2: error || 'Failed to login as guest',
      });
    }
    setLoading(null);
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Details',
        text2: 'Please enter both email and password.',
      });
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

      setAuth(user.uid, user.email?.split('@')[0] || existingProfile?.userName || 'User');

      // Immediately restore cloud data to the store
      await useStore.getState().hydrateFromCloud();

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
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
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
            <Text style={styles.logo}>LifeOS</Text>
            <Text style={styles.tagline}>Level up your daily reality ✨</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.cardWrap}>
            <BlurView intensity={35} tint="dark" style={styles.card}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleEmailAuth}
                  disabled={loading !== null}
                >
                  <LinearGradient
                    colors={['#7C5CFF', '#5B8CFF']}
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

                <TouchableOpacity
                  onPress={() => setIsSignUp(!isSignUp)}
                  style={styles.toggleBtn}
                >
                  <Text style={styles.toggleText}>
                    {isSignUp ? 'Already joined? ' : 'New to LifeOS? '}
                    <Text style={styles.toggleTextBold}>
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
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.googleButton}
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

              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestLogin}
                disabled={loading !== null}
              >
                {loading === 'guest' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.guestButtonText}>Guest</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>
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
    backgroundColor: '#000',
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
    color: '#FFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: -1,
  },
  tagline: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    fontSize: 15,
  },
  cardWrap: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  card: {
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  toggleTextBold: {
    color: '#A78BFF',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    ...Typography.caption,
    marginHorizontal: 16,
    color: 'rgba(255,255,255,0.4)',
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
    flex: 2,
    backgroundColor: '#FFFFFF',
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
  guestButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  guestButtonText: {
    ...Typography.h3,
    color: '#FFF',
    fontSize: 15,
  },
  terms: {
    ...Typography.caption,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    lineHeight: 18,
  }
});


