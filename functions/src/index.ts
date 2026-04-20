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
import { onSchedule } from 'firebase-functions/v2/scheduler';

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

async function assertWithinRateLimit(uid: string) {
  const db = admin.firestore();
  const limitRef = db.collection('_internal').doc('rateLimits').collection('users').doc(uid);
  const WINDOW_MS = 60_000;
  const MAX_REQ_PER_WINDOW = 20;

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(limitRef);
      const now = Date.now();

      if (!doc.exists) {
        transaction.set(limitRef, { count: 1, windowStart: now });
        return;
      }

      const data = doc.data()!;
      if (now - data.windowStart > WINDOW_MS) {
        transaction.update(limitRef, { count: 1, windowStart: now });
        return;
      }

      if (data.count >= MAX_REQ_PER_WINDOW) {
        throw new HttpsError('resource-exhausted', 'AI rate limit exceeded. Try again in a minute.');
      }

      transaction.update(limitRef, { count: data.count + 1 });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[RateLimit] Transaction failed:', error);
    // On internal error, we allow the request to prevent locking out users due to db issues
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
    console.log('[callAI] request.auth:', JSON.stringify(request.auth ?? null));
    console.log('[callAI] headers:', JSON.stringify(request.rawRequest?.headers?.authorization ? 'Bearer token present' : 'NO AUTH HEADER'));
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    await assertWithinRateLimit(request.auth.uid);

    const { messages, systemInstruction } = request.data as {
      messages: AIMessage[];
      systemInstruction?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'messages[] is required.');
    }

    // F-BUG-05 FIX: Enforce strict input limits to prevent token cost attacks/bloat
    if (messages.length > 50) {
      throw new HttpsError('invalid-argument', 'Max 50 messages allowed in history.');
    }

    if (systemInstruction && systemInstruction.length > 4000) {
      throw new HttpsError('invalid-argument', 'System instruction too long (max 4000 chars).');
    }

    for (const msg of messages) {
      if (msg.content && msg.content.length > 10000) {
        throw new HttpsError('invalid-argument', 'Message content too long (max 10000 chars).');
      }
      if (msg.image?.base64 && msg.image.base64.length > 1400000) {
        throw new HttpsError('invalid-argument', 'Image too large (max ~1MB base64).');
      }
    }

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'addTask',
            description: 'Add a new task to the user\'s daily list.',
            parameters: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING', description: 'The task description' },
                priority: { type: 'STRING', enum: ['high', 'medium', 'low'], description: 'Task priority' },
                startTime: { type: 'STRING', description: 'Optional start time (e.g. "09:00 AM")' },
                endTime: { type: 'STRING', description: 'Optional end time (e.g. "10:00 AM")' },
              },
              required: ['text'],
            },
          },
          {
            name: 'addHabit',
            description: 'Create a new habit for the user to track.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'The habit name (e.g. Drink Water)' },
                category: { type: 'STRING', description: 'Category (Health, Work, Personal, etc.)' },
                frequency: { type: 'STRING', enum: ['daily', 'weekly', 'monthly'], description: 'How often' },
              },
              required: ['title'],
            },
          },
          {
            name: 'setMood',
            description: 'Log the user\'s current mood and emotions.',
            parameters: {
              type: 'OBJECT',
              properties: {
                mood: { type: 'NUMBER', description: 'Mood level from 1 (Awful) to 5 (Amazing)' },
                note: { type: 'STRING', description: 'Optional note about how they feel' },
                emotions: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of specific emotions' },
              },
              required: ['mood'],
            },
          },
          {
            name: 'updateTask',
            description: 'Edit an existing task\'s properties.',
            parameters: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'The task ID from context' },
                text: { type: 'STRING', description: 'New description' },
                priority: { type: 'STRING', enum: ['high', 'medium', 'low'] },
                startTime: { type: 'STRING' },
                endTime: { type: 'STRING' },
              },
              required: ['id'],
            },
          },
          {
            name: 'removeTask',
            description: 'Delete a task from the list.',
            parameters: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'The task ID from context' },
                text: { type: 'STRING', description: 'Optional confirmation' },
              },
              required: ['id'],
            },
          },
          {
            name: 'updateHabit',
            description: 'Modify an existing habit.',
            parameters: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'The habit ID from context' },
                title: { type: 'STRING' },
                frequency: { type: 'STRING', enum: ['daily', 'weekly', 'monthly'] },
              },
              required: ['id'],
            },
          },
          {
            name: 'removeHabit',
            description: 'Permanently remove a habit.',
            parameters: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING', description: 'The habit ID from context' },
              },
              required: ['id'],
            },
          },
        ],
      },
    ];

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction || 'You are LifeOS, a premium personal assistant.',
      tools: tools as any,
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
      const response = result.response;

      const calls = response.functionCalls();
      if (calls && calls.length > 0) {
        return {
          text: null,
          functionCalls: calls.map(c => ({ name: c.name, args: c.args })),
        };
      }

      return { text: response.text() };
    } catch (err: any) {
      console.error('callAI error:', err);
      throw new HttpsError('internal', err?.message || 'AI call failed.');
    }
  }
);

