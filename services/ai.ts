import { auth, functions } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { httpsCallable } from 'firebase/functions';
import { aiActionHandler } from './aiActionHandler';

const USE_AI_PROXY = process.env.EXPO_PUBLIC_USE_AI_PROXY === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // NOT EXPO_PUBLIC_ — dev only, never ships in bundle

if (!USE_AI_PROXY && !__DEV__) {
  throw new Error('[FATAL] Gemini API key must not be used directly in production. USE_AI_PROXY must be true.');
}

let _genAIModule: typeof import('@google/generative-ai') | null = null;
const getGenAIModule = async () => {
  if (!_genAIModule) _genAIModule = await import('@google/generative-ai');
  return _genAIModule;
};

const getCurrentAppContext = (memories: any[] = []) => {
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
        startTime: t.startTime,
        endTime: t.endTime
      })),
      focusTimeMinutes: Math.round(state.focusSession.totalSecondsToday / 60),
    },
    habits: habits.map(h => {
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      });
      const completions = last14Days.filter(day => h.completedDays.includes(day)).length;
      return {
        id: h.id,
        title: h.title,
        isCompletedToday: h.completedDays.includes(today),
        last14DaysRate: `${Math.round((completions / 14) * 100)}%`,
        missed: last14Days.filter(day => !h.completedDays.includes(day)).slice(0, 3)
      };
    }),
    recentMoods: moodHistory,
    memories: memories.map(m => m.content).slice(0, 5)
  };

  return `STATE: ${JSON.stringify(context)}`;
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
        description: 'Delete a task. IMPORTANT: Only call this after the user has explicitly confirmed deletion (e.g. said "yes", "confirm", "delete it"). Never call preemptively.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The task ID from context' },
            userConfirmed: { type: 'boolean', description: 'Must be true — only set after user explicitly confirmed deletion in this message' },
          },
          required: ['id', 'userConfirmed'],
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
        description: 'Permanently remove a habit. IMPORTANT: Only call this after the user has explicitly confirmed deletion (e.g. said "yes", "confirm", "delete it"). Never call preemptively.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The habit ID from context' },
            userConfirmed: { type: 'boolean', description: 'Must be true — only set after user explicitly confirmed deletion in this message' },
          },
          required: ['id', 'userConfirmed'],
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
      {
        name: 'saveUserMemory',
        description: 'Save a permanent fact, preference, or life goal about the user to long-term memory. Use this whenever the user shares something significant about themselves that should be remembered in future conversations.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The fact or preference to remember (e.g. "User is allergic to peanuts" or "User wants to run a marathon")' },
            category: { type: 'string', enum: ['preference', 'goal', 'fact', 'past_event'], description: 'The type of information' },
            importance: { type: 'number', minimum: 1, maximum: 5, description: 'How important this is to remember (1 = low, 5 = critical)' },
          },
          required: ['content'],
        },
      },
      {
        name: 'searchTasks',
        description: 'Search through the user\'s entire task history (beyond just today) to find specific past or future tasks.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search term or keyword' },
          },
          required: ['query'],
        },
      },
      {
        name: 'getHabitDetails',
        description: 'Get the full history and detailed statistics for a specific habit (ID found in context).',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The habit ID from context' },
          },
          required: ['id'],
        },
      },
      {
        name: 'showInteractiveCard',
        description: 'Show an interactive UI card (poll, checklist, or progress bar) in the chat.',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['poll', 'checklist', 'progress'], description: 'The card type' },
            title: { type: 'string', description: 'Heading for the card' },
            options: { type: 'array', items: { type: 'string' }, description: 'Options for poll or checklist items' },
            value: { type: 'number', description: 'Value for progress bar (0-100)' },
          },
          required: ['type', 'title'],
        },
      },
    ],
  },
];

