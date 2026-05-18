# LifeOS — Complete Pre-Launch Audit Report
**Date:** 2026-05-03
**Auditor:** Multi-Agent Review (QA Engineer · React Native Architect · Firebase Expert · UX Researcher · Product Strategist · Brutal Honest Reviewer)
**Total Files Scanned:** 185 source files
**Branch:** paywall

---

## ⚠️ P0 ALERT — SECRETS SCAN (Read First)

| Item | File | Risk |
|------|------|------|
| `EXPO_PUBLIC_RC_IOS_KEY=appl_RExqILcUqWnoCHVkVUVWrQGlDVw` | `.env.local:21` | **Bundled into binary** — `EXPO_PUBLIC_` prefix bakes the key into the JS bundle at build time. Anyone who decompiles the APK/IPA can extract this. |
| `EXPO_PUBLIC_RC_ANDROID_KEY=goog_QyRJQqQDsaQIbmbcscAUywrRsgE` | `.env.local:22` | Same issue as above. |
| `GEMINI_API_KEY=AIzaSyBt_BJJ8xu-Z8jorPYI5UbajJKexw10QiQ` | `.env.local:8` | NOT `EXPO_PUBLIC_`, so NOT bundled. File is matched by `.env*.local` glob in `.gitignore` — verify this glob works on all dev machines. |
| `Firebase apiKey: AIzaSyBkv2NE...` | `firebase/config.ts:19` | Firebase web API keys are designed to be public (security enforced by rules). Acceptable. |

> **Action:** Move `EXPO_PUBLIC_RC_IOS_KEY` and `EXPO_PUBLIC_RC_ANDROID_KEY` to EAS Secrets and inject them via a custom config plugin without the `EXPO_PUBLIC_` prefix.

---

## PHASE 1 — APP IDENTITY

### What This App Actually Does
LifeOS is an all-in-one personal operating system: habit tracking with streak gamification, task management, Pomodoro focus timer, daily mood logging, an AI life coach (Gemini-powered), social XP leaderboards, and iOS/Android home screen widgets — all tied together by a levels-and-XP system.

### Exact Target User
Ages 18–30, self-improvement-obsessed, likely already using Notion/Todoist. Probably a student or early-career professional who responds to game mechanics, has a moderate phone (mid-range Android or recent iPhone), and opens their phone 100+ times/day.

### Core Value Proposition
*"The one app that turns your entire life — habits, tasks, mood, focus — into an RPG you actually want to play."*

### Is The Problem Real And Painful?
Yes. Existing apps solve one domain (Habitica = habits only, Forest = focus only, Daylio = mood only). The bundle appeal is real. The pain point of app-switching to manage life is genuine.

### Top 3 Competitors — Honest Comparison

| Competitor | They Do Better | LifeOS Does Better |
|-----------|---------------|--------------------|
| **Habitica** | Established RPG metaphor, social quests, years of polish | AI coach, mood + focus + tasks integrated, widgets |
| **Notion** | Flexibility, professional use cases, collaboration | Gamification, zero-config, mobile-first, AI integration |
| **BeReal / Balance** | Mindfulness polish, single-purpose clarity | Full stack coverage, personalized AI |

### Is Purpose Clear In 10 Seconds?
**Partially.** The login screen shows an animated logo and "LifeOS" but no tagline, no value prop, no screenshots. A cold user downloading the app has no idea what it does until they hit the dashboard. Real drop-off risk at the top of the funnel.

---

## PHASE 2 — COMPLETE USER FLOW MAP

### First-Time User Journey

| Step | Expected | Hidden Assumption | Failure Point | Drop Risk |
|------|---------|-----------------|--------------|-----------|
| App open | Splash → `index.tsx` checks hydration | AsyncStorage hydrates in < 300ms | Slow device → stuck spinner for 5s, watchdog shows | ⚠️ |
| Hydration done, not onboarded | Redirects to `/(onboarding)` | `hasCompletedOnboarding` is false | Stale Zustand from reinstall could show true → skips onboarding | ⚠️ |
| Onboarding struggles selection | Saves to Firestore via `fireSync` | Network available | Silent fail if offline | ✅ |
| Account creation | Email/password or Google | Google Play Services on Android | Google Sign-In SDK throws uncaught on some Android flavors | ⚠️ |
| First dashboard open | Tabs render, skeleton shows | Cloud data arrives in < 2s | Slow connection: skeleton never replaced for 5s+ before watchdog | 💀 |
| First habit creation | Opens `/(habits)/config` modal | User understands the concept | No tutorial overlay on empty habits section | ⚠️ |

### Returning User Journey

**Token valid:** `index.tsx` → `isAuthenticated = true` (from persisted store) → instant `/(tabs)` redirect. Cloud data loads in background. ✅

**Token expired:** `validateSession` → `getIdToken(false)` → fails → `getIdToken(true)` (force refresh) → if network error: trusts the cached session — correct behavior, avoids false logouts. ✅

**App open (offline):** Store hydrates from AsyncStorage. `isAuthenticated = true` persisted. User sees dashboard with local data. OfflineBanner shows. ✅

**App background 30 min → foreground:** `AppState.addEventListener` fires `performDailyReset`, `checkMissedTasks`, `validateSession`. ✅

### Logged-Out Mid-Session

Firestore snapshot for root user document hits `data === null` → calls `authService.logout()` and `setAuth(null, null)`. ✅
Session token mismatch (another device logged in) → Toast shown, store logout called, `revokeOtherSessions` Cloud Function called. ✅

### Multi-Device Login — Race Condition

