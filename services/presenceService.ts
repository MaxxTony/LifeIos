import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase/config';

export const presenceService = {
  joinFocusRoom: async (userId: string, userName: string) => {
    if (!userId) return;
    const userRef = ref(rtdb, `focusRoom/${userId}`);
    
    // Auto-remove on app termination or disconnect
    await onDisconnect(userRef).remove();

    // Set online status
    await set(userRef, {
      userName,
      joinedAt: serverTimestamp(),
      status: 'focusing'
    });
  },

  leaveFocusRoom: async (userId: string) => {
    if (!userId) return;
    const userRef = ref(rtdb, `focusRoom/${userId}`);
    await set(userRef, null);
    
    // Cancel the pending disconnect hook since we manually disconnected
    onDisconnect(userRef).cancel().catch(() => {});
  },

  subscribeToFocusRoom: (callback: (users: any[]) => void) => {
    const roomRef = ref(rtdb, 'focusRoom');
    return onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const activeUsers = Object.keys(data).map(uid => ({
        id: uid,
        ...data[uid]
      }));
      callback(activeUsers);
    });
  }
};
