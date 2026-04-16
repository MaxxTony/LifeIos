# LifeOS Cloud Functions

These functions exist to keep the Gemini (and future AI provider) API keys
**off the client bundle**. `EXPO_PUBLIC_*` env vars are embedded in the
JS bundle at build time — anyone who decompiles the app can extract them.
That is why C-2 in the audit flagged the keys as a ship blocker.

## What's in here

- `src/index.ts` — `callAI` callable function. Enforces `request.auth`,
  applies a 20-req/min per-uid in-memory rate limit, and forwards the
  payload to Gemini using a server-side secret.

## Deploy

```bash
cd functions
npm install

# Store the Gemini key as a Firebase secret (never committed to disk).
firebase functions:secrets:set GEMINI_API_KEY
# (paste the new rotated key)

firebase deploy --only functions
```

Then in the client:

1. Set `EXPO_PUBLIC_USE_AI_PROXY=true` in `.env.local`.
2. Rebuild the app. `services/ai.ts` will now call the function via
   `httpsCallable('callAI')` instead of using the client key.
3. Once confirmed working, **rotate and delete** `EXPO_PUBLIC_GEMINI_API_KEY`
   in Google Cloud Console. Any build older than the rotation will break,
   which is exactly what you want.

## Local development

```bash
firebase emulators:start --only functions,firestore,auth
```

The client auto-talks to the local emulator when `__DEV__` is true if you
wire `connectFunctionsEmulator` in `firebase/config.ts`.