async function callAIProxy(messages: any[], baseSystemInstruction?: string, memories: any[] = []) {
  if (!auth.currentUser) {
    console.warn('[LifeOS] AI call failed: User is not authenticated on the client.');
    return { text: 'UNAUTHENTICATED' };
  }

  try {
    await auth.currentUser.getIdToken();

    // Inject full context even through proxy (F-BUG-02)
    const contextStr = getCurrentAppContext(memories);
    const fullSystemInstruction = `${baseSystemInstruction || 'You are LifeOS, a premium personal assistant.'}\n\n${contextStr}`;

    const result = await httpsCallable(functions, 'callAI')({
      messages,
      systemInstruction: fullSystemInstruction,
      tools: tools as any,
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
        else if (call.name === 'saveUserMemory') res = await aiActionHandler.handleSaveUserMemory(call.args as any);
        else if (call.name === 'searchTasks') res = aiActionHandler.handleSearchTasks(call.args as any);
        else if (call.name === 'getHabitDetails') res = aiActionHandler.handleGetHabitDetails(call.args as any);
        else if (call.name === 'showInteractiveCard') res = aiActionHandler.handleShowInteractiveCard(call.args as any);

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
      if (successParts.length > 0) parts.push(`🔹 ${successParts.join(' ')}`);
      if (failParts.length > 0) parts.push(`❌ Could not complete: ${failParts.join(', ')}.`);
      
      return {
        text: parts.join('\n\n') || 'Done! I have updated your system.',
        card: (toolResults.find(r => r.name === 'showInteractiveCard')?.response as any)?.data
      };
    }

    return { text: data.text || 'Sorry, I could not generate a response.' };
  } catch (err: any) {
    console.error('[LifeOS] callAIProxy error:', err);
    throw err;
  }
}

export const getAIResponse = async (
  messages: { role: 'user' | 'assistant' | 'system', content: string, image?: { base64: string, mimeType: string } }[]
): Promise<{ text: string, card?: any }> => {
  const state = useStore.getState();
  const userId = state.userId;
  let memories: any[] = [];
  
  if (userId) {
    try {
      const { getDocs, query, collection, orderBy, limit } = require('firebase/firestore');
      const { db } = require('@/firebase/config');
      const memoriesRef = collection(db, 'users', userId, 'memories');
      const q = query(memoriesRef, orderBy('importance', 'desc'), limit(10));
      const snap = await getDocs(q);
      memories = snap.docs.map((d: any) => d.data());
    } catch (err) {
      console.warn('[AI] Failed to fetch memories:', err);
    }
  }

  if (USE_AI_PROXY) {
    try {
      const state = useStore.getState();
      const systemInstruction = `You are LifeOS, a premium assistant. Be concise and use emojis! 🌈✨ 
      CRITICAL: NO MARKDOWN (* or **). Use CAPS for focus and emojis for bullets.
      ALWAYS provide a full verbal response along with every tool call in the same message.
      APPEARANCE: For theme/mode puchiye: LIGHT☀️, DARK🌙, SYSTEM⚙️. Colors offer kariye: Royal👑, Azure💙, Neo🌿, Coral🪸, Sunset🌅. Use updateSettings tool.
      MEMORY: Use saveUserMemory for user facts (goals, diet, names). Personalize advice using context memories.
      PATTERNS: Analyze "missed" habits, suggest solutions.
      RESEARCH: Use searchTasks/getHabitDetails for history.
      EQ: Analyze sentiment/mood. If low (<3), be EMPATHIC FRIEND. If high, be STRICT COACH.
      CONFLICTS: Scan today's tasks for overlaps. Proactively offer reschedule via updateTask.
      User: ${state.userName || 'User'}. Date: ${new Date().toLocaleDateString()}.`;

      return await callAIProxy(messages, systemInstruction, memories);
    } catch (err: any) {
      console.error('getAIResponse proxy error:', err);
      return { text: 'I am sorry, I am having trouble connecting right now. Please try again.' };
    }
  }

  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key missing. Please add GEMINI_API_KEY to your .env.local file.');
    return { text: 'AI is not configured. Please check your environment setup.' };
  }

  try {
    const { GoogleGenerativeAI } = await getGenAIModule();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are LifeOS, a premium assistant. Be concise and use emojis! 🌈✨ 
      CRITICAL: NO MARKDOWN. Use CAPS for focus and emojis for bullets.
      ALWAYS provide a full verbal response along with every tool call in the same message.
      APPEARANCE: Use updateSettings for theme (LIGHT☀️/DARK🌙/SYSTEM⚙️) and colors.
      MEMORY: Use saveUserMemory for user facts (goals/diet/names). Personalize using context.
      PATTERNS: Analyze missed habits, suggest solutions.
      RESEARCH: Use searchTasks/getHabitDetails for history.
      EQ: Analyze sentiment/mood. If low (<3), be EMPATHIC FRIEND. If high, be STRICT COACH.
      CONFLICTS: Scan today's tasks for overlaps. Proactively offer reschedule via updateTask.
      ${getCurrentAppContext(memories)}`,
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
        else if (call.name === 'saveUserMemory') res = await aiActionHandler.handleSaveUserMemory(call.args as any);
        else if (call.name === 'searchTasks') res = aiActionHandler.handleSearchTasks(call.args as any);
        else if (call.name === 'getHabitDetails') res = aiActionHandler.handleGetHabitDetails(call.args as any);
        else if (call.name === 'showInteractiveCard') res = aiActionHandler.handleShowInteractiveCard(call.args as any);

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
      return {
        text: result2.response.text(),
        card: (toolResults.find(r => r.name === 'showInteractiveCard')?.response as any)?.data
      };
    }

    return { text: response.text() };
  } catch (error) {
    console.error('Gemini AI Service Error:', error);
    return { text: 'I am sorry, I am having trouble connecting to my brain right now. Please try again.' };
  }
};

export const getFocusQuote = async () => {
  if (!USE_AI_PROXY && !GEMINI_API_KEY) return null;

  try {
    const prompt = 'Generate a short, powerful, single-sentence motivational quote for a deep work focus session. Max 15 words. Include a relevant emoji at the end! ✨';

    if (USE_AI_PROXY) {
      const res = await callAIProxy([{ role: 'user', content: prompt }]);
      return res.text || null;
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
    const prompt = `Analyze this mood data and give ONE short, actionable insight (max 25 words). Include helpful emojis! 🌈 Data: ${summary}`;

    if (USE_AI_PROXY) {
      const res = await callAIProxy([{ role: 'user', content: prompt }]);
      return res.text || null;
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
