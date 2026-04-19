import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Dimensions, RefreshControl
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { socialService, PublicProfile, FriendRequest } from '@/services/socialService';
import { useStore } from '@/store/useStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, UserPlus, Check, Crown, Flame, ChevronLeft, Clock, Users, Trophy, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MEDAL: Record<number, { gold: string; bg: string; label: string }> = {
  0: { gold: '#FFD700', bg: '#B8860B22', label: '1ST' },
  1: { gold: '#C0C0C0', bg: '#A9A9A922', label: '2ND' },
  2: { gold: '#CD7F32', bg: '#8B451322', label: '3RD' },
};

const RANK_NAMES = [
  'Spark','Seeker','Challenger','Pathfinder','Striker',
  'Warrior','Guardian','Architect','Enforcer','Legend',
  'Phantom','Titan','Sovereign','Ascendant','Immortal',
  'Eclipse','Ethereal','Mythic','Transcendent','Apex',
];
const rankName = (level: number) => RANK_NAMES[Math.min((level || 1) - 1, RANK_NAMES.length - 1)];

// ─── Reusable Avatar ──────────────────────────────────────────────────────────
function Avatar({ uri, name, size, colors }: { uri?: string | null; name: string; size: number; colors: any }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
      {uri
        ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        : <Text style={{ color: colors.primary, fontWeight: '900', fontSize: size * 0.42 }}>{(name || '?')[0].toUpperCase()}</Text>}
    </View>
  );
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────
function XPBar({ weeklyXP, maxXP, color }: { weeklyXP: number; maxXP: number; color: string }) {
  const pct = maxXP > 0 ? Math.max(0.04, weeklyXP / maxXP) : 0.04;
  const anim = useSharedValue(0);
  useEffect(() => { anim.value = withDelay(300, withSpring(pct, { damping: 14 })); }, [pct]);
  const style = useAnimatedStyle(() => ({ width: `${anim.value * 100}%` as any }));
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: color + '20', marginTop: 6, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: color }, style]} />
    </View>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────
