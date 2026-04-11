const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const getAIResponse = async (messages: { role: 'user' | 'assistant' | 'system', content: string }[]) => {
  try {
    // Check for existing system prompt, if not found, add the default one
    const hasSystemPrompt = messages.some(m => m.role === 'system');
    const finalMessages = hasSystemPrompt 
      ? messages 
      : [{ role: 'system', content: 'You are LifeOS, a helpful, minimalist AI assistant focused on helping users stay productive and reduce stress.' }, ...messages];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Groq AI Service Error:', error);
    return 'I am sorry, I am having trouble connecting to the system right now.';
  }
};

/**
 * Fetches a short, powerful motivational quote for focus sessions.
 */
export const getFocusQuote = async () => {
  const content = await getAIResponse([
    { 
      role: 'system', 
      content: 'Generate a short, powerful, single-sentence motivational quote for a deep work focus session. Max 15 words. No hashtags, no quotation marks. Do not repeat famous quotes, try something fresh.' 
    }
  ]);
  
  // Basic validation to ensure we don't return the error message
  if (content.includes('I am sorry') || content.length < 5) return null;
  return content;
};

/**
 * Analyzes mood history and generates a personalized insight.
 */
export const getMoodInsight = async (moodData: { mood: number; activities?: string[]; emotions?: string[] }[]) => {
  if (moodData.length < 3) return null; // Need minimum data
  
  const summary = moodData.map((m, i) => 
    `Day ${i + 1}: Level ${m.mood}/5${m.activities?.length ? `, activities: ${m.activities.join(', ')}` : ''}${m.emotions?.length ? `, emotions: ${m.emotions.join(', ')}` : ''}`
  ).join('. ');

  const content = await getAIResponse([
    { 
      role: 'system', 
      content: `You are a concise wellness coach. Analyze this mood data and give ONE short, actionable insight (max 25 words). Be specific about patterns you see. No generic advice. Data: ${summary}` 
    }
  ]);
  
  if (content.includes('I am sorry') || content.length < 5) return null;
  return content;
};
