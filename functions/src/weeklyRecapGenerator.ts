import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

/**
 * weeklyRecapGenerator
 * Runs every Sunday at 23:59 (11:59 PM).
 * Aggregates user performance data for the week and saves a recap document.
 */
export const weeklyRecapGenerator = functions.scheduler.onSchedule('59 23 * * 0', async (event) => {
  const db = admin.firestore();
  const usersSnap = await db.collection('users').get();
  
  const now = new Date();
  const year = now.getFullYear();
  // Get ISO week number (approximate is fine for this use case)
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  const weekId = `${year}-W${weekNumber}`;

  console.log(`[WeeklyRecap] Generating recaps for week ${weekId}...`);

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    try {
      // 1. Fetch Stats for the week
      // (Simplified: We use the current weeklyXP as a proxy for this week's progress)
      const globalStatsRef = db.collection('users').doc(uid).collection('stats').doc('global');
      const globalStatsSnap = await globalStatsRef.get();
      const globalStats = globalStatsSnap.data() || {};

      // 2. Count Tasks & Habits
      // We look for tasks/habits completed in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const tasksSnap = await db.collection('users').doc(uid).collection('tasks')
        .where('completed', '==', true)
        .where('date', '>=', sevenDaysAgoStr)
        .get();
      
      const habitsSnap = await db.collection('users').doc(uid).collection('habits').get();
      let totalHabitCompletions = 0;
      habitsSnap.docs.forEach(h => {
        const completedDays = (h.data().completedDays || []) as string[];
        totalHabitCompletions += completedDays.filter(d => d >= sevenDaysAgoStr).length;
      });

      // 3. Focus Time
      const focusSnap = await db.collection('users').doc(uid).collection('focusHistory')
        .where(admin.firestore.FieldPath.documentId(), '>=', sevenDaysAgoStr)
        .get();
      let totalFocusSeconds = 0;
      focusSnap.docs.forEach(f => {
        totalFocusSeconds += (f.data().totalSeconds || 0);
      });

      // 4. Save Recap
      const recapData = {
        weekId,
        xpGained: globalStats.weeklyXP || 0,
        tasksCompleted: tasksSnap.size,
        habitCompletions: totalHabitCompletions,
        focusHours: Math.round((totalFocusSeconds / 3600) * 10) / 10,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        hasSeen: false,
      };

      await db.collection('users').doc(uid).collection('weeklyRecaps').doc(weekId).set(recapData);
      
      // 5. Reset weeklyXP for next week
      await globalStatsRef.update({
        weeklyXP: 0,
        lastWeekXP: globalStats.weeklyXP || 0
      });

      console.log(`[WeeklyRecap] Saved recap for ${uid}`);
    } catch (err) {
      console.error(`[WeeklyRecap] Failed for user ${uid}:`, err);
    }
  }
});