function PodiumCard({ profile, rank, maxXP, colors, isMe }: { profile: PublicProfile; rank: number; maxXP: number; colors: any; isMe: boolean }) {
  const medal = MEDAL[rank];
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (rank === 0) pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(rank * 120).springify()}>
      <Animated.View style={[pulseStyle, styles.podiumCard, { backgroundColor: colors.card, borderColor: medal.gold + '50', marginTop: rank === 0 ? 0 : rank === 1 ? 20 : 36 }]}>
        {rank === 0 && <View style={styles.crownWrap}><Crown size={18} color="#FFD700" fill="#FFD700" /></View>}
        <LinearGradient colors={[medal.gold + '18', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <Avatar uri={profile.avatarUrl} name={profile.userName} size={50} colors={colors} />
        <Text style={[styles.podiumRankLabel, { color: medal.gold }]}>{medal.label}</Text>
        <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{profile.userName || 'Anonymous'}{isMe ? ' 👤' : ''}</Text>
        <Text style={[styles.podiumRankTitle, { color: colors.textSecondary }]}>{rankName(profile.level)}</Text>
        {profile.globalStreak > 0 && (
          <View style={[styles.podiumStreakBadge, { backgroundColor: '#EF444415' }]}>
            <Flame size={10} color="#EF4444" fill="#EF4444" />
            <Text style={styles.podiumStreakText}>{profile.globalStreak}</Text>
          </View>
        )}
        <Text style={[styles.podiumXP, { color: medal.gold }]}>{(profile.weeklyXP || 0).toLocaleString()}</Text>
        <Text style={[styles.podiumXPLabel, { color: colors.textSecondary }]}>XP THIS WEEK</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── User Row (for both Discover and League rest) ─────────────────────────────
function UserRow({
  profile, isMe, pos, maxXP, colors, actionLabel, actionColor, onAction, actionDisabled
}: {
  profile: PublicProfile; isMe?: boolean; pos?: number; maxXP?: number;
  colors: any; actionLabel?: string; actionColor?: string;
  onAction?: () => void; actionDisabled?: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay((pos || 0) * 60).duration(350)}>
      <View style={[styles.rowCard, { backgroundColor: isMe ? colors.primary + '12' : colors.card, borderColor: isMe ? colors.primary + '50' : colors.border }]}>
        {pos !== undefined && (
          <Text style={[styles.rowRank, { color: colors.textSecondary }]}>{pos}</Text>
        )}
        <Avatar uri={profile.avatarUrl} name={profile.userName} size={44} colors={colors} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
              {profile.userName || 'Anonymous'}{isMe ? ' 👤' : ''}
            </Text>
            {(profile.globalStreak || 0) > 0 && (
              <View style={[styles.streakPill, { backgroundColor: '#EF444415' }]}>
                <Flame size={10} color="#EF4444" fill="#EF4444" />
                <Text style={styles.streakPillText}>{profile.globalStreak}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.rowRankTitle, { color: colors.textSecondary }]}>Lv.{profile.level || 1} · {rankName(profile.level)}</Text>
          {maxXP !== undefined && (
            <XPBar weeklyXP={profile.weeklyXP} maxXP={maxXP} color={isMe ? colors.primary : colors.textSecondary} />
          )}
        </View>
        {onAction ? (
          <TouchableOpacity
            onPress={actionDisabled ? undefined : onAction}
            style={[styles.actionBtn, {
              backgroundColor: actionDisabled ? colors.border : (actionColor || colors.primary) + '15',
              borderColor: actionDisabled ? colors.border : (actionColor || colors.primary) + '60',
            }]}
          >
            <Text style={[styles.actionBtnText, { color: actionDisabled ? colors.textSecondary : (actionColor || colors.primary) }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.rowXP, { color: isMe ? colors.primary : colors.text }]}>{(profile.weeklyXP || 0).toLocaleString()}</Text>
            <Text style={[styles.rowXPLabel, { color: colors.textSecondary }]}>XP</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── TAB 1: League ───────────────────────────────────────────────────────────
function LeagueTab({ leaderboard, loading, currentUserId, colors, onRefresh, refreshing }: any) {
  const maxXP = leaderboard[0]?.weeklyXP || 1;
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  if (leaderboard.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ fontSize: 52 }}>⚔️</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Rivals Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Go to the <Text style={{ color: colors.primary, fontWeight: '800' }}>Discover</Text> tab to find and challenge other LifeOS users!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rest}
      keyExtractor={i => i.userId}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center', marginBottom: 4 }]}>THIS WEEK'S TOP CHAMPIONS</Text>
          {/* Podium: 2nd | 1st | 3rd */}
          <View style={styles.podiumRow}>
            {top3[1] && <PodiumCard profile={top3[1]} rank={1} maxXP={maxXP} colors={colors} isMe={top3[1].userId === currentUserId} />}
            {top3[0] && <PodiumCard profile={top3[0]} rank={0} maxXP={maxXP} colors={colors} isMe={top3[0].userId === currentUserId} />}
            {top3[2] && <PodiumCard profile={top3[2]} rank={2} maxXP={maxXP} colors={colors} isMe={top3[2].userId === currentUserId} />}
          </View>
          {rest.length > 0 && <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg, marginBottom: 8 }]}>THE REST OF THE PACK</Text>}
        </View>
      }
      renderItem={({ item, index }) => (
        <UserRow profile={item} isMe={item.userId === currentUserId} pos={index + 4} maxXP={maxXP} colors={colors} />
      )}
    />
  );
}

