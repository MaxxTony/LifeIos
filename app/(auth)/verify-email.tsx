import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { useStore } from '@/store/useStore';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const email = authService.currentUser?.email;

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      // Force reload the user profile from Firebase to get latest emailVerified status
      await authService.currentUser?.reload();
      if (authService.currentUser?.emailVerified) {
        Alert.alert('Success', 'Email verified! Welcome to LifeOS.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Not Verified', 'Please click the link in the email we sent you.');
      }
    } catch (error) {
      console.error('Verification check failed:', error);
      Alert.alert('Error', 'Failed to check verification status.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await authService.sendEmailVerification();
      Alert.alert('Sent', 'A new verification link has been sent to your email.');
      setCooldown(60); // 1 minute cooldown
    } catch (error) {
      console.error('Resend failed:', error);
      Alert.alert('Error', 'Could not send verification email. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <LinearGradient colors={['#0B0B0F', '#1A1A1F']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="email-check-outline" size={80} color="#7C5CFF" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.description}>
          We've sent a verification link to:{"\n"}
          <Text style={styles.emailText}>{email || 'your email'}</Text>
        </Text>

        <View style={styles.instructions}>
          <Text style={styles.instructionItem}>1. Open your email app</Text>
          <Text style={styles.instructionItem}>2. Click the verification link</Text>
          <Text style={styles.instructionItem}>3. Come back here and click "Check Status"</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.primaryButton, loading && styles.disabledButton]} 
            onPress={handleCheckStatus}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Check Status</Text>}
          </Pressable>

          <Pressable 
            style={[styles.secondaryButton, (cooldown > 0 || loading) && styles.disabledButton]} 
            onPress={handleResend}
            disabled={loading || cooldown > 0}
          >
            <Text style={styles.secondaryButtonText}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#A0A0A5',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  emailText: {
    color: '#FFF',
    fontWeight: '700',
  },
  instructions: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
  },
  instructionItem: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#7C5CFF',
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 30,
    padding: 10,
  },
  logoutText: {
    color: '#FF4B4B',
    fontSize: 14,
    fontWeight: '700',
  },
});