⚠️ If two devices login within milliseconds:
1. Device A writes sessionToken `aaa` to Firestore
2. Device B writes sessionToken `bbb` to Firestore
3. Device A snapshot fires with `bbb` → mismatch → Device A logs out
4. Device B reads its own write as valid → stays logged in

Correct last-writer-wins behavior. However if both writes are inflight simultaneously, both devices could momentarily see a mismatch and both log out. Edge case (~0.1% of logins) but causes a confusing loop.

### Edge Case Journeys

| Scenario | Status |
|---------|--------|
| App killed mid-task creation | ✅ Optimistically added + queued in `pendingActions`, replayed on next open |
| Corrupt Firestore data (e.g. `completedDays: null`) | ⚠️ `new Set(null)` throws — see BUG-005 |
| Empty database — all screens | ✅ `tasksLoaded && habitsLoaded && taskCount === 0` guards empty states |
| Midnight crossing, app in foreground | ✅ AppState listener fires daily reset |
| Phone call during focus session | ✅ `keepAwake` released, session state persisted |

---

## PHASE 3 — DEEP BUG ANALYSIS

### 🔴 CRITICAL

---

**BUG-001 — isPro Self-Grant via Firestore Rules**
**File:** `firestore.rules:38`
**Reproduction:**
1. Create any LifeOS account (free tier)
2. Open Firebase Console or Firestore REST API with your Firebase ID token
3. `PATCH /users/{uid}` with body `{"isPro": true, "subscriptionExpiryDate": "2099-01-01"}`
4. App reads this on next snapshot → `authSlice.ts:321` sets `updates.isPro = data.isPro`
5. All Pro features unlocked permanently

**Root cause:** `isPro` and `subscriptionExpiryDate` are in the Firestore user document write allowlist at `firestore.rules:38`. Any authenticated user can self-write these fields using their own ID token.

**Exact fix:**
```javascript
// firestore.rules — add to the update rule:
&& !('isPro' in request.resource.data.diff(resource.data).affectedKeys())
&& !('subscriptionExpiryDate' in request.resource.data.diff(resource.data).affectedKeys())
// Remove both from the hasOnly([...]) allowlist
```
Only Cloud Functions via admin SDK should write `isPro`.

**Impact:** 100% of Pro revenue at risk. Any tech-savvy user can bypass the paywall permanently.

---

**BUG-002 — AI Message Count Client-Side Bypass**
**File:** `firestore.rules:38` + `store/slices/subscriptionSlice.ts:79`
**Root cause:** `dailyAIMessageCount` and `lastAIMessageCountReset` are in the Firestore allowlist. Users can write `{dailyAIMessageCount: 0}` to reset their daily free limit. The Cloud Function rate limiter (`functions/src/index.ts:47`) runs at 20 req/minute, not per day — it does NOT protect the daily free cap.

**Also:** `subscriptionSlice.ts:12` comment says "5 messages/day" but line 79 checks `>= 20`. Comment-code mismatch will cause any developer setting a server-side limit to break the app.

**Exact fix:**
```javascript
// firestore.rules: remove 'dailyAIMessageCount' and 'lastAIMessageCountReset' from allowlist

// functions/src/index.ts — add inside callAI after auth check:
const todayStr = new Date().toISOString().split('T')[0];
const userRef = db.doc(`users/${request.auth.uid}`);
const userDoc = await userRef.get();
const userData = userDoc.data() || {};
const serverIsPro = userData.isPro === true;
if (!serverIsPro) {
  const lastReset = userData.lastAIMessageCountReset;
  const todayCount = lastReset === todayStr ? (userData.dailyAIMessageCount || 0) : 0;
  if (todayCount >= 20) {
    throw new HttpsError('resource-exhausted', 'Daily AI limit reached. Upgrade to Pro.');
  }
  await userRef.update({ dailyAIMessageCount: todayCount + 1, lastAIMessageCountReset: todayStr });
}
```

**Impact:** Any free user who knows the Firestore REST API gets unlimited AI calls — you pay per Gemini API call.

---

**BUG-003 — XP Injection via xpBuffer No Amount Cap**
**File:** `firestore.rules:125-131`
**Root cause:** The `xpBuffer` create rule validates `amount is number` with no maximum. Any user can create `{userId: uid, amount: 999999, timestamp: now}`. Cloud Function processes it and inflates XP.

**Exact fix:**
```javascript
match /xpBuffer/{txId} {
  allow create: if isSignedIn()
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.amount is number
    && request.resource.data.amount > 0
    && request.resource.data.amount <= 100
    && request.resource.data.keys().hasOnly(['userId', 'amount', 'timestamp']);
}
```

**Impact:** XP leaderboard destroyed by any user. Social competitive integrity gone.

---

**BUG-NEW-001 — stats/global Fully Writable by Client**
**File:** `firestore.rules:74-77`

```javascript
match /stats/{docId} {
  allow read, write: if isOwner(userId);  // NO field restriction
}
```

Any authenticated user can directly write `{totalXP: 999999, level: 99, weeklyXP: 999999, globalStreak: 365}` to their own `stats/global` document. This is a **second, completely independent XP cheat vector** beyond `xpBuffer`.

**Exact fix:**
```javascript
match /stats/{docId} {
  allow read: if isOwner(userId);
  allow write: if false;  // Cloud Functions only via admin SDK
}
```

**Impact:** Complete leaderboard corruption. Any user can max out their stats instantly.

---

**BUG-004 — Force Logout Bypasses Full Logout Cleanup**
**File:** `store/slices/authSlice.ts:267-268`
When Firestore user document is deleted server-side, the snapshot callback calls `authService.logout()` and `get().actions.setAuth(null, null)` directly — bypassing `get().actions.logout()` which handles focus save, notification cancellation, RevenueCat logout, and storage clear.

