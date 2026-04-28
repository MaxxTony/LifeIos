import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

/**
 * scheduledStatsAggregator
 * Runs every 5 minutes.
 * Aggregates pending XP transactions from 'xpBuffer' and updates users' global stats.
 * This pattern avoids 'hot doc' contention on global stats and reduces write costs by 90%.
 */
export const scheduledStatsAggregator = functions.scheduler.onSchedule('every 5 minutes', async (event) => {
  const db = admin.firestore();
  const bufferRef = db.collection('xpBuffer');
  
  try {
    // 1. Fetch all pending transactions
    const snapshot = await bufferRef.limit(1000).get();
    if (snapshot.empty) {
      console.log('No pending XP transactions in buffer.');
      return;
    }

    const transactions = snapshot.docs;
    const userUpdates: Record<string, { xp: number; weeklyXP: number }> = {};
    const docsToDelete: string[] = [];

    // 2. Group by User ID
    transactions.forEach(doc => {
      const data = doc.data();
      const uid = data.userId;
      if (!uid) return;

      if (!userUpdates[uid]) {
        userUpdates[uid] = { xp: 0, weeklyXP: 0 };
      }
      
      userUpdates[uid].xp += (data.amount || 0);
      userUpdates[uid].weeklyXP += (data.amount || 0);
      docsToDelete.push(doc.id);
    });

    // 3. Update User Stats & Clear Buffer
    const batch = db.batch();
    
    // Update each user's stats/global doc
    for (const [uid, delta] of Object.entries(userUpdates)) {
      const statsRef = db.collection('users').doc(uid).collection('stats').doc('global');
      batch.set(statsRef, {
        totalXP: admin.firestore.FieldValue.increment(delta.xp),
        weeklyXP: admin.firestore.FieldValue.increment(delta.weeklyXP),
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // Delete processed buffer docs
    docsToDelete.forEach(id => {
      batch.delete(bufferRef.doc(id));
    });

    await batch.commit();
    console.log(`Successfully aggregated ${transactions.length} XP transactions for ${Object.keys(userUpdates).length} users.`);

    // If we hit the limit, recurse or wait for next run
    if (transactions.length === 1000) {
      console.log('Limit reached, more transactions may remain.');
    }
  } catch (error) {
    console.error('Error in scheduledStatsAggregator:', error);
  }
});
