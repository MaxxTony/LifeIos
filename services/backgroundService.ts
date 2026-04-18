import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { runAICoachTask } from './aiCoachService';
import { useStore } from '@/store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AI_COACH_TASK = 'BACKGROUND_AI_COACH_TASK';
export const SYNC_BACKGROUND_FETCH = 'SYNC_BACKGROUND_FETCH';

const COACH_USER_KEY = 'lifeos_coach_task_owner';

// expo-task-manager requires a custom native build (not available in Expo Go).
// Guard all defineTask calls so the rest of the app loads cleanly without it.
let nativeTasksAvailable = false;
try {
  TaskManager.defineTask(AI_COACH_TASK, runAICoachTask);

  TaskManager.defineTask(SYNC_BACKGROUND_FETCH, async () => {
    try {
      const { actions, userId } = useStore.getState();
      if (!userId) return BackgroundFetch.BackgroundFetchResult.NoData;
      await actions.retrySync();
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('[BackgroundFetch] Sync Task Failed:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  nativeTasksAvailable = true;
} catch {
  console.log('[Background] Native task module unavailable (Expo Go). Background tasks disabled.');
}

export const registerAllBackgroundTasks = async () => {
  if (!nativeTasksAvailable) return;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.log('[Background] Fetch not available:', status);
      return;
    }

    const userId = useStore.getState().userId;
    if (userId) {
      await AsyncStorage.setItem(COACH_USER_KEY, userId);
    }

    // MIN-08 FIX: Only register if not already registered — prevents re-registration on every app launch
    const isCoachRegistered = await TaskManager.isTaskRegisteredAsync(AI_COACH_TASK);
    if (!isCoachRegistered) {
      await BackgroundFetch.registerTaskAsync(AI_COACH_TASK, {
        minimumInterval: 60 * 60 * 24,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    const isSyncRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_BACKGROUND_FETCH);
    if (!isSyncRegistered) {
      await BackgroundFetch.registerTaskAsync(SYNC_BACKGROUND_FETCH, {
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    console.log('[Background] All tasks registered successfully.');
  } catch (err) {
    console.warn('[Background] Task registration failed:', err);
  }
};
