import { BorderRadius, Spacing } from '@/constants/theme';
import { useProGate } from '@/hooks/useProFeature';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Camera, Lock, Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const ShareWeeklyCard = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { isPro, openPaywall } = useProGate();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPro) {
      router.push('/weekly-review');
    } else {
      openPaywall();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={[styles.container, !isPro && styles.containerLocked]}
    >
      <LinearGradient
        colors={isPro ? [colors.primary, colors.secondary] : ['#4B5563', '#1F2937']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >

        <View style={styles.content}>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              {isPro ? (
                <Sparkles size={16} color="#FFF" />
              ) : (
                <Lock size={16} color="rgba(255,255,255,0.6)" />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, !isPro && { color: 'rgba(255,255,255,0.6)' }]}>Snap your wins! 📸</Text>
                {!isPro && (
                  <View style={styles.miniProBadge}>
                    <Text style={styles.miniProBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.subtitle, !isPro && { color: 'rgba(255,255,255,0.4)' }]}>
              {isPro
                ? "You dominated this week. Share your evolution with the world."
                : "Unlock Weekly Evolution summaries to share your growth with friends."
              }
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <View style={[styles.iconCircle, !isPro && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              {isPro ? (
                <Camera size={24} color={colors.primary} />
              ) : (
                <Lock size={24} color="rgba(255,255,255,0.5)" />
              )}
            </View>
          </View>
        </View>

        <View style={[styles.footer, !isPro && { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.footerText, !isPro && { color: 'rgba(255,255,255,0.4)' }]}>
            {isPro ? 'GET YOUR HIGH-RES SUMMARY' : 'UPGRADE TO UNLOCK SUMMARY'}
          </Text>
          <ArrowRight size={14} color={isPro ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)"} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginTop: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  containerLocked: {
    shadowOpacity: 0.1,
  },
  gradient: {
    padding: 20,
    position: 'relative',
  },
  miniProBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniProBadgeText: {
    fontFamily: 'Inter-Bold',
    color: '#000',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    fontSize: 20,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  footerText: {
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    letterSpacing: 1.5,
  }
});
