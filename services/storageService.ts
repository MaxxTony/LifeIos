import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/config';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
   * Uploads a profile image to Firebase Storage.
   * Resizes and compresses the image before uploading.
   */
  uploadProfileImage: async (uri: string, userId: string, previousUrl?: string | null): Promise<string> => {
    try {
      if (previousUrl) {
        await storageService.deleteImage(previousUrl);
      }

      // Resize and compress
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const timestamp = new Date().getTime();
      const fileName = `profiles/${userId}/avatar_${timestamp}.jpg`;
      const storageRef = ref(storage, fileName);

      // Fetch the local URI as a blob and upload
      const response = await fetch(manipResult.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);

      const downloadUrl = await getDownloadURL(storageRef);
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
    try {
      if (!url || !url.includes('firebasestorage')) return;
      const fileRef = getRefFromUrl(url);
      await deleteObject(fileRef);
    } catch (error) {
      console.warn('Could not delete image from storage:', error);
    }
  },
};
