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
      // B-FP: Only heartbeat if we are authenticated and updating our own path
      const { authService } = require('./authService');
      const currentUser = authService.currentUser;
      if (!currentUser || currentUser.uid !== userId) return;

      // Ensure the user is actually still in focus mode locally
      const { useStore } = require('@/store/useStore');
      const { focusSession, userName } = useStore.getState();
      if (!focusSession.isActive) return;

      const userRef = ref(rtdb, `focusRoom/${userId}`);
      
      // C-RTDB-1 FIX: Heartbeat must satisfy .validate rule: "newData.hasChildren(['userName', 'lastActive', 'status'])"
      // Sending a more complete object ensures it passes even if the node was deleted by onDisconnect.
      await update(userRef, { 
        lastActive: serverTimestamp(),
        userName: userName || 'Anonymous',
        status: 'focusing',
        isPublic: true
      }).catch(() => {});
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
      // M-02 FIX: Filter out stale entries (lastActive > 60s ago)
      const STALE_THRESHOLD_MS = 60000;
      const now = Date.now();
      const activeUsers = Object.keys(data)
        .filter(uid => {
          const lastActive = data[uid]?.lastActive;
          if (!lastActive) return false;
          const ms = typeof lastActive === 'object' && 'toMillis' in lastActive
            ? lastActive.toMillis()
            : typeof lastActive === 'number' ? lastActive : 0;
          return now - ms < STALE_THRESHOLD_MS;
        })
        .map(uid => ({ id: uid, ...data[uid] }));
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
