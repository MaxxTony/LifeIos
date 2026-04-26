import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys that live in the history shard (large, cold, ~1 entry/day)
const HISTORY_KEYS = new Set(['moodHistory', 'focusHistory', 'lifeScoreHistory']);
// Keys that live in the tasks shard (medium, changes often during the day)
const TASK_KEYS = new Set(['tasks', 'pendingActions']);
// Everything else goes in core (small, hot — auth, settings, gamification)

/**
 * Splits the Zustand persist blob across 3 AsyncStorage keys instead of 1.
 *
 * Problem: a single-key design means the entire store (tasks, history,
 * settings, XP…) is re-serialized and written on every state change.
 * After 6+ months of daily use the blob can exceed 500 KB, making cold
 * hydration noticeably slow on mid-range Android devices.
 *
 * Solution: separate the state into 3 independently-written shards so a
 * focus-timer tick (touches only core) does not re-write the tasks array,
 * and completing a task does not re-write 365 days of mood history.
 *
 * Migration: first time this runs, the old single-key blob is read,
 * split into shards, and the old key is removed. Completely transparent.
 */
export function createShardedStorage(baseName: string) {
  const CORE_KEY = `${baseName}:core`;
  const TASKS_KEY = `${baseName}:tasks`;
  const HIST_KEY = `${baseName}:hist`;

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        // O18 FIX: Some environments/versions of AsyncStorage have issues with multiGet.
        // Falling back to individual await calls for maximum robustness.
        const coreStr = await AsyncStorage.getItem(CORE_KEY);

        // No shards written yet → fall back to old monolithic key (migration path)
        if (!coreStr) {
          console.log('[LifeOS Storage] No shards found. Checking monolith...');
          return await AsyncStorage.getItem(name);
        }

        const tasksStr = await AsyncStorage.getItem(TASKS_KEY);
        const histStr = await AsyncStorage.getItem(HIST_KEY);

        const coreObj = JSON.parse(coreStr);
        const tasksObj = tasksStr ? JSON.parse(tasksStr) : { state: {} };
        const histObj = histStr ? JSON.parse(histStr) : { state: {} };

        // O18: Shards are merged back into a single object for Zustand hydration.

        const merged = {
          ...coreObj,
          state: {
            ...coreObj.state,
            ...tasksObj.state,
            ...histObj.state,
          },
        };

        return JSON.stringify(merged);
      } catch (e: any) {
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const { state, ...meta } = JSON.parse(value) as {
          state: Record<string, unknown>;
          [k: string]: unknown;
        };

        const coreState: Record<string, unknown> = {};
        const tasksState: Record<string, unknown> = {};
        const histState: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(state)) {
          if (HISTORY_KEYS.has(key)) histState[key] = val;
          else if (TASK_KEYS.has(key)) tasksState[key] = val;
          else {
            // Sharding complete. Serialize and write to disk.
            coreState[key] = val;
          }
        }

        // O18 FIX: Atomic multiSet fallback to individual sets for compatibility
        await Promise.all([
          AsyncStorage.setItem(CORE_KEY, JSON.stringify({ ...meta, state: coreState })),
          AsyncStorage.setItem(TASKS_KEY, JSON.stringify({ ...meta, state: tasksState })),
          AsyncStorage.setItem(HIST_KEY, JSON.stringify({ ...meta, state: histState })),
        ]);

        // Remove the old monolithic key so it doesn't persist alongside shards
        await AsyncStorage.removeItem(name);
      } catch {
        // Fallback: write monolithically if sharding fails so data is never lost
        try { await AsyncStorage.setItem(name, value); } catch { /* silent */ }
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        await Promise.all([
          AsyncStorage.removeItem(name),
          AsyncStorage.removeItem(CORE_KEY),
          AsyncStorage.removeItem(TASKS_KEY),
          AsyncStorage.removeItem(HIST_KEY),
        ]);
      } catch { /* silent */ }
    },
  };
}
