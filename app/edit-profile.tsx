import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, Camera, User, FileText, Briefcase, MapPin, 
  Globe, Trash2, Image as ImageIcon, X, Phone, Calendar, 
  Sparkles, Hash, MessageSquare, Plus
} from 'lucide-react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { GlassCard } from '@/components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { storageService } from '@/services/storageService';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

export default function EditProfileScreen() {
  const { 
    userId, userName, bio, location, occupation, avatarUrl, 
    phoneNumber, birthday, pronouns, skills, socialLinks, 
    updateProfile 
  } = useStore();
  const router = useRouter();
  const colors = useThemeColors();

  const [form, setForm] = useState({
    userName: userName || '',
    bio: bio || '',
    location: location || '',
    occupation: occupation || '',
    avatarUrl: avatarUrl || null,
    phoneNumber: phoneNumber || '',
    birthday: birthday || '',
    pronouns: pronouns || '',
    skills: skills || '',
    socialLinks: {
      twitter: socialLinks?.twitter || '',
      github: socialLinks?.github || '',
      linkedin: socialLinks?.linkedin || '',
      website: socialLinks?.website || '',
      instagram: socialLinks?.instagram || '',
      threads: socialLinks?.threads || '',
      discord: socialLinks?.discord || '',
    }
  });

  const [saving, setSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // M-7 FIX: Accept any phone format (international-friendly).
  // Strip non-digit/non-plus characters so the stored value is clean,
  // but don't force a US (xxx) xxx-xxxx pattern.
  const handlePhoneChange = (text: string) => {
    // Allow digits, spaces, dashes, parentheses, plus (for country codes)
    const cleaned = text.replace(/[^\d\s\-()+]/g, '');
    setForm({ ...form, phoneNumber: cleaned });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      // P-5 FIX: Use local date components to avoid UTC midnight off-by-one.
      // new Date("YYYY-MM-DD").toISOString() shifts the date in negative-offset timezones.
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      setForm({ ...form, birthday: `${y}-${m}-${d}` });
    }
  };

  const profileCompleteness = useMemo(() => {
    const fields = [
      form.userName, form.bio, form.avatarUrl, form.location,
      form.occupation, form.phoneNumber, form.birthday, form.pronouns
    ];
    const filled = fields.filter(f => !!f).length;
    const socialValues = Object.values(form.socialLinks).filter(f => !!f);
    const totalSocials = Object.keys(form.socialLinks).length; // 7

    // M-8 FIX: social score is proportional (each link adds ~2.86%), not binary
    const baseScore = (filled / fields.length) * 80;
    const socialScore = (socialValues.length / totalSocials) * 20;
    return Math.round(baseScore + socialScore);
  }, [form]);

  const handlePickImage = async (useCamera: boolean) => {
    setShowImagePicker(false);
    
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', `We need access to your ${useCamera ? 'camera' : 'gallery'} to update your profile picture.`);
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled) {
        setUploadingImage(true);
        const localUri = result.assets[0].uri;
        
        // Upload to Firebase Storage
        if (!userId) {
          Alert.alert('Error', 'User ID not found. Please log in again.');
          return;
        }
        const downloadUrl = await storageService.uploadProfileImage(localUri, userId, form.avatarUrl);
        
        // Update local state and auto-save (or just state)
        setForm({ ...form, avatarUrl: downloadUrl });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Upload Failed', 'Something went wrong while uploading your image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    setShowImagePicker(false);
    
    if (form.avatarUrl) {
      setUploadingImage(true);
      try {
        await storageService.deleteImage(form.avatarUrl);
        setForm({ ...form, avatarUrl: null });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Image removal error:', error);
        Alert.alert('Error', 'Something went wrong while removing your image.');
      } finally {
        setUploadingImage(false);
      }
    } else {
      setForm({ ...form, avatarUrl: null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveHeaderButton}>
            {saving ? (
              <Text style={[styles.saveText, { color: colors.primary, opacity: 0.5 }]}>...</Text>
            ) : (
              <Text style={[styles.saveText, { color: colors.primary }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Completeness Bar */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.completenessContainer}>
            <View style={styles.completenessHeader}>
              <Text style={[styles.completenessText, { color: colors.textSecondary }]}>Profile Completeness</Text>
              <Text style={[styles.completenessPercentage, { color: colors.primary }]}>{profileCompleteness}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.primary + '10' }]}>
              <Animated.View 
                style={[
                  styles.progressBarFill, 
                  { backgroundColor: colors.primary, width: `${profileCompleteness}%` }
                ]} 
              />
            </View>
          </Animated.View>

          {/* Avatar Section */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={() => setShowImagePicker(true)} 
              style={styles.avatarWrapper}
              disabled={uploadingImage}
            >
               <LinearGradient
                colors={[colors.primary, colors.primary + '30']}
                style={styles.avatarBorderGradient}
              >
                <View style={[styles.avatarBorder, { backgroundColor: colors.background }]}>
                  {form.avatarUrl ? (
                    <Image source={{ uri: form.avatarUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.initialsContainer, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.initials, { color: colors.primary }]}>
                        {form.userName?.[0]?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  
                  {uploadingImage && (
                    <View style={styles.uploadingOverlay}>
                      <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                      <Text style={styles.uploadingText}>...</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              
              <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
                <Camera size={14} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarLabel, { color: colors.textSecondary }]}>Change Profile Picture</Text>
          </Animated.View>

          {/* Info Sections */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Section title="PERSONAL ACCOUNT" icon={User}>
              <InputItem 
                label="User Name" 
                value={form.userName} 
                onChangeText={(t) => setForm({...form, userName: t})}
                placeholder="e.g. John Doe"
                icon={User}
              />
              <InputItem 
                label="Your Bio" 
                value={form.bio} 
                onChangeText={(t) => setForm({...form, bio: t})}
                placeholder="Tell us about yourself..."
                multiline
                icon={FileText}
              />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)}>
            <Section title="IDENTITY & INFO" icon={Sparkles}>
              <InputItem 
                label="Pronouns" 
                value={form.pronouns} 
                onChangeText={(t) => setForm({...form, pronouns: t})}
                placeholder="e.g. he/him, they/them"
                icon={Sparkles}
              />
               <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <InputItem 
                  label="Birthday" 
                  value={form.birthday} 
                  onChangeText={() => {}}
                  placeholder="YYYY-MM-DD"
                  editable={false}
                  icon={Calendar}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              <InputItem 
                label="Phone Number" 
                value={form.phoneNumber} 
                onChangeText={handlePhoneChange}
                placeholder="(555) 000-0000"
                keyboardType="phone-pad"
                icon={Phone}
              />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)}>
            <Section title="PROFILE DETAILS" icon={Briefcase}>
              <InputItem 
                label="Occupation" 
                value={form.occupation} 
                onChangeText={(t) => setForm({...form, occupation: t})}
                placeholder="Product Designer"
                icon={Briefcase}
              />
              <InputItem 
                label="Skills / Expertise" 
                value={form.skills} 
                onChangeText={(t) => setForm({...form, skills: t})}
                placeholder="Product design, React, AI..."
                icon={Plus}
              />
              <InputItem 
                label="Location" 
                value={form.location} 
                onChangeText={(t) => setForm({...form, location: t})}
                placeholder="San Francisco, CA"
                icon={MapPin}
              />
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600)}>
            <Section title="SOCIAL LINKS" icon={Globe}>
               <InputItem 
                label="Twitter / X" 
                value={form.socialLinks.twitter} 
                onChangeText={(t) => updateSocial('twitter', t)}
                placeholder="@username"
                icon={TwitterIcon}
              />
               <InputItem 
                label="Instagram" 
                value={form.socialLinks.instagram} 
                onChangeText={(t) => updateSocial('instagram', t)}
                placeholder="@username"
                icon={InstagramIcon}
              />
              <InputItem 
                label="GitHub" 
                value={form.socialLinks.github} 
                onChangeText={(t) => updateSocial('github', t)}
                placeholder="username"
                icon={GithubIcon}
              />
              <InputItem 
                label="LinkedIn" 
                value={form.socialLinks.linkedin} 
                onChangeText={(t) => updateSocial('linkedin', t)}
                placeholder="profile-username"
                icon={LinkedinIcon}
              />
              <InputItem 
                label="Discord" 
                value={form.socialLinks.discord} 
                onChangeText={(t) => updateSocial('discord', t)}
                placeholder="username#0000"
                icon={MessageSquare}
              />
              <InputItem 
                label="Website" 
                value={form.socialLinks.website} 
                onChangeText={(t) => updateSocial('website', t)}
                placeholder="https://..."
                icon={Globe}
              />
            </Section>
          </Animated.View>

          {/* Date Picker Modal/Dialog */}
          {Platform.OS === 'ios' ? (
            <Modal
              visible={showDatePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
                <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Birthday</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerWrapper}>
                    <DateTimePicker
                      value={(() => {
                        if (form.birthday) {
                          // P-5 FIX: parse YYYY-MM-DD as local time, not UTC
                          const parts = form.birthday.split('-').map(Number);
                          if (parts.length === 3) {
                            const d = new Date(parts[0], parts[1] - 1, parts[2]);
                            if (!isNaN(d.getTime())) return d;
                          }
                        }
                        return new Date();
                      })()}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      textColor={colors.text}
                    />
                  </View>
                </View>
              </Pressable>
            </Modal>
          ) : (
            showDatePicker && (
              <DateTimePicker
                value={(() => {
                  if (form.birthday) {
                    const d = new Date(form.birthday);
                    return isNaN(d.getTime()) ? new Date() : d;
                  }
                  return new Date();
                })()}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Image Picker Modal */}
        <Modal
          visible={showImagePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImagePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowImagePicker(false)}>
             <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
             <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Change Avatar</Text>
                  <TouchableOpacity onPress={() => setShowImagePicker(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalOptions}>
                  <OptionItem 
                    icon={Camera} 
                    label="Take Photo" 
                    color={colors.text}
                    onPress={() => handlePickImage(true)} 
                  />
                  <OptionItem 
                    icon={ImageIcon} 
                    label="Choose from Gallery" 
                    color={colors.text}
                    onPress={() => handlePickImage(false)} 
                  />
                  {form.avatarUrl && (
                    <OptionItem 
                      icon={Trash2} 
                      label="Remove Photo" 
                      color="#FF4B4B"
                      onPress={handleRemoveImage} 
                    />
                  )}
                </View>

                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.background }]} 
                  onPress={() => setShowImagePicker(false)}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
             </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: colors.primary + '10' }]}>
          <Icon size={14} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <GlassCard style={styles.sectionCard}>
        {children}
      </GlassCard>
    </View>
  );
}

