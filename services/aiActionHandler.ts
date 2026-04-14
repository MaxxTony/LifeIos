import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';

export const aiActionHandler = {
  /**
   * Adds a new task based on AI parameters
   */
  handleAddTask: (params: { text: string; priority?: 'high' | 'medium' | 'low'; startTime?: string; endTime?: string }) => {
    const store = useStore.getState();
    try {
      store.addTask(
        params.text,
        params.startTime,
        params.endTime,
        params.priority || 'medium',
        getTodayLocal()
      );
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
    const store = useStore.getState();
    try {
      store.addHabit({
        title: params.title,
        category: params.category || 'General',
        frequency: params.frequency || 'daily',
        icon: 'sparkles', // Default AI icon
        color: '#6366f1', // Default AI color (Indigo)
        targetDays: [0, 1, 2, 3, 4, 5, 6], // Daily by default
        reminderTime: null,
        goalDays: params.frequency === 'daily' ? 7 : 1,
      });
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
    const store = useStore.getState();
    try {
      store.setMood(params.mood, {
        note: params.note,
        emotions: params.emotions,
        activities: params.activities
      });
      return { success: true, message: `Logged mood level ${params.mood}` };
    } catch (error: any) {
      console.error('AI Set Mood Error:', error);
      return { success: false, message: `Failed to log mood: ${error.message}` };
    }
  },

  handleUpdateTask: (params: { id: string; text?: string; priority?: 'high' | 'medium' | 'low'; startTime?: string; endTime?: string }) => {
    const store = useStore.getState();
    try {
      const { id, ...updates } = params;
      store.updateTask(id, updates);
      return { success: true, message: `Updated task ${id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to update task: ${error.message}` };
    }
  },

  handleRemoveTask: (params: { id: string }) => {
    const store = useStore.getState();
    try {
      store.removeTask(params.id);
      return { success: true, message: `Removed task ${params.id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to remove task: ${error.message}` };
    }
  },

  handleUpdateHabit: (params: { id: string; title?: string; frequency?: 'daily' | 'weekly' | 'monthly' }) => {
    const store = useStore.getState();
    try {
      const { id, ...updates } = params;
      store.updateHabit(id, updates);
      return { success: true, message: `Updated habit ${id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to update habit: ${error.message}` };
    }
  },

  handleRemoveHabit: (params: { id: string }) => {
    const store = useStore.getState();
    try {
      store.removeHabit(params.id);
      return { success: true, message: `Removed habit ${params.id}` };
    } catch (error: any) {
      return { success: false, message: `Failed to remove habit: ${error.message}` };
    }
  }
};