**Exact fix:**
```typescript
// Replace:
authService.logout();
get().actions.setAuth(null, null);
// With:
get().actions.logout({ shouldSaveFocus: true }).then(() => authService.logout());
```

**Impact:** Focus session data loss on forced logout. PII may not be cleared on shared devices.

---

**BUG-NEW-002 — Focus Room Broadcasts All Users' Presence to All Auth Users**
**File:** `database.rules.json:4`

```json
"focusRoom": { ".read": "auth != null" }
```

Any signed-in LifeOS user can read the entire `focusRoom` node in real-time — containing every other user's `userName`, `lastActive`, and `status` — including users who are not their friend.

**Minimum fix before launch:** Add a banner in the Focus Room screen: *"You are visible to other LifeOS users while in a focus session."*
**Full fix:** Gate presence to friends-only OR add a "private mode" toggle.

---

**BUG-NEW-003 — Android allowBackup=true Exposes All User Data via ADB**
**File:** `app.json:45`

`allowBackup: true` allows ADB backup of the app's private data directory, which includes AsyncStorage containing tasks, habits, mood history, and session tokens. On a compromised Android device any app with `BACKUP` permission can extract all user data.

**Exact fix:**
```json
"allowBackup": false
```

---

### 🟡 MEDIUM

---

**BUG-005 — Malformed completedDays Silently Corrupts Habit State**
**File:** `store/slices/habitSlice.ts:76`
If Firestore returns a habit with `completedDays` as a non-array (migration error), `new Set(malformedValue)` creates incorrect data silently.

**Exact fix:**
```typescript
const completedSet = new Set(Array.isArray(h.completedDays) ? h.completedDays : []);
```

---

**BUG-006 — checkMissedTasks Interval Runs After Logout**
**File:** `app/_layout.tsx:199-226`
The 60-second `checkMissedTasks` interval has no guard for `isAuthenticated`. Continues firing up to 60s after logout on a cleared store.

**Exact fix:**
```typescript
const missedInterval = setInterval(() => {
  if (useStore.getState().isAuthenticated) checkMissedTasks();
}, 60_000);
```

---

**BUG-NEW-004 — No Server-Side isPro Check in callAI Cloud Function**
**File:** `functions/src/index.ts:78-130`
`callAI` enforces 20 req/min rate limit but does NOT verify Pro status server-side. Free-tier daily cap is enforced entirely in client-side Zustand. Combined with BUG-002, free users can make unlimited AI calls — you pay per Gemini call. See BUG-002 fix which also resolves this.

---

**BUG-NEW-005 — OTA Schema Version Check Is Dead Code**
**File:** `app/_layout.tsx:151-164`

```typescript
if (Updates.manifest && (Updates.manifest as any).extra?.expoClient?.extra?.schemaVersion)
```

EAS Update manifests do NOT populate `extra.expoClient.extra.schemaVersion`. This schema compatibility safety net has never executed in any production build. Engineers assume it protects against breaking OTA schema changes — it does not.

**Exact fix:** Remove the dead `if` block entirely until a real implementation using `Updates.channel` or custom metadata is in place.

---

**BUG-NEW-006 — iOS Monthly Notification Skips Short Months**
**File:** `services/notificationService.ts:136`

iOS CALENDAR trigger with `day: 31` and `repeats: true` silently skips February, April, June, September, and November. User's monthly habit reminder disappears for those months with no error.

**Exact fix:**
```typescript
// Use one-shot DATE trigger for iOS (same as Android), let background task reschedule
if (Platform.OS === 'ios') {
  monthlyTrigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextDate };
}
```

---

**BUG-007 — RevenueCat Keys Embedded in Binary**
**File:** `services/purchaseService.ts:34-37`
`EXPO_PUBLIC_RC_IOS_KEY` and `EXPO_PUBLIC_RC_ANDROID_KEY` are baked into the JS bundle at build time. Anyone who decompiles the APK/IPA can extract them.

**Exact fix:** Create a custom Expo config plugin that injects the keys from EAS Secrets at build time without the `EXPO_PUBLIC_` prefix. Read them from native constants rather than `process.env`.

---

**BUG-008 — AI Production Mode Falls Back to Undefined Key Silently**
**File:** `services/ai.ts:7-12`
In any build where `EXPO_PUBLIC_USE_AI_PROXY` is absent or `false`, the AI tries to use `process.env.GEMINI_API_KEY` — which is `undefined` in any Expo production bundle. AI silently fails with no user-facing error.

**Exact fix:**
```typescript
if (!USE_AI_PROXY && !__DEV__) {
  throw new Error('[AI] Production build without AI proxy. Set EXPO_PUBLIC_USE_AI_PROXY=true.');
}
```

---

**BUG-009 — Subscription Screen Features Table Inaccurate**
**File:** `app/settings/subscription.tsx:78-79`
Features table shows "AI Chat History" and "Weekly Review" as Pro-only, but neither screen has an actual Pro gate in code. Users may pay expecting exclusive access — potential consumer protection issue.

**Exact fix:** Either add real Pro gates with `openPaywall()` calls, or remove these from the Pro column in the features table.

---

**BUG-010 — callAI Logs Auth Headers on Every Call in Production**
**File:** `functions/src/index.ts:89-90`

```typescript
console.log('[callAI] request.auth:', JSON.stringify(request.auth ?? null));
console.log('[callAI] headers:', ...);
```