// ─── TAB 2: Discover ──────────────────────────────────────────────────────────
function DiscoverTab({ currentUserId, colors }: { currentUserId: string; colors: any }) {
  const [allUsers, setAllUsers] = useState<PublicProfile[]>([]);
  const [filtered, setFiltered] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [users, sent, leaderboard] = await Promise.all([
        socialService.getAllUsers(currentUserId),
        socialService.getSentRequests(currentUserId),
        socialService.getLeaderboard(currentUserId),
      ]);
      setAllUsers(users);
      setFiltered(users);
      setSentIds(new Set(sent.map(r => r.toUserId)));
      setFriendIds(new Set(leaderboard.filter(p => p.userId !== currentUserId).map(p => p.userId)));
      setLoading(false);
    };
    load();
  }, [currentUserId]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (!text.trim()) { setFiltered(allUsers); return; }
    setFiltered(allUsers.filter(u => u.userName?.toLowerCase().includes(text.toLowerCase())));
  };

  const handleChallenge = async (toUserId: string) => {
    setSending(toUserId);
    const ok = await socialService.sendFriendRequest(currentUserId, toUserId);
    if (ok) {
      setSentIds(prev => new Set(prev).add(toUserId));
      Alert.alert('🏁 Challenge Sent!', 'They will see your request in the Requests tab.');
    } else {
      Alert.alert('Notice', 'Request already sent or you are already connected.');
    }
    setSending(null);
  };

  const getButtonState = (userId: string) => {
    if (friendIds.has(userId)) return { label: 'Friends ✓', disabled: true };
    if (sentIds.has(userId)) return { label: 'Pending ⏳', disabled: true };
    return { label: 'Challenge', disabled: false };
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by username..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, marginTop: 12 }]}>Finding players...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 42 }}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Players Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try a different username</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.userId}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>
              {filtered.length} PLAYERS ON LIFEOS
            </Text>
          }
          renderItem={({ item, index }) => {
            const { label, disabled } = getButtonState(item.userId);
            return (
              <UserRow
                profile={item}
                colors={colors}
                pos={index}
                actionLabel={sending === item.userId ? '...' : label}
                actionColor={disabled ? undefined : colors.primary}
                onAction={() => handleChallenge(item.userId)}
                actionDisabled={disabled || sending === item.userId}
              />
            );
          }}
        />
      )}
    </View>
  );
}

