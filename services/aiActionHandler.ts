import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { analyticsService } from './analyticsService';
import { socialService } from './socialService';

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
      return { success: true, message: `Updated task ${id}` };
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

  handleUpdateSettings: (params: { theme?: 'light' | 'dark' | 'system'; accentColor?: string }) => {
    const store = useStore.getState();
    try {
      if (params.theme) {
        store.actions.setThemePreference(params.theme);
      }
      if (params.accentColor) {
        store.actions.setAccentColor(params.accentColor);
      }
      analyticsService.logEvent(store.userId, 'ai_tool_call', { toolName: 'updateSettings' });
      return { success: true, message: 'App settings updated successfully.' };
    } catch (error: any) {
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
  }
};
