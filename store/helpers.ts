import { Task, MoodEntry } from './types';
import { formatLocalDate } from '@/utils/dateUtils';
import { LEVEL_THRESHOLDS, LEVEL_NAMES } from '@/constants/gamification';

export { LEVEL_THRESHOLDS, LEVEL_NAMES };

export const migrateTasks = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    let migrated = { ...task };
    if (!migrated.date) {
      migrated.date = formatLocalDate(new Date(task.createdAt));
    }
    if (!migrated.priority) {
      migrated.priority = 'medium';
    }
    if (!migrated.status) {
      migrated.status = 'pending';
    }
    return migrated;
  });
};

export const parseTimeString = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  try {
    const cleaned = timeStr.trim().replace(/\s+/g, ' ').toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
    
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3];

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (modifier === 'PM' && hours < 12) hours += 12;
    else if (modifier === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  } catch (e) {
    return null;
  }
};

export const migrateMoodHistory = (history: any): Record<string, MoodEntry> => {
  if (!history) return {};
  if (!Array.isArray(history)) return history;

  const map: Record<string, MoodEntry> = {};
  history.forEach((entry: any) => {
    if (entry && entry.timestamp) {
      const dateKey = formatLocalDate(new Date(entry.timestamp));
      map[dateKey] = entry;
    }
  });
  return map;
};

// Fisher-Yates unbiased shuffle — replaces sort(() => 0.5 - Math.random())
export const shuffleArray = <T>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const QUEST_TEMPLATES = [
  { type: 'task' as const, title: 'Complete 3 Tasks', targetCount: 3, rewardXP: 50 },
  { type: 'task' as const, title: 'Complete 5 Tasks', targetCount: 5, rewardXP: 100 },
  { type: 'focus' as const, title: 'Deep Work: 1 Hour Focus', targetCount: 3600, rewardXP: 100 },
  { type: 'focus' as const, title: 'Zen Moment: 10 Min Focus', targetCount: 600, rewardXP: 30 },
  { type: 'habit' as const, title: 'Consistency: 2 Habits Done', targetCount: 2, rewardXP: 60 },
  { type: 'habit' as const, title: 'Daily Master: 4 Habits Done', targetCount: 4, rewardXP: 100 },
  { type: 'mood' as const, title: 'Emotional Insight: Log Mood', targetCount: 1, rewardXP: 40 },
  { type: 'mood' as const, title: 'Daily Reflection: Log with Note', targetCount: 2, rewardXP: 60 },
];

export const SYNC_RETRY_DELAYS_MS = [500, 1500, 4000];

export const isTransientError = (err: any, userId?: string | null): boolean => {
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();
  
  if (code === 'permission-denied' && !userId) return false;
  if (code.includes('unavailable') || code.includes('deadline-exceeded') || code.includes('aborted')) return true;
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('offline')) return true;
  return false;
};

// --- Gamification Logic exported from shared constants ---

export const computeLevel = (xp: number): number => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
};

export const getLevelProgress = (xp: number) => {
  const level = computeLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level];

  if (nextThreshold === undefined) {
    return {
      progress: 1.0,
      xpInLevel: xp - currentThreshold,
      xpRequiredForNext: 0
    };
  }

  const xpInLevel = xp - currentThreshold;
  const xpRequiredForNext = nextThreshold - currentThreshold;
  const progress = Math.min(xpInLevel / xpRequiredForNext, 1.0);

  return { progress, xpInLevel, xpRequiredForNext };
};
