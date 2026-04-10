import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { useStore } from '@/store/useStore';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const router = useRouter();
  const { setAuth, onboardingData } = useStore();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '191144362794-llbrvs0nlnsvfvumadefl58teuufpv8c.apps.googleusercontent.com',
    iosClientId: '191144362794-8k90o6dbsd0vghai83k7fj12opanvfms.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    const { user, error } = await authService.loginWithGoogle(idToken);
    if (user) {
      // Sync onboarding data on first login
      await dbService.saveUserProfile(user.uid, {
        email: user.email,
        userName: user.displayName || 'User',
        ...onboardingData,
        createdAt: Date.now()
      });
      setAuth(user.uid, user.displayName || 'User');
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', error || 'Failed to login with Google.');
    }
    setLoading(false);
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    const { user, error } = await authService.loginAsGuest();
    if (user) {
      setAuth(user.uid, 'Guest');
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', error || 'Failed to login as guest.');
    }
    setLoading(false);
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { user, error } = isSignUp 
      ? await authService.signUp(email, password)
      : await authService.login(email, password);

    if (user) {
      if (isSignUp) {
        await dbService.saveUserProfile(user.uid, {
          email: user.email,
          userName: email.split('@')[0],
          ...onboardingData,
          createdAt: Date.now()
        });
      }
      setAuth(user.uid, user.email?.split('@')[0] || 'User');
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error', error || 'Authentication failed.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>LifeOS</Text>
        <Text style={styles.tagline}>Fix your life, one day at a time</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.dark.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.dark.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? Sign In' : 'New here? Create Account'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={() => promptAsync()}
          disabled={!request || loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin} disabled={loading}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    padding: Spacing.xl,
    justifyContent: 'space-around',
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.05,
  },
  logo: {
    ...Typography.h1,
    fontSize: 48,
    color: Colors.dark.text,
  },
  tagline: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: Colors.dark.card,
    height: 56,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: Colors.dark.gradient[0], // Using start of gradient as solid
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  toggleText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerText: {
    ...Typography.caption,
    marginHorizontal: Spacing.md,
    color: Colors.dark.textSecondary,
  },
  footer: {
    marginBottom: Spacing.md,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  googleButtonText: {
    ...Typography.h3,
    color: '#000000',
  },
  guestButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  guestButtonText: {
    ...Typography.h3,
    color: Colors.dark.textSecondary,
  },
  terms: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  }
});


