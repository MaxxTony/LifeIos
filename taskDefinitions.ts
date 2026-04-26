import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// These MUST be defined at the root bundle level (outside any component/function)
// so they execute synchronously when the JS bundle loads — required by expo-task-manager.

TaskManager.defineTask('ai-coach', async () => {
  try {
    const { runAICoachTask } = require('@/services/aiCoachService');
    return await runAICoachTask();
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

TaskManager.defineTask('sync-fetch', async () => {
  try {
    const { useStore } = require('@/store/useStore');
    const { actions, userId } = useStore.getState();
    if (!userId) return BackgroundFetch.BackgroundFetchResult.NoData;
    await actions.retrySync();
    
    // BUG-007 FIX: Reschedule notifications in background to prevent one-shot expiry on Android
    const { notificationService } = require('@/services/notificationService');
    await notificationService.rescheduleAllHabits();
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Safety-net: fires every ~60 min in background. Catches midnight even if the scheduled
// notification doesn't wake the app (e.g. device restarted, DND, app force-killed long-term).
TaskManager.defineTask('daily-reset', async () => {
  try {
    const { useStore } = require('@/store/useStore');
    const store = useStore.getState();
    if (!store._hasHydrated) return BackgroundFetch.BackgroundFetchResult.NoData;
    store.actions.performDailyReset();
    store.actions.generateDailyQuests();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