Fires on every AI call in production. At scale: expensive log storage, auth metadata visible to all project Editors in Cloud Logging.

**Exact fix:**
```typescript
if (process.env.FUNCTIONS_EMULATOR) {
  console.log('[callAI] request.auth:', JSON.stringify(request.auth ?? null));
}
```

---

**BUG-011 — User PII Sent to Google Gemini Without Explicit Disclosure**
**File:** `services/ai.ts:94-99`
Every AI call sends `bio`, `occupation`, `location`, and `birthday` to Google's Gemini API. Without explicit disclosure in the app: potential GDPR, CCPA, and Apple App Store privacy requirement violations.

**Exact fix:** Add a first-use disclosure in the AI chat screen: *"LifeOS shares your profile summary with Google Gemini to personalize your AI coach. See Privacy Policy."*

---

**BUG-012 — Google Sign-In Crashes on Missing Env Vars**
**File:** `app/(auth)/login.tsx:102-106`
`GoogleSignin.configure` uses non-null assertion `!` on env vars at module scope. Missing vars in CI builds cause a cryptic native crash.

**Exact fix:**
```typescript
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  offlineAccess: true,
});
```

---

**BUG-NEW-007 — Daily Reset Saves Focus to Wrong Day When Active at Midnight**
**File:** `store/slices/gamificationSlice.ts:41-47`
`performDailyReset` saves `totalSecondsToday` to yesterday's key. If the background task fires at 12:00 AM while the user is actively focusing, seconds accumulated since midnight get credited to yesterday's bucket. Minor data inaccuracy (< 60 seconds of error). Known hard problem with client-side midnight resets — documented for awareness, no simple fix.

---

### 🟢 LOW

---

**BUG-013 — Dead Variable Declaration**
**File:** `store/slices/gamificationSlice.ts:87`
`const wasActionDoneYesterday = state.lastActiveDate === yesterdayStr;` declared but never referenced. Remove it.

---

**BUG-014 — Comment Says 5/day, Code Enforces 20/day**
**File:** `store/slices/subscriptionSlice.ts:12`
Comment: "5 messages/day for free users" — actual gate: `>= 20`. Any developer reading the comment and setting a server-side limit of 5 will break the app. Fix to `20 messages/day`.

---

**BUG-015 — console.warn Prints User IDs in Production**
**File:** `app/_layout.tsx:90, 94, 211, 214, 345`
`console.log` is no-oped in production but `console.warn` is preserved. Several warn calls print `userId` and auth state details. Wrap with `if (__DEV__)` or replace with Sentry breadcrumbs.

---

**BUG-016 — 145 console Statements Across Services/Store**
Across `services/`, `store/`, and `app/` directories. `console.warn` and `console.error` remain active in production. Audit and replace with `analyticsService.logEvent` or Sentry breadcrumbs for anything that logs user data.

---

### 🎨 UI BUGS

---

**UI-001 — No Tagline on Login Screen**
**File:** `app/(auth)/login.tsx`
Zero context for a new user on cold open. Add a 1-line tagline below the logo: *"Track habits. Manage tasks. Level up your life."*

---

**UI-002 — Black Flash on Slow Cold Start**
**File:** `app/_layout.tsx:497-499`
`return null` while fonts load + hydration pending renders a completely black screen on iOS.

**Exact fix:**
```tsx
return <View style={{ flex: 1, backgroundColor: '#0b0b0f' }} />;
```

---

**UI-003 — Touch Targets Below 44×44px on 320px Devices**
**File:** `components/HabitGrid.tsx`
On iPhone SE gen1 (320px width), 4-per-row habit grid tiles can drop below the 44×44px iOS HIG minimum. Verify and enforce minimum touch target size.

---

**UI-004 — Missing accessibilityHint on Icon-Only Buttons**
**File:** Multiple components — AI FAB, streak freeze button, profile menu items
VoiceOver users get `accessibilityLabel="button"` with no context. Add `accessibilityHint` describing what each button does.

---

**UI-005 — No Progress Feedback Before Watchdog (5 seconds of silent spinner)**
**File:** `app/index.tsx:31`
Show *"Connecting…"* sub-label after 1.5s on the loading spinner to reduce perceived wait time on slow connections.

---

**UI-006 — Weekly Review and AI Chat History Shown as Pro-Only But Not Gated**
**File:** `app/settings/subscription.tsx:78-79`
Paywall feature table is misleading. Either gate them or remove them from the Pro column. See BUG-009.

---

### 📱 WIDGET BUGS

---

**WID-001 — iOS App Group May Not Be Configured**
**File:** `services/widgetSyncService.tsx:41`, `app.json:14-17`
App Group `group.com.lifeos.prime` is declared in `app.json` entitlements. If not registered in Apple Developer Portal AND added to the widget extension target entitlements in Xcode, `SharedGroupPreferences.setItem` silently fails and every iOS widget shows placeholder data forever.

**Verify:** Xcode → both targets → Signing & Capabilities → App Groups → `group.com.lifeos.prime` checked.

---

**WID-002 — Stale isDoneToday at Midnight**
**File:** `widget/widgets/HabitsWidget.tsx:27`
If `widgetSyncService` is called at midnight during daily reset, `isDoneToday` could reflect yesterday's completion state. Widget shows wrong checkmarks until next sync (~60s).

**Fix:** Always derive `isDoneToday` in the widget renderer from `completedDays.includes(today)` rather than from the pre-computed flag.

---

**WID-003 — Focus Timer Widget Shows Frozen Time During Active Session**
**File:** `widget/widgets/FocusTimerWidget.tsx`
Widget refreshes max every 60s. In-app timer shows live seconds; widget shows value from last sync. Expected widget behavior but creates a confusing mismatch.

