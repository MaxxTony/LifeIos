import { auth, functions } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { httpsCallable } from 'firebase/functions';
import { aiActionHandler } from './aiActionHandler';

const USE_AI_PROXY = process.env.EXPO_PUBLIC_USE_AI_PROXY === 'true';
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!USE_AI_PROXY && !__DEV__) {
  throw new Error('[FATAL] Gemini API key must not be used directly in production. USE_AI_PROXY must be true.');
}

let _genAIModule: typeof import('@google/generative-ai') | null = null;
const getGenAIModule = async () => {
  if (!_genAIModule) _genAIModule = await import('@google/generative-ai');
  return _genAIModule;
};

const getCurrentAppContext = () => {
  const state = useStore.getState();
  const today = getTodayLocal();

  // C-AI-2 FIX: Truncate context to only include essential high-level data
  // Limit to top 5 tasks and top 5 habits to prevent token bloat and PII leakage
  const tasks = state.tasks
    .filter(t => t.date === today)
    .sort((a, b) => {
      const pMap = { high: 0, medium: 1, low: 2 };
      return (pMap[a.priority as keyof typeof pMap] ?? 1) - (pMap[b.priority as keyof typeof pMap] ?? 1);
    })
    .slice(0, 5);

  const habits = state.habits.slice(0, 5);

  // Limit mood history to last 7 days only
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  const moodHistory: Record<string, any> = {};
  last7Days.forEach(day => {
    if (state.moodHistory[day]) moodHistory[day] = state.moodHistory[day].mood;
  });

  const context = {
    user: {
      name: state.userName || 'User',
      bio: state.bio,
      occupation: state.occupation,
      skills: state.skills,
      location: state.location,
      birthday: state.birthday,
      struggles: state.onboardingData.struggles.slice(0, 3),
    },
    settings: {
      theme: state.themePreference,
      accentColor: state.accentColor,
    },
    today: {
      date: today,
      tasks: tasks.map(t => ({
        id: t.id,
        text: t.text,
        priority: t.priority,
        status: t.status,
      })),
      focusTimeMinutes: Math.round(state.focusSession.totalSecondsToday / 60),
    },
    habits: habits.map(h => ({
      id: h.id,
      title: h.title,
      isCompletedToday: h.completedDays.includes(today),
    })),
    recentMoods: moodHistory
  };

  const snapshot = `CURRENT APP STATE SNAPSHOT (${today}):\n${JSON.stringify(context, null, 2)}`;

  // C-AI-2: Enforce hard character limit to prevent proxy failures & protect PII
  return snapshot.length > 2000 ? snapshot.substring(0, 1997) + '...' : snapshot;
};

