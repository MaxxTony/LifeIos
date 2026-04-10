import { Colors, Typography } from '@/constants/theme';
import { useStore } from '@/store/useStore';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const TOTAL_SLIDES = 4;

const STRUGGLES = [
  { id: 'procrastination', label: '⏰ I keep delaying', emoji: '⏰' },
  { id: 'focus', label: '🎯 Can\'t focus', emoji: '🎯' },
  { id: 'sleep', label: '😴 Sleep is a mess', emoji: '😴' },
  { id: 'motivation', label: '🔥 No motivation', emoji: '🔥' },
  { id: 'stress', label: '😰 Always stressed', emoji: '😰' },
  { id: 'goals', label: '🏆 No clear goals', emoji: '🏆' },
  { id: 'habits', label: '📅 Can\'t be consistent', emoji: '📅' },
  { id: 'overwhelm', label: '🌊 Feels too much', emoji: '🌊' },
  { id: 'burnout', label: '💀 Totally burnt out', emoji: '💀' },
  { id: 'time', label: '⚡ Never enough time', emoji: '⚡' },
];

// ─── Animated Pulsing Orb ────────────────────────────────────────────────────
// Smooth sonar ripple: withDelay is OUTSIDE withRepeat so the offset applies
// only once (initial phase shift). All 4 rings share the same CYCLE period,
// keeping them in perfect sync forever.
const RIPPLE_CYCLE = 3200;        // ms for one full ring expansion
const RIPPLE_STAGGER = RIPPLE_CYCLE / 4; // 800 ms between each ring

function PulsingOrb() {
  const scale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.6);

  // Each ring has its own scale + opacity shared value
  const r1s = useSharedValue(1); const r1o = useSharedValue(0);
  const r2s = useSharedValue(1); const r2o = useSharedValue(0);
  const r3s = useSharedValue(1); const r3o = useSharedValue(0);
  const r4s = useSharedValue(1); const r4o = useSharedValue(0);

  useEffect(() => {
    // Orb gentle breathing
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false
    );
    orbOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.7, { duration: 2000 }),
      ),
      -1, false
    );

    // One ripple cycle: instantly reset → smoothly expand + fade out
    const rippleScale = (max: number) =>
      withSequence(
        withTiming(1, { duration: 0 }),                                          // instant reset
        withTiming(max, { duration: RIPPLE_CYCLE, easing: Easing.out(Easing.quad) }), // smooth expand
      );
    const rippleOpacity = withSequence(
      withTiming(0.5, { duration: 0 }),                                              // instant appear
      withTiming(0, { duration: RIPPLE_CYCLE, easing: Easing.in(Easing.quad) }),  // smooth fade
    );

    // Ring 1 — phase 0 ms
    r1s.value = withRepeat(rippleScale(2.1), -1, false);
    r1o.value = withRepeat(rippleOpacity, -1, false);

    // Ring 2 — phase 800 ms (withDelay outside withRepeat = one-time offset)
    r2s.value = withDelay(RIPPLE_STAGGER, withRepeat(rippleScale(2.1), -1, false));
    r2o.value = withDelay(RIPPLE_STAGGER, withRepeat(rippleOpacity, -1, false));

    // Ring 3 — phase 1600 ms
    r3s.value = withDelay(RIPPLE_STAGGER * 2, withRepeat(rippleScale(2.1), -1, false));
    r3o.value = withDelay(RIPPLE_STAGGER * 2, withRepeat(rippleOpacity, -1, false));

    // Ring 4 — phase 2400 ms
    r4s.value = withDelay(RIPPLE_STAGGER * 3, withRepeat(rippleScale(2.1), -1, false));
    r4o.value = withDelay(RIPPLE_STAGGER * 3, withRepeat(rippleOpacity, -1, false));
  }, []);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: orbOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1s.value }], opacity: r1o.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2s.value }], opacity: r2o.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: r3s.value }], opacity: r3o.value }));
  const ring4Style = useAnimatedStyle(() => ({ transform: [{ scale: r4s.value }], opacity: r4o.value }));

  return (
    <View style={orbStyles.container}>
      {/* Ripple rings — rendered largest → smallest so they layer correctly */}
      <Animated.View style={[orbStyles.ring, ring4Style]} />
      <Animated.View style={[orbStyles.ring, ring3Style]} />
      <Animated.View style={[orbStyles.ring, ring2Style]} />
      <Animated.View style={[orbStyles.ring, ring1Style]} />
      {/* App Icon */}
      <Animated.View style={[orbStyles.iconWrapper, orbStyle]}>
        <Image
          source={require('../../assets/images/splash-icon.png')}
          style={orbStyles.iconImage}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const orbStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  iconWrapper: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  iconImage: { width: 180, height: 180, borderRadius: 90 },
  // Single base ring — scale transform handles expansion for all 4 rings
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: '#7C5CFF',
  },
});

