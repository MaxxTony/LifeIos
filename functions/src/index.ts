/**
 * LifeOS Cloud Functions
 * ----------------------
 * Holds AI provider API keys server-side so they are NEVER shipped in the
 * client bundle. The client calls `callAI` via `httpsCallable` and the
 * function enforces auth + rate limits before hitting Gemini.
 *
 * Deployment:
 *   1. cd functions && npm install
 *   2. firebase functions:secrets:set GEMINI_API_KEY
 *        (paste the key — it is never written to disk)
 *   3. firebase deploy --only functions
 *   4. Rotate the old EXPO_PUBLIC_GEMINI_API_KEY in Google Cloud Console.
 *   5. Set EXPO_PUBLIC_USE_AI_PROXY=true in the client .env and rebuild.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

// defineSecret takes the secret's NAME (an identifier), not its value.
// The actual key lives in Google Secret Manager and is set out-of-band via
//   firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: { base64: string; mimeType: string };
};

// Very small per-uid in-memory rate limiter. Replace with Firestore-backed
// limiter if you need durability across instances.
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 20;

function assertWithinRateLimit(uid: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(uid);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    rateBuckets.set(uid, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQ_PER_WINDOW) {
    throw new HttpsError('resource-exhausted', 'AI rate limit exceeded. Try again in a minute.');
  }
}

export const callAI = onCall(
  {
    secrets: [GEMINI_API_KEY],
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    assertWithinRateLimit(request.auth.uid);

    const { messages, systemInstruction } = request.data as {
      messages: AIMessage[];
      systemInstruction?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages[] is required.');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction || 'You are LifeOS, a helpful personal assistant.',
    });

    const history = messages.slice(0, -1)
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

    const last = messages[messages.length - 1];
    const lastParts: any[] = [{ text: last.content || '' }];
    if (last.image) {
      lastParts.push({ inlineData: { data: last.image.base64, mimeType: last.image.mimeType } });
    }

    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastParts);
      return { text: result.response.text() };
    } catch (err: any) {
      console.error('callAI error:', err);
      throw new HttpsError('internal', err?.message || 'AI call failed.');
    }
  }
);
