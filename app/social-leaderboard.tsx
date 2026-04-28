import { BlurView } from '@/components/BlurView';
import { Shadows, Spacing } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FriendRequest, PublicProfile, socialService } from '@/services/socialService';
import { useStore } from '@/store/useStore';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Clock, Compass, Crown, Flame, Search, Trophy, Users, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MEDAL: Record<number, { gold: string; bg: string; label: string }> = {
  0: { gold: '#FFD700', bg: '#B8860B22', label: '1ST' },
  1: { gold: '#C0C0C0', bg: '#A9A9A922', label: '2ND' },
  2: { gold: '#CD7F32', bg: '#8B451322', label: '3RD' },
};

const RANK_NAMES = [
  'Spark', 'Seeker', 'Challenger', 'Pathfinder', 'Striker',
  'Warrior', 'Guardian', 'Architect', 'Enforcer', 'Legend',
  'Phantom', 'Titan', 'Sovereign', 'Ascendant', 'Immortal',
  'Eclipse', 'Ethereal', 'Mythic', 'Transcendent', 'Apex',
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

// BUG-020: Memoize PodiumCard to prevent re-animation on every XP update
const PodiumCard = React.memo(({ profile, rank, maxXP, colors, isMe }: { profile: PublicProfile; rank: number; maxXP: number; colors: any; isMe: boolean }) => {
  const medal = MEDAL[rank];
  const pulse = useSharedValue(1);
  const float = useSharedValue(0);

  useEffect(() => {
    if (rank === 0) {
      pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, true);
      float.value = withRepeat(withSequence(withTiming(-6, { duration: 2500 }), withTiming(0, { duration: 2500 })), -1, true);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value },
      { translateY: float.value }
    ]
  }));

  return (
    <Animated.View entering={FadeInUp.delay(rank * 150).springify()}>
      <Animated.View style={[
        animatedStyle,
        styles.podiumCard,
        {
          backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderColor: medal.gold + '40',
          marginTop: rank === 0 ? 0 : rank === 1 ? 24 : 44
        }
      ]}>
        {colors.isDark && <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark" />}
        <LinearGradient
          colors={[medal.gold + '25', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />

        {rank === 0 && (
          <View style={styles.crownWrap}>
            <Crown size={20} color="#FFD700" fill="#FFC107" />
          </View>
        )}

        <View style={[styles.podiumAvatarWrap, { borderColor: medal.gold + '60' }]}>
          <Avatar uri={profile.avatarUrl} name={profile.userName} size={rank === 0 ? 58 : 48} colors={colors} />
        </View>

        <Text style={[styles.podiumRankLabel, { color: medal.gold }]}>{medal.label}</Text>
        <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
          {profile.userName || 'Anonymous'}{isMe ? ' 👋' : ''}
        </Text>
        <Text style={[styles.podiumRankTitle, { color: colors.textSecondary }]}>{rankName(profile.level)}</Text>

        <View style={styles.podiumXPRow}>
          <Text style={[styles.podiumXP, { color: medal.gold }]}>{(profile.weeklyXP || 0).toLocaleString()}</Text>
          <Text style={[styles.podiumXPLabel, { color: colors.textSecondary }]}>XP</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

// ─── User Row (for both Discover and League rest) ─────────────────────────────
const UserRow = React.memo(({
  profile, isMe, pos, maxXP, colors, actionLabel, actionColor, onAction, actionDisabled
}: {
  profile: PublicProfile; isMe?: boolean; pos?: number; maxXP?: number;
  colors: any; actionLabel?: string; actionColor?: string;
  onAction?: () => void; actionDisabled?: boolean;
}) => {
  return (
    <Animated.View entering={FadeInDown.delay((pos || 0) * 40).duration(300)}>
      <View style={[
        styles.rowCard,
        {
          backgroundColor: isMe ? colors.primary + '10' : colors.card,
          borderColor: isMe ? colors.primary + '40' : colors.border,
          borderWidth: isMe ? 1.5 : 1
        }
      ]}>

        <Avatar uri={profile.avatarUrl} name={profile.userName} size={48} colors={colors} />

        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.rowName, { color: colors.text, fontFamily: 'Outfit-Bold' }]} numberOfLines={1}>
              {profile.userName || 'Anonymous'}{isMe ? ' 👋' : ''}
            </Text>
            {(profile.globalStreak || 0) > 0 && (
              <View style={[styles.streakPill, { backgroundColor: '#EF444415' }]}>
                <Flame size={10} color="#EF4444" fill="#EF4444" />
                <Text style={styles.streakPillText}>{profile.globalStreak}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.rowRankTitle, { color: colors.textSecondary, fontFamily: 'Inter-Medium' }]}>
            Lv.{profile.level || 1} · {rankName(profile.level)}
          </Text>
          {maxXP !== undefined && (
            <XPBar weeklyXP={profile.weeklyXP} maxXP={maxXP} color={isMe ? colors.primary : colors.textSecondary} />
          )}
        </View>

        {onAction ? (
          <TouchableOpacity
            onPress={actionDisabled ? undefined : onAction}
            style={[styles.actionBtn, {
              backgroundColor: actionDisabled ? 'transparent' : (actionColor || colors.primary) + '15',
              borderColor: actionDisabled ? colors.border : (actionColor || colors.primary) + '60',
              opacity: actionDisabled ? 0.6 : 1
            }]}
          >
            <Text style={[styles.actionBtnText, { color: actionDisabled ? colors.textSecondary : (actionColor || colors.primary) }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.rowXP, { color: isMe ? colors.primary : colors.text, fontFamily: 'Outfit-Bold' }]}>
              {(profile.weeklyXP || 0).toLocaleString()}
            </Text>
            <Text style={[styles.rowXPLabel, { color: colors.textSecondary }]}>XP</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

// ─── TAB 1: League ───────────────────────────────────────────────────────────
function LeagueTab({ leaderboard, loading, currentUserId, colors, onRefresh, refreshing }: any) {
  const maxXP = useMemo(() => leaderboard[0]?.weeklyXP || 1, [leaderboard]);
  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const rest = useMemo(() => leaderboard.slice(3), [leaderboard]);

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
function DiscoverTab({
  currentUserId, colors, friendIds, sentIds, incomingIds, onNavigateToRequests
}: {
  currentUserId: string; colors: any; friendIds: Set<string>; sentIds: Set<string>;
  incomingIds: Set<string>; onNavigateToRequests: () => void;
}) {
  const [recentUsers, setRecentUsers] = useState<PublicProfile[]>([]);
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  // Initial load of recently active users
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { profiles, lastDoc: doc } = await socialService.getAllUsers(currentUserId);
      setRecentUsers(profiles);
      setLastDoc(doc);
      setHasMore(profiles.length >= 20);
      setLoading(false);
    };
    load();
  }, [currentUserId]);

  const handleLoadMore = async () => {
    if (isMoreLoading || !hasMore || isSearching || query.trim()) return;

    setIsMoreLoading(true);
    const { profiles, lastDoc: doc } = await socialService.getAllUsers(currentUserId, lastDoc);
    
    if (profiles.length > 0) {
      setRecentUsers(prev => [...prev, ...profiles]);
      setLastDoc(doc);
      setHasMore(profiles.length >= 20);
    } else {
      setHasMore(false);
    }
    setIsMoreLoading(false);
  };

  // Debounced Search Logic
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await socialService.searchUsers(query, currentUserId);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, currentUserId]);

  const handleChallenge = async (toUserId: string) => {
    setSending(toUserId);
    const ok = await socialService.sendFriendRequest(currentUserId, toUserId);
    if (ok) {
      Alert.alert('🏁 Challenge Sent!', 'They will see your request in the Requests tab.');
    } else {
      Alert.alert('Notice', 'Request already sent or you are already connected.');
    }
    setSending(null);
  };

  const getButtonState = (userId: string) => {
    if (friendIds.has(userId)) return { label: 'Friends ✓', disabled: true };
    if (sentIds.has(userId)) return { label: 'Pending ⏳', disabled: true };
    if (incomingIds.has(userId)) return { label: 'Review 🏁', disabled: false };
    return { label: 'Challenge', disabled: false };
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ opacity: 0.5 }}>
          <Search size={20} color={colors.textSecondary} strokeWidth={2.5} />
        </View>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Find rivals by username..."
          placeholderTextColor={colors.textSecondary + '80'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isSearching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, marginTop: 16 }]}>Scouring the council...</Text>
        </View>
      ) : (
        <FlatList
          data={query.trim() ? searchResults : recentUsers}
          keyExtractor={i => i.userId}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12, marginLeft: 4 }]}>
              {query.trim() ? `SEARCHING FOR "${query.toUpperCase()}"` : `RECENTLY ACTIVE ON LIFEOS (${recentUsers.length})`}
            </Text>
          }
          ListFooterComponent={
            isMoreLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListEmptyComponent={
            !loading && !isSearching ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 52 }}>{query.trim() ? '🔍' : '👥'}</Text>
                <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Outfit-Bold' }]}>
                  {query.trim() ? 'No Results' : 'Lonely Council'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {query.trim() 
                    ? `We couldn't find any players named "${query}"`
                    : "No recent activity found. Challenge your friends to start the race!"}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const { label, disabled } = getButtonState(item.userId);
            const isSending = sending === item.userId;
            const isIncoming = incomingIds.has(item.userId);

            return (
              <UserRow
                profile={item}
                colors={colors}
                pos={index % 20} // Reset animation delay per page
                actionLabel={isSending ? '...' : label}
                actionColor={isIncoming ? colors.success : (disabled ? undefined : colors.primary)}
                onAction={() => {
                  if (isIncoming) {
                    onNavigateToRequests();
                    return;
                  }
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  handleChallenge(item.userId);
                }}
                actionDisabled={disabled || isSending || isIncoming}
              />
            );
          }}
        />
      )}
    </View>
  );
}