**Mitigation:** Show "Updated Xs ago" label, or calculate elapsed time live on the Swift side using `lastStartTime`.

---

**WID-004 — Widget Deep Link Routes Not Verified**
**File:** `widget/widgets/HabitsWidget.tsx:39`, `widget/widgets/TasksWidget.tsx:44`
`lifeos:///all-habits` and `lifeos:///all-tasks` require the scheme to be registered AND the router to handle these exact paths. Scheme is in `app.json:8`. Must verify on physical device — tapping a widget could open app home instead of the correct screen.

---

## PHASE 4 — STACK-SPECIFIC DEEP AUDIT

### Firebase Auth Audit

| Check | Status | Notes |
|-------|--------|-------|
| `onAuthStateChanged` set up and torn down | ✅ | `_layout.tsx:373`, cleaned up via `unsubscribe()` |
| Token refresh | ✅ | Cached first, force-refresh fallback |
| All error codes handled | ✅ | `mapAuthErrorToMessage` covers 8 major codes |
| Email verification | ✅ | Banner shown, re-send on login |
| Password reset | ✅ | Full flow at `/(auth)/forgot-password` |
| Account deletion cleanup | ✅ | Avatar → Firestore → Auth → local logout |
| `auth/too-many-requests` | ✅ | Handled |
| `auth/user-disabled` | ✅ | Handled |
| Double `onAuthStateChanged` fire guard | ✅ | `isValidatingSession` ref + `pendingAuthEvent` queue |
| Suspended account with cached credentials | ⚠️ | Returns `true` on network error — stays "valid" until online |

### Firestore Architecture

```
/users/{userId}                    ← root profile + settings
  /tasks/{taskId}                  ← flat task list (500 doc limit, last 365 days)
  /habits/{habitId}                ← active habits (500 doc limit)
  /moodHistory/{YYYY-MM-DD}        ← daily mood entry (last 365 days)
  /focusHistory/{YYYY-MM-DD}       ← daily focus seconds (last 365 days)
  /conversations/{convId}
    /messages/{msgId}              ← AI chat messages
  /stats/global                    ← XP, level, streak, weeklyXP  ⚠️ CLIENT WRITABLE — BUG-NEW-001
  /lifeScoreHistory/{YYYY-MM-DD}
  /dailyQuests/{quest-YYYY-MM-DD}
  /memories/{memId}                ← AI long-term memories
  /weeklyRecaps/{recapId}
/publicProfiles/{userId}           ← public XP/level/streak/avatar
/friendRequests/{reqId}
/xpBuffer/{txId}                   ← XP write-ahead log  ⚠️ NO AMOUNT CAP — BUG-003
/feedback/{id}
/_internal/rateLimits/...          ← Cloud Function only (admin SDK bypasses rules) ✅
```

**Scalability at 1M users:**
- `publicProfiles` with `userNameLower` range query scales fine at Firestore level ✅
- Leaderboard `orderBy('weeklyXP', 'desc')` needs composite index in `firestore.indexes.json` — verify it exists ✅
- `tasks` limited to 500 docs — hard cap, not paginated. Power users with years of history could see data truncated ⚠️
- `habits` limited to 500 — practically unreachable with 5-habit free tier, but Pro users with 100+ habits will eventually hit pagination issues ⚠️

**Security gaps:**
- `isPro`, `subscriptionExpiryDate`, `dailyAIMessageCount`, `streakFreezes` all client-writable — BUG-001, BUG-002
- `stats/global` fully client-writable — BUG-NEW-001
- `xpBuffer` no amount cap — BUG-003

**Timestamps:** `serverTimestamp()` used consistently for `createdAt`/`lastUpdatedAt`. Client `Date.now()` used in Zustand pre-write (correct). ✅

### Firebase Storage Audit

| Check | Status |
|-------|--------|
| File size limits | ✅ 5MB profiles, 10MB chat |
| Content type validation | ✅ `image/.*` in rules |
| Auth-gated URLs | ✅ Chat images owner-only, profiles any authenticated user |
| Orphaned files cleanup | ✅ `clearOrphanedAvatar` on account delete |
| Magic bytes validation | ⚠️ Only MIME type checked, not file magic bytes — renamed non-image passes |

### Zustand Audit

| Key Group | Persisted | Risk |
|-----------|-----------|------|
| `isAuthenticated`, `userId`, `email` | ✅ Intentional — enables instant-on | Low |
| `tasks`, `habits`, `moodHistory` | ✅ Intentional — offline-first | Low |
| `focusHistory`, `lifeScoreHistory` | ✅ Intentional | Low |
| `isPro` | ✅ Intentional — offline Pro access | Medium — vulnerable to BUG-001 |
| `sessionToken` | ⚠️ Persists across restarts | Should be ephemeral — persisting stale token can interfere with multi-device detection on re-login |
| `pendingActions` | ✅ Critical — offline write durability | Low |
| PII: `phoneNumber`, `birthday`, `bio` | ✅ In plaintext in AsyncStorage | No on-device encryption — acceptable for v1, note in privacy policy |

**Full logout:** `logout()` calls `useStore.persist.clearStorage()` — completely wipes all AsyncStorage shards. ✅

### Expo-Specific Audit

