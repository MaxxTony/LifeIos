import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  updateDoc,
  limit,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

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

  // FIX M-8: Added limit(100) to prevent fetching unbounded message history
  getMessages: async (userId: string, conversationId: string): Promise<ChatMessage[]> => {
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(100) // FIX M-8: cap at 100 messages per load
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
      await addDoc(collection(db, 'users', userId, 'conversations', conversationId, 'messages'), {
        role,
        content,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'users', userId, 'conversations', conversationId), {
        lastMessage: imageUrl ? 'Sent an image' : content,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  },

  // FIX C-5: Use Firebase Storage instead of base64 in Firestore
  // Firestore has a 1MB document limit — base64 images easily exceed this
  uploadImage: async (userId: string, uri: string, base64?: string, mimeType?: string): Promise<string> => {
    try {
      const fileName = `chat-images/${userId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      // Fetch the local URI and convert to blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob, { contentType: mimeType || 'image/jpeg' });
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Image upload to Firebase Storage failed:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  },

  // FIX M-14: Delete sub-collection messages before deleting the conversation
  // Firestore does NOT cascade-delete sub-collections automatically
  deleteConversation: async (userId: string, conversationId: string) => {
    try {
      // Step 1: Delete all messages in the sub-collection via batch
      const messagesRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
      const messagesSnap = await getDocs(messagesRef);

      if (messagesSnap.docs.length > 0) {
        const batch = writeBatch(db);
        messagesSnap.docs.forEach(msgDoc => batch.delete(msgDoc.ref));
        await batch.commit();
      }

      // Step 2: Delete the parent conversation document
      await deleteDoc(doc(db, 'users', userId, 'conversations', conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};
