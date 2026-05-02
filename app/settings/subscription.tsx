import { useThemeColors } from '@/hooks/useThemeColors';
import { purchaseService } from '@/services/purchaseService';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Bot,
  Brain,
  CheckCircle2,
  ChevronLeft,
  Crown,
  History,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubDetails {
  periodType: 'trial' | 'intro' | 'normal';
  willRenew: boolean;
  expirationDate: string | null;
  productIdentifier: string;
  store: string;
  latestPurchaseDate: string | null;
  managementURL: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const planLabel = (productId: string): string => {
  const id = productId.toLowerCase();
  if (id.includes('annual') || id.includes('yearly') || id.includes('year')) return 'Annual';
  if (id.includes('month')) return 'Monthly';
  if (id.includes('week')) return 'Weekly';
  if (id.includes('lifetime')) return 'Lifetime';
  return 'Pro';
};

const daysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// ─── Feature comparison data ──────────────────────────────────────────────────

const FEATURES = [
  { icon: Bot,     label: 'AI Coach Messages',   free: '20 / day',   pro: 'Unlimited' },
  { icon: Brain,   label: 'AI Chat History',      free: false,        pro: true },
  { icon: History, label: 'Weekly Review',         free: false,        pro: true },
  { icon: Zap,     label: 'Lucky XP Boost',        free: false,        pro: true },
  { icon: Trophy,  label: 'Trophy Cabinet',        free: 'Basic',      pro: 'Full access' },
  { icon: Target,  label: 'Daily Quests',          free: '3 quests',   pro: '3 quests' },
  { icon: Sparkles,label: 'Streak Freeze',         free: 'Buy w/ XP',  pro: 'Buy w/ XP' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureRow({ icon: Icon, label, free, pro, colors }: {
  icon: any; label: string; free: string | boolean; pro: string | boolean; colors: any;
}) {
  const renderCell = (val: string | boolean, isProCol: boolean) => {
    if (typeof val === 'boolean') {
      return val
        ? <CheckCircle2 size={18} color={isProCol ? '#10B981' : colors.textSecondary} />
        : <XCircle size={18} color={colors.textSecondary + '50'} />;
    }
    return (
      <Text style={[styles.featureCellText, {
        color: isProCol ? (colors.isDark ? '#F8FAFC' : '#0F172A') : colors.textSecondary,
        fontFamily: isProCol ? 'Inter-SemiBold' : 'Inter-Regular',
      }]}>
        {val}
      </Text>
    );
  };

  return (
    <View style={[styles.featureRow, { borderBottomColor: colors.isDark ? '#1F2937' : '#F1F5F9' }]}>
      <View style={styles.featureLabel}>
        <Icon size={15} color={colors.textSecondary} />
        <Text style={[styles.featureLabelText, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.featureFreeCell}>{renderCell(free, false)}</View>
      <View style={styles.featureProCell}>{renderCell(pro, true)}</View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const isPro = useStore(s => s.isPro);
  const expiryDate = useStore(s => s.subscriptionExpiryDate);
  const checkEntitlements = useStore(s => s.actions.checkEntitlements);

  const [details, setDetails] = useState<SubDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!isPro) { setLoadingDetails(false); return; }
    loadDetails();
  }, [isPro]);

  const loadDetails = async () => {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      const info = await Purchases.getCustomerInfo();
      const entitlement = info.entitlements.active['pro'];
      if (entitlement) {
        setDetails({
          periodType: entitlement.periodType as SubDetails['periodType'],
          willRenew: entitlement.willRenew,
          expirationDate: entitlement.expirationDate ?? null,
          productIdentifier: entitlement.productIdentifier,
          store: entitlement.store,
          latestPurchaseDate: entitlement.latestPurchaseDate ?? null,
          managementURL: info.managementURL ?? null,
        });
      }
    } catch (_) {}
    setLoadingDetails(false);
  };

  const handleUpgrade = async () => {
    await purchaseService.presentPaywall();
    await checkEntitlements();
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await purchaseService.restorePurchases();
      if (restored) {
        await checkEntitlements();
        await loadDetails();
        Toast.show({ type: 'success', text1: '✅ Restored!', text2: 'Your Pro access has been restored.' });
      } else {
        Toast.show({ type: 'info', text1: 'Nothing to restore', text2: 'No active subscription found for this Apple ID.' });
      }
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Restore failed', text2: 'Please try again or contact support.' });
    }
    setRestoring(false);
  };

  const handleManage = () => {
    const url = details?.managementURL
      ?? (Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions');
    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open', 'Please manage your subscription from the App Store / Play Store.')
    );
  };

  const daysLeft = daysUntil(expiryDate);
  const isTrial = details?.periodType === 'trial';
  const plan = details ? planLabel(details.productIdentifier) : 'Pro';
  const cardBg = colors.isDark ? '#0F172A' : '#FFFFFF';
  const borderColor = colors.isDark ? '#1E293B' : '#E2E8F0';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {isPro ? (
          <ProView
            colors={colors}
            cardBg={cardBg}
            borderColor={borderColor}
            isTrial={isTrial}
            plan={plan}
            daysLeft={daysLeft}
            expiryDate={expiryDate}
            details={details}
            loadingDetails={loadingDetails}
            onManage={handleManage}
            onRestore={handleRestore}
            restoring={restoring}
          />
        ) : (
          <FreeView
            colors={colors}
            cardBg={cardBg}
            borderColor={borderColor}
            onUpgrade={handleUpgrade}
            onRestore={handleRestore}
            restoring={restoring}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Pro View ─────────────────────────────────────────────────────────────────

function ProView({ colors, cardBg, borderColor, isTrial, plan, daysLeft, expiryDate, details, loadingDetails, onManage, onRestore, restoring }: any) {
  return (
    <>
      {/* Hero card */}
      <Animated.View entering={FadeInUp.springify()} style={styles.heroWrap}>
        <LinearGradient
          colors={['#7C5CFF', '#00D1FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconRow}>
            <View style={styles.heroIconBg}>
              <Crown size={28} color="#FFD700" />
            </View>
            {isTrial && (
              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>FREE TRIAL</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroPlanTitle}>LifeOS {plan}</Text>
          <Text style={styles.heroPlanSub}>
            {isTrial
              ? `Trial ends in ${daysLeft ?? '—'} days`
              : details?.willRenew
              ? `Renews ${formatDate(expiryDate)}`
              : `Expires ${formatDate(expiryDate)}`}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Details card */}
      {loadingDetails ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : details ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <DetailRow label="Plan" value={`LifeOS ${plan}`} colors={colors} />
          <DetailRow label="Status" value={isTrial ? 'Free Trial' : 'Active'} valueColor={isTrial ? colors.warning : colors.success} colors={colors} />
          <DetailRow label="Started" value={formatDate(details.latestPurchaseDate)} colors={colors} />
          <DetailRow
            label={isTrial ? 'Trial ends' : details.willRenew ? 'Next billing' : 'Expires'}
            value={formatDate(expiryDate)}
            colors={colors}
            isLast
          />
        </Animated.View>
      ) : null}

      {/* Features you have */}
      <Animated.View entering={FadeInDown.delay(150).springify()}>
        <SectionLabel text="WHAT'S INCLUDED" colors={colors} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {[
            'Unlimited AI Coach messages',
            'Full AI Chat History',
            'Weekly Review & Insights',
            'Lucky XP Boost (5% chance)',
            'Full Trophy Cabinet',
          ].map((item, i, arr) => (
            <View key={item} style={[styles.includedRow, i < arr.length - 1 && { borderBottomColor: colors.isDark ? '#1F2937' : '#F1F5F9', borderBottomWidth: 1 }]}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={[styles.includedText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Actions */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionsWrap}>
        <TouchableOpacity style={[styles.manageBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' }]} onPress={onManage} activeOpacity={0.8}>
          <Ionicons name="settings-outline" size={18} color={colors.primary} />
          <Text style={[styles.manageBtnText, { color: colors.primary }]}>Manage Subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.restoreBtn, { borderColor: borderColor }]} onPress={onRestore} disabled={restoring} activeOpacity={0.7}>
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <RefreshCw size={15} color={colors.textSecondary} />
              <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>Restore Purchases</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

// ─── Free View ────────────────────────────────────────────────────────────────

function FreeView({ colors, cardBg, borderColor, onUpgrade, onRestore, restoring }: any) {
  return (
    <>
      {/* Hero */}
      <Animated.View entering={FadeInUp.springify()} style={styles.heroWrap}>
        <LinearGradient
          colors={colors.isDark ? ['#1E1B4B', '#0F172A'] : ['#EEF2FF', '#DBEAFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconBg}>
            <Sparkles size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroPlanTitle, { color: colors.text }]}>Upgrade to Pro</Text>
          <Text style={[styles.heroPlanSub, { color: colors.textSecondary }]}>
            Unlock the full LifeOS experience
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Feature comparison table */}
      <Animated.View entering={FadeInDown.delay(80).springify()}>
        <SectionLabel text="FREE VS PRO" colors={colors} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor, paddingHorizontal: 0, overflow: 'hidden' }]}>
          {/* Table header */}
          <View style={[styles.tableHeader, { backgroundColor: colors.isDark ? '#1E293B' : '#F8FAFC', borderBottomColor: borderColor }]}>
            <View style={styles.featureLabel} />
            <View style={styles.featureFreeCell}>
              <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>FREE</Text>
            </View>
            <View style={[styles.featureProCell, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}>
              <Crown size={12} color={colors.primary} />
              <Text style={[styles.tableHeaderText, { color: colors.primary }]}>PRO</Text>
            </View>
          </View>

          {FEATURES.map((f, i) => (
            <FeatureRow key={f.label} {...f} colors={colors} />
          ))}
        </View>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.ctaWrap}>
        <TouchableOpacity onPress={onUpgrade} activeOpacity={0.9}>
          <LinearGradient
            colors={['#7C5CFF', '#00D1FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeBtn}
          >
            <Crown size={20} color="#FFD700" />
            <Text style={styles.upgradeBtnText}>Unlock Pro</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.restoreBtn, { borderColor }]} onPress={onRestore} disabled={restoring} activeOpacity={0.7}>
          {restoring ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <RefreshCw size={15} color={colors.textSecondary} />
              <Text style={[styles.restoreBtnText, { color: colors.textSecondary }]}>Restore Purchases</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.legalNote, { color: colors.textSecondary }]}>
          Subscriptions auto-renew unless cancelled at least 24h before the renewal date. Manage in your App Store / Play Store account settings.
        </Text>
      </Animated.View>
    </>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({ text, colors }: { text: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{text}</Text>
  );
}

function DetailRow({ label, value, valueColor, colors, isLast = false }: {
  label: string; value: string; valueColor?: string; colors: any; isLast?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !isLast && { borderBottomColor: colors.isDark ? '#1F2937' : '#F1F5F9', borderBottomWidth: 1 }]}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  scroll: {
    padding: 16,
    paddingBottom: 60,
  },
  heroWrap: { marginBottom: 20 },
  heroBanner: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  heroIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  heroIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trialBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#1C1917',
    letterSpacing: 1,
  },
  heroPlanTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroPlanSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 4,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  detailLabel: { fontFamily: 'Inter-Regular', fontSize: 14 },
  detailValue: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  includedText: { fontFamily: 'Inter-Regular', fontSize: 14 },
  actionsWrap: { gap: 12, marginBottom: 12 },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  manageBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  restoreBtnText: { fontFamily: 'Inter-Regular', fontSize: 13 },
  // --- Comparison table ---
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  featureLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureLabelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  featureFreeCell: {
    width: 68,
    alignItems: 'center',
  },
  featureProCell: {
    width: 80,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  featureCellText: {
    fontSize: 12,
    textAlign: 'center',
  },
  // --- CTA ---
  ctaWrap: { gap: 12, marginBottom: 12 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    borderRadius: 18,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  upgradeBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  legalNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.6,
  },
});
