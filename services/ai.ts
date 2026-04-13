import { useStore } from '@/store/useStore';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { aiActionHandler } from './aiActionHandler';
import { getTodayLocal } from '@/utils/dateUtils'; // FIX M-1: use local date

// ⚠️  SECURITY WARNING — M-9
// EXPO_PUBLIC_ variables are embedded in the JS bundle at build time.
// Anyone who decompiles the APK/IPA can extract this key and run AI queries on your bill.
//
// PRODUCTION FIX: Route all AI calls through a Firebase Cloud Function (or your own
// backend). The Cloud Function holds the key server-side and the client calls it via
// HTTPS. Example:
//   https.onCall(async (data, ctx) => {
//     if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', '...');
//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
//     ...
//   });
//
// Until that backend proxy is in place, rotate this key frequently in Google Cloud Console
// and restrict it by Android package / iOS bundle ID in the API credentials settings.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Initialize Gemini
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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
      title: h.title,
      frequency: h.frequency,
      isCompletedToday: h.completedDays.includes(today),
      streak: state.getStreak(h.id)
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
    ],
  },
];

export const getAIResponse = async (
  messages: { role: 'user' | 'assistant' | 'system', content: string, image?: { base64: string, mimeType: string } }[]
) => {
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
      const toolResults: any = {};

      for (const call of calls) {
        if (call.name === 'addTask') {
          toolResults[call.name] = aiActionHandler.handleAddTask(call.args as any);
        } else if (call.name === 'addHabit') {
          toolResults[call.name] = aiActionHandler.handleAddHabit(call.args as any);
        } else if (call.name === 'setMood') {
          toolResults[call.name] = aiActionHandler.handleSetMood(call.args as any);
        }
      }

      // FIX M-2: Send ALL tool results back, not just calls[0]
      const result2 = await chat.sendMessage(
        calls.map(call => ({
          functionResponse: {
            name: call.name,
            response: toolResults[call.name] || { success: false, message: 'Unknown tool' }
          }
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
  try {
    const model = genAI?.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model?.generateContent('Generate a short, powerful, single-sentence motivational quote for a deep work focus session. Max 15 words.');
    return result?.response.text() || null;
  } catch {
    return null;
  }
};

export const getMoodInsight = async (moodData: any[]) => {
  if (moodData.length < 3) return null;
  const summary = JSON.stringify(moodData);
  try {
    const model = genAI?.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model?.generateContent(`Analyze this mood data and give ONE short, actionable insight (max 25 words). Data: ${summary}`);
    return result?.response.text() || null;
  } catch {
    return null;
  }
};