// ─── Animated Brain / Neural Icon ────────────────────────────────────────────
function BrainVisual() {
  const glow = useSharedValue(0.5);
  const float = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 1800 }), withTiming(0.5, { duration: 1800 })),
      -1, false
    );
    float.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
    opacity: glow.value,
  }));

  return (
    <Animated.View style={[brainStyles.container, floatStyle]}>
      <Text style={brainStyles.icon}>🧠</Text>
      <View style={brainStyles.glowBehind} />
    </Animated.View>
  );
}

const brainStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative' },
  icon: { fontSize: 100, textAlign: 'center' },
  glowBehind: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#7C5CFF22',
  },
});

// ─── Final Hero Visual (Slide 4) ─────────────────────────────────────────────
function FinalHero() {
  const glow = useSharedValue(0.6);
  const iconS = useSharedValue(0);
  const p1 = useSharedValue(0); const p2 = useSharedValue(0);
  const p3 = useSharedValue(0); const p4 = useSharedValue(0);
  const rir1 = useSharedValue(1); const rio1 = useSharedValue(0);
  const rir2 = useSharedValue(1); const rio2 = useSharedValue(0);
  const rir3 = useSharedValue(1); const rio3 = useSharedValue(0);
  const CYCLE = 2800;

  useEffect(() => {
    iconS.value = withSpring(1, { damping: 7, stiffness: 90 });
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false
    );
    const spin = { duration: 5000, easing: Easing.linear };
    p1.value = withRepeat(withTiming(Math.PI * 2, spin), -1, false);
    p2.value = withDelay(1250, withRepeat(withTiming(Math.PI * 2, spin), -1, false));
    p3.value = withDelay(2500, withRepeat(withTiming(Math.PI * 2, spin), -1, false));
    p4.value = withDelay(3750, withRepeat(withTiming(Math.PI * 2, spin), -1, false));

    const ripS = (max: number) => withSequence(withTiming(1, { duration: 0 }), withTiming(max, { duration: CYCLE, easing: Easing.out(Easing.quad) }));
    const ripO = withSequence(withTiming(0.5, { duration: 0 }), withTiming(0, { duration: CYCLE, easing: Easing.in(Easing.ease) }));
    rir1.value = withRepeat(ripS(2.4), -1, false); rio1.value = withRepeat(ripO, -1, false);
    rir2.value = withDelay(CYCLE / 3, withRepeat(ripS(2.4), -1, false)); rio2.value = withDelay(CYCLE / 3, withRepeat(ripO, -1, false));
    rir3.value = withDelay((CYCLE / 3) * 2, withRepeat(ripS(2.4), -1, false)); rio3.value = withDelay((CYCLE / 3) * 2, withRepeat(ripO, -1, false));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconS.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const r1Style = useAnimatedStyle(() => ({ transform: [{ scale: rir1.value }], opacity: rio1.value }));
  const r2Style = useAnimatedStyle(() => ({ transform: [{ scale: rir2.value }], opacity: rio2.value }));
  const r3Style = useAnimatedStyle(() => ({ transform: [{ scale: rir3.value }], opacity: rio3.value }));

  const orbitStyle = (sv: { value: number }, radius: number, phase: number) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateX: Math.cos(sv.value + phase) * radius },
        { translateY: Math.sin(sv.value + phase) * radius },
      ],
    }));

  const o1 = orbitStyle(p1 as any, 88, 0);
  const o2 = orbitStyle(p2 as any, 88, Math.PI / 2);
  const o3 = orbitStyle(p3 as any, 88, Math.PI);
  const o4 = orbitStyle(p4 as any, 88, (Math.PI * 3) / 2);

  return (
    <View style={heroStyles.container}>
      <Animated.View style={[heroStyles.ring, r3Style]} />
      <Animated.View style={[heroStyles.ring, r2Style]} />
      <Animated.View style={[heroStyles.ring, r1Style]} />
      <Animated.View style={[heroStyles.glow, glowStyle]} />
      <Animated.View style={[heroStyles.iconWrap, iconStyle]}>
        <Image source={require('../../assets/images/splash-icon.png')} style={heroStyles.icon} resizeMode="cover" />
      </Animated.View>
      {/* <Animated.View style={[heroStyles.particle, o1]}><Text style={heroStyles.pText}>✨</Text></Animated.View>
      <Animated.View style={[heroStyles.particle, o2]}><Text style={heroStyles.pText}>🚀</Text></Animated.View>
      <Animated.View style={[heroStyles.particle, o3]}><Text style={heroStyles.pText}>⭐</Text></Animated.View>
      <Animated.View style={[heroStyles.particle, o4]}><Text style={heroStyles.pText}>💜</Text></Animated.View> */}
    </View>
  );
}

const heroStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', height: 230, width: '100%' },
  iconWrap: { width: 130, height: 130, borderRadius: 65, overflow: 'hidden', zIndex: 2 },
  icon: { width: 130, height: 130, borderRadius: 65 },
  glow: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#7C5CFF',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 50, elevation: 20, zIndex: 1,
  },
  ring: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1.5, borderColor: '#7C5CFF' },
  particle: { position: 'absolute', zIndex: 3 },
  pText: { fontSize: 20 },
});


// ─── Struggle Chip ───────────────────────────────────────────────────────────
function StruggleChip({ item, selected, onToggle }: { item: typeof STRUGGLES[0]; selected: boolean; onToggle: () => void }) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    borderOpacity.value = withTiming(selected ? 1 : 0, { duration: 220 });
  }, [selected]);

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.94, { duration: 80 }), withSpring(1, { damping: 8 }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: borderOpacity.value }));

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[chipStyles.chip, chipStyle]}>
        {/* Glow border when selected */}
        <Animated.View style={[StyleSheet.absoluteFillObject, chipStyles.selectedBorder, glowStyle]} />
        <BlurView intensity={20} tint="dark" style={chipStyles.blur}>
          <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{item.label}</Text>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: { margin: 4, borderRadius: 24, overflow: 'hidden' },
  blur: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  selectedBorder: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#7C5CFF',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  label: { ...Typography.body, color: Colors.dark.textSecondary, fontSize: 13 },
  labelSelected: { color: '#A78BFF', fontFamily: 'Inter-SemiBold' },
});

// ─── Dot Indicator ───────────────────────────────────────────────────────────
function DotIndicator({ current }: { current: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: TOTAL_SLIDES }).map((_, i) => {
        const isActive = i === current;
        return (
          <Animated.View
            key={i}
            style={[dotStyles.dot, isActive && dotStyles.active]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 4,
  },
  active: { width: 24, backgroundColor: '#7C5CFF' },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedStruggles, setSelectedStruggles] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { setOnboardingData, completeOnboarding, userId } = useStore();

  const slideOpacity = useSharedValue(1);

  const goToSlide = useCallback((index: number) => {
    slideOpacity.value = withTiming(0, { duration: 180 }, () => {
      runOnJS(setCurrentSlide)(index);
      slideOpacity.value = withTiming(1, { duration: 300 });
    });
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentSlide < TOTAL_SLIDES - 1) {
      goToSlide(currentSlide + 1);
    } else {
      // Save onboarding selections and mark as complete
      setOnboardingData({ struggles: selectedStruggles });
      completeOnboarding();
      // Always go to Login — user chooses their method there (Email, Google, or Guest)
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const toggleStruggle = (id: string) => {
    setSelectedStruggles(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const slides = [
    // ── Slide 1: Welcome ─────────────────────────────────────────────────
    <View style={styles.slide} key="slide-1">
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.visualContainer}>
        <PulsingOrb />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.textBlock}>
        <Text style={styles.heading}>Master your</Text>
        <Text style={[styles.heading, styles.gradient]}>Life OS</Text>
        <Text style={styles.subheading}>
          Your AI-powered life companion.{'\n'}Built to help you grow, every single day.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.bottomArea}>
        <DotIndicator current={0} />
        <GradientButton label="Get Started →" onPress={handleNext} />
      </Animated.View>
    </View>,

    // ── Slide 2: AI Coach ─────────────────────────────────────────────────
    <View style={styles.slide} key="slide-2">
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.visualContainer}>
        <BrainVisual />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.textBlock}>
        <Text style={styles.heading}>A coach that</Text>
        <Text style={[styles.heading, styles.gradient]}>gets you.</Text>
        <Text style={styles.subheading}>
          Powered by AI — your coach adapts to your goals, mood and schedule in real time.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.chatPreview}>
        <BlurView intensity={30} tint="dark" style={styles.chatCard}>
          <Text style={styles.chatLine}>🤖 <Text style={styles.chatBold}>LifeOS AI</Text></Text>
          <Text style={styles.chatText}>"You seem to be most productive in the morning. Want me to schedule your deep work then?"</Text>
        </BlurView>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.bottomArea}>
        <DotIndicator current={1} />
        <GradientButton label="Sounds Good →" onPress={handleNext} />
      </Animated.View>
    </View>,

    // ── Slide 3: Struggles ────────────────────────────────────────────────
    <View style={styles.slide} key="slide-3">
      {/* Text + chips together so space-between only separates from button */}
      <View style={styles.slide3Wrapper}>
        <Animated.View entering={FadeInDown.delay(50).springify()} style={[styles.textBlock, { marginBottom: 20 }]}>
          <Text style={styles.heading}>What holds</Text>
          <Text style={[styles.heading, styles.gradient]}>you back?</Text>
          <Text style={styles.subheading}>Select all that apply — your AI will adapt</Text>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200)} style={styles.chipsGrid}>
          {STRUGGLES.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(i * 40).springify()}>
              <StruggleChip
                item={item}
                selected={selectedStruggles.includes(item.id)}
                onToggle={() => toggleStruggle(item.id)}
              />
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.bottomArea}>
        <DotIndicator current={2} />
        <GradientButton
          label={selectedStruggles.length > 0 ? `Continue (${selectedStruggles.length} selected) →` : 'Continue →'}
          onPress={handleNext}
        />
      </Animated.View>
    </View>,

    // ── Slide 4: Final ───────────────────────────────────────────────────────
    <View style={[styles.slide, { paddingTop: Platform.OS === 'ios' ? 48 : 32 }]} key="slide-4">

      {/* Hero Visual */}
      <Animated.View entering={ZoomIn.delay(80).springify()} style={styles.visualContainer}>
        <FinalHero />
      </Animated.View>

      {/* Headline */}
      <Animated.View entering={FadeInUp.delay(250).springify()} style={[styles.textBlock, { marginBottom: 20 }]}>

        <Text style={[styles.subheading, { marginTop: 12, fontSize: 16, color: 'rgba(255,255,255,0.65)' }]}>
          Your AI-powered OS is ready.{'\n'}Everything you need. Nothing you don't.
        </Text>
      </Animated.View>

      {/* Promise list */}
      <Animated.View entering={FadeInUp.delay(400).springify()} style={slide4Styles.promiseList}>
        {[
          { icon: '🧠', text: 'AI coach that learns you' },
          { icon: '✅', text: 'Daily tasks, auto-planned' },
          { icon: '💜', text: 'Mood & habit tracking' },
        ].map((item, i) => (
          <Animated.View key={item.text} entering={FadeInUp.delay(500 + i * 80).springify()} style={slide4Styles.promiseRow}>
            <View style={slide4Styles.iconBadge}>
              <Text style={{ fontSize: 16 }}>{item.icon}</Text>
            </View>
            <Text style={slide4Styles.promiseText}>{item.text}</Text>
            <Text style={slide4Styles.tick}>✓</Text>
          </Animated.View>
        ))}
      </Animated.View>

      {/* Social proof */}
      <Animated.View entering={FadeInUp.delay(750).springify()} style={slide4Styles.socialProof}>
        <Text style={slide4Styles.socialText}>🔥 Join thousands building better lives</Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.bottomArea}>
        <DotIndicator current={3} />
        <GradientButton label="Begin My Journey →" onPress={handleNext} />
      </Animated.View>
    </View>,
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient blobs */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={['#1A0A3E', '#0B0B0F', '#0B0B0F']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
      </View>

      <Animated.View style={{ flex: 1, opacity: slideOpacity }}>
        {slides[currentSlide]}
      </Animated.View>
    </View>
  );
}

