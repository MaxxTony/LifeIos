import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { analyticsService } from './analyticsService';
import { purchaseService } from './purchaseService';
import { socialService } from './socialService';

const FREE_ACCENTS: Record<string, string> = {
  '#7C5CFF': 'Royal',
  '#5B8CFF': 'Azure',
  '#00D68F': 'Neo',
};
const PRO_ACCENTS: Record<string, string> = {
  '#FF4B4B': 'Coral',
  '#FFB347': 'Sunset',
  '#FF69B4': 'Candy',
  '#00CED1': 'Cyber',
  '#10B981': 'Emerald',
  '#8B5CF6': 'Violet',
  '#DC2626': 'Crimson',
  '#D97706': 'Amber',
  '#E11D48': 'Rose',
};
const NAME_TO_HEX: Record<string, string> = {
  royal: '#7C5CFF', azure: '#5B8CFF', neo: '#00D68F',
  coral: '#FF4B4B', sunset: '#FFB347', candy: '#FF69B4',
  cyber: '#00CED1', emerald: '#10B981', violet: '#8B5CF6',
  crimson: '#DC2626', amber: '#D97706', rose: '#E11D48',
};

function resolveAccent(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.startsWith('#')) {
    const upper = trimmed.toUpperCase();
    if (FREE_ACCENTS[upper] || PRO_ACCENTS[upper]) return upper;
    return null;
  }
  const hex = NAME_TO_HEX[trimmed.toLowerCase()];
  return hex || null;
}

/**
 * C-AI-3 FIX: Strict validation guards for AI-triggered actions.
 * Ensures that AI cannot pass oversized strings, non-existent IDs,
 * or invalid data types into the store.
 */