/**
 * C-AUTH-2 FIX: Session Revocation
 * -------------------------------
 * Invalidates all refresh tokens for the calling user.
 * This is used during multi-device login to ensure that old sessions
 * (and potentially stolen ID tokens) are killed.
 */
export const revokeOtherSessions = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    try {
      const uid = request.auth.uid;
      await admin.auth().revokeRefreshTokens(uid);
      console.log(`[Auth] Revoked refresh tokens for user: ${uid}`);
      return { success: true };
    } catch (err: any) {
      console.error('[Auth] revokeOtherSessions error:', err);
      throw new HttpsError('internal', 'Failed to revoke sessions.');
    }
  }
);

// F-7: Scheduled cleanup for unbounded conversation growth
// Runs every night at midnight to delete messages older than 90 days.
export const scheduledConversationCleanup = onSchedule('0 0 * * *', async () => {
  const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 90 * 86400000)
  );

  const db = admin.firestore();
  const messagesToPrune = await db
    .collectionGroup('messages')
    .where('createdAt', '<', ninetyDaysAgo)
    .limit(500)
    .get();

  if (messagesToPrune.empty) {
    console.log('[LifeOS Cleanup] No stale messages to delete.');
    return;
  }

  const batch = db.batch();
  const parentConvPaths = new Set<string>();
  // O4 FIX: Collect Storage image URLs from messages before deleting them.
  // Without this, images uploaded in chat stayed in Storage permanently.
  const imageUrlsToDelete: string[] = [];

  messagesToPrune.docs.forEach((doc) => {
    batch.delete(doc.ref);
    // Path: users/{uid}/conversations/{convId}/messages/{msgId}
    const parentPath = doc.ref.parent.parent?.path;
    if (parentPath) parentConvPaths.add(parentPath);
    // Collect imageUrl if present and valid
    const data = doc.data();
    if (data.imageUrl && typeof data.imageUrl === 'string' && data.imageUrl.includes('firebasestorage')) {
      imageUrlsToDelete.push(data.imageUrl);
    }
  });

  await batch.commit();
  console.log(`[LifeOS Cleanup] Deleted ${messagesToPrune.size} stale messages.`);

  // O4 FIX: Delete Storage objects for pruned messages.
  // Fire-and-forget — storage cleanup failures don't affect message deletion.
  if (imageUrlsToDelete.length > 0) {
    const storageBucket = admin.storage().bucket();
    await Promise.all(
      imageUrlsToDelete.map(async (url) => {
        try {
          // Extract the Storage path from the download URL
          const match = url.match(/\/o\/([^?]+)/);
          if (!match) return;
          const storagePath = decodeURIComponent(match[1]);
          await storageBucket.file(storagePath).delete();
          console.log(`[LifeOS Cleanup] Deleted Storage image: ${storagePath}`);
        } catch (err: any) {
          // 404 = already deleted, safe to ignore
          if (err?.code !== 404 && err?.code !== 'storage/object-not-found') {
            console.warn(`[LifeOS Cleanup] Storage delete failed for image: ${err?.message}`);
          }
        }
      })
    );
    console.log(`[LifeOS Cleanup] Processed ${imageUrlsToDelete.length} Storage image deletions.`);
  }

  // C-12 FIX: Delete parent conversation documents if they are now empty
  for (const convPath of parentConvPaths) {
    const remainingMessages = await db.doc(convPath).collection('messages').limit(1).get();
    if (remainingMessages.empty) {
      await db.doc(convPath).delete();
      console.log(`[LifeOS Cleanup] Deleted ghost conversation: ${convPath}`);
    }
  }
});
