import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

const ORPHANED_AVATARS_KEY = 'lifeos_orphaned_avatars';

/**
 * Parse a Firebase Storage download URL back to a storage reference.
 * URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?...
 */
const getRefFromUrl = (url: string) => {
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) throw new Error(`Unable to parse storage URL: ${url}`);
  const path = decodeURIComponent(match[1]);
  return ref(storage, path);
};

export const storageService = {
  /**
   * Generic file upload with progress feedback.
   */
  uploadFile: async (
    path: string, 
    uri: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
          if (__DEV__) console.log(`[Storage] Upload is ${progress.toFixed(1)}% done`);
        },
        (error) => {
          console.error('[Storage] Upload task failed:', error);
          reject(error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  },

  /**
   * Uploads a profile image to Firebase Storage.
   * Resizes and compresses the image before uploading.
   */
  uploadProfileImage: async (
    uri: string, 
    userId: string, 
    previousUrl?: string | null,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    try {
      // Resize and compress
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const timestamp = new Date().getTime();
      const fileName = `profiles/${userId}/avatar_${timestamp}.jpg`;
      
      const downloadUrl = await storageService.uploadFile(fileName, manipResult.uri, onProgress);

      // F-BUG-29 FIX: Cleanup old avatar only AFTER the new one is safely stored
      if (previousUrl) {
        try {
          await storageService.deleteImage(previousUrl);
          // Also clear any previously queued orphan for this user
          await storageService.clearOrphanedAvatar(userId);
        } catch {
          // M-13 FIX: Delete failed — queue URL for retry on next upload and capture to Sentry.
          await storageService.queueOrphanedAvatar(userId, previousUrl);
          Sentry.addBreadcrumb({
            category: 'storage',
            message: 'Avatar delete failed — queued for later cleanup',
            data: { userId, url: previousUrl },
            level: 'warning',
          });
        }
      } else {
        // Attempt to clean up any previously orphaned avatar now that we have a new one
        await storageService.retryOrphanedAvatar(userId);
      }

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image to Storage:', error);
      throw error;
    }
  },

  /**
   * Deletes an image from storage given its full download URL.
   */
  deleteImage: async (url: string) => {
    if (!url || !url.includes('firebasestorage')) return;
    const fileRef = getRefFromUrl(url);
    await deleteObject(fileRef);
  },

  queueOrphanedAvatar: async (userId: string, url: string) => {
    try {
      await AsyncStorage.setItem(`${ORPHANED_AVATARS_KEY}_${userId}`, url);
    } catch { /* best-effort */ }
  },

  clearOrphanedAvatar: async (userId: string) => {
    try {
      await AsyncStorage.removeItem(`${ORPHANED_AVATARS_KEY}_${userId}`);
    } catch { /* best-effort */ }
  },

  retryOrphanedAvatar: async (userId: string) => {
    try {
      const url = await AsyncStorage.getItem(`${ORPHANED_AVATARS_KEY}_${userId}`);
      if (!url) return;
      await storageService.deleteImage(url);
      await AsyncStorage.removeItem(`${ORPHANED_AVATARS_KEY}_${userId}`);
    } catch { /* best-effort */ }
  },
};