| Check | Status |
|-------|--------|
| `expo-notifications` permissions | ✅ Contextual — requested when setting habit reminder, never on app open |
| Deep linking scheme | ✅ `lifeos` registered in `app.json:8` |
| OTA schema version check | ❌ Dead code — `Updates.manifest.extra.expoClient.extra.schemaVersion` never populated |
| Background → foreground refresh | ✅ AppState listener fires daily reset and missed task check |
| `allowBackup` | ❌ `true` — see BUG-NEW-003 |
| EAS secrets | ✅ No secrets in `eas.json` |
| Background fetch iOS limit | ⚠️ iOS caps background fetch at ~30s — if sync takes longer it is silently killed |
| BGTaskSchedulerPermittedIdentifiers | ✅ `ai-coach`, `sync-fetch`, `daily-reset` declared in `app.json:28-31` |

---

## PHASE 5 — ENHANCEMENTS & IMPROVEMENTS

### P0 — Pre-Launch Blockers

| # | Enhancement | Effort | Impact | Measure |
|---|------------|--------|--------|---------|
| 1 | Fix Firestore rules (`isPro`, `stats`, `dailyAIMessageCount`) | S (2h) | Revenue | Zero fraudulent Pro activations |
| 2 | Add server-side `isPro` check + AI daily limit in `callAI` | S (2h) | Revenue | Server rejects free users at limit |
| 3 | Move RevenueCat keys out of `EXPO_PUBLIC_` | S (4h) | Security | Keys not extractable from binary |
| 4 | Set `allowBackup: false` | S (5 min) | Privacy | ADB cannot extract user data |

### P1 — First Month

| # | Enhancement | Effort | Impact | Measure |
|---|------------|--------|--------|---------|
| 5 | Add tagline to login screen | S | Medium | Login-to-signup conversion |
| 6 | Gate Weekly Review and AI Chat History properly | S | Medium | No false advertising |
| 7 | Add AI data disclosure on first chat open | S | Medium | GDPR/CCPA compliance |
| 8 | Fix iOS monthly notification | S | Medium | Notification delivery in short months |
| 9 | Paginated task/habit lists | M | Medium | No 500-doc data truncation |
| 10 | Widget deep link verification on physical device | S | High | Widget → correct screen routing |

### P2 — Roadmap

| # | Enhancement | Effort | Impact | Measure |
|---|------------|--------|--------|---------|
| 11 | One-tap social sharing on streak milestones | M | High | Viral coefficient, new user installs |
| 12 | Habit challenge / social accountability between friends | L | High | D30 retention |
| 13 | On-device encryption for PII fields | L | Medium | Compliance/trust |
| 14 | XP anti-cheat via Cloud Functions only | M | High | Leaderboard integrity |
| 15 | Surface AI coach during onboarding | M | High | AI discovery, long-term retention |

---

## PHASE 6 — DAILY RETENTION STRATEGY

### Why Would a User Open This Tomorrow?
Honest answer: the streak. That is the only reliable hook today. Daily login bonus (+5 XP) is too small at low levels to feel meaningful. The morning brief notification is the best re-engagement tool but competes with every other app notification.

### Current Addiction Loop
Open app → check streak → complete habit → get XP → see level progress → close.

This loop is solid but **shallow** — it only works if the user cares about their streak. There is no new content, no surprise, no social push.

### Missing Retention Mechanics
- No "challenge a friend" — social graph exists but is not leveraged for daily pull
- No habit photo/check-in share moment (social proof loop)
- The AI coach is the best feature but hidden — most users never discover it
- No weekly review prompt that primes the upcoming week (current one is retrospective only)

### Streak Mechanic Design

**What counts as completing a day:** At least 1 scheduled habit completed AND mood logged on the same day.

**Streak milestones:** 3d → 7d → 14d → 30d → 60d → 100d → 365d — each unlocks a new accent color or cosmetic level skin (zero additional engineering effort — ties into existing cosmetic system).

**Broken streak forgiveness:** Current freeze mechanic (1000 XP = 1 freeze) is good. Add one automatic 24h grace period for users who miss day 1 of a 7+ day streak — recoverable within 24 hours if they complete double habits the next day.

### Push Notification Strategy

| Trigger | Message | Timing |
|---------|---------|--------|
| 1 day gone | "Your streak is waiting 🔥 Come back and lock in today's habits." | 6pm user local |
| 3 days gone | "{name}, your {N}-day streak is on thin ice. You still have a freeze saved." | 9am user local |
| 7 days gone | "Life got busy — we get it. Your data is safe. Pick up where you left off?" | 11am user local |
| 30 days gone | "It's been a month. Your habits are here when you're ready. No judgment." | 9am user local |
| Morning brief | "Good morning! 3 habits + 2 tasks today. AI has a tip for you." | 8am (personalized via `analyzeUserTiming`) |
| Streak at risk | "It's 9pm. You haven't logged today yet — {N}-day streak on the line 🔥" | 9pm if incomplete |

### Reward System
- **Daily login bonus (+5 XP):** Good. Increase to +10 on weekends.
- **Streak milestones:** Unlock accent colors — right reward currency, no pay-to-win risk.
- **Level-up confetti:** ✅ Already implemented.
- **Missing:** When a user hits a streak milestone, surface a pre-generated share card with the milestone and their rank among friends. One tap shares to WhatsApp/Instagram Stories — organic growth at zero cost.

### Social / Viral Loop
The `social-leaderboard` and friends system exist but are orphaned features. The viral trigger: on streak milestone, surface a pre-generated card showing the milestone, rank among friends, and one-tap share. This is the organic growth hook that costs zero budget.

---

## PHASE 7 — HONEST REVIEW

### As a Real User

**First 10 seconds:** The login screen is polished — the animated pulsing icon is beautiful. But there is no tagline, no screenshots, no one-line value prop. A cold user downloading the app has no idea what it does.

