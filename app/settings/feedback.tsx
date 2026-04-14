import { Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AlertCircle, Bug, MessageSquare, Send, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const CATEGORIES: CategoryItem[] = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: '#FF4B4B' },
  { id: 'feature', label: 'Feature Request', icon: Sparkles, color: '#7C5CFF' },
  { id: 'general', label: 'General', icon: MessageSquare, color: '#00D1FF' },
];

interface CategoryItem {
  id: string;
  label: string;
  icon: any;
  color: string;
}

interface CategoryTileProps {
  item: CategoryItem;
  isActive: boolean;
  onPress: () => void;
}

function CategoryTile({ item, isActive, onPress }: CategoryTileProps) {
  const colors = useThemeColors();
  const Icon = item.icon;
  const scale = useSharedValue(isActive ? 1.05 : 1);
  const glowOpacity = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.05 : 1, { damping: 15 });
    glowOpacity.value = withTiming(isActive ? 1 : 0, { duration: 300 });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: withTiming(isActive ? colors.primary : colors.border, { duration: 300 }),
    backgroundColor: withTiming(isActive ? colors.primary + '10' : colors.card, { duration: 300 }),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.categoryWrapper}
    >
      <Animated.View style={[styles.categoryTile, animatedStyle]}>
        <Animated.View style={[styles.activeGlow, { backgroundColor: colors.primary + '20' }, glowStyle]} />
        <View style={[styles.iconContainer, { backgroundColor: isActive ? colors.primary + '20' : colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <Icon size={22} color={isActive ? colors.primary : colors.textSecondary} />
        </View>
        <Text style={[styles.categoryLabel, { color: isActive ? colors.text : colors.textSecondary }]}>
          {item.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FeedbackSettings() {
  const router = useRouter();
  const [category, setCategory] = useState('general');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const colors = useThemeColors();
  const maxLength = 500;

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      Toast.show({
        type: 'success',
        text1: 'Feedback Received',
        text2: 'Thank you for helping us build the future of LifeOS.',
        position: 'bottom',
      });
      router.back();
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >


        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <Sparkles size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
          </View>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <CategoryTile
                key={cat.id}
                item={cat}
                isActive={category === cat.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategory(cat.id);
                }}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
          <View style={styles.sectionHeadingRow}>
            <MessageSquare size={14} color={colors.textSecondary} />
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>YOUR MESSAGE</Text>
          </View>
          <View style={[styles.inputPremiumCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="What can we do better?"
              placeholderTextColor={colors.textSecondary + '50'}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={feedback}
              onChangeText={(text) => text.length <= maxLength && setFeedback(text)}
              selectionColor={colors.primary}
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, { color: feedback.length >= maxLength ? colors.danger : colors.textSecondary }]}>
                {feedback.length}/{maxLength}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.footerAction}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.submitButton, (!feedback.trim() || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!feedback.trim() || submitting}
          >
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>Send Message</Text>
                  <Send size={18} color="#FFF" style={{ marginLeft: 10 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.supportHint}>
            <AlertCircle size={14} color={colors.textSecondary} opacity={0.6} />
            <Text style={[styles.supportHintText, { color: colors.textSecondary }]}>
              Need urgent help? Visit our Help Center
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    ...Typography.h2,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
    opacity: 0.7,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 4,
    gap: 8,
  },
  sectionHeading: {
    ...Typography.labelSmall,
    letterSpacing: 1.5,
    fontWeight: '800',
    fontSize: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryWrapper: {
    flex: 1,
  },
  categoryTile: {
    height: 110,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  activeGlow: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderRadius: 100,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  inputPremiumCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    minHeight: 200,
  },
  textInput: {
    ...Typography.body,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 0,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    opacity: 0.6,
  },
  footerAction: {
    marginTop: 10,
  },
  submitButton: {
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  supportHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  supportHintText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
});
