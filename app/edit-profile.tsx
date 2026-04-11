import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useRouter } from 'expo-router';
import { LucideIcon, ChevronLeft, Camera, User, FileText, Briefcase, MapPin, Globe, Check } from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { GlassCard } from '@/components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function EditProfileScreen() {
  const { 
    userName, bio, location, occupation, avatarUrl, socialLinks, 
    updateProfile 
  } = useStore();
  const router = useRouter();

  const [form, setForm] = useState({
    userName: userName || '',
    bio: bio || '',
    location: location || '',
    occupation: occupation || '',
    avatarUrl: avatarUrl || null,
    socialLinks: {
      twitter: socialLinks?.twitter || '',
      github: socialLinks?.github || '',
      linkedin: socialLinks?.linkedin || '',
      website: socialLinks?.website || '',
    }
  });

  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setForm({ ...form, avatarUrl: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    if (!form.userName.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(form as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const updateSocial = (key: keyof typeof form.socialLinks, value: string) => {
    setForm({
      ...form,
      socialLinks: {
        ...form.socialLinks,
        [key]: value
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={Colors.dark.text} size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderButton}>
            {saving ? (
              <Text style={[styles.saveText, { opacity: 0.5 }]}>...</Text>
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
              <LinearGradient
                colors={Colors.dark.gradient as any}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {form.avatarUrl ? (
                    <Image source={{ uri: form.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <User size={40} color={Colors.dark.primary} />
                  )}
                </View>
                <View style={styles.cameraIcon}>
                  <Camera size={14} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change avatar</Text>
          </View>

          <Section title="Basic Info">
            <InputItem 
              icon={User} 
              label="Name" 
              value={form.userName} 
              onChangeText={(t) => setForm({...form, userName: t})}
              placeholder="Your displayed name"
            />
            <InputItem 
              icon={Briefcase} 
              label="Occupation" 
              value={form.occupation} 
              onChangeText={(t) => setForm({...form, occupation: t})}
              placeholder="e.g. Product Designer"
            />
            <InputItem 
              icon={MapPin} 
              label="Location" 
              value={form.location} 
              onChangeText={(t) => setForm({...form, location: t})}
              placeholder="e.g. San Francisco, CA"
            />
            <InputItem 
              icon={FileText} 
              label="Bio" 
              value={form.bio} 
              onChangeText={(t) => setForm({...form, bio: t})}
              placeholder="Write a short bio..."
              multiline
            />
          </Section>

          <Section title="Social & Web">
             <InputItem 
              icon={(props: any) => <FontAwesome6 name="x-twitter" {...props} />} 
              label="Twitter / X" 
              value={form.socialLinks.twitter} 
              onChangeText={(t) => updateSocial('twitter', t)}
              placeholder="@username"
            />
            <InputItem 
              icon={(props: any) => <FontAwesome6 name="github" {...props} />} 
              label="GitHub" 
              value={form.socialLinks.github} 
              onChangeText={(t) => updateSocial('github', t)}
              placeholder="username"
            />
            <InputItem 
              icon={(props: any) => <FontAwesome6 name="linkedin" {...props} />} 
              label="LinkedIn" 
              value={form.socialLinks.linkedin} 
              onChangeText={(t) => updateSocial('linkedin', t)}
              placeholder="profile-url"
            />
             <InputItem 
              icon={Globe} 
              label="Website" 
              value={form.socialLinks.website} 
              onChangeText={(t) => updateSocial('website', t)}
              placeholder="https://yourwebsite.com"
            />
          </Section>

          <TouchableOpacity 
            style={[styles.saveButton, saving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={Colors.dark.gradient as any}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <GlassCard style={styles.sectionCard}>
        {children}
      </GlassCard>
    </View>
  );
}

function InputItem({ 
  icon: Icon, 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  multiline = false 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  onChangeText: (t: string) => void; 
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputItem}>
      <View style={styles.inputHeader}>
        <Icon size={16} color={Colors.dark.textSecondary} />
        <Text style={styles.inputLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.textInput, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.tabIconDefault}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
  },
  saveHeaderButton: {
    paddingHorizontal: Spacing.md,
  },
  saveText: {
    ...Typography.bodyLarge,
    color: Colors.dark.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  avatarGradient: {
    flex: 1,
    borderRadius: BorderRadius.full,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    flex: 1,
    width: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.dark.primary,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  avatarHint: {
    ...Typography.caption,
    marginTop: Spacing.sm,
    color: Colors.dark.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.labelSmall,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    padding: 0,
  },
  inputItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
    color: Colors.dark.textSecondary,
  },
  textInput: {
    ...Typography.body,
    color: Colors.dark.text,
    paddingVertical: Spacing.xs,
  },
  textArea: {
    textAlignVertical: 'top',
    height: 80,
    marginTop: 4,
  },
  saveButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 56,
  },
  saveGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    ...Typography.bodyLarge,
    color: 'white',
    fontWeight: '700',
  },
});
