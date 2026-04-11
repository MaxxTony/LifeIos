import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc,
  updateDoc,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

// No longer using Firebase Storage to avoid billing requirements
// Images are stored as Base64 strings in the database

export interface ChatConversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: any;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: any;
}

export const chatService = {
  // Get all conversations for a user
  getConversations: async (userId: string): Promise<ChatConversation[]> => {
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations'),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatConversation[];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  },

  // Get messages for a specific conversation
  getMessages: async (userId: string, conversationId: string): Promise<ChatMessage[]> => {
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  },

  // Create a new conversation
  createConversation: async (userId: string, firstMessage: string): Promise<string> => {
    try {
      // Create a short title from the first message
      const title = firstMessage.length > 30 
        ? firstMessage.substring(0, 27) + '...' 
        : firstMessage;

      const convRef = await addDoc(collection(db, 'users', userId, 'conversations'), {
        title,
        lastMessage: firstMessage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return convRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Add a message to a conversation
  addMessage: async (
    userId: string, 
    conversationId: string, 
    role: 'user' | 'assistant', 
    content: string,
    imageUrl?: string
  ) => {
    try {
      // 1. Add the message to the subcollection
      await addDoc(collection(db, 'users', userId, 'conversations', conversationId, 'messages'), {
        role,
        content,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
      });

      // 2. Update the conversation metadata
      await updateDoc(doc(db, 'users', userId, 'conversations', conversationId), {
        lastMessage: imageUrl ? 'Sent an image' : content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  },

  // Process an image and return a data URL that can be stored in the database
  uploadImage: async (userId: string, uri: string, base64?: string, mimeType?: string): Promise<string> => {
    if (base64 && mimeType) {
      return `data:${mimeType};base64,${base64}`;
    }
    
    try {
      // Fallback: if we only have URI, try to fetch and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error processing image:', error);
      return uri; // Return original URI as last resort
    }
  },

  // Delete a conversation and its messages
  deleteConversation: async (userId: string, conversationId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'conversations', conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};
