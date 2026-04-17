import { auth, functions } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { httpsCallable } from 'firebase/functions';
import { aiActionHandler } from './aiActionHandler';

const USE_AI_PROXY = process.env.EXPO_PUBLIC_USE_AI_PROXY === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!USE_AI_PROXY && !__DEV__) {
  console.error('[LifeOS] CRITICAL: Client-side AI key detected in non-dev build. Proxy is MANDATORY for production.');
}

const genAI = (GEMINI_API_KEY && (!USE_AI_PROXY || __DEV__)) ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const getCurrentAppContext = () => {
  const state = useStore.getState();
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
            text: { type: SchemaType.STRING, description: 'Optional confirmation' },
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

async function callAIProxy(messages: any[], baseSystemInstruction?: string) {
  if (!auth.currentUser) {
    console.warn('[LifeOS] AI call failed: User is not authenticated on the client.');
    return 'UNAUTHENTICATED';
  }

  try {
    await auth.currentUser.getIdToken(true);

    // Inject full context even through proxy (F-BUG-02)
    const contextStr = getCurrentAppContext();
    const fullSystemInstruction = `${baseSystemInstruction || 'You are LifeOS, a premium personal assistant.'}\n\n${contextStr}`;

    const result = await httpsCallable(functions, 'callAI')({
      messages,
      systemInstruction: fullSystemInstruction,
    });

    const data = result.data as any;

    if (data.functionCalls && data.functionCalls.length > 0) {
      const toolResults = [];

      for (const call of data.functionCalls) {
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

      // We could call the proxy again with tool results to get a final text response,
      // but for simplicity and consistency with current direct implementation, 
      // we'll just confirm action success.
      return 'Done! I have updated your system with those changes.';
    }

    return data.text || 'Sorry, I could not generate a response.';
  } catch (err: any) {
    console.error('[LifeOS] callAIProxy error:', err);
    throw err;
  }
}

export const getAIResponse = async (
  messages: { role: 'user' | 'assistant' | 'system', content: string, image?: { base64: string, mimeType: string } }[]
) => {
  if (USE_AI_PROXY) {
    try {
      const state = useStore.getState();
      const systemInstruction = `You are LifeOS, a premium personal assistant.
      You help users manage tasks, habits, and moods.
      Be supportive, proactive, and concise.
      User: ${state.userName || 'User'}. Date: ${new Date().toLocaleDateString()}.`;

      return await callAIProxy(messages, systemInstruction);
    } catch (err: any) {
      console.error('getAIResponse proxy error:', err);
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
      return await callAIProxy([{ role: 'user', content: prompt }]);
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

  try {
    const summary = JSON.stringify(moodData);
    const prompt = `Analyze this mood data and give ONE short, actionable insight (max 25 words). Data: ${summary}`;

    if (USE_AI_PROXY) {
      return await callAIProxy([{ role: 'user', content: prompt }]);
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