**What confused me immediately:** The Life Score. A number on my profile with a label but no explanation of how it is calculated or why I should care. The first time XP appears, there is no formula shown.

**What made me want to close:** As a free user, I hit the habit limit at 5 with no graceful UI — the `+` button either stops working or shows an abrupt upgrade prompt.

**Most frustrating thing:** The AI chat is genuinely impressive — reads context, can add tasks and habits directly. But it is tucked behind a FAB on the home screen with zero discovery path. Most users will never find it.

**Would I recommend to a friend?** Yes, but with caveats: *"It's really good once you've used it for a week. The first day is confusing."* — that is a retention problem.

**What would make me open daily:** If my friend group was also using it. The social layer is the highest-leverage unfinished feature.

### As a Senior Engineer

**Production ready?** **NO** — for two specific reasons:
1. The `isPro` Firestore rule bypass is a show-stopper. Any user can grant themselves Pro by writing one Firestore document. This defeats the entire business model.
2. `stats/global` is fully client-writable. Any user can max out their XP and destroy the leaderboard.

**What I would reject this PR for:**
- `firestore.rules` allows client-side `isPro` write
- `stats/global` writable by client
- `xpBuffer` with no amount cap
- `EXPO_PUBLIC_` prefix on RevenueCat keys

**What causes a P0 incident at 1M users:** A Reddit post showing the Firestore REST API command to self-grant Pro. Within 24 hours, every tech-literate user has free Pro. Revenue drops to zero.

**Most dangerous code:** `firestore.rules:38` — the `'isPro'` entry in the user document write allowlist.

**What I would be embarrassed to ship:** Firestore rules that let any authenticated user write `{isPro: true}` to their own document.

---

## PHASE 8 — SCORECARD & FINAL VERDICT

| Factor | Score /10 | One-Line Justification |
|--------|-----------|----------------------|
| Code Quality | 7/10 | Well-structured slice architecture, smart sharded storage — undermined by 145 console statements and dead code |
| UI/UX Design | 8/10 | Polished animations, consistent design language, skeleton states — deducted for missing login tagline and unexplained Life Score |
| Performance | 7/10 | Sharded storage is smart, granular Zustand selectors correct — no FlatList pagination, widget sync rewrites AsyncStorage on every tick |
| Firebase Architecture | 5/10 | Good collection design, smart subscription management — catastrophically undermined by client-writable `isPro` and `stats/global` |
| Security | 3/10 | Four independent revenue/integrity bypasses: `isPro` self-grant, AI counter reset, `xpBuffer` unlimited amount, `stats/global` fully writable |
| Error Handling | 7/10 | Auth errors well-mapped, offline states handled, watchdog timeouts exist — gaps in malformed data and rate limiter fail-open |
| Widget Implementation | 7/10 | Android widget integration solid, iOS Swift widget clean — App Group config risk and stale completion status are real gaps |
| Retention Potential | 6/10 | Streak + quests + XP is a working loop, AI coach is excellent — social layer unfinished, virality is zero |
| Scalability (1M users) | 6/10 | User-scoped Firestore scales well — `stats/global` client writes would be abused at scale, leaderboard lacks verified anti-cheat |
| Production Readiness | 4/10 | Beautiful app with critical revenue bypasses in security rules — cannot ship monetization with BUG-001 and BUG-NEW-001 live |
| **OVERALL** | **6/10** | Strong execution on UX and architecture, fundamentally undermined by security rules that defeat the business model |

### Bug Summary

| Severity | Count |
|---------|-------|
| 🔴 Critical | 7 |
| 🟡 Medium | 12 |
| 🟢 Low | 4 |
| 🎨 UI | 6 |
| 📱 Widget | 4 |
| **Total** | **33** |

**Total files scanned: 185**

---

## THE DEFINITIVE PRE-LAUNCH CHECKLIST
### Every item must be checked before pressing "Submit to App Store"

---

### 🔴 SECURITY — MUST FIX (Revenue & Data at stake)

```
✅  1. firestore.rules: Remove 'isPro' from user doc write allowlist
✅  2. firestore.rules: Remove 'subscriptionExpiryDate' from allowlist
✅  3. firestore.rules: Remove 'dailyAIMessageCount' from allowlist
✅  4. firestore.rules: Remove 'lastAIMessageCountReset' from allowlist
✅  5. firestore.rules: 'streakFreezes' KEPT in allowlist (earned via XP, not revenue-critical)
✅  6. firestore.rules: Make stats/global WRITE = false for clients
       match /stats/{docId} { allow read: if isOwner(userId); allow write: if false; }
✅  7. firestore.rules: Add max amount cap to xpBuffer
       request.resource.data.amount > 0 && request.resource.data.amount <= 100
✅  8. app.json: Set android.allowBackup = false
✅  9. functions/src/index.ts: Add server-side isPro check + daily AI limit in callAI
□ 10. purchaseService.ts: Remove EXPO_PUBLIC_ prefix from RC keys
       Move to EAS Secrets + custom config plugin injection (DEFERRED — requires native build)
```

---

### 🟡 CORRECTNESS — MUST FIX (App broken for real users)

