import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Target, Zap, Brain, Sparkles, Flame, Share2 } from 'lucide-react-native';
import { Spacing, Typography } from '@/constants/theme';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface ShareCardProps {
  stats: {
    completedTasks: number;
    totalTasks: number;
    completedHabits: number;
    focusHours: string;
    avgMood: string;
    taskRate: number;
    habitRate: number;
  };
  userName?: string | null;
}

export const ShareCard = ({ stats, userName }: ShareCardProps) => {
  const colors = useThemeColors();
  const displayName = userName || 'User';
  const viewShotRef = React.useRef<any>(null);

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
      });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your progress!',
        UTI: 'public.png',
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <LinearGradient
            colors={[colors.primary + '20', 'transparent', colors.secondary + '10']}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Branded Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                <Flame size={18} color="#FFF" fill="#FFF" />
              </View>
              <Text style={[styles.logoText, { color: colors.text }]}>LifeOS</Text>
            </View>
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>WEEKLY REPORT</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>Leveling Up! 🚀</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {displayName}'s progress for the past 7 days
            </Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Target size={20} color={colors.secondary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedTasks}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks Done</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Zap size={20} color={colors.danger} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedHabits}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Habits Kept</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Brain size={20} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.focusHours}h</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Deep Work</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Sparkles size={20} color={colors.warning} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.avgMood}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Mood</Text>
              </View>
            </View>

            {/* Consistency Bar */}
            <View style={styles.consistencySection}>
              <View style={styles.consistencyHeader}>
                 <Text style={[styles.consistencyLabel, { color: colors.text }]}>Weekly Consistency</Text>
                 <Text style={[styles.consistencyValue, { color: colors.primary }]}>{stats.habitRate}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                 <LinearGradient 
                  colors={[colors.primary, colors.secondary]} 
                  start={{x:0, y:0}} 
                  end={{x:1, y:0}} 
                  style={[styles.progressBar, { width: `${stats.habitRate}%` }]} 
                 />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Generated by LifeOS</Text>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity 
        style={[styles.shareButton, { backgroundColor: colors.primary }]}
        onPress={handleShare}
      >
        <Share2 size={20} color="#FFF" />
        <Text style={styles.shareText}>Share Progress</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: (CARD_WIDTH - 48 - 12) / 2,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  consistencySection: {
    marginTop: 12,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  consistencyLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  consistencyValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.4,
  },
  outerContainer: {
    alignItems: 'center',
    gap: 20,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: CARD_WIDTH,
    height: 56,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  shareText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
});
