import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Use simpler, shorter task names
export const AI_COACH_TASK = 'ai-coach';
export const SYNC_BACKGROUND_FETCH = 'sync-fetch';
export const DAILY_RESET_TASK = 'daily-reset';

const COACH_USER_KEY = 'lifeos_coach_task_owner';


export const registerAllBackgroundTasks = async () => {
  try {
    const statusFetch = await BackgroundFetch.getStatusAsync();
    if (statusFetch !== BackgroundFetch.BackgroundFetchStatus.Available) {
      console.log('[Background] Fetch not available status:', statusFetch);
      return;
    }

    const { useStore } = require('@/store/useStore');
    const userId = useStore.getState().userId;
    if (userId) {
      await AsyncStorage.setItem(COACH_USER_KEY, userId);
    }

    // 2. Register AI Coach (24h interval)
    await BackgroundFetch.registerTaskAsync(AI_COACH_TASK, {
      minimumInterval: 60 * 60 * 24,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    // 3. Register Sync Task (1h interval)
    await BackgroundFetch.registerTaskAsync(SYNC_BACKGROUND_FETCH, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    // 4. Register Daily Reset Task (1h interval — safety net for midnight crossing)
    await BackgroundFetch.registerTaskAsync(DAILY_RESET_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[Background] Registration successful.');
  } catch (err: any) {
    console.warn('[Background] Registration error:', err.message);
  }
};

export const unregisterAllBackgroundTasks = async () => {
  try {
    const registered = await TaskManager.getRegisteredTasksAsync();
    const hasCoach = registered.some(t => t.taskName === AI_COACH_TASK);
    const hasSync = registered.some(t => t.taskName === SYNC_BACKGROUND_FETCH);

    const hasReset = registered.some(t => t.taskName === DAILY_RESET_TASK);
    if (hasCoach) await BackgroundFetch.unregisterTaskAsync(AI_COACH_TASK);
    if (hasSync) await BackgroundFetch.unregisterTaskAsync(SYNC_BACKGROUND_FETCH);
    if (hasReset) await BackgroundFetch.unregisterTaskAsync(DAILY_RESET_TASK);

    console.log('[Background] Unregistered.');
  } catch (err) {
    console.warn('[Background] Unregistration failed:', err);
  }
};
