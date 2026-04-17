import {
  ref,
  set,
  remove,
  onDisconnect,
  serverTimestamp,
  onValue,
  DataSnapshot,
} from 'firebase/database';
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
      lastActive: serverTimestamp(),
      status: 'focusing',
    });
  },

  updateHeartbeat: async (userId: string) => {
    if (!userId) return;
    const lastActiveRef = ref(rtdb, `focusRoom/${userId}/lastActive`);
    await set(lastActiveRef, serverTimestamp());
  },

  leaveFocusRoom: async (userId: string) => {
    if (!userId) return;
    const userRef = ref(rtdb, `focusRoom/${userId}`);
    await remove(userRef);

    // Cancel the pending disconnect hook since we manually disconnected
    onDisconnect(userRef).cancel().catch(() => {});
  },

  subscribeToFocusRoom: (callback: (users: any[]) => void) => {
    const roomRef = ref(rtdb, 'focusRoom');

    // onValue returns an unsubscribe function directly
    const unsubscribe = onValue(roomRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      const activeUsers = Object.keys(data).map(uid => ({
        id: uid,
        ...data[uid],
      }));
      callback(activeUsers);
    });

    return unsubscribe;
  },
};