// ─── Gradient Button ──────────────────────────────────────────────────────────
function GradientButton({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    scale.value = withSequence(withTiming(0.96, { duration: 80 }), withSpring(1, { damping: 8 }));
    onPress();
  };
  return (
    <TouchableOpacity onPress={press} activeOpacity={1} style={{ width: '100%' }}>
      <Animated.View style={[btnStyle, { borderRadius: 16, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#8B5CF6', '#7C5CFF', '#5B8CFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          <Text style={styles.btnText}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0F' },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
  visualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.85,
    width: '100%',
  },
  textBlock: { alignItems: 'center', marginBottom: 12 },
  heading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 44,
  },
  gradient: { color: '#A78BFF' },
  subheading: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 23,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  chatPreview: { width: '100%', marginTop: 14 },
  chatCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(124,92,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.25)',
    overflow: 'hidden',
  },
  chatLine: { ...Typography.caption, color: Colors.dark.textSecondary, marginBottom: 6 },
  chatBold: { color: '#A78BFF', fontFamily: 'Inter-SemiBold' },
  chatText: { ...Typography.body, color: Colors.dark.text, lineHeight: 22, fontSize: 15 },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'flex-start',
  },
  slide3Wrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  benefitsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  benefitCard: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.2)',
    overflow: 'hidden',
    width: (width - 72) / 3,
  },
  benefitIcon: { fontSize: 28, marginBottom: 6 },
  benefitLabel: { ...Typography.caption, color: Colors.dark.textSecondary, textAlign: 'center', fontSize: 12 },
  bottomArea: { width: '100%', marginTop: 4 },
  gradientBtn: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: '#FFF', fontWeight: '600' },
});

const slide4Styles = StyleSheet.create({
  promiseList: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(124,92,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: {
    flex: 1,
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  tick: {
    color: '#7C5CFF',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  socialProof: {
    marginTop: 16,
    alignItems: 'center',
  },
  socialText: {
    ...Typography.caption,
    color: 'rgba(124,92,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
});
