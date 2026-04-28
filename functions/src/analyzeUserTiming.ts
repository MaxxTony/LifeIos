import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

/**
 * Analyzes user activity (tasks & focus sessions) to determine their "Prime Time".
 * This is the hour of the day they are most likely to start being productive.
 */
export const analyzeUserTiming = onDocumentUpdated('users/{userId}/stats/global', async (event) => {
    const userId = event.params.userId;
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData || !oldData) return null;

    // Only run if lastActiveDate changed (meaning a day has passed)
    if (newData.lastActiveDate === oldData.lastActiveDate) return null;

    const db = admin.firestore();
    
    // 1. Get last 50 tasks
    const tasksSnapshot = await db.collection('users').doc(userId)
        .collection('tasks')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    if (tasksSnapshot.empty) return null;

    const hours: number[] = [];
    tasksSnapshot.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.createdAt);
        if (!isNaN(date.getTime())) {
            hours.push(date.getHours());
        }
    });

    if (hours.length === 0) return null;

    // 2. Find the peak hour (mode)
    const hourCounts: Record<number, number> = {};
    let peakHour = 9; // Default to 9 AM
    let maxCount = 0;

    hours.forEach(h => {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
        if (hourCounts[h] > maxCount) {
            maxCount = hourCounts[h];
            peakHour = h;
        }
    });

    const nudgeHour = peakHour;
    const nudgeMinute = 0;

    console.log(`[LifeOS] User ${userId} peak hour: ${peakHour}. Setting preferredNudgeTime to ${nudgeHour}:00`);

    // 3. Update user profile with preferredNudgeTime
    return db.collection('users').doc(userId).update({
        preferredNudgeTime: {
            hour: nudgeHour,
            minute: nudgeMinute,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    });
});