// ─── TAB 3: Requests ─────────────────────────────────────────────────────────
interface RequestsData {
  incoming: { req: FriendRequest, profile: PublicProfile }[];
  outgoing: FriendRequest[];
}

function RequestsTab({
  currentUserId, colors, onFriendAccepted, data, loading
}: {
  currentUserId: string; colors: any; onFriendAccepted: () => void; data: RequestsData; loading: boolean;
}) {
  const handleAccept = async (reqId: string) => {
    await socialService.acceptFriendRequest(reqId);
    onFriendAccepted();
  };

  const handleDecline = async (reqId: string) => {
    await socialService.declineFriendRequest(reqId);
  };

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />;

  const isEmpty = data.incoming.length === 0 && data.outgoing.length === 0;

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
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: 'Outfit-Bold' }]}>No Requests Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Challenge someone from the Discover tab!</Text>
            </View>
          )}

          {data.incoming.length > 0 && (
            <View style={{ marginBottom: Spacing.xl }}>
              <Text style={[styles.label, { color: colors.primary, marginBottom: 12, marginLeft: 4 }]}>INCOMING CHALLENGES ({data.incoming.length})</Text>
              {data.incoming.map(({ req, profile }) => (
                <Animated.View key={req.id} entering={FadeInDown} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.primary + '30' }]}>
                  <Avatar uri={profile.avatarUrl} name={profile.userName} size={48} colors={colors} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.rowName, { color: colors.text, fontFamily: 'Outfit-Bold' }]}>{profile.userName}</Text>
                    <Text style={[styles.rowRankTitle, { color: colors.primary, fontWeight: '700' }]}>WANTS TO RACE! 🏁</Text>
                    <Text style={[styles.rowXPLabel, { color: colors.textSecondary, marginTop: 2 }]}>Lv.{profile.level} · {rankName(profile.level)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.acceptBtn, { backgroundColor: colors.success }]}>
                      <Check size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.acceptBtn, { backgroundColor: colors.border }]}>
                      <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}

          {data.outgoing.length > 0 && (
            <View>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 12, marginLeft: 4 }]}>SENT REQUESTS</Text>
              {data.outgoing.map(req => (
                <Animated.View key={req.id} entering={FadeInDown} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.8 }]}>
                  <View style={[styles.pendingAvatarPlaceholder, { backgroundColor: colors.border }]}>
                    <Clock size={16} color={colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.rowName, { color: colors.text, opacity: 0.7 }]}>Player #{req.toUserId.slice(0, 4)}</Text>
                    <Text style={[styles.rowRankTitle, { color: colors.textSecondary }]}>Waiting for response... ⏳</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDecline(req.id)} style={styles.cancelBtn}>
                    <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
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
  const [requests, setRequests] = useState<RequestsData>({ incoming: [], outgoing: [] });
  const [leagueLoading, setLeagueLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    setLeagueLoading(true);
    setRequestsLoading(true);

    const unsubLeaderboard = socialService.subscribeToLeaderboard(currentUserId, (board) => {
      setLeaderboard(board);
      setLeagueLoading(false);
      setRefreshing(false);
    });

    const unsubRequests = socialService.subscribeToRequests(currentUserId, (payload) => {
      setRequests(payload);
      setRequestsLoading(false);
    });

    return () => {
      unsubLeaderboard();
      unsubRequests();
    };
  }, [currentUserId]);

  // Derive friend/sent/incoming IDs for the Discover tab
  const friendIds = useMemo(() => new Set(leaderboard.map(p => p.userId)), [leaderboard]);
  const sentIds = useMemo(() => new Set(requests.outgoing.map(r => r.toUserId)), [requests.outgoing]);
  const incomingIds = useMemo(() => new Set(requests.incoming.map(i => i.req.fromUserId)), [requests.incoming]);

  const onRefresh = () => { setRefreshing(true); /* Logic handled by snapshot */ };

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
          <TouchableOpacity onPress={() => router.back()} style={[styles.liquidBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: 'Outfit-Bold' }]}>⚔️ Champions Council</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>REAL-TIME LEADERBOARD</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Tab Bar */}
        <View style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {TABS.map(({ key, icon: Icon, label }) => {
              const active = tab === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTab(key);
                  }}
                  style={[styles.tabItem, active && { backgroundColor: colors.primary + '15' }]}
                >
                  <Icon size={16} color={active ? colors.primary : colors.textSecondary} strokeWidth={active ? 2.5 : 2} />
                  <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '900' : '700' }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
            <DiscoverTab
              currentUserId={currentUserId}
              colors={colors}
              friendIds={friendIds}
              sentIds={sentIds}
              incomingIds={incomingIds}
              onNavigateToRequests={() => setTab('requests')}
            />
          )}
          {tab === 'requests' && currentUserId && (
            <RequestsTab
              currentUserId={currentUserId}
              colors={colors}
              data={requests}
              loading={requestsLoading}
              onFriendAccepted={() => setTab('league')}
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
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: 12,
  },
  liquidBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, ...Shadows.sm },
  headerTitle: { fontSize: 22, fontWeight: '900' },
  headerSub: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 2, opacity: 0.6 },

  /* Tab bar */
  tabContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tabBar: {
    flexDirection: 'row', borderRadius: 25, borderWidth: 1.5, overflow: 'hidden', padding: 4, ...Shadows.sm
  },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 20 },
  tabLabel: { fontSize: 12 },

  /* League */
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: Spacing.xl + 10, marginTop: Spacing.lg },
  podiumCard: {
    width: (width - Spacing.lg * 2 - 16) / 3, borderRadius: 24, padding: 12,
    alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, ...Shadows.md
  },
  podiumAvatarWrap: {
    borderWidth: 2, borderRadius: 99, padding: 3, marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  crownWrap: { position: 'absolute', top: -16, alignSelf: 'center', zIndex: 10, ...Shadows.md },
  podiumRankLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 6, fontFamily: 'Outfit-Bold' },
  podiumName: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  podiumRankTitle: { fontSize: 9, fontWeight: '600', marginTop: 1, textAlign: 'center', opacity: 0.7 },
  podiumXPRow: { alignItems: 'center', marginTop: 12 },
  podiumXP: { fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  podiumXPLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: -2 },

  /* Rows */
  rowCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 22,
    borderWidth: 1, padding: 16, marginBottom: 12, ...Shadows.sm
  },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  rowRank: { fontSize: 12, fontWeight: '900' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowRankTitle: { fontSize: 11, marginTop: 2 },
  rowXP: { fontSize: 20, fontWeight: '900' },
  rowXPLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textAlign: 'right' },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  streakPillText: { color: '#EF4444', fontSize: 10, fontWeight: '900' },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1.5, minWidth: 96, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '900' },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
    height: 54, borderRadius: 27, borderWidth: 1.5, gap: 12, marginBottom: Spacing.lg,
    ...Shadows.sm
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '600' },

  /* Requests */
  requestCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, borderWidth: 1.5, padding: 16, marginBottom: 12, ...Shadows.sm },
  acceptBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  pendingAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1.5 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, backgroundColor: 'rgba(239, 68, 68, 0.1)' },

  /* Common */
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.6 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 24, opacity: 0.7 },
});
