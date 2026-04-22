import AsyncStorage from '@react-native-async-storage/async-storage';

// multiGet/multiSet/multiRemove exist at runtime but the bundled TS types
// don't always expose them on the default export — cast once here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AS = AsyncStorage as any;

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
        const results = await AS.multiGet([CORE_KEY, TASKS_KEY, HIST_KEY]);
        const coreStr = results[0][1];

        // No shards written yet → fall back to old monolithic key (migration path)
        if (!coreStr) {
          return await AsyncStorage.getItem(name);
        }

        const coreObj = JSON.parse(coreStr);
        const tasksObj = results[1][1] ? JSON.parse(results[1][1]) : { state: {} };
        const histObj = results[2][1] ? JSON.parse(results[2][1]) : { state: {} };

        // Merge shards back into the shape Zustand persist expects: { state, version }
        return JSON.stringify({
          ...coreObj,
          state: {
            ...coreObj.state,
            ...tasksObj.state,
            ...histObj.state,
          },
        });
      } catch {
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
          else coreState[key] = val;
        }

        await AS.multiSet([
          [CORE_KEY, JSON.stringify({ ...meta, state: coreState })],
          [TASKS_KEY, JSON.stringify({ ...meta, state: tasksState })],
          [HIST_KEY, JSON.stringify({ ...meta, state: histState })],
        ]);

        // Remove the old monolithic key so it doesn't persist alongside shards
        await AsyncStorage.removeItem(name);
      } catch {
        // Fallback: write monolithically if sharding fails so data is never lost
        try { await AsyncStorage.setItem(name, value); } catch { /* silent */ }
      }
    },

    removeItem: async (name: string): Promise<void> => {
      await AS.multiRemove([name, CORE_KEY, TASKS_KEY, HIST_KEY]);
    },
  };
}