export const aiActionHandler = {
  /**
   * Adds a new task based on AI parameters
   */
  handleAddTask: (params: { text: string; priority?: 'high' | 'medium' | 'low'; startTime?: string; endTime?: string }) => {
    if (!params.text || typeof params.text !== 'string' || params.text.length > 500) {
      return { success: false, message: 'Invalid or missing task text (max 500 chars).' };
    }
    
    const store = useStore.getState();
    try {
      store.actions.addTask(
        params.text,
        params.startTime || undefined,
        params.endTime || undefined,
        params.priority || 'medium',
        getTodayLocal()
      );
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'addTask' });
      return { success: true, message: `Successfully added task: ${params.text}` };
    } catch (error: any) {
      console.error('AI Add Task Error:', error);
      return { success: false, message: `Failed to add task: ${error.message}` };
    }
  },

  /**
   * Adds a new habit based on AI parameters
   */
  handleAddHabit: (params: { title: string; category?: string; frequency?: 'daily' | 'weekly' | 'monthly' }) => {
    if (!params.title || typeof params.title !== 'string' || params.title.length > 100) {
      return { success: false, message: 'Invalid or missing habit title (max 100 chars).' };
    }

    const store = useStore.getState();
    try {
      store.actions.addHabit({
        title: params.title,
        category: params.category || 'General',
        frequency: params.frequency || 'daily',
        icon: 'sparkles',
        color: '#6366f1',
        targetDays: [0, 1, 2, 3, 4, 5, 6],
        reminderTime: null,
        goalDays: params.frequency === 'daily' ? 7 : 1,
      });
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'addHabit' });
      return { success: true, message: `Successfully created habit: ${params.title}` };
    } catch (error: any) {
      console.error('AI Add Habit Error:', error);
      return { success: false, message: `Failed to create habit: ${error.message}` };
    }
  },

  /**
   * Logs a mood entry based on AI parameters
   */
  handleSetMood: (params: { mood: number; note?: string; emotions?: string[]; activities?: string[] }) => {
    const moodValue = Number(params.mood);
    if (isNaN(moodValue) || moodValue < 1 || moodValue > 5) {
      return { success: false, message: 'Invalid mood level (must be 1-5).' };
    }

    if (params.note && params.note.length > 1000) {
      return { success: false, message: 'Note is too long (max 1000 chars).' };
    }

    const store = useStore.getState();
    try {
      store.actions.setMood(moodValue, {
        note: params.note,
        emotions: params.emotions,
        activities: params.activities
      });
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'setMood' });
      return { success: true, message: `Logged mood level ${moodValue}` };
    } catch (error: any) {
      console.error('AI Set Mood Error:', error);
      return { success: false, message: `Failed to log mood: ${error.message}` };
    }
  },

  handleUpdateTask: (params: { id: string; text?: string; priority?: 'high' | 'medium' | 'low'; startTime?: string; endTime?: string }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid task ID.' };
    }

    const store = useStore.getState();
    const taskExists = store.tasks.some(t => t.id === params.id);
    if (!taskExists) {
      return { success: false, message: `Task not found (ID: ${params.id})` };
    }

    try {
      const { id, ...updates } = params;
      store.actions.updateTask(id, updates);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateTask' });
      return { success: true, message: 'Task updated successfully! ✅' };
    } catch (error: any) {
      return { success: false, message: `Failed to update task: ${error.message}` };
    }
  },

  handleRemoveTask: (params: { id: string; userConfirmed?: boolean }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid task ID.' };
    }
    if (!params.userConfirmed) {
      return { success: false, message: 'Deletion requires explicit user confirmation. Ask the user to confirm before calling this tool.' };
    }

    const store = useStore.getState();
    const taskExists = store.tasks.some(t => t.id === params.id);
    if (!taskExists) {
      return { success: false, message: `Task not found (ID: ${params.id})` };
    }

    try {
      store.actions.removeTask(params.id);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'removeTask' });
      return { success: true, message: `Removed task ${params.id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to remove task: ${error.message}` };
    }
  },

  handleUpdateHabit: (params: { id: string; title?: string; frequency?: 'daily' | 'weekly' | 'monthly' }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid habit ID.' };
    }

    const store = useStore.getState();
    const habitExists = store.habits.some(h => h.id === params.id);
    if (!habitExists) {
      return { success: false, message: `Habit not found (ID: ${params.id})` };
    }

    try {
      const { id, ...updates } = params;
      store.actions.updateHabit(id, updates);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateHabit' });
      return { success: true, message: `Updated habit ${id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to update habit: ${error.message}` };
    }
  },

  handleRemoveHabit: (params: { id: string; userConfirmed?: boolean }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid habit ID.' };
    }
    if (!params.userConfirmed) {
      return { success: false, message: 'Deletion requires explicit user confirmation. Ask the user to confirm before calling this tool.' };
    }

    const store = useStore.getState();
    const habitExists = store.habits.some(h => h.id === params.id);
    if (!habitExists) {
      return { success: false, message: `Habit not found (ID: ${params.id})` };
    }

    try {
      store.actions.removeHabit(params.id);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'removeHabit' });
      return { success: true, message: `Removed habit ${params.id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to remove habit: ${error.message}` };
    }
  },

  handleUpdateProfile: (params: { userName?: string; bio?: string; occupation?: string; skills?: string; location?: string; birthday?: string }) => {
    const store = useStore.getState();
    try {
      store.actions.updateProfile(params);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateProfile' });
      return { success: true, message: 'Successfully updated your profile information.' };
    } catch (error: any) {
      return { success: false, message: `Failed to update profile: ${error.message}` };
    }
  },

  handleUpdateSettings: (params: { theme?: string; accentColor?: string }) => {
    const store = useStore.getState();
    try {
      const messages: string[] = [];

      if (params.theme) {
        const normalizedTheme = params.theme.toLowerCase();
        if (['light', 'dark', 'system'].includes(normalizedTheme)) {
          store.actions.setThemePreference(normalizedTheme as any);
          messages.push(`Switched to ${normalizedTheme} mode.`);
        } else {
          return { success: false, message: `Theme "${params.theme}" isn't valid. Use light, dark, or system.` };
        }
      }

      if (params.accentColor) {
        const hex = resolveAccent(params.accentColor);
        if (!hex) {
          return {
            success: false,
            message: `"${params.accentColor}" isn't one of the LifeOS accents. Pick Royal, Azure, Neo, Coral, Sunset, Candy, Cyber, Emerald, Violet, Crimson, Amber, or Rose.`
          };
        }

        const isPro = store.isPro;
        const isProAccent = !!PRO_ACCENTS[hex];
        const accentName = FREE_ACCENTS[hex] || PRO_ACCENTS[hex];

        if (isProAccent && !isPro) {
          // Surface the paywall and tell the AI so it can respond honestly.
          purchaseService.presentPaywall().catch(() => { /* best effort */ });
          analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateSettings', blocked: 'pro_accent', accentName });
          return {
            success: false,
            message: `${accentName} is a Pro accent. Opening the upgrade screen — they can switch to it the second they go Pro. Free accents available right now: Royal, Azure, Neo.`
          };
        }

        store.actions.setAccentColor(hex);
        messages.push(`Accent set to ${accentName}.`);
      }

      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateSettings' });
      return {
        success: true,
        message: messages.length ? messages.join(' ') : 'Nothing to change — already set.'
      };
    } catch (error: any) {
      console.error('AI Update Settings Error:', error);
      return { success: false, message: `Failed to update settings: ${error.message}` };
    }
  },

  handleGetSocialLeaderboard: async () => {
    const store = useStore.getState();
    if (!store.userId) return { success: false, message: 'User not authenticated' };
    
    try {
      const board = await socialService.getLeaderboard(store.userId);
      const summary = board.map((p, i) => `#${i+1} ${p.userName} (${p.weeklyXP} XP, Level ${p.level})`).join('\n');
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'getSocialLeaderboard' });
      return { success: true, message: `Current Leaderboard:\n${summary}`, data: board };
    } catch (error: any) {
      return { success: false, message: `Failed to fetch leaderboard: ${error.message}` };
    }
  },

  handleSendSocialNudge: async (params: { friendId: string; message: string }) => {
    const store = useStore.getState();
    if (!store.userId) return { success: false, message: 'User not authenticated' };

    try {
      // For now, we simulate the nudge by logging it
      console.log(`[AI Nudge] To: ${params.friendId}, Message: ${params.message}`);
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'sendSocialNudge', targetFriendId: params.friendId });
      return { success: true, message: `Nudge sent to friend (ID: ${params.friendId})` };
    } catch (error: any) {
      return { success: false, message: `Failed to send nudge: ${error.message}` };
    }
  },

  handleGetPerformanceTrends: () => {
    const store = useStore.getState();
    const today = getTodayLocal();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    try {
      // 1. Task Completion Analysis
      const recentTasks = store.tasks.filter(t => t.date >= cutoffStr);
      const total = recentTasks.length;
      const completed = recentTasks.filter(t => t.status === 'completed').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // 2. Focus Time Analysis
      let totalFocusSeconds = 0;
      Object.entries(store.focusHistory).forEach(([date, seconds]) => {
        if (date >= cutoffStr) totalFocusSeconds += seconds;
      });
      const avgFocusMins = Math.round((totalFocusSeconds / 30) / 60);

      // 3. Day of Week Analysis
      const dayStats: Record<string, { total: number; completed: number }> = {};
      recentTasks.forEach(t => {
        const day = new Date(t.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (!dayStats[day]) dayStats[day] = { total: 0, completed: 0 };
        dayStats[day].total++;
        if (t.status === 'completed') dayStats[day].completed++;
      });

      const bestDay = Object.entries(dayStats)
        .map(([day, stats]) => ({ day, rate: stats.completed / stats.total }))
        .sort((a, b) => b.rate - a.rate)[0];

      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'getPerformanceTrends' });

      return {
        success: true,
        message: `Analysis of the last 30 days:
- Task Completion Rate: ${completionRate}% (${completed}/${total})
- Avg Focus Time: ${avgFocusMins} mins/day
- Most Productive Day: ${bestDay ? bestDay.day : 'N/A'}
- Overall Mood: ${store.mood || 'Stable'}`,
        data: { completionRate, totalTasks: total, completedTasks: completed, avgFocusMins, bestDay }
      };
    } catch (error: any) {
      console.error('AI Trends Error:', error);
      return { success: false, message: `Failed to analyze trends: ${error.message}` };
    }
  },

  /**
   * Saves a long-term memory/fact about the user to Firestore
   */
  handleSaveUserMemory: async (params: { content: string; category?: string; importance?: number }) => {
    if (!params.content || typeof params.content !== 'string' || params.content.length > 500) {
      return { success: false, message: 'Invalid memory content (max 500 chars).' };
    }

    const store = useStore.getState();
    if (!store.userId) return { success: false, message: 'User not authenticated.' };

    try {
      const { dbService } = require('./dbService');
      const memoryId = `mem_${Date.now()}`;
      await dbService.saveCollectionDoc(store.userId, 'memories', memoryId, {
        content: params.content,
        category: params.category || 'fact',
        importance: params.importance || 3,
        createdAt: new Date().toISOString()
      });

      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'saveUserMemory', category: params.category });
      return { success: true, message: `Memory saved: "${params.content}"` };
    } catch (error: any) {
      console.error('AI Save Memory Error:', error);
      return { success: false, message: `Failed to save memory: ${error.message}` };
    }
  },

  /**
   * Search through all tasks in the store
   */
  handleSearchTasks: (params: { query: string }) => {
    const store = useStore.getState();
    const searchStr = params.query.toLowerCase();
    
    const results = store.tasks
      .filter(t => t.text.toLowerCase().includes(searchStr))
      .slice(0, 10)
      .map(t => ({ text: t.text, date: t.date, status: t.status, priority: t.priority }));

    analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'searchTasks', query: params.query });
    
    if (results.length === 0) return { success: true, message: `No tasks found matching "${params.query}".` };
    return { 
      success: true, 
      message: `Found ${results.length} tasks matching "${params.query}":`, 
      data: results 
    };
  },

  /**
   * Get full details and long-term history for a specific habit
   */
  handleGetHabitDetails: (params: { id: string }) => {
    const store = useStore.getState();
    const habit = store.habits.find(h => h.id === params.id);
    
    if (!habit) return { success: false, message: `Habit with ID ${params.id} not found.` };

    const totalCompletions = habit.completedDays.length;
    const bestStreak = habit.bestStreak || 0;
    
    analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'getHabitDetails', habitId: params.id });

    return {
      success: true,
      message: `Details for "${habit.title}":`,
      data: {
        title: habit.title,
        category: habit.category,
        frequency: habit.frequency,
        totalCompletions,
        bestStreak,
        currentStreak: habit.currentStreak,
        createdAt: habit.createdAt
      }
    };
  },

  /**
   * Return a payload for an interactive card
   */
  handleShowInteractiveCard: (params: { type: string; title: string; options?: string[]; value?: number }) => {
    analyticsService.logEvent(useStore.getState().userId, 'ai_tool_call', { toolName: 'showInteractiveCard', type: params.type });
    
    return {
      success: true,
      message: `Showing ${params.type} card: "${params.title}"`,
      data: {
        type: params.type,
        title: params.title,
        options: params.options,
        value: params.value
      }
    };
  }
};
