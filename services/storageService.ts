import { storage } from '../firebase/config';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

export const storageService = {
  /**
   * Uploads a profile image to Firebase Storage
   * @param uri The local file URI from ImagePicker
   * @param userId The unique ID of the user
   * @param previousUrl The URL of the previous image to delete
   * @returns The public download URL
   */
  uploadProfileImage: async (uri: string, userId: string, previousUrl?: string | null): Promise<string> => {
    try {
      // Delete previous image if exists to replace it
      if (previousUrl) {
        await storageService.deleteImage(previousUrl);
      }

      // 1. Fetch the image to convert it into a blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Create a reference to 'profiles/userId/avatar_timestamp.jpg'
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `profiles/${userId}/avatar_${timestamp}.jpg`);

      // 3. Upload the blob
      await uploadBytes(storageRef, blob);

      // 4. Get and return the download URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image to Storage:', error);
      throw error;
    }
  },

  /**
   * Deletes an image from storage given its full URL
   */
  deleteImage: async (url: string) => {
    try {
      if (!url || !url.includes('firebasestorage')) return;
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (error) {
      console.warn('Could not delete image from storage (might already be gone):', error);
    }
  }
};
