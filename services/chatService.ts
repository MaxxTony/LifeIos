import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  startAfter,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';

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
  createdAt?: number | any;
}

export const chatService = {
  // Get most recent conversations for a user (capped at 50)
  getConversations: async (userId: string): Promise<ChatConversation[]> => {
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations'),
        orderBy('updatedAt', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatConversation[];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  },

  // Get messages for a conversation (paginated)
  getMessages: async (userId: string, conversationId: string, lastVisibleEntry?: any): Promise<{ messages: ChatMessage[], lastVisible: any }> => {
    try {
      // C-15 FIX: query() requires a collection ref as first arg every time — cannot chain from an existing Query.
      const msgCol = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
      const q = lastVisibleEntry
        ? query(msgCol, orderBy('createdAt', 'desc'), startAfter(lastVisibleEntry), limit(50))
        : query(msgCol, orderBy('createdAt', 'desc'), limit(50));

      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      const messages = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as ChatMessage[];
      
      // We return them reversed here (decending), UI handles chronological sorting if needed
      return { 
        messages: messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)), 
        lastVisible 
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { messages: [], lastVisible: null };
    }
  },

  // Create a new conversation
  createConversation: async (userId: string, firstMessage: string): Promise<string> => {
    try {
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
      await addDoc(
        collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
        {
          role,
          content,
          imageUrl: imageUrl || null,
          createdAt: serverTimestamp(),
        }
      );

      await updateDoc(doc(db, 'users', userId, 'conversations', conversationId), {
        lastMessage: imageUrl ? 'Sent an image' : content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  },

  // Upload image to Firebase Storage with compression
  uploadImage: async (
    userId: string, 
    uri: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    try {
      const { storageService } = require('./storageService');
      const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');

      // C-MEDIA-12: Resize and compress chat photos to save quota and speed up chat
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Cap width at 1200px
        { compress: 0.7, format: SaveFormat.JPEG }
      );

      const timestamp = new Date().getTime();
      const fileName = `profiles/${userId}/chats_${timestamp}.jpg`;

      return await storageService.uploadFile(fileName, manipResult.uri, onProgress);
    } catch (error: any) {
      console.error('Image upload failed:', error);
      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  },

  // Delete conversation and its messages
  deleteConversation: async (userId: string, conversationId: string) => {
    try {
      const messagesRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
      const messagesSnap = await getDocs(messagesRef);

      if (!messagesSnap.empty) {
        const docs = messagesSnap.docs;
        for (let i = 0; i < docs.length; i += 499) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 499);
          chunk.forEach(msgDoc => batch.delete(msgDoc.ref));
          await batch.commit();
        }
      }

      await deleteDoc(doc(db, 'users', userId, 'conversations', conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
};