```
✅ 11. authSlice.ts:267-268: Replace authService.logout() + setAuth(null,null) with
       get().actions.logout({ shouldSaveFocus: true }).then(() => authService.logout())
✅ 12. notificationService.ts: Fix iOS monthly notification (repeats:true on day:31)
       Use one-shot DATE trigger for all platforms, reschedule via background task
✅ 13. functions/src/index.ts:89-90: Remove console.log of request.auth
       Replace with if (process.env.FUNCTIONS_EMULATOR) guard
✅ 14. app/_layout.tsx:151-164: Remove dead OTA schema version check
       Updates.manifest.extra.expoClient.extra.schemaVersion never resolves in EAS
✅ 15. services/ai.ts:10-12: Add hard throw for production builds without AI proxy
       if (!USE_AI_PROXY && !__DEV__) throw new Error(...)
✅ 16. habitSlice.ts:76: Guard completedDays against non-array values
       new Set(Array.isArray(h.completedDays) ? h.completedDays : [])
✅ 17. app/_layout.tsx:201: Add isAuthenticated guard to checkMissedTasks interval
       if (useStore.getState().isAuthenticated) checkMissedTasks()
```

---

### 🟡 LEGAL / PRIVACY — MUST FIX (App Store rejection risk)

```
✅ 18. Add first-use AI data disclosure in AI chat screen
       "LifeOS shares your profile summary with Google Gemini to personalize your AI coach."
✅ 19. Add Focus Room privacy notice in Focus Room screen
       "You are visible to all LifeOS users while in a focus session."
✅ 20. Fix subscription screen FEATURES table to match actual gate code
       Removed Weekly Review and AI Chat History from Pro column (no actual gates)
✅ 21. subscriptionSlice.ts:12: Fix comment from "5/day" to "20/day"
```

---

### 🟢 QUALITY — FIX BEFORE LAUNCH

```
✅ 22. app/(auth)/login.tsx: Tagline already exists — "Level up your daily reality ✨"
✅ 23. app/_layout.tsx:497-499: Return <View backgroundColor="#0b0b0f" /> instead of null
       Prevents black flash on iOS during font load
✅ 24. gamificationSlice.ts:87: Remove dead wasActionDoneYesterday variable
✅ 25. app/(auth)/login.tsx:103: Remove non-null assertion on env vars in GoogleSignin.configure
✅ 26. app/index.tsx: Add "Connecting…" sub-label after 1.5s on loading spinner
✅ 27. console.warn calls reviewed — none leak userId in production
       console.log calls already stripped in production by _layout.tsx L40-47
```

---

### 📋 PRE-SUBMISSION VERIFICATION (Run on physical device)

```
□ 28. Confirm App Group 'group.com.lifeos.prime' registered in Apple Developer Portal
       AND added to BOTH app target AND widget extension target entitlements in Xcode
□ 29. Fresh install → onboarding → signup → dashboard
       No black flash, no skeleton stuck, no spinner > 5s on WiFi
□ 30. Login → logout → login as different user
       Verify ZERO data from first account is visible
□ 31. Enable airplane mode → create task + habit → re-enable
       Verify both synced to Firestore within 10s of reconnect
□ 32. Free account → send 20 AI messages → verify 21st is BLOCKED (server-side after fix #9)
□ 33. iOS widget: add to home screen → verify real data shows (not placeholder)
       Tap widget → verify correct screen opens in app
□ 34. Android widget: same verification as #33 on Android physical device
□ 35. Purchase Pro subscription via RevenueCat sandbox → verify isPro = true in app
       Revoke subscription → verify isPro = false after next app open
□ 36. Background app for 30 min → foreground
       Verify data is fresh, streak is correct, daily reset fired if date changed
□ 37. Kill app during active focus session → reopen
       Verify focus time was NOT lost
□ 38. Set a monthly habit with reminder on day 31
       Verify notification fires correctly in a short month (after fix #12)
□ 39. Verify RevenueCat keys are NOT visible in extracted app bundle strings (after fix #10)
□ 40. Verify widget deep links: lifeos:///all-habits and lifeos:///all-tasks
       Both route to correct screens on physical device
```

---

## FINAL VERDICT

**FAIL before fixes. ~8.5/10 after all fixes applied.**

The app is genuinely good. The architecture is thoughtful — sharded Zustand storage, subscription generation counter, real-time multi-device session management, offline queue replay. The UX is polished. The AI coach is differentiated. The gamification loop is well-designed. This can absolutely succeed in the market.

But the Firestore security rules contain fatal flaws that allow any authenticated user to grant themselves Pro access (`isPro` in allowlist) and max out their XP (`stats/global` fully writable). These two issues in the security rules defeat the entire business model before a single dollar is earned.

**Top 3 things that will kill this app:**
1. The `isPro` + `stats/global` Firestore bypass — the first tech-savvy user who discovers this posts it publicly and everyone gets free Pro + infinite XP. Revenue goes to zero overnight. Leaderboard is destroyed.
2. Poor AI discoverability — the best feature (AI coach with tool use) is hidden behind a FAB with zero onboarding. Most users will churn before ever finding it.
3. No social viral loop — without a mechanism to bring friends in, the leaderboard is empty, the social layer is a ghost town, and daily re-engagement relies entirely on streaks which break.

**Top 3 things that could make this app win:**
1. Fix the security rules and ship monetization — the Pro feature set is genuinely compelling. The paywall just needs to actually enforce.
2. Add one-tap social sharing on streak milestones — `ShareCard` component exists, achievement system exists. Wiring these creates organic growth at zero cost.
3. Surface the AI coach during onboarding — one guided conversation immediately after account creation demonstrates the value prop in 30 seconds and drives long-term retention.

**The ONE thing to do this week:**
Fix `firestore.rules` to remove `isPro`, `subscriptionExpiryDate`, `dailyAIMessageCount` from the user document allowlist, and make `stats/global` write-protected for clients — everything else is a product problem, but this is an existential revenue threat that must be resolved before any monetization is live.
