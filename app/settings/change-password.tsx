import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only email/password users have a password to change
  const user = authService.currentUser;
  const hasEmailProvider = user?.providerData.some(p => p.providerId === 'password');

  const isStrong = newPassword.length >= 8;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSave = async () => {
    setError(null);
    if (!currentPassword) { setError('Enter your current password'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (!isMatch) { setError('New passwords do not match'); return; }
    if (newPassword === currentPassword) { setError('New password must be different from current password'); return; }

    setLoading(true);
    const { error: err } = await authService.changePassword(currentPassword, newPassword);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const cardBg = colors.isDark ? '#111827' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1F2937' : '#F1F5F9';
  const inputBg = colors.isDark ? '#1A2035' : '#F8FAFC';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

            {!hasEmailProvider ? (
              <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor }]}>
                <KeyRound size={32} color={colors.primary} />
                <Text style={[styles.infoTitle, { color: colors.text }]}>Google Account</Text>
                <Text style={[styles.infoBody, { color: colors.textSecondary }]}>
                  You signed in with Google. Password changes must be made through your Google account settings.
                </Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CURRENT PASSWORD</Text>
                  <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textSecondary + '80'}
                      secureTextEntry={!showCurrent}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>NEW PASSWORD</Text>
                  <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={colors.textSecondary + '80'}
                      secureTextEntry={!showNew}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {newPassword.length > 0 && (
                    <View style={styles.strengthRow}>
                      <View style={[styles.strengthBar, { backgroundColor: isStrong ? '#10B981' : '#F59E0B', width: isStrong ? '100%' : '50%' }]} />
                      <Text style={[styles.strengthLabel, { color: isStrong ? '#10B981' : '#F59E0B' }]}>
                        {isStrong ? 'Strong' : 'Weak — use 8+ characters'}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 20 }]}>CONFIRM NEW PASSWORD</Text>
                  <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor, borderColor: confirmPassword.length > 0 ? (isMatch ? '#10B981' : '#EF4444') : borderColor }]}>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Repeat new password"
                      placeholderTextColor={colors.textSecondary + '80'}
                      secureTextEntry={!showConfirm}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                      <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {error && (
                  <View style={[styles.errorCard, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
    borderBottomWidth: 1,
  },
  headerTitle: { ...Typography.h3, fontSize: 17, fontWeight: '700' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.md, gap: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.md,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  eyeBtn: { padding: 4 },
  strengthRow: { marginTop: 8, gap: 4 },
  strengthBar: { height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 },
  saveBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  infoTitle: { fontSize: 18, fontWeight: '800' },
  infoBody: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
