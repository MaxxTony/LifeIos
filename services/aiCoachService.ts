import { useStore } from '@/store/useStore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getAIResponse } from './ai';
import { notificationService } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AI_COACH_TASK = 'BACKGROUND_AI_COACH_TASK';
const COACH_USER_KEY = 'lifeos_coach_task_owner';

// C-8: Define background task at the module Level (Expo Router best practice)
// Using a literal string and ensuring this runs at the very top of module evaluation.
TaskManager.defineTask('BACKGROUND_AI_COACH_TASK', runAICoachTask);

/**
 * runAICoachTask
 * Standard function declaration to take advantage of hoisting.
 */
export async function runAICoachTask() {
  try {
    const state = useStore.getState();
    const { habits, tasks, focusHistory } = state;

    // B-M1: Verify that the background task is running for the correct user.
    const registeredUserId = await AsyncStorage.getItem(COACH_USER_KEY);
    if (!state.userId || state.userId !== registeredUserId) {
      console.log("[AI Coach] Skip: User mismatch or logged out.");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Prepare a summarized payload of the user's last 7 days
    const payload = JSON.stringify({
      habits: habits.map(h => ({ title: h.title, streak: h.bestStreak })),
      focusHistory,
      tasks: tasks.slice(-20).map(t => ({ text: t.text, completed: t.completed, missed: t.status === 'missed' }))
    });

    const prompt = `
      You are an elite productivity AI Coach.
      Analyze the user's recent data over the last 7 days:
      ${payload}
      
      Identify ONE major pattern (e.g., they miss specific habits, or their focus dips). 
      Return ONLY a JSON response in this exact format, with no markdown formatting or backticks:
      {
        "insight": "Your observation here",
        "actionableAdvice": "A short, engaging push notification text to help them course-correct tomorrow."
      }
    `;

    // Call the LLM
    const response = await getAIResponse([{ role: 'user', content: prompt }]);

    let parsed: { insight?: string; actionableAdvice?: string } | null = null;
    try {
      const cleaned = response
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('AI Coach response parse failed:', e, 'raw:', response);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (!parsed || typeof parsed.actionableAdvice !== 'string' || !parsed.actionableAdvice.trim()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Send a personalized local push notification
    if (typeof notificationService?.sendProactiveAI === 'function') {
      notificationService.sendProactiveAI('LifeOS AI Coach 🧠', parsed.actionableAdvice);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("AI Coach Background Task Failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

export const registerAICoachTask = async () => {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.log("Background fetch not available:", status);
      return;
    }

    // B-M1: Store the current userId so the task knows who to run for.
    const userId = useStore.getState().userId;
    if (userId) {
      await AsyncStorage.setItem(COACH_USER_KEY, userId);
    }

    await BackgroundFetch.registerTaskAsync(AI_COACH_TASK, {
      minimumInterval: 60 * 60 * 24,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log("AI Coach background task registered");
  } catch (err) {
    console.log("Task Register failed:", err);
  }
};
