import { BlurView } from '@/components/BlurView';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { presenceService } from '@/services/presenceService';
import { useStore } from '@/store/useStore';
import { useProGate } from '@/hooks/useProFeature';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// C-12: Extracted so useSharedValue/useAnimatedStyle are called at the top of
// a component, not inside .map() — hooks-in-loop was a rules-of-hooks violation
// that crashed whenever the presence list length changed.
type AvatarItemProps = {
  user: any;
  isMe: boolean;
  colors: any;
};
function AvatarItem({ user, isMe, colors }: AvatarItemProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 + Math.random() * 1000 }),
        withTiming(0.4, { duration: 1500 + Math.random() * 1000 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.avatarContainer, animatedStyle]}>
      <LinearGradient
        colors={isMe ? [colors.primary, colors.secondary] : [colors.primary + '55', colors.primary + '20']}
        style={styles.avatarGradient}
      >
        <Ionicons name="flame" size={24} color="#FFF" />
      </LinearGradient>
      <Text style={[styles.avatarName, { color: colors.text }]} numberOfLines={1}>
        {isMe ? "You" : user.userName?.split(' ')[0] || "Monk"}
      </Text>
    </Animated.View>
  );
}

export default function FocusRoomScreen() {
  const colors = useThemeColors();
  const userId = useStore(state => state.userId);
  const isFocusing = useStore(state => state.focusSession.isActive);
  const toggleFocusSession = useStore(state => state.actions.toggleFocusSession);
  const router = useRouter();
  const { isPro, openPaywall } = useProGate();

  // Gate 7: Focus Room is Pro-only
  if (!isPro) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <LinearGradient 
          colors={['#1A1A1A', '#0D0D0D']} 
          style={StyleSheet.absoluteFill} 
        />
        
        {/* Abstract background glow */}
        <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.primary, opacity: 0.2, filter: 'blur(80px)' }} />
        <View style={{ position: 'absolute', bottom: -50, left: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: '#00D1FF', opacity: 0.15, filter: 'blur(60px)' }} />

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}>
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{ width: 100, height: 100, borderRadius: 30, backgroundColor: 'rgba(124, 92, 255, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(124, 92, 255, 0.3)' }}>
              <Ionicons name="flame" size={48} color="#7C5CFF" />
            </View>
            <Text style={{ color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 32, textAlign: 'center', marginBottom: 8 }}>Focus Room</Text>
            <View style={{ backgroundColor: 'rgba(0, 209, 255, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 209, 255, 0.2)' }}>
              <Text style={{ color: '#00D1FF', fontFamily: 'Outfit-Bold', fontSize: 12, letterSpacing: 1 }}>PRO FEATURE</Text>
            </View>
          </View>

          <View style={{ gap: 20, marginBottom: 48 }}>
            {[
              { icon: 'people', title: 'Co-Focus Live', desc: 'Study and work in real-time with other LifeOS users worldwide.' },
              { icon: 'shield-checkmark', title: 'Monk Mode Pro', desc: 'Unlock advanced accountability and presence tools.' },
              { icon: 'stats-chart', title: 'Live Progress', desc: 'See real-time focus stats and climb the room leaderboard.' }
            ].map((feature, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={feature.icon as any} size={22} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16, marginBottom: 2 }}>{feature.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 18 }}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            onPress={openPaywall} 
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C5CFF', '#00D1FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 18, padding: 18, alignItems: 'center', shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}
            >
              <Text style={{ color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 18 }}>Upgrade to LifeOS Pro</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit-Medium', fontSize: 14 }}>Not now, maybe later</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = presenceService.subscribeToFocusRoom((users) => {
      // presenceService already strips stale entries (>60s old) before calling back
      setActiveUsers(users);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Monk Mode",
          headerShown: true,
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.header}>
        <View style={styles.statsBadge}>
          <View style={[styles.liveIndicator, { backgroundColor: '#FF3B30' }]} />
          <Text style={[styles.statsText, { color: colors.text }]}>
            {loading
              ? "..."
              : `${activeUsers.length} ${activeUsers.length === 1 ? 'person' : 'people'} focusing`}
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Stay disciplined. Don't break the chain.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeUsers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flame-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No one is focusing yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Start a session to be the first in the room</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.roomContent}>
          <View style={styles.avatarGrid}>
            {activeUsers.map((user) => (
              <AvatarItem
                key={user.id}
                user={user}
                isMe={user.id === userId}
                colors={colors}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <BlurView intensity={80} tint={colors.isDark ? "dark" : "light"} style={styles.footer}>
        {!isFocusing ? (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              toggleFocusSession();
            }}
          >
            <Ionicons name="flame" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.startBtnText}>Start Focusing & Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeFooterContainer}>
            <View style={styles.activeFooter}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
              <Text style={[styles.activeFooterText, { color: colors.success }]}>Contributing</Text>
            </View>
            <TouchableOpacity
              style={[styles.leaveBtn, { borderColor: colors.border }]}
              onPress={() => {
                toggleFocusSession();
                router.back();
              }}
            >
              <Text style={[styles.leaveBtnText, { color: colors.textSecondary }]}>Pause & Leave</Text>
            </TouchableOpacity>
          </View>
        )}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  statsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4 },
  statsText: { fontFamily: 'Outfit-Bold', fontSize: 16 },
  subtitle: { ...Typography.body, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  roomContent: { padding: Spacing.md, paddingBottom: 100 },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  avatarContainer: { alignItems: 'center', gap: 8, width: 80 },
  avatarGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarName: { ...Typography.caption, fontSize: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.xl, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  startBtn: { padding: 16, borderRadius: BorderRadius.full, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  startBtnText: { color: '#FFF', fontFamily: 'Outfit-Bold', fontSize: 16 },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { ...Typography.body, textAlign: 'center', paddingHorizontal: 32 },
  activeFooterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  activeFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeFooterText: { fontFamily: 'Outfit-Bold', fontSize: 14 },
  leaveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  leaveBtnText: { fontFamily: 'Outfit-Bold', fontSize: 14 },
});