// ─── TAB 3: Requests ─────────────────────────────────────────────────────────
function RequestsTab({ currentUserId, colors, onFriendAccepted }: { currentUserId: string; colors: any; onFriendAccepted: () => void }) {
  const [incoming, setIncoming] = useState<{ req: FriendRequest; profile: PublicProfile }[]>([]);
  const [outgoing, setOutgoing] = useState<{ req: FriendRequest; profile: PublicProfile }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [incData, sentData] = await Promise.all([
      socialService.getFriendRequests(currentUserId),
      socialService.getSentRequests(currentUserId),
    ]);

    const incomingItems = incData.requests.map(req => ({
      req,
      profile: incData.profiles.find(p => p.userId === req.fromUserId)!,
    })).filter(x => x.profile);

    const outgoingItems: { req: FriendRequest; profile: PublicProfile }[] = [];
    for (const req of sentData) {
      // Show basic placeholder — name will update once they create their public profile
      outgoingItems.push({
        req,
        profile: { userId: req.toUserId, userName: req.toUserId.slice(0, 8) + '...', avatarUrl: null, level: 1, weeklyXP: 0, globalStreak: 0, lastActive: 0 }
      });
    }

    setIncoming(incomingItems);
    setOutgoing(outgoingItems.filter(o => o.req.status === 'pending'));
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentUserId]);

  const handleAccept = async (reqId: string) => {
    await socialService.acceptFriendRequest(reqId);
    onFriendAccepted();
    load();
  };

  const handleDecline = async (reqId: string) => {
    await socialService.declineFriendRequest(reqId);
    load();
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  const isEmpty = incoming.length === 0 && outgoing.length === 0;

  return (
    <FlatList
      data={[]}
      renderItem={null}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      ListEmptyComponent={
        <View>
          {isEmpty && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 42 }}>📬</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Requests Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Challenge someone from Discover tab!</Text>
            </View>
          )}

          {incoming.length > 0 && (
            <View style={{ marginBottom: Spacing.xl }}>
              <Text style={[styles.label, { color: colors.primary, marginBottom: 8 }]}>INCOMING — {incoming.length}</Text>
              {incoming.map(({ req, profile }) => (
                <Animated.View key={req.id} entering={FadeInDown} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.primary + '30' }]}>
                  <Avatar uri={profile.avatarUrl} name={profile.userName} size={44} colors={colors} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{profile.userName}</Text>
                    <Text style={[styles.rowRankTitle, { color: colors.textSecondary }]}>wants to race 🏁</Text>
                    <Text style={[styles.rowRankTitle, { color: colors.textSecondary }]}>Lv.{profile.level} · {rankName(profile.level)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.acceptBtn, { backgroundColor: '#10B981' }]}>
                      <Check size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.acceptBtn, { backgroundColor: colors.border }]}>
                      <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}

          {outgoing.length > 0 && (
            <View>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>SENT — WAITING FOR REPLY</Text>
              {outgoing.map(({ req, profile }) => (
                <Animated.View key={req.id} entering={FadeInDown} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Avatar uri={profile.avatarUrl} name={profile.userName} size={44} colors={colors} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{profile.userName}</Text>
                    <Text style={[styles.rowRankTitle, { color: colors.textSecondary }]}>Challenge pending ⏳</Text>
                  </View>
                  <View style={[styles.pendingBadge, { backgroundColor: colors.border }]}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={[styles.pendingText, { color: colors.textSecondary }]}>Pending</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      }
    />
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Tab = 'league' | 'discover' | 'requests';

export default function SocialLeaderboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const currentUserId = useStore(s => s.userId);

  const [tab, setTab] = useState<Tab>('league');
  const [leaderboard, setLeaderboard] = useState<PublicProfile[]>([]);
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeague = useCallback(async () => {
    if (!currentUserId) return;
    const board = await socialService.getLeaderboard(currentUserId);
    setLeaderboard(board);
    setLeagueLoading(false);
    setRefreshing(false);
  }, [currentUserId]);

  useEffect(() => { loadLeague(); }, [loadLeague]);

  const onRefresh = () => { setRefreshing(true); loadLeague(); };

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: 'league', icon: Trophy, label: 'League' },
    { key: 'discover', icon: Compass, label: 'Discover' },
    { key: 'requests', icon: Users, label: 'Requests' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>⚔️ Social</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Weekly XP Resets Monday</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TABS.map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <TouchableOpacity key={key} onPress={() => setTab(key)} style={[styles.tabItem, active && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}>
                <Icon size={16} color={active ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
          {tab === 'league' && (
            <LeagueTab
              leaderboard={leaderboard}
              loading={leagueLoading}
              currentUserId={currentUserId}
              colors={colors}
              onRefresh={onRefresh}
              refreshing={refreshing}
            />
          )}
          {tab === 'discover' && currentUserId && (
            <DiscoverTab currentUserId={currentUserId} colors={colors} />
          )}
          {tab === 'requests' && currentUserId && (
            <RequestsTab
              currentUserId={currentUserId}
              colors={colors}
              onFriendAccepted={() => { loadLeague(); setTab('league'); }}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, paddingTop: 4,
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.lg, borderRadius: 0,
  },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabLabel: { fontSize: 12, fontWeight: '800' },

  /* League */
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl, marginTop: Spacing.md },
  podiumCard: {
    width: (width - Spacing.lg * 2 - 16) / 3, borderRadius: 20, padding: 12,
    alignItems: 'center', overflow: 'hidden', borderWidth: 1.5,
  },
  crownWrap: { position: 'absolute', top: -14, alignSelf: 'center', zIndex: 10 },
  podiumRankLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 8 },
  podiumName: { fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  podiumRankTitle: { fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  podiumStreakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  podiumStreakText: { color: '#EF4444', fontSize: 9, fontWeight: '800' },
  podiumXP: { fontSize: 17, fontWeight: '900', marginTop: 8 },
  podiumXPLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 1 },

  /* Rows */
  rowCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10 },
  rowRank: { width: 26, fontSize: 13, fontWeight: '900', textAlign: 'center', marginRight: 4 },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowRankTitle: { fontSize: 11, marginTop: 1 },
  rowXP: { fontSize: 18, fontWeight: '900' },
  rowXPLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  streakPillText: { color: '#EF4444', fontSize: 9, fontWeight: '800' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, minWidth: 88, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '800' },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    height: 50, borderRadius: 25, borderWidth: 1, gap: 10, marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },

  /* Requests */
  requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10 },
  acceptBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pendingText: { fontSize: 11, fontWeight: '700' },

  /* Common */
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
