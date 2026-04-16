import { useStore } from '@/store/useStore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { httpsCallable } from 'firebase/functions';
import { getFunctionsService, auth } from '@/firebase/config';
import { aiActionHandler } from './aiActionHandler';
import { getTodayLocal } from '@/utils/dateUtils'; // FIX M-1: use local date

// C-2: Server-side proxy flag.
// When EXPO_PUBLIC_USE_AI_PROXY=true, all AI calls route through the
// `callAI` Firebase Cloud Function (see functions/README.md). The function
// holds the Gemini key as a server-side secret so it never ships in the
// client bundle. When false, we fall back to the legacy client-side key
// path so the app keeps working pre-deploy.
// C-2: Server-side proxy flag.
const USE_AI_PROXY = process.env.EXPO_PUBLIC_USE_AI_PROXY === 'true';

// ⚠️ SECURITY: Never use EXPO_PUBLIC_ for production API keys. 
// We use a non-prefixed GEMINI_KEY that won't be bundled by Expo.
const GEMINI_API_KEY = process.env.GEMINI_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!USE_AI_PROXY && !__DEV__) {
  console.error('[LifeOS] CRITICAL: Client-side AI key detected in non-dev build. Proxy is MANDATORY for production.');
}

const genAI = (GEMINI_API_KEY && (!USE_AI_PROXY || __DEV__)) ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

/**
 * Generates a comprehensive snapshot of the app's current state
 * to provide the AI with context.
 */
const getCurrentAppContext = () => {
  const state = useStore.getState();
  // FIX M-1: Use getTodayLocal() instead of toISOString() — avoids UTC date mismatch
  const today = getTodayLocal();

  const context = {
    user: {
      name: state.userName || 'User',
      struggles: state.onboardingData.struggles,
    },
    today: {
      date: today,
      tasks: state.tasks.filter(t => t.date === today).map(t => ({
        id: t.id,
        text: t.text,
        priority: t.priority,
        status: t.status,
        timing: t.startTime ? `${t.startTime} - ${t.endTime}` : 'No time set'
      })),
      focusTimeMinutes: Math.round(state.focusSession.totalSecondsToday / 60),
      focusGoalHours: state.focusGoalHours,
      currentMood: state.moodHistory[today]?.mood || 'Not logged'
    },
    habits: state.habits.map(h => ({
      id: h.id,
      title: h.title,
      frequency: h.frequency,
      isCompletedToday: h.completedDays.includes(today),
      streak: state.actions.getStreak(h.id)
    }))
  };

  return `CURRENT APP STATE SNAPSHOT (${today}):\n${JSON.stringify(context, null, 2)}`;
};

/**
 * Tool definitions for Gemini Function Calling
 */
const tools = [
  {
    functionDeclarations: [
      {
        name: 'addTask',
        description: 'Add a new task to the user\'s daily list.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: 'The task description' },
            priority: { type: SchemaType.STRING, enum: ['high', 'medium', 'low'], description: 'Task priority' },
            startTime: { type: SchemaType.STRING, description: 'Optional start time (e.g. "09:00 AM")' },
            endTime: { type: SchemaType.STRING, description: 'Optional end time (e.g. "10:00 AM")' },
          },
          required: ['text'],
        },
      },
      {
        name: 'addHabit',
        description: 'Create a new habit for the user to track.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING, description: 'The habit name (e.g. Drink Water)' },
            category: { type: SchemaType.STRING, description: 'Category (Health, Work, Personal, etc.)' },
            frequency: { type: SchemaType.STRING, enum: ['daily', 'weekly', 'monthly'], description: 'How often' },
          },
          required: ['title'],
        },
      },
      {
        name: 'setMood',
        description: 'Log the user\'s current mood and emotions.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            mood: { type: SchemaType.NUMBER, description: 'Mood level from 1 (Awful) to 5 (Amazing)' },
            note: { type: SchemaType.STRING, description: 'Optional note about how they feel' },
            emotions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'List of specific emotions' },
          },
          required: ['mood'],
        },
      },
      {
        name: 'updateTask',
        description: 'Edit an existing task\'s properties.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'The task ID from context' },
            text: { type: SchemaType.STRING, description: 'New description' },
            priority: { type: SchemaType.STRING, enum: ['high', 'medium', 'low'] },
            startTime: { type: SchemaType.STRING },
            endTime: { type: SchemaType.STRING },
          },
          required: ['id'],
        },
      },
      {
        name: 'removeTask',
        description: 'Delete a task from the list.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'The task ID from context' },
          },
          required: ['id'],
        },
      },
      {
        name: 'updateHabit',
        description: 'Modify an existing habit.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'The habit ID from context' },
            title: { type: SchemaType.STRING },
            frequency: { type: SchemaType.STRING, enum: ['daily', 'weekly', 'monthly'] },
          },
          required: ['id'],
        },
      },
      {
        name: 'removeHabit',
        description: 'Permanently remove a habit.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'The habit ID from context' },
          },
          required: ['id'],
        },
      },
    ],
  },
];