function InputItem({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  multiline = false,
  icon: Icon,
  keyboardType = 'default',
  editable = true,
  pointerEvents
}: { 
  label: string; 
  value: string; 
  onChangeText: (t: string) => void; 
  placeholder: string;
  multiline?: boolean;
  icon?: any;
  keyboardType?: any;
  editable?: boolean;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}) {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View 
      style={[
        styles.inputItem, 
        { borderBottomColor: colors.border },
        isFocused && { backgroundColor: colors.primary + '05' }
      ]}
      pointerEvents={pointerEvents}
    >
      <View style={styles.inputLabelRow}>
        {Icon && <Icon size={12} color={isFocused ? colors.primary : colors.textSecondary} style={{ marginRight: 6 }} />}
        <Text style={[styles.inputLabel, { color: isFocused ? colors.primary : colors.textSecondary }]}>{label}</Text>
      </View>
      <TextInput
        style={[styles.textInput, { color: colors.text }, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary + '60'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

// Icon helpers for socials
const TwitterIcon = (props: any) => <FontAwesome6 name="x-twitter" {...props} />;
const InstagramIcon = (props: any) => <FontAwesome6 name="instagram" {...props} />;
const GithubIcon = (props: any) => <FontAwesome6 name="github" {...props} />;
const LinkedinIcon = (props: any) => <FontAwesome6 name="linkedin" {...props} />;

function OptionItem({ icon: Icon, label, color, onPress }: any) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={[styles.optionItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <Icon size={20} color={color} />
      <Text style={[styles.optionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    ...Typography.h3,
    fontSize: 18,
  },
  saveHeaderButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  saveText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
  },
  completenessContainer: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 4,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  completenessText: {
    ...Typography.labelSmall,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  completenessPercentage: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    width: 124,
    height: 124,
    position: 'relative',
  },
  avatarBorderGradient: {
    width: 124,
    height: 124,
    borderRadius: 62,
    padding: 2,
  },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 40,
    fontFamily: 'Outfit-Bold',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadingText: {
    color: '#FFF',
    fontWeight: '800',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarLabel: {
    ...Typography.caption,
    marginTop: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 9,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 8,
    gap: 8,
  },
  sectionIconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.labelSmall,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 28,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputItem: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 0.5,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  textInput: {
    ...Typography.bodyLarge,
    fontSize: 16,
    paddingVertical: 4,
    fontFamily: 'Inter-Medium',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  modalTitle: {
    ...Typography.h3,
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
  },
  modalOptions: {
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  optionLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    height: 60,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    letterSpacing: 1,
  },
  datePickerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    minHeight: 200,
  },
  doneText: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    fontSize: 16,
  },
});
