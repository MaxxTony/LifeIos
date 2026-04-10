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
    content: string
  ) => {
    try {
      // 1. Add the message to the subcollection
      await addDoc(collection(db, 'users', userId, 'conversations', conversationId, 'messages'), {
        role,
        content,
        createdAt: serverTimestamp(),
      });

      // 2. Update the conversation metadata
      await updateDoc(doc(db, 'users', userId, 'conversations', conversationId), {
        lastMessage: content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  },

  // Delete a conversation and its messages
  deleteConversation: async (userId: string, conversationId: string) => {
    try {
      // Note: In Firestore, deleting a document does not delete its subcollections
      // For a simple implementation, we delete the conversation doc.
      // In a production app, you might want a cloud function to clean up subcollections.
      await deleteDoc(doc(db, 'users', userId, 'conversations', conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};
