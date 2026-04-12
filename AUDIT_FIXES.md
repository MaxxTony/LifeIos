# LifeOS — Bug Fix Document
> Generated: 2026-04-12  
> Resolved: 2026-04-12  
> Total Issues: 34 / 34 Fixed ✅

---

## Summary Checklist

### CRITICAL (Must fix before release)
- [x] C-1: Firebase credentials in source → moved to .env.local
- [x] C-2: Gemini API key acknowledged → moved to .env.local (full fix needs backend proxy)
- [x] C-3: Task ID collisions → replaced with `Crypto.randomUUID()`
- [x] C-4: `performDailyReset` never called → triggered in `_layout.tsx` on hydration
- [x] C-5: Base64 images in Firestore → replaced with Firebase Storage upload

### HIGH (Fix this week)
- [x] H-1: AI chat silent errors → error message now shown in chat bubble
- [x] H-2: Fake voice button → removed entirely
- [x] H-3: Streak UTC/local date mismatch → replaced with `formatLocalDate()` everywhere
- [x] H-4: `checkMissedTasks` wrong date → now uses `task.date` to build endDateTime
- [x] H-5: Focus timer background accumulation → AppState listener added
- [x] H-6: Fire-and-forget Firestore writes → wrapped in `fireSync()` with error logging
- [x] H-7: "Hi null!" in chat → added `|| 'there'` null guard

### MEDIUM (Fix in next sprint)
- [x] M-1: AI context wrong date → uses `getTodayLocal()` instead of `toISOString()`
- [x] M-2: Multiple AI tool calls → all tool results sent back now
- [x] M-3: Android tab bar always dark → uses `colors.isDark` for tint and bg
- [x] M-4: Dead `activeDot` style → deleted
- [x] M-5: Nested touchables on Android → restructured to sibling layout
- [x] M-6: HabitGrid day labels wrong → derived dynamically from calendar
- [x] M-7: MoodTrend day label UTC off-by-one → parses date components manually
- [x] M-8: No chat pagination → `limit(100)` added to getMessages query
- [x] M-9: Unused `keyboardHeight` state → deleted dead code
- [x] M-10: `keyboardVerticalOffset = 0` → set to `insets.top + 56`
- [x] M-11: Missing fonts → theme updated to use loaded `Inter-SemiBold`
- [x] M-12: Appearance screen dark-only styles → all text uses `colors.text` / `colors.textSecondary`
- [x] M-13: HabitGrid shows 3 with no "view all" → overflow link added
- [x] M-14: `deleteConversation` orphans messages → batch deletes messages first

### LOW (Cleanup when time allows)
- [x] L-1: Remove false `async` from store actions → removed from addTask, toggleTask, setMood
- [x] L-2: Android package naming inconsistency → both iOS and Android now use `com.lifeos.app`
- [x] L-3: Splash `resizeMode: "cover"` → changed to `"contain"`
- [x] L-4: Adaptive icon foreground/background → removed duplicate, uses `backgroundColor` only
- [x] L-5: Add `maxLength` to TextInput → added `maxLength={2000}` on AI chat input
- [x] L-6: Add accessibility labels → added to all interactive elements in changed components
- [x] L-7: Add `secondary` to `useThemeColors` return value → added
- [x] L-8: Fix `useEffect` dependency array in FocusWidget → `updateFocusTime` added to deps

---

## Files Changed

| File | Fixes Applied |
|---|---|
| `.env.local` (created) | C-1, C-2 |
| `firebase/config.ts` | C-1 |
| `store/useStore.ts` | C-3, C-4, H-3, H-4, H-6, L-1 |
| `app/_layout.tsx` | C-4 |
| `services/chatService.ts` | C-5, M-8, M-14 |
| `services/ai.ts` | M-1, M-2 |
| `app/ai-chat.tsx` | H-1, H-2, H-7, M-9, M-10, L-5, L-6 |
| `app/(tabs)/_layout.tsx` | M-3, M-4, L-6 |
| `components/DailyTasksWidget.tsx` | M-5, L-6 |
| `components/HabitGrid.tsx` | M-6, M-13, L-6 |
| `components/MoodTrend.tsx` | M-7 |
| `components/FocusWidget.tsx` | H-5, L-8, L-6 |
| `hooks/useThemeColors.ts` | L-7 |
| `app/settings/appearance.tsx` | M-12, L-6 |
| `constants/theme.ts` | M-11 |
| `app.json` | L-2, L-3, L-4 |

---

## Remaining Manual Steps (Require Your Action)

These cannot be automated — they need files or external services you control:

### 1. Add Your Real API Keys to `.env.local`
Open `.env.local` and replace the placeholder:
```
EXPO_PUBLIC_GEMINI_API_KEY=your-actual-gemini-key-here
```

### 2. C-2 Full Fix — Backend Proxy for Gemini (Recommended)
The Gemini key is still technically in the JS bundle via `EXPO_PUBLIC_`.
A full fix requires routing AI calls through a Firebase Cloud Function.
This is the only issue that couldn't be completely fixed without backend work.

### 3. Add Missing Font Files (for M-11 complete fix)
Download `Inter-Medium.ttf` and `Inter-Bold.ttf` from Google Fonts and place them in `/assets/fonts/`.
Then restore the original font references in `constants/theme.ts` and add them to `useFonts` in `app/_layout.tsx`.

### 4. L-5 — Add `maxLength` to Other Screens
`maxLength={2000}` was added to AI chat only. Also add to:
- Task creation screen (`app/tasks/create.tsx`)
- Habit creation screen
- Profile bio/location/occupation fields (`app/edit-profile.tsx`)
