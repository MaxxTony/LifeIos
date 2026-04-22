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
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