export const getAIResponse = async (
  messages: { role: 'user' | 'assistant' | 'system', content: string, image?: { base64: string, mimeType: string } }[]
) => {
  // C-2: Server-side proxy path — no API key on device, no tool-calling yet.
  // Tool-calling can be added to the Cloud Function in a follow-up; for now
  // the proxy handles plain text + vision, which covers the chat use case.
  if (USE_AI_PROXY) {
    // auth.authStateReady() resolves once Firebase Auth has finished loading
    // its persisted state from AsyncStorage. Without this await, the
    // auth-internal provider used by httpsCallable may not be initialized yet
    // and will send the request without an Authorization header, causing
    // the function to throw `unauthenticated` even when the user is logged in.
    await auth.authStateReady();

    console.log('[AI DEBUG] authStateReady done. currentUser:', auth.currentUser?.uid ?? 'NULL');

    if (!auth.currentUser) {
      console.warn('[LifeOS] AI call failed: User is not authenticated on the client.');
      return 'UNAUTHENTICATED';
    }

    try {
      const idToken = await auth.currentUser.getIdToken(true); // force refresh
      console.log('[AI DEBUG] Got ID token, length:', idToken.length, 'uid:', auth.currentUser.uid);

      const call = httpsCallable<
        { messages: typeof messages; systemInstruction?: string },
        { text: string }
      >(getFunctionsService(), 'callAI');
      const state = useStore.getState();
      const systemInstruction = `You are LifeOS, a premium personal assistant.
      You help users manage tasks, habits, and moods.
      Be supportive, proactive, and concise.
      User: ${state.userName || 'User'}. Date: ${new Date().toLocaleDateString()}.`;
      const result = await call({ messages, systemInstruction });
      return result.data?.text || 'Sorry, I could not generate a response.';
    } catch (err: any) {
      console.error('[AI DEBUG] callAI error code:', (err as any)?.code, 'message:', (err as any)?.message);
      console.error('callAI proxy error:', err);
      return 'I am sorry, I am having trouble connecting right now. Please try again.';
    }
  }

  if (!genAI) {
    console.warn('Gemini API key missing. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    return 'AI is not configured. Please check your environment setup.';
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are LifeOS, a premium personal assistant.
      You help users manage tasks, habits, and moods.
      Be supportive, proactive, and concise.
      You have access to the user's current app state via context.
      Important: You can actually perform actions like adding tasks or habits using the provided tools.
      If a user asks to "remind me to..." or "add a habit...", use the tools!
      If the user provides an image, analyze it carefully to help them.

      ${getCurrentAppContext()}`,
      tools: tools as any,
    });

    // Format messages for Gemini Chat API (exclude system role — not supported in chat history)
    const history = messages.slice(0, -1)
      .filter(m => m.role !== 'system')
      .map(m => {
        const parts: any[] = [{ text: m.content || '' }];
        if (m.image) {
          parts.push({
            inlineData: {
              data: m.image.base64,
              mimeType: m.image.mimeType
            }
          });
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      });

    const lastMsg = messages[messages.length - 1];
    const lastParts: any[] = [{ text: lastMsg.content || '' }];
    if (lastMsg.image) {
      lastParts.push({
        inlineData: {
          data: lastMsg.image.base64,
          mimeType: lastMsg.image.mimeType
        }
      });
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastParts);
    const response = await result.response;

    // Handle potential tool calls
    const calls = response.functionCalls();
    if (calls && calls.length > 0) {
      const toolResults = [];

      for (const call of calls) {
        let res = null;
        if (call.name === 'addTask') res = aiActionHandler.handleAddTask(call.args as any);
        else if (call.name === 'addHabit') res = aiActionHandler.handleAddHabit(call.args as any);
        else if (call.name === 'setMood') res = aiActionHandler.handleSetMood(call.args as any);
        else if (call.name === 'updateTask') res = aiActionHandler.handleUpdateTask(call.args as any);
        else if (call.name === 'removeTask') res = aiActionHandler.handleRemoveTask(call.args as any);
        else if (call.name === 'updateHabit') res = aiActionHandler.handleUpdateHabit(call.args as any);
        else if (call.name === 'removeHabit') res = aiActionHandler.handleRemoveHabit(call.args as any);

        toolResults.push({
          name: call.name,
          response: res || { success: false, message: 'Unknown tool' }
        });
      }

      // FIX M-2: Send ALL tool results back
      const result2 = await chat.sendMessage(
        toolResults.map(tr => ({
          functionResponse: tr
        }))
      );
      return result2.response.text();
    }

    return response.text();
  } catch (error) {
    console.error('Gemini AI Service Error:', error);
    return 'I am sorry, I am having trouble connecting to my brain right now. Please try again.';
  }
};

export const getFocusQuote = async () => {
  if (!USE_AI_PROXY && !genAI) return null;

  try {
    const prompt = 'Generate a short, powerful, single-sentence motivational quote for a deep work focus session. Max 15 words.';
    
    if (USE_AI_PROXY) {
      await auth.authStateReady();
      if (!auth.currentUser) return null;
      await auth.currentUser.getIdToken();
      const call = httpsCallable<{ messages: { role: string; content: string }[] }, { text: string }>(getFunctionsService(), 'callAI');
      const result = await call({ messages: [{ role: 'user', content: prompt }] });
      return result.data?.text || null;
    } else {
      const model = genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result?.response.text() || null;
    }
  } catch (err) {
    console.error('[AI] getFocusQuote error:', err);
    return null;
  }
};

export const getMoodInsight = async (moodData: any[]) => {
  if (moodData.length < 3) return null;
  if (!USE_AI_PROXY && !genAI) return null;

  const summary = JSON.stringify(moodData);
  const prompt = `Analyze this mood data and give ONE short, actionable insight (max 25 words). Data: ${summary}`;

  try {
    if (USE_AI_PROXY) {
      await auth.authStateReady();
      if (!auth.currentUser) return null;
      await auth.currentUser.getIdToken();
      const call = httpsCallable<{ messages: { role: string; content: string }[] }, { text: string }>(getFunctionsService(), 'callAI');
      const result = await call({ messages: [{ role: 'user', content: prompt }] });
      return result.data?.text || null;
    } else {
      const model = genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result?.response.text() || null;
    }
  } catch (err) {
    console.error('[AI] getMoodInsight error:', err);
    return null;
  }
};
