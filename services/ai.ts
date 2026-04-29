import { auth, functions } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { getTodayLocal } from '@/utils/dateUtils';
import { httpsCallable } from 'firebase/functions';
import { aiActionHandler } from './aiActionHandler';

const USE_AI_PROXY = process.env.EXPO_PUBLIC_USE_AI_PROXY === 'true';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // NOT EXPO_PUBLIC_ — dev only, never ships in bundle

if (!USE_AI_PROXY && !__DEV__) {
  console.warn('[LifeOS] AI is running in direct mode on a production build. This is usually due to missing EXPO_PUBLIC_USE_AI_PROXY env var.');
}

let _genAIModule: typeof import('@google/generative-ai') | null = null;
const getGenAIModule = async () => {
  if (!_genAIModule) _genAIModule = await import('@google/generative-ai');
  return _genAIModule;
};

const buildSystemInstruction = () => {
  const state = useStore.getState();
  const isPro = state.isPro;
  const name = state.userName || 'friend';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  return `You are LifeOS — ${name}'s pocket buddy + life coach. NOT a chatbot. The friend who hypes wins, calls bullshit, pushes harder.

VOICE
- Friend texting: "yo", "let's go", "got you", "damn", "I'm proud of you". Use ${name} sometimes.
- Mood-aware: STATE.recentMoods < 3 → soft, validating first. ≥ 4 → push harder coach mode.
- Real names/numbers from STATE only. No generic advice.
- Reply in user's language. Hinglish ("kr do"/"haan"/"bhai") → match it. Hindi/Spanish/etc same — keep buddy voice in their language.

STYLE
- 1-3 sentences, under 50 words. Plain text — NO *, **, ###, dashes.
- CAPS sparingly. Max 2 emojis (🔥 ✨ 💪 🫶 ⚡️ 🧠 🌅 🌙).
- ALWAYS verbal reply alongside any tool call.
- Speak human, never technical ("locked it in for 9 AM ✨").

APPEARANCE — pass HEX always, never the name
- Theme (light/dark/system): free for everyone.
- FREE accents: Royal #7C5CFF, Azure #5B8CFF, Neo #00D68F.
- PRO accents: Coral #FF4B4B, Sunset #FFB347, Candy #FF69B4, Cyber #00CED1, Emerald #10B981, Violet #8B5CF6, Crimson #DC2626, Amber #D97706, Rose #E11D48.
- ${isPro ? 'User is PRO ✨ — every accent unlocked.' : 'User is FREE. If they ask for a PRO accent, say honestly "Coral is a Pro vibe — opening upgrade for you 🔥" THEN call updateSettings (the paywall pops automatically). Free options: Royal/Azure/Neo.'}
- Resolve nicknames: "ocean"→Azure, "warm orange"→Sunset, "green"→Neo, "pink"→Candy, etc.

POWERS (full toolkit, no gates)
Tasks: addTask/updateTask/searchTasks. removeTask only after explicit "yes/confirm/delete it" with userConfirmed=true.
Habits: addHabit/updateHabit/getHabitDetails. removeHabit same confirm rule.
Mood: setMood with emotions. Profile: updateProfile.
saveUserMemory whenever they share something real (goals, diet, milestones, fears, wins).
getPerformanceTrends, getSocialLeaderboard, sendSocialNudge, showInteractiveCard.

RULES
- Read STATE first.
- Time conflicts in today.tasks → offer updateTask reschedule unprompted.
- Missed habits → ask the real reason, suggest a 1% smaller version.
- Pull memories to personalize ("I know you're prepping for the marathon…").
- Never sound corporate. Never "As an AI…". Never claim done without the tool call.

Today: ${today}. User: ${name}.`;
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
        description: 'Change the app theme mode and/or accent color. Theme is free for everyone. Accent has a free tier (Royal/Azure/Neo) and a Pro tier (Coral/Sunset/Candy/Cyber/Emerald/Violet/Crimson/Amber/Rose). Always pass the HEX value for accentColor — never the name.',
        parameters: {
          type: 'object',
          properties: {
            theme: { type: 'string', enum: ['light', 'dark', 'system'], description: 'Theme mode (free for all users)' },
            accentColor: { type: 'string', description: 'Hex code of the accent. FREE: #7C5CFF (Royal), #5B8CFF (Azure), #00D68F (Neo). PRO: #FF4B4B (Coral), #FFB347 (Sunset), #FF69B4 (Candy), #00CED1 (Cyber), #10B981 (Emerald), #8B5CF6 (Violet), #DC2626 (Crimson), #D97706 (Amber), #E11D48 (Rose).' },
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

// AI has FULL access to every tool for both Free and Pro users — the AI is
// the heart of the app, so it can do anything. Free vs Pro gating happens
// at two specific layers instead of restricting the toolset:
//   1. Daily AI message cap (useProGate.canUseAI) — blocks the network call.
//   2. Pro-only accents inside handleUpdateSettings — opens the paywall if hit.

async function callAIProxy(messages: any[], baseSystemInstruction?: string, memories: any[] = []) {
  if (!auth.currentUser) {
    console.warn('[LifeOS] AI call failed: User is not authenticated on the client.');
    return { text: 'UNAUTHENTICATED' };
  }

  try {
    await auth.currentUser.getIdToken();

    // Inject full context even through proxy (F-BUG-02)
    const contextStr = getCurrentAppContext(memories);
    const basePrompt = baseSystemInstruction || 'You are LifeOS, a premium assistant.';

    // Safety: cloud function caps systemInstruction (currently 4000, 8000 after
    // next deploy). If prompt + context overflows, keep the personality intact
    // and trim the context tail — losing some habit history hurts less than
    // losing the buddy persona entirely.
    const MAX_SYSTEM_CHARS = 3900;
    let fullSystemInstruction = `${basePrompt}\n\n${contextStr}`;
    if (fullSystemInstruction.length > MAX_SYSTEM_CHARS) {
      const room = MAX_SYSTEM_CHARS - basePrompt.length - 4;
      const trimmedContext = room > 200 ? contextStr.slice(0, room) : '';
      fullSystemInstruction = `${basePrompt}\n\n${trimmedContext}`;
      console.warn(`[AI] System instruction trimmed from ${basePrompt.length + contextStr.length + 2} to ${fullSystemInstruction.length} chars.`);
    }

    // The cloud function defines its own canonical tool set, so we don't ship
    // tools across the wire — saves ~3KB per request and a JSON serialize.
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
      
      // C-UI-CLEAN: Remove technical prefixes (🔹, ❌) as requested by user.
      // We rely on the AI's natural language response (data.text) for feedback.
      if (data.text) {
        return {
          text: data.text,
          card: (toolResults.find(r => r.name === 'showInteractiveCard')?.response as any)?.data
        };
      }

      // Fallback if AI didn't provide text but executed tools successfully
      const allSuccess = toolResults.every(r => r.response?.success !== false);
      return {
        text: allSuccess ? "Done! I've updated your system. ✨" : "I encountered a small issue while trying to do that, but I've updated what I could. 😅",
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
      const { getDocs, query, collection, orderBy, limit } = await import('firebase/firestore');
      const { db } = await import('@/firebase/config');
      const memoriesRef = collection(db, 'users', userId, 'memories');
      const q = query(memoriesRef, orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      memories = snap.docs.map((d: any) => d.data());
    } catch (err) {
      console.warn('[AI] Failed to fetch memories:', err);
    }
  }

  const systemInstruction = buildSystemInstruction();

  // Gemini hard-requires the conversation history to start with role 'user'.
  // If the persisted convo begins with an assistant/proactive message, drop
  // leading non-user messages until we hit the first user turn.
  const firstUserIdx = messages.findIndex(m => m.role === 'user');
  const sanitizedMessages = firstUserIdx > 0 ? messages.slice(firstUserIdx) : messages;

  if (USE_AI_PROXY) {
    try {
      return await callAIProxy(sanitizedMessages, systemInstruction, memories);
    } catch (err: any) {
      console.error('getAIResponse proxy error:', err);
      return { text: "Yo, my brain glitched for a sec. Hit me again? 🙏" };
    }
  }

  if (!GEMINI_API_KEY && !USE_AI_PROXY) {
    console.warn('Gemini API key missing and Proxy disabled. Please check your environment setup.');
    return { text: 'I am sorry, my AI brain is currently disconnected. Please contact support or check your internet connection.' };
  }

  try {
    const { GoogleGenerativeAI } = await getGenAIModule();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `${systemInstruction}\n\n${getCurrentAppContext(memories)}`,
      tools: tools as any,
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // TOKEN-OPT: Truncate history to last 20 messages to reduce token costs ~40%
    const recentMessages = sanitizedMessages.slice(-21);
    const history = recentMessages.slice(0, -1)
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

    const lastMsg = sanitizedMessages[sanitizedMessages.length - 1];
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
    const response = result.response;

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
