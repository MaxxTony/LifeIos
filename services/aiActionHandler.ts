import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { analyticsService } from './analyticsService';

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

  handleRemoveTask: (params: { id: string }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid task ID.' };
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

  handleRemoveHabit: (params: { id: string }) => {
    if (!params.id || typeof params.id !== 'string' || params.id.length > 100) {
      return { success: false, message: 'Invalid habit ID.' };
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
  }
};
