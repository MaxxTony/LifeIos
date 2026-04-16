import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, getStorageService } from '../firebase/config';

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

// The "XHR Trick" is the most robust way to get a native-backed Blob in React Native.
// This bypasses the broken JavaScript Blob constructor and works perfectly with Firebase.
const uriToBlob = (uri: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.error('uriToBlob Error:', e);
      reject(new Error('Failed to convert URI to Blob.'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatConversation[];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  },

  // FIX M-8: Added limit(101) to detect when history reaches the view cap
  getMessages: async (userId: string, conversationId: string): Promise<ChatMessage[]> => {
    try {
      const q = query(
        collection(db, 'users', userId, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'), // Fetch newest first to know if we hit the limit
        limit(101) // Fetch 101 to check if there are more
      );
      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      // Sort back to chronological for the UI
      return messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
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
      throw error; // Propagate so callers can surface failures to the user
    }
  },

  // Upload image to Firebase Storage via XHR blob conversion (required for React Native).
  // Uses explicit gs:// URI to handle new .firebasestorage.app bucket discovery.
  uploadImage: async (userId: string, uri: string): Promise<string> => {
    try {
      // P-6 FIX: Ensure auth is ready and services are lazy-loaded
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated with Firebase');
      }

      // 1. Fetch the image to convert it into a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Create a reference to 'profiles/userId/avatar_timestamp.jpg'
      const timestamp = new Date().getTime();
      const storageInstance = getStorageService();
      const storageRef = ref(storageInstance, `profiles/${userId}/chats_${timestamp}.jpg`);

      // 3. Upload the blob
      await uploadBytes(storageRef, blob);
      // 4. Get and return the download URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;


    } catch (error: any) {
      console.error('Image upload failed:', error);
      throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
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
