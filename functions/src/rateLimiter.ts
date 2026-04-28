import * as admin from 'firebase-admin';

/**
 * Generic rate limiter for document creation triggers.
 * Tracks usage in _internal/rateLimits/users/{uid}/{collectionName}
 */
export async function isWithinRateLimit(uid: string, collectionName: string, limit: number, windowMs: number) {
  const db = admin.firestore();
  const limitRef = db.collection('_internal').doc('rateLimits').collection('users').doc(uid).collection('collections').doc(collectionName);
  const now = Date.now();

  try {
    let allowed = true;
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(limitRef);
      
      if (!doc.exists) {
        transaction.set(limitRef, { count: 1, windowStart: now });
        return;
      }

      const data = doc.data()!;
      if (now - data.windowStart > windowMs) {
        // Reset window
        transaction.update(limitRef, { count: 1, windowStart: now });
        return;
      }

      if (data.count >= limit) {
        allowed = false;
        return;
      }

      transaction.update(limitRef, { count: data.count + 1 });
    });
    return allowed;
  } catch (error) {
    console.error(`[RateLimit] Error for ${uid} on ${collectionName}:`, error);
    // On error, we allow the write to prevent blocking legitimate users due to internal issues
    return true;
  }
}
