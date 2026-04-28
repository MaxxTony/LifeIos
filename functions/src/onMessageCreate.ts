import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const onMessageCreate = onDocumentCreated(
  {
    document: 'users/{uid}/conversations/{convId}/messages/{msgId}',
    secrets: [GEMINI_API_KEY],
  },
  async (event) => {
    const { uid, convId } = event.params;
    const db = admin.firestore();
    
    try {
      // 1. Check message count for this conversation
      const msgCol = db.collection('users').doc(uid).collection('conversations').doc(convId).collection('messages');
      const countSnap = await msgCol.count().get();
      const count = countSnap.data().count;

      // 2. Trigger summarization every 50 messages
      if (count > 0 && count % 50 === 0) {
        console.log(`[Summarizer] Triggering summarization for ${uid}/${convId} at message ${count}`);
        
        // Fetch last 50 messages
        const last50 = await msgCol.orderBy('createdAt', 'desc').limit(50).get();
        const messages = last50.docs.reverse().map(d => {
          const data = d.data();
          return `${data.role === 'assistant' ? 'AI' : 'User'}: ${data.content}`;
        }).join('\n');

        // 3. Call Gemini to summarize
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Summarize the following conversation history into a concise "Memory" block (max 100 words). 
        Focus on user preferences, goals, and significant life events mentioned.
        Format as a factual third-person narrative.
        
        CONVERSATION:
        ${messages}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        // 4. Save to memories
        await db.collection('users').doc(uid).collection('memories').add({
          content: `CONVERSATION SUMMARY (${new Date().toLocaleDateString()}): ${summary}`,
          category: 'past_event',
          importance: 3,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          sourceConvId: convId,
        });

        // 5. Update conversation with a summary flag/snippet
        await db.collection('users').doc(uid).collection('conversations').doc(convId).update({
          hasSummary: true,
          lastSummaryAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[Summarizer] Successfully summarized ${uid}/${convId}`);
      }
    } catch (err) {
      console.error('[Summarizer] Error:', err);
    }
  }
);
