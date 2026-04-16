import { Task, MoodEntry } from './types';
import { formatLocalDate } from '@/utils/dateUtils';

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

export const QUEST_TEMPLATES = [
  { type: 'task' as const, title: 'Complete 3 Tasks', targetCount: 3, rewardXP: 50 },
  { type: 'task' as const, title: 'Complete 5 Tasks', targetCount: 5, rewardXP: 100 },
  { type: 'focus' as const, title: 'Deep Work: 1 Hour Focus', targetCount: 3600, rewardXP: 100 },
  { type: 'focus' as const, title: 'Zen Moment: 10 Min Break', targetCount: 600, rewardXP: 30 },
  { type: 'habit' as const, title: 'Consistency: 2 Habits Done', targetCount: 2, rewardXP: 60 },
  { type: 'habit' as const, title: 'Daily Master: 4 Habits Done', targetCount: 4, rewardXP: 100 },
  { type: 'mood' as const, title: 'Emotional Insight: Log Mood', targetCount: 1, rewardXP: 40 },
  { type: 'mood' as const, title: 'Daily Reflection: Log with Note', targetCount: 1, rewardXP: 60 },
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
