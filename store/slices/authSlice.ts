import { StateCreator } from 'zustand';
import { UserState, Task, Habit, MoodEntry, AuthActions } from '../types';
import { authService } from '@/services/authService';
import { dbService } from '@/services/dbService';
import { getTodayLocal, formatLocalDate } from '@/utils/dateUtils';
import { fireSync, isSyncingGlobal, setSyncingGlobal } from '../syncHelper';
import { migrateTasks, computeLevel } from '../helpers';
import Toast from 'react-native-toast-message';
import { query, where, orderBy, limit, documentId, setDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { setSentryUser } from '@/services/crashAnalytics';

const LOGGED_OUT_STATE: Partial<UserState> = {
  // Auth
  isAuthenticated: false,
  userId: null,
  userName: null,
  sessionToken: null,
  // Sync control
  _syncUnsubscribes: [],
  pendingActions: [],
  syncError: null,
  _lastRetryAt: 0,
  // Active focus session
  focusSession: {
    totalSecondsToday: 0,
    isActive: false,
    lastStartTime: null,
    isPomodoro: false,
    pomodoroMode: 'work' as const,
    pomodoroWorkDuration: 25 * 60,
    pomodoroBreakDuration: 5 * 60,
    pomodoroTimeLeft: 25 * 60,
    sessionStartSeconds: 0,
    pomodoroOverflow: 0,
  },
  // Transient UI state
  globalConfetti: false,
  recentXP: null,
  proactivePrompt: null,
  streakMilestones: [],
  lastMoodLog: null,
  // PII-CLEAR: Wipe personal data so it never leaks to the next user on a shared device.
  // On re-login, Firestore snapshots restore everything within 1-2s.
  tasks: [],
  habits: [],
  moodHistory: {},
  focusHistory: {},
  lifeScoreHistory: {},
  dailyQuests: [],
  // Profile PII
  avatarUrl: null,
  bio: '',
  location: '',
  occupation: '',
  pronouns: '',
  phoneNumber: null,
  birthday: null,
  skills: null,
  socialLinks: {},
  // Gamification
  totalXP: 0,
  level: 1,
  globalStreak: 0,
  streakFreezes: 0,
  weeklyXP: 0,
  lastActiveDate: null,
  lastResetDate: null,
  hasSeenWalkthrough: false,
  hasCompletedOnboarding: false,
  onboardingData: { struggles: [] },
  aiInsight: null,
};

export const createAuthSlice: StateCreator<UserState, [["zustand/persist", unknown]], [], AuthActions> = (set, get) => ({
  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
  completeOnboarding: () => {
    console.log('[LifeOS Store] completeOnboarding called.');
    set({ hasCompletedOnboarding: true });
    const { userId } = get();
    if (userId) {
      fireSync(() => dbService.saveUserProfile(userId, { hasCompletedOnboarding: true }), 'completeOnboarding', userId);
    } else {
      console.warn('[LifeOS Store] completeOnboarding: userId is null, profile save skipped.');
    }
  },

  setAuth: async (userId, userName, email, sessionToken) => {
    const currentState = get();
    const unsubs = currentState._syncUnsubscribes;
    for (const unsub of unsubs) {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    }

    if (!userId) {
      // C-AUTH-14 FIX: Do not wipe the store on the FIRST null fire of onAuthStateChanged.
      // Firebase often fires null before resolving the real persistent user. 
      // Wiping here causes the "Instant-On" local cache to be destroyed, 
      // leading to theme/data flashes.
      if (!currentState._authStateResolved && currentState.isAuthenticated) {
        console.log('[LifeOS Store] Ignoring initial null auth fire to preserve local cache.');
        return;
      }

      // User signed out or session actually expired — clear user data.
      set((state) => ({
        ...LOGGED_OUT_STATE,
        _subscriptionGen: state._subscriptionGen + 1,
      }));
      return;
    }

    set((state) => ({
      userId,
      // C-AUTH-15 FIX: Protect local userName. If we have a name in store, 
      // don't overwrite it with a generic Firebase display name (e.g. from email).
      userName: state.userName || userName,
      email: state.email || email,
      sessionToken: sessionToken || state.sessionToken,
      isAuthenticated: true,
      _syncUnsubscribes: [],
      _subscriptionGen: state._subscriptionGen + 1,
    }));
    
    // C-18 FIX: Tag Sentry session so crashes are attributed to the correct user.
    setSentryUser(userId, userName);
    // subscribeToCloud is NOT called here intentionally. It is the caller's
    // responsibility (onAuthStateChanged in _layout.tsx or retrySync) to start
    // the subscription ONCE. Calling it here caused a double-subscription on
    // every fresh login because both login.tsx and onAuthStateChanged call setAuth.
  },

  updateProfile: async (updates) => {
    const { userId } = get();
    if (!userId) return;
    const allowed: (keyof UserState)[] = [
      'userName', 'bio', 'location', 'occupation', 'avatarUrl',
      'phoneNumber', 'birthday', 'pronouns', 'skills', 'socialLinks',
    ];
    const safe: Partial<UserState> = {};
    for (const key of allowed) {
      if (key in updates) {
        (safe as any)[key] = (updates as any)[key];
      }
    }
    set(safe as any);
    await dbService.saveUserProfile(userId, safe);
  },

  logout: async (options = { shouldSaveFocus: true }) => {
    const state = get();
    const { shouldSaveFocus = true } = options;

    // 1. Emergency Focus Save (NON-BLOCKING background fireSync)
    if (shouldSaveFocus && state.focusSession?.isActive && state.userId) {
      const now = Date.now();
      const lastTickDelta = state.focusSession.lastStartTime
        ? Math.min((now - state.focusSession.lastStartTime) / 1000, 30)
        : 0;
      const totalSeconds = Math.max(0, state.focusSession.totalSecondsToday + lastTickDelta);
      
      // Use fireSync so it finishes even if state is cleared
      // BUG-021: Await the save so auth isn't wiped before the write completes
      await fireSync(() => dbService.saveFocusEntry(state.userId!, getTodayLocal(), totalSeconds), 'logoutFocusSave', state.userId);
    }

    // 2. Clean up presence
    if (state.focusSession?.isActive && state.userId) {
      const { presenceService } = await import('@/services/presenceService');
      presenceService.leaveFocusRoom(state.userId);
    }

    state._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });

    // Storage is intentionally NOT cleared here. Tasks, habits, and history
    // survive logout so the dashboard renders instantly on re-login without a
    // skeleton or flash. Firestore snapshots overwrite everything within 1-2s.

    // 4. Cancel Notifications
    const { notificationService } = await import('@/services/notificationService');
    notificationService.cancelAllNotifications();

    setSentryUser(null);
    // Reset only user data, keep theme/settings
    set((s) => ({
      ...LOGGED_OUT_STATE,
      _subscriptionGen: s._subscriptionGen + 1,
    }));

    // BUG-010 FIX: Complete purge of local sharded storage to prevent PII leaks
    // between users on shared devices.
    try {
      const { useStore } = await import('../useStore');
      await useStore.persist.clearStorage();
    } catch (e) {
      console.warn('[LifeOS Store] Storage clear failed on logout:', e);
    }
  },

  subscribeToCloud: () => {
    const userId = get().userId;
    if (!userId) return;

    // Clear existing subs
    get()._syncUnsubscribes.forEach(unsub => {
      try { if (typeof unsub === 'function') unsub(); } catch (_) {}
    });

    let myGen!: number;
    set(state => {
      myGen = state._subscriptionGen + 1;
      return { _subscriptionGen: myGen, _syncUnsubscribes: [] };
    });
    const isStale = () => get()._subscriptionGen !== myGen || get().userId !== userId;

    const HISTORY_WINDOW_DAYS = 365;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - HISTORY_WINDOW_DAYS);
    const windowStartStr = formatLocalDate(windowStart);

    const syncWindowDate = new Date();
    syncWindowDate.setDate(syncWindowDate.getDate() - 365);
    const syncWindowStr = formatLocalDate(syncWindowDate);
    const syncStartedAt = Date.now();

    const checkOfflineStatus = (fromCache: boolean) => {
      if (!fromCache) return false;
      const now = Date.now();
      const { lastCloudSync } = get().syncStatus;
      if (now - syncStartedAt < 5000) return false;
      if (lastCloudSync && now - lastCloudSync < 30000) return false;
      return true;
    };

    // C-STORE-4 FIX: Collect ALL unsubscribers in a local array first.
    // If an error occurs midway, we still update the store with what we have
    // so they can be cleaned up on the next logout/login.
    // O1 FIX: Removed eager publicProfile upsert here — it was firing a
    // duplicate write every app open. The onSnapshot callback below already
    // upserts on every non-cached Firestore read, which covers the same case
    // within ~500ms of open. One write per session is sufficient.
    const collected: (() => void)[] = [];

    try {
      // Root Profile Subscription
      const unsubRoot = dbService.subscribeToUserData(
        userId,
        (data: any) => {
          if (isStale()) return;
          if (!data) {
            console.warn('[LifeOS] User document deleted from Firestore - forcing logout.');
            authService.logout();
            get().actions.setAuth(null, null);
            return;
          }

          const currentToken = get().sessionToken;
          if (data.sessionToken && currentToken && data.sessionToken !== currentToken && !data._fromCache) {
            console.warn('[LifeOS] sessionToken mismatch - logging out device.');
            Toast.show({
              type: 'error',
              text1: 'Session Expired',
              text2: 'You have been logged in on another device.'
            });
            
            // C-SYNC-SESSION FIX: Call store logout first to trigger auto-save of focus timer
            get().actions.logout({ shouldSaveFocus: true }).then(async () => {
              try {
                const { httpsCallable } = await import('firebase/functions');
                const { functions } = await import('@/firebase/config');
                await httpsCallable(functions, 'revokeOtherSessions')();
              } catch (_) { /* non-blocking — local logout already happened */ }
              authService.logout();
            });
            return;
          }

          const updates: Partial<UserState> = {};
          if (data.userName) updates.userName = data.userName;
          if (data.moodTheme) updates.moodTheme = data.moodTheme;
          if (data.themePreference) updates.themePreference = data.themePreference;
          if (data.focusGoalHours !== undefined) updates.focusGoalHours = data.focusGoalHours;
          if (data.bio !== undefined) updates.bio = data.bio;
          if (data.location !== undefined) updates.location = data.location;
          if (data.occupation !== undefined) updates.occupation = data.occupation;
          if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
          if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber;
          if (data.birthday !== undefined) updates.birthday = data.birthday;
          if (data.pronouns !== undefined) updates.pronouns = data.pronouns;
          if (data.skills !== undefined) updates.skills = data.skills;
          if (data.socialLinks !== undefined) updates.socialLinks = data.socialLinks;
          if (data.accentColor) updates.accentColor = data.accentColor;
          if (data.homeTimezone) updates.homeTimezone = data.homeTimezone;
          if (data.hasSeenWalkthrough !== undefined) updates.hasSeenWalkthrough = data.hasSeenWalkthrough;
          if (data.streakFreezes !== undefined) updates.streakFreezes = data.streakFreezes;
          if (data.lastLoginBonusDate !== undefined) updates.lastLoginBonusDate = data.lastLoginBonusDate;
          if (data.isPro !== undefined) updates.isPro = data.isPro;
          if (data.subscriptionExpiryDate !== undefined) updates.subscriptionExpiryDate = data.subscriptionExpiryDate;
          if (data.dailyAIMessageCount !== undefined) updates.dailyAIMessageCount = data.dailyAIMessageCount;
          if (data.lastAIMessageCountReset !== undefined) updates.lastAIMessageCountReset = data.lastAIMessageCountReset;
          if (data.preferredNudgeTime !== undefined) updates.preferredNudgeTime = data.preferredNudgeTime;
          if (data.aiInsight !== undefined) updates.aiInsight = data.aiInsight;

          // SYNC FIX: Handle remote focus session changes (cross-device)
          if (data.activeFocusSession !== undefined) {
            const current = get().focusSession;
            if (data.activeFocusSession === null) {
              if (current.isActive) {
                updates.focusSession = { ...current, isActive: false, lastStartTime: null };
              }
            } else {
              const remote = data.activeFocusSession;
              // Only sync if the remote session is "newer" or we aren't active locally
              if (!current.isActive || remote.lastStartTime > (current.lastStartTime || 0)) {
                updates.focusSession = {
                  ...current,
                  isActive: true,
                  isPomodoro: remote.isPomodoro,
                  pomodoroMode: remote.pomodoroMode,
                  pomodoroTimeLeft: remote.pomodoroTimeLeft,
                  lastStartTime: remote.lastStartTime
                };
              }
            }
          }

          // C-AUTH-10 FIX: Aggressive self-healing for stale onboarding flags in cloud.
          // O17 FIX: STICKY TRUE. Once these are true, never let a cloud snapshot downgrade them to false/undefined.
          const currentCompleted = get().hasCompletedOnboarding;
          const currentSeen = get().hasSeenWalkthrough;
          
          const hasCompletedOnboarding = !!(data.hasCompletedOnboarding || currentCompleted || data.userName || (Array.isArray(data.struggles) && data.struggles.length > 0) || (data.level && data.level > 1));
          updates.hasCompletedOnboarding = hasCompletedOnboarding;
          
          // C-AUTH-11 FIX: Self-healing for walkthrough flag — if you've completed onboarding, you've definitely seen the walkthrough.
          const hasSeenWalkthrough = !!(data.hasSeenWalkthrough || currentSeen || hasCompletedOnboarding);
          updates.hasSeenWalkthrough = hasSeenWalkthrough;

          updates.onboardingData = { struggles: Array.isArray(data.struggles) ? data.struggles : (get().onboardingData?.struggles || []) };

          updates.syncStatus = {
            ...get().syncStatus,
            profileLoaded: true,
            isOffline: checkOfflineStatus(!!data._fromCache),
            lastCloudSync: !data._fromCache ? Date.now() : get().syncStatus.lastCloudSync
          };

          set(updates);
          
          // C-AUTH-10 FIX: Self-healing for missing onboarding/walkthrough flags in cloud
          const finalState = get();
          if (finalState.hasCompletedOnboarding && !data.hasCompletedOnboarding && !data._fromCache) {
            console.log('[LifeOS] Healing missing onboarding flag in cloud...');
            dbService.saveUserProfile(userId, { hasCompletedOnboarding: true });
          }
          if (finalState.hasSeenWalkthrough && !data.hasSeenWalkthrough && !data._fromCache) {
            console.log('[LifeOS] Healing missing walkthrough flag in cloud...');
            dbService.saveUserProfile(userId, { hasSeenWalkthrough: true });
          }

          // SOCIAL: Sync fresh profile to publicProfiles root collection.
          // Fires on every app open with real username + avatar from Firestore.
          if (!data._fromCache) {
            const currentState = get();
            const displayName = data.userName || currentState.userName || 'Unknown';
            setDoc(
              doc(db, 'publicProfiles', userId),
              {
                userName: displayName,
                // O9 FIX: Keep lowercase version for case-insensitive search queries.
                userNameLower: displayName.toLowerCase(),
                avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : (currentState.avatarUrl || null),
                level: currentState.level || 1,
                weeklyXP: currentState.weeklyXP || 0,
                globalStreak: currentState.globalStreak || 0,
                lastActive: Date.now(),
              },
              { merge: true }
            ).catch(err => console.warn('[LifeOS] publicProfile sync failed:', err));
          }
        },
        (error) => {
          if (error.code === 'permission-denied') {
            console.warn('[LifeOS] Firestore permission denied for root user - forcing logout.');
            authService.logout();
            get().actions.setAuth(null, null);
          }
        }
      );
      collected.push(unsubRoot);

      // Tasks Subscription
      const unsubTasks = dbService.subscribeToCollection(
        userId,
        'tasks',
        (docs, metadata) => {
          if (isStale()) return;
          set((state) => ({
            tasks: migrateTasks(docs as Task[]),
            syncStatus: {
              ...state.syncStatus,
              tasksLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where('date', '>=', syncWindowStr), orderBy('date', 'desc'), limit(500))
      );
      collected.push(unsubTasks);

      // Habits Subscription
      const unsubHabits = dbService.subscribeToCollection(
        userId,
        'habits',
        (docs, metadata) => {
          if (isStale()) return;
          // FIREBASE FIX: Filter archived habits locally to avoid requiring a composite index
          // for where('archived') + orderBy('createdAt').
          const activeHabits = (docs as Habit[]).filter(h => h.archived !== true);
          set((state) => ({
            habits: activeHabits,
            syncStatus: {
              ...state.syncStatus,
              habitsLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, orderBy('createdAt', 'desc'), limit(500))
      );
      collected.push(unsubHabits);

      // Mood History Subscription
      const unsubMood = dbService.subscribeToCollection(
        userId,
        'moodHistory',
        (docs, metadata) => {
          const map: Record<string, MoodEntry> = {};
          docs.forEach(doc => {
            const { id, ...entry } = doc as { id: string } & MoodEntry;
            map[id] = entry;
          });
          const today = getTodayLocal();
          set(state => ({
            moodHistory: { ...state.moodHistory, ...map },
            mood: map[today]?.mood ?? state.mood,
            syncStatus: {
              ...state.syncStatus,
              moodLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where(documentId(), '>=', windowStartStr))
      );
      collected.push(unsubMood);

      // Focus History Subscription
      const unsubFocus = dbService.subscribeToCollection(
        userId,
        'focusHistory',
        (docs, metadata) => {
          if (isStale()) return;
          const map: Record<string, number> = {};
          docs.forEach(doc => {
            map[doc.id] = (doc as { totalSeconds?: number }).totalSeconds || 0;
          });
          
          // C-SYNC-FOCUS FIX: Automatically sync the cloud's today value into the active focusSession object
          // so the Dashboard/Timer doesn't reset to 0 after re-logging in.
          const today = getTodayLocal();
          const cloudTodaySeconds = map[today] || 0;

          set((state) => ({
            focusHistory: map,
            focusSession: {
              ...state.focusSession,
              // Only update if current local total is less than cloud (prevents overwriting in-flight ticks)
              totalSecondsToday: Math.max(state.focusSession.totalSecondsToday, cloudTodaySeconds)
            },
            syncStatus: {
              ...state.syncStatus,
              focusLoaded: true,
              isOffline: checkOfflineStatus(metadata?.fromCache ?? state.syncStatus.isOffline)
            }
          }));
        },
        (ref) => query(ref, where(documentId(), '>=', windowStartStr))
      );
      collected.push(unsubFocus);

      // Quests Subscription
      const unsubQuests = dbService.subscribeToCollection(
        userId,
        'dailyQuests',
        (docs) => {
          if (isStale()) return;
          set((state) => ({ 
            dailyQuests: docs as any[],
            syncStatus: {
              ...state.syncStatus,
              questsLoaded: true
            }
          }));
          // C-SYNC-QUEST FIX: Re-trigger generation once we know cloud state
          get().actions.generateDailyQuests();
        },
        (ref) => {
          const todayQuestPrefix = `quest-${formatLocalDate(new Date())}`;
          const tomorrowStr = formatLocalDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
          return query(
            ref, 
            where(documentId(), '>=', todayQuestPrefix), 
            where(documentId(), '<', `quest-${tomorrowStr}`)
          );
        }
      );
      collected.push(unsubQuests);

      // Stats/Global Subscription — keeps XP, level, streak live across devices
      const unsubStats = dbService.subscribeToCollection(
        userId,
        'stats',
        (docs) => {
          if (isStale()) return;
          const statsDoc = docs.find(d => d.id === 'global');
          if (!statsDoc) return;
          const serverXP: number = statsDoc.totalXP || 0;
          const currentState = get();
          const updates: Partial<UserState> = {};
          // Always take max so an in-flight local XP gain is never overwritten
          if (serverXP > currentState.totalXP) {
            updates.totalXP = serverXP;
            const { computeLevel } = require('../helpers');
            updates.level = computeLevel(serverXP);
          }
          if (statsDoc.weeklyXP !== undefined) updates.weeklyXP = Math.max(statsDoc.weeklyXP, currentState.weeklyXP);
          if (statsDoc.globalStreak !== undefined) updates.globalStreak = statsDoc.globalStreak;
          if (statsDoc.lastActiveDate !== undefined) updates.lastActiveDate = statsDoc.lastActiveDate;
          if (statsDoc.lastWeekResetDate !== undefined) updates.lastWeekResetDate = statsDoc.lastWeekResetDate;
          if (Object.keys(updates).length > 0) set(updates);
        }
      );
      collected.push(unsubStats);

      // Weekly Recaps Subscription
      const unsubRecaps = dbService.subscribeToCollection(
        userId,
        'weeklyRecaps',
        (docs) => {
          if (isStale()) return;
          const recaps: Record<string, import('../types').WeeklyRecap> = {};
          docs.forEach(d => {
            recaps[d.id] = { ...d } as any;
          });
          set({ weeklyRecaps: recaps });
        }
      );
      collected.push(unsubRecaps);
    } catch (err) {
      console.error('[LifeOS] Sync subscription set failed:', err);
    } finally {
      if (!isStale()) {
        // Still the active generation — store unsubscribers for later cleanup.
        set({ _syncUnsubscribes: collected });
      } else {
        // A newer subscribeToCloud() call has already taken over.
        // Immediately tear down any listeners we opened so they don't leak.
        collected.forEach(unsub => { try { unsub(); } catch (_) {} });
      }
    }
  },

  hydrateFromCloud: async () => {
    const userId = authService.currentUser?.uid || get().userId;
    if (userId) {
      try {
        const { data } = await dbService.getUserProfile(userId);
        if (data) {
          await dbService.migrateLegacyData(userId, data);
          const struggles = (data as any).struggles;
          
          // C-SYNC-20 FIX: Never overwrite local store with nulls from cloud.
          // This prevents "flashing" where data disappears and then reappears.
          const updates: Partial<UserState> = {};
          if (data.userName) updates.userName = data.userName;
          if (data.hasCompletedOnboarding !== undefined) updates.hasCompletedOnboarding = data.hasCompletedOnboarding;
          if (Array.isArray(struggles)) updates.onboardingData = { struggles };
          if (data.moodTheme) updates.moodTheme = data.moodTheme;
          if (data.themePreference) updates.themePreference = data.themePreference;
          if (data.focusGoalHours !== undefined) updates.focusGoalHours = data.focusGoalHours;
          if (data.bio !== undefined) updates.bio = data.bio;
          if (data.location !== undefined) updates.location = data.location;
          if (data.occupation !== undefined) updates.occupation = data.occupation;
          if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;
          if (data.phoneNumber !== undefined) updates.phoneNumber = data.phoneNumber;
          if (data.birthday !== undefined) updates.birthday = data.birthday;
          if (data.pronouns !== undefined) updates.pronouns = data.pronouns;
          if (data.skills !== undefined) updates.skills = data.skills;
          if (data.socialLinks !== undefined) updates.socialLinks = data.socialLinks;
          if (data.accentColor) updates.accentColor = data.accentColor;
          if (data.homeTimezone) updates.homeTimezone = data.homeTimezone;
          if (data.isPro !== undefined) updates.isPro = data.isPro;
          if (data.subscriptionExpiryDate !== undefined) updates.subscriptionExpiryDate = data.subscriptionExpiryDate;
          if (data.dailyAIMessageCount !== undefined) updates.dailyAIMessageCount = data.dailyAIMessageCount;
          if (data.lastAIMessageCountReset !== undefined) updates.lastAIMessageCountReset = data.lastAIMessageCountReset;
          if (data.preferredNudgeTime !== undefined) updates.preferredNudgeTime = data.preferredNudgeTime;
          if (data.aiInsight !== undefined) updates.aiInsight = data.aiInsight;
          // C-AUTH-10 FIX: Sticky flags in hydrate path
          if (data.hasCompletedOnboarding === true || get().hasCompletedOnboarding === true) updates.hasCompletedOnboarding = true;
          if (data.hasSeenWalkthrough === true || get().hasSeenWalkthrough === true || updates.hasCompletedOnboarding) updates.hasSeenWalkthrough = true;

          set(updates);
        }

        // M-12 FIX: Server-wins for XP — take max(local, server) so the higher value always wins.
        // Prevents cheating rollbacks when re-logging in and prevents data loss from multi-device use.
        const statsDoc = await dbService.getCollectionDoc(userId, 'stats', 'global');
        if (statsDoc) {
          const serverXP: number = statsDoc.totalXP || 0;
          const localXP = get().totalXP;
          
          const updates: Partial<UserState> = {};
          
          if (serverXP > localXP) {
            updates.totalXP = serverXP;
            updates.level = computeLevel(serverXP);
          }
          
          if (statsDoc.globalStreak !== undefined) updates.globalStreak = statsDoc.globalStreak;
          // O5 FIX: Use Math.max to prevent a device that was offline from
          // overwriting a higher weeklyXP earned on another device.
          if (statsDoc.weeklyXP !== undefined) updates.weeklyXP = Math.max(statsDoc.weeklyXP, get().weeklyXP);
          if (statsDoc.lastActiveDate !== undefined) updates.lastActiveDate = statsDoc.lastActiveDate;
          if (statsDoc.lastWeekResetDate !== undefined) updates.lastWeekResetDate = statsDoc.lastWeekResetDate;
          
          if (Object.keys(updates).length > 0) {
            set(updates);
          }
        }

        // GAMIFICATION: Daily Login Bonus (+5 XP)
        // Runs here — after max(server, local) XP is in state — so we never
        // add 5 to a stale local 0 and overwrite the real server XP.
        // added 5 to a stale local 0 and overwrite the real server XP.
        const todayStr = formatLocalDate(new Date());
        const stateAfterStats = get();
        
        // O18 FIX: Added safety check. If the cloud profile exists but is MISSING 
        // lastLoginBonusDate (undefined), do NOT trigger the bonus yet.
        const cloudHasBonusDate = stateAfterStats.lastLoginBonusDate !== undefined;
        
        if (cloudHasBonusDate && stateAfterStats.lastLoginBonusDate !== todayStr) {
          const newXP = stateAfterStats.totalXP + 5;
          const newWeeklyXP = stateAfterStats.weeklyXP + 5;
          const newLevel = computeLevel(newXP);
          set({ totalXP: newXP, weeklyXP: newWeeklyXP, level: newLevel, lastLoginBonusDate: todayStr });
          fireSync(() => dbService.updateGlobalStats(userId!, { totalXP: newXP, weeklyXP: newWeeklyXP }, 5), 'dailyLoginBonus_stats', userId);
          fireSync(() => dbService.saveUserProfile(userId!, { lastLoginBonusDate: todayStr } as any), 'dailyLoginBonus_profile', userId);
          setTimeout(() => {
            get().actions.triggerGlobalConfetti();
            Toast.show({ type: 'success', text1: '🎁 Daily Bonus!', text2: '+5 XP for logging in today.', visibilityTime: 4000 });
          }, 1500);
        } else {
          console.log('[LifeOS] Skipping Daily Bonus. lastLoginBonusDate:', stateAfterStats.lastLoginBonusDate);
        }

        // SOCIAL FIX: Always upsert publicProfile on login so user appears
        // in other users' Discover tab. This fires even if user has never earned XP.
        try {
          const state = get();
          const displayName = state.userName || 'Unknown';
          await setDoc(
            doc(db, 'publicProfiles', userId),
            {
              userName: displayName,
              // O9 FIX: Keep lowercase version for case-insensitive search queries.
              userNameLower: displayName.toLowerCase(),
              avatarUrl: state.avatarUrl || null,
              level: state.level || 1,
              weeklyXP: state.weeklyXP || 0,
              globalStreak: state.globalStreak || 0,
              lastActive: Date.now(),
            },
            { merge: true }
          );
        } catch (profileErr) {
          console.warn('[LifeOS] publicProfile upsert failed (non-fatal):', profileErr);
        }
      } catch (err: any) {
        console.error('Cloud hydration failed:', err);
      }
    }
  },

  clearSyncError: () => set({ syncError: null }),
  retrySync: async () => {
    const now = Date.now();
    if (now - get()._lastRetryAt < 10000) return;
    
    // C-SYNC-3 FIX: Re-entrancy lock
    if (isSyncingGlobal) {
      console.log('[LifeOS Sync] Sync already in progress, skipping retry.');
      return;
    }
    setSyncingGlobal(true);

    set({ syncError: null, _lastRetryAt: now });
    
    const { userId, pendingActions } = get();
    if (!userId) {
      setSyncingGlobal(false);
      return;
    }

    try {
      // C-5: Process Pending Actions Queue
      if (pendingActions.length > 0) {
        console.log(`[LifeOS Sync] Processing ${pendingActions.length} pending actions...`);
        for (const action of pendingActions) {
          try {
            if (action.collection === 'tasks') {
              if (action.type === 'delete') await dbService.deleteTask(userId, action.id);
              else await dbService.saveTask(userId, action.payload);
            } else if (action.collection === 'habits') {
              if (action.type === 'delete') await dbService.deleteHabit(userId, action.id);
              else await dbService.saveHabit(userId, action.payload);
            }
            set(state => ({
              pendingActions: state.pendingActions.filter(a => a.id !== action.id)
            }));
          } catch (err) {
            console.warn(`[LifeOS Sync] Retry failed for ${action.id}:`, err);
          }
        }
      }

      get().actions.subscribeToCloud();
    } catch (err: any) {
      console.error('[LifeOS] retrySync failed:', err?.message || err);
      set({ syncError: { label: 'retrySync', message: err?.message || String(err), timestamp: Date.now() } });
    } finally {
      setSyncingGlobal(false);
    }
  },

  setOnboardingData: (data) => set((state) => {
    const next = { ...state.onboardingData, ...data };
    if (state.userId && data.struggles) {
      fireSync(() => dbService.saveUserProfile(state.userId!, { struggles: data.struggles } as any), 'saveStruggles', state.userId);
    }
    return { onboardingData: next };
  }),
  setThemePreference: (theme) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveUserProfile(state.userId!, { themePreference: theme } as any), 'saveThemePreference', state.userId);
    return { themePreference: theme };
  }),
  setAccentColor: (color) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveAccentColor(state.userId!, color), 'saveAccentColor', state.userId);
    return { accentColor: color };
  }),
  triggerGlobalConfetti: () => {
    set({ globalConfetti: true });
    // Auto turn off so it can be re-triggered
    setTimeout(() => {
      set({ globalConfetti: false });
    }, 4000);
  },
  setHasSeenWalkthrough: (seen) => set((state) => {
    if (state.userId) fireSync(() => dbService.saveUserProfile(state.userId!, { hasSeenWalkthrough: seen }), 'saveWalkthroughState', state.userId);
    return { hasSeenWalkthrough: seen };
  }),
  updateNotificationSettings: (updates) => {
    const state = get();
    const prev = state.notificationSettings;
    const next = { ...prev, ...updates };
    
    set({ notificationSettings: next });

    // Side-effects: Handle real-time cancellation/rescheduling
    import('@/services/notificationService').then(({ notificationService }) => {
      // ━━ MASTER TOGGLE ━━
      if (updates.masterEnabled === false) {
        notificationService.cancelAllNotifications();
        return; 
      }
      
      if (updates.masterEnabled === true) {
        // Re-schedule everything
        state.actions.refreshHabitNotifications();
        state.tasks.forEach(t => {
          if (!t.completed && t.startTime && t.date >= getTodayLocal()) {
            notificationService.scheduleTaskNotification(t.id, t.text, t.startTime, t.date);
          }
        });
        notificationService.scheduleMorningBrief();
        notificationService.scheduleDailyMoodReminder();
        notificationService.scheduleStreakWarningNotification();
        notificationService.scheduleQuestFOMO();
        notificationService.scheduleWeeklyLeaderboardAlert();
        notificationService.scheduleComebackNotifications();
        return;
      }

      // If Master is OFF, don't trigger individual side effects (they are already canceled)
      if (!next.masterEnabled) return;

      // ━━ GRANULAR TOGGLES ━━
      
      // Habits
      if (updates.habitReminders === true) {
        state.actions.refreshHabitNotifications();
      } else if (updates.habitReminders === false) {
        state.habits.forEach(h => notificationService.cancelHabitReminders(h.id));
      }

      // Tasks
      if (updates.taskReminders === true) {
        state.tasks.forEach(t => {
          if (!t.completed && t.startTime && t.date >= getTodayLocal()) {
            notificationService.scheduleTaskNotification(t.id, t.text, t.startTime, t.date);
          }
        });
      } else if (updates.taskReminders === false) {
        state.tasks.forEach(t => notificationService.cancelTaskNotification(t.id));
      }

      // Wellness
      if (updates.dailyMoodCheckin === true) notificationService.scheduleDailyMoodReminder();
      else if (updates.dailyMoodCheckin === false) notificationService.cancelMoodReminder();

      // Morning Brief
      if (updates.morningBrief === true) notificationService.scheduleMorningBrief();
      else if (updates.morningBrief === false) notificationService.cancelMorningBrief();

      // Streaks & XP
      if (updates.streakWarning === true) notificationService.scheduleStreakWarningNotification();
      else if (updates.streakWarning === false) notificationService.cancelStreakWarningNotification();

      if (updates.questCompleted === true) notificationService.scheduleQuestFOMO();
      else if (updates.questCompleted === false) notificationService.cancelQuestFOMO();

      if (updates.weeklyLeaderboard === true) notificationService.scheduleWeeklyLeaderboardAlert();
      else if (updates.weeklyLeaderboard === false) notificationService.cancelWeeklyLeaderboardAlert();

      // Re-engagement
      if (updates.comeback48h === true || updates.comeback7d === true) {
        notificationService.scheduleComebackNotifications();
      } else if (updates.comeback48h === false && updates.comeback7d === false) {
        // Technically comeback schedules both, but we can't easily cancel only one 
        // without deterministic IDs. scheduleComebackNotifications handles its own cancellations.
        notificationService.scheduleComebackNotifications(); 
      }
    });

    if (state.userId) {
      fireSync(() => dbService.saveUserProfile(state.userId!, { notificationSettings: next }), 'updateNotificationSettings', state.userId);
    }
  },
  buyStreakFreeze: async () => {
    const state = get();
    if (!state.userId) return;
    if (state.totalXP < 1000) {
      Toast.show({ type: 'error', text1: 'Not enough XP', text2: 'You need 1,000 XP to buy a Freeze.' });
      return;
    }
    if (state.streakFreezes >= 3) {
      Toast.show({ type: 'info', text1: 'Max Freezes Reached', text2: 'You can only hold 3 Streak Freezes at a time.' });
      return;
    }

    const newXP = state.totalXP - 1000;
    const newWeeklyXP = Math.max(0, state.weeklyXP - 1000);
    const newFreezes = state.streakFreezes + 1;
    const newLevel = computeLevel(newXP);
    
    set({ totalXP: newXP, weeklyXP: newWeeklyXP, streakFreezes: newFreezes, level: newLevel });
    
    // Save to global stats
    fireSync(() => dbService.updateGlobalStats(state.userId!, { totalXP: newXP, weeklyXP: newWeeklyXP }), 'buyFreeze_stats', state.userId);
    // Save freeze count to root profile
    fireSync(() => dbService.saveUserProfile(state.userId!, { streakFreezes: newFreezes } as any), 'buyFreeze_profile', state.userId);
    
    Toast.show({ type: 'success', text1: '❄️ Streak Freeze Bought!', text2: 'It will automatically be used if you miss a day.' });
  },
});