const tools = [
  {
    functionDeclarations: [
      {
        name: 'addTask',
        description: 'Add a new task to the user\'s daily list.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The task description' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority' },
            startTime: { type: 'string', description: 'Optional start time (e.g. "09:00 AM")' },
            endTime: { type: 'string', description: 'Optional end time (e.g. "10:00 AM")' },
          },
          required: ['text'],
        },
      },
      {
        name: 'addHabit',
        description: 'Create a new habit for the user to track.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The habit name (e.g. Drink Water)' },
            category: { type: 'string', description: 'Category (Health, Work, Personal, etc.)' },
            frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'How often' },
          },
          required: ['title'],
        },
      },
      {
        name: 'setMood',
        description: 'Log the user\'s current mood and emotions.',
        parameters: {
          type: 'object',
          properties: {
            mood: { type: 'number', description: 'Mood level from 1 (Awful) to 5 (Amazing)' },
            note: { type: 'string', description: 'Optional note about how they feel' },
            emotions: { type: 'array', items: { type: 'string' }, description: 'List of specific emotions' },
          },
          required: ['mood'],
        },
      },
      {
        name: 'updateTask',
        description: 'Edit an existing task\'s properties.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The task ID from context' },
            text: { type: 'string', description: 'New description' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
          },
          required: ['id'],
        },
      },
      {
        name: 'removeTask',
        description: 'Delete a task from the list.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The task ID from context' },
            text: { type: 'string', description: 'Optional confirmation' },
          },
          required: ['id'],
        },
      },
      {
        name: 'updateHabit',
        description: 'Modify an existing habit.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The habit ID from context' },
            title: { type: 'string' },
            frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          },
          required: ['id'],
        },
      },
      {
        name: 'removeHabit',
        description: 'Permanently remove a habit.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The habit ID from context' },
          },
          required: ['id'],
        },
      },
      {
        name: 'updateProfile',
        description: 'Update user profile information (name, bio, occupation, skills, location, birthday).',
        parameters: {
          type: 'object',
          properties: {
            userName: { type: 'string', description: 'User display name' },
            bio: { type: 'string' },
            occupation: { type: 'string' },
            skills: { type: 'string', description: 'Comma separated list of skills' },
            location: { type: 'string', description: 'City or country' },
            birthday: { type: 'string', description: 'Date string (e.g. YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'getSocialLeaderboard',
        description: 'Fetch the current weekly XP leaderboard for the user and their friends.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'sendSocialNudge',
        description: 'Send a motivational nudge to a friend on the leaderboard.',
        parameters: {
          type: 'object',
          properties: {
            friendId: { type: 'string', description: 'The ID of the friend to nudge' },
            message: { type: 'string', description: 'The nudge message' },
          },
          required: ['friendId', 'message'],
        },
      },
      {
        name: 'getPerformanceTrends',
        description: 'Analyze user productivity, focus, and mood trends over the last 30 days.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'updateSettings',
        description: 'Change app theme (light/dark/system) or accent color.',
        parameters: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'], description: 'Theme preference' },
            accentColor: { type: 'string', description: 'Hex color code (e.g. #FF5733)' },
          },
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
    await auth.currentUser.getIdToken();

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
        else if (call.name === 'updateProfile') res = aiActionHandler.handleUpdateProfile(call.args as any);
        else if (call.name === 'updateSettings') res = aiActionHandler.handleUpdateSettings(call.args as any);
        else if (call.name === 'getSocialLeaderboard') res = await aiActionHandler.handleGetSocialLeaderboard();
        else if (call.name === 'sendSocialNudge') res = await aiActionHandler.handleSendSocialNudge(call.args as any);
        else if (call.name === 'getPerformanceTrends') res = aiActionHandler.handleGetPerformanceTrends();

        toolResults.push({
          name: call.name,
          response: res || { success: false, message: 'Unknown tool' }
        });
      }

      // C-21 FIX: Build a context-aware summary from actual tool results instead of a hardcoded string.
      const successParts = toolResults
        .filter(r => r.response?.success !== false)
        .map(r => r.response?.message || r.name);
      const failParts = toolResults
        .filter(r => r.response?.success === false)
        .map(r => r.response?.message || r.name);

      const parts: string[] = [];
      if (successParts.length > 0) parts.push(successParts.join(' '));
      if (failParts.length > 0) parts.push(`Could not complete: ${failParts.join(', ')}.`);
      return parts.join(' ') || 'Done! I have updated your system.';
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
      User: ${state.userName || 'User'}. Date: ${new Date().toLocaleDateString()}.
      
      CRITICAL: You HAVE the permission and the tool (updateSettings) to change the app's appearance. 
      NEVER tell the user "I cannot change the theme" or "I don't have permission". 
      When a user asks to change the theme or color, you MUST use the updateSettings tool.

      APPEARANCE CONTROL:
      - **KEYWORDS: "theme", "mode", "light", "dark"** -> Focus on lighting mode.
        Ask: "I can switch you to **Light Mode**, **Dark Mode**, or **System Default**. Which one would you like?"
      - **KEYWORDS: "color", "accent"** -> Focus on the color style.
        Offer these official colors: Royal (#7C5CFF), Azure (#5B8CFF), Neo (#00D68F), Coral (#FF4B4B), Sunset (#FFB347), Candy (#FF69B4), Cyber (#00CED1), Emerald (#10B981), Violet (#8B5CF6), Crimson (#DC2626), Amber (#D97706), Rose (#E11D48).
        Ask: "Which one would you like to try?"
      
      Always use the **updateSettings** tool to apply the final choice. Both options are available to you!`;

      return await callAIProxy(messages, systemInstruction);
    } catch (err: any) {
      console.error('getAIResponse proxy error:', err);
      return 'I am sorry, I am having trouble connecting right now. Please try again.';
    }
  }

  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key missing. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env.local file.');
    return 'AI is not configured. Please check your environment setup.';
  }

  try {
    const { GoogleGenerativeAI } = await getGenAIModule();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are LifeOS, a premium personal assistant.
      You help users manage tasks, habits, and moods.
      Be supportive, proactive, and concise.
      You have access to the user's current app state via context.
      
      CRITICAL: You HAVE the permission and the tool (updateSettings) to change the app's appearance. 
      NEVER tell the user "I cannot change the theme" or "I don't have permission". 
      When a user asks to change the theme or color, you MUST use the updateSettings tool.

      Important: You can actually perform actions like adding tasks or habits using the provided tools.
      If a user asks to "remind me to..." or "add a habit...", use the tools!
      If the user provides an image, analyze it carefully to help them.

      APPEARANCE CONTROL:
      - **KEYWORDS: "theme", "mode", "light", "dark"** -> Focus on lighting mode.
        Ask: "I can switch you to **Light Mode**, **Dark Mode**, or **System Default**. Which one would you like?"
      - **KEYWORDS: "color", "accent"** -> Focus on the color style.
        Offer these official colors: Royal (#7C5CFF), Azure (#5B8CFF), Neo (#00D68F), Coral (#FF4B4B), Sunset (#FFB347), Candy (#FF69B4), Cyber (#00CED1), Emerald (#10B981), Violet (#8B5CF6), Crimson (#DC2626), Amber (#D97706), Rose (#E11D48).
        Ask: "Which one would you like to try?"
      
      Always use the **updateSettings** tool to apply the final choice. Both options are available to you!

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
        else if (call.name === 'updateProfile') res = aiActionHandler.handleUpdateProfile(call.args as any);
        else if (call.name === 'updateSettings') res = aiActionHandler.handleUpdateSettings(call.args as any);
        else if (call.name === 'getSocialLeaderboard') res = await aiActionHandler.handleGetSocialLeaderboard();
        else if (call.name === 'sendSocialNudge') res = await aiActionHandler.handleSendSocialNudge(call.args as any);
        else if (call.name === 'getPerformanceTrends') res = aiActionHandler.handleGetPerformanceTrends();

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
  if (!USE_AI_PROXY && !GEMINI_API_KEY) return null;

  try {
    const prompt = 'Generate a short, powerful, single-sentence motivational quote for a deep work focus session. Max 15 words.';

    if (USE_AI_PROXY) {
      return await callAIProxy([{ role: 'user', content: prompt }]);
    } else {
      const { GoogleGenerativeAI } = await getGenAIModule();
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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
  if (!USE_AI_PROXY && !GEMINI_API_KEY) return null;

  try {
    const safeData = moodData.slice(-30);
    const summary = JSON.stringify(safeData);
    const prompt = `Analyze this mood data and give ONE short, actionable insight (max 25 words). Data: ${summary}`;

    if (USE_AI_PROXY) {
      return await callAIProxy([{ role: 'user', content: prompt }]);
    } else {
      const { GoogleGenerativeAI } = await getGenAIModule();
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      return result?.response.text() || null;
    }
  } catch (err) {
    console.error('[AI] getMoodInsight error:', err);
    return null;
  }
};
