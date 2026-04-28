import { useStore } from '@/store/useStore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { getAIResponse } from './ai';
import { notificationService } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_USER_KEY = 'lifeos_coach_task_owner';

/**
 * runAICoachTask
 * runAICoachTask
 * Standard function declaration to take advantage of hoisting.
 */
export async function runAICoachTask() {
  try {
    // M-07 FIX: Verify user identity BEFORE the jitter delay so we don't burn 30 mins for nobody.
    const state = useStore.getState();
    const registeredUserId = await AsyncStorage.getItem(COACH_USER_KEY);
    const { authService } = require('./authService');
    const actualUid = authService.currentUser?.uid;

    if (!state.userId || state.userId !== registeredUserId || state.userId !== actualUid) {
      console.log("[AI Coach] Skip: User mismatch, logged out, or session mismatched.");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // S-INFRA-8: Add jitter (up to 30 mins) to prevent thundering herd
    const jitterMs = Math.floor(Math.random() * 30 * 60 * 1000);
    if (!__DEV__) {
      await new Promise(r => setTimeout(r, jitterMs));
    }

    const { habits, tasks, focusHistory } = state;

    // Prepare a summarized payload of only the last 7 days to keep token costs low
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
 
    const truncatedFocus = Object.fromEntries(
      Object.entries(focusHistory).filter(([date]) => date >= lastWeekStr)
    );
 
    const payload = JSON.stringify({
      habits: habits.slice(0, 10).map(h => ({ title: h.title, streak: h.bestStreak })),
      focusHistory: truncatedFocus,
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
      const cleaned = (response.text || '')
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

