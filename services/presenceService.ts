import {
  ref,
  set,
  remove,
  onDisconnect,
  serverTimestamp,
  onValue,
  update,
  DataSnapshot,
} from 'firebase/database';
import { rtdb } from '../firebase/config';

export const presenceService = {
  joinFocusRoom: async (userId: string, userName: string) => {
    if (!userId) return;
    try {
      const userRef = ref(rtdb, `focusRoom/${userId}`);

      // Auto-remove on app termination or disconnect
      await onDisconnect(userRef).remove();

      // Set online status
      await set(userRef, {
        userName,
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        status: 'focusing',
        isPublic: true, // Required by new security rules for room visibility
      });
    } catch (err) {
      console.warn('[Presence] Failed to join focus room:', err);
    }
  },

  updateHeartbeat: async (userId: string) => {
    if (!userId) return;
    try {
      const userRef = ref(rtdb, `focusRoom/${userId}`);
      // Use update on the parent instead of set on the child to be more consistent with RTDB patterns.
      await update(userRef, { lastActive: serverTimestamp() }).catch(() => {});
    } catch (_) {
      // Quiet fail for heartbeat
    }
  },

  leaveFocusRoom: async (userId: string) => {
    if (!userId) return;
    try {
      const userRef = ref(rtdb, `focusRoom/${userId}`);
      await remove(userRef);

      // Cancel the pending disconnect hook since we manually disconnected
      onDisconnect(userRef).cancel().catch(() => {});
    } catch (err) {
      console.warn('[Presence] Failed to leave focus room:', err);
    }
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
    }, (error) => {
      // Gracefully handle permission-denied (e.g. if reading the whole room is restricted)
      if (error.message.includes('permission_denied')) {
        console.warn('[Presence] List-level access restricted by security rules.');
        callback([]);
      }
    });

    return unsubscribe;
  },
};
