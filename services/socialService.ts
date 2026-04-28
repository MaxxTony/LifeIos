import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, limit, serverTimestamp, orderBy, documentId, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface PublicProfile {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  level: number;
  weeklyXP: number;
  globalStreak: number;
  lastActive: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export const socialService = {
  searchUsers: async (searchQuery: string, currentUserId: string): Promise<PublicProfile[]> => {
    try {
      // O9 FIX: Query against 'userNameLower' for case-insensitive search.
      // userNameLower is written as name.toLowerCase() on every profile update.
      const lowerQuery = searchQuery.toLowerCase();
      const q = query(
        collection(db, 'publicProfiles'),
        where('userNameLower', '>=', lowerQuery),
        where('userNameLower', '<=', lowerQuery + '\uf8ff'),
        limit(20)
      );
      
      const snap = await getDocs(q);
      const profiles: PublicProfile[] = [];
      snap.forEach(docSnap => {
        if (docSnap.id !== currentUserId) {
          profiles.push({ userId: docSnap.id, ...docSnap.data() } as PublicProfile);
        }
      });
      return profiles;
    } catch(e) {
      console.error('Error searching users:', e);
      return [];
    }
  },

  sendFriendRequest: async (fromUserId: string, toUserId: string): Promise<boolean> => {
    try {
      // Check if already sent
      const q1 = query(collection(db, 'friendRequests'), where('fromUserId', '==', fromUserId), where('toUserId', '==', toUserId));
      const q2 = query(collection(db, 'friendRequests'), where('fromUserId', '==', toUserId), where('toUserId', '==', fromUserId));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      if (!snap1.empty || !snap2.empty) return false; // Already related

      const newReqRef = doc(collection(db, 'friendRequests'));
      await setDoc(newReqRef, {
        id: newReqRef.id,
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('Error sending friend request:', e);
      return false;
    }
  },

  getFriendRequests: async (userId: string): Promise<{ requests: FriendRequest[], profiles: PublicProfile[] }> => {
    try {
      const q = query(
        collection(db, 'friendRequests'), 
        where('toUserId', '==', userId), 
        where('status', '==', 'pending'),
        limit(50) // BUG-013: Prevent OOM/Performance degradation on huge request lists
      );
      const snap = await getDocs(q);
      const requests = snap.docs.map(d => d.data() as FriendRequest);
      
      const profiles: PublicProfile[] = [];
      
      // O2 FIX: Batch profile reads using 'in' query instead of N individual getDoc() calls.
      // Firestore 'in' supports up to 10 values per query — chunk accordingly.
      const fromIds = requests.map(r => r.fromUserId).filter(Boolean);
      if (fromIds.length > 0) {
        // BUG-014: Increased chunk size to 30 (Firestore limit) to reduce query overhead.
        for (let i = 0; i < fromIds.length; i += 30) {
          const chunk = fromIds.slice(i, i + 30);
          const batchSnap = await getDocs(
            query(collection(db, 'publicProfiles'), where(documentId(), 'in', chunk))
          );
          batchSnap.forEach(d => profiles.push({ userId: d.id, ...d.data() } as PublicProfile));
        }
      }
      
      return { requests, profiles };
    } catch (e) {
      console.error('Error getting requests:', e);
      return { requests: [], profiles: [] };
    }
  },

  acceptFriendRequest: async (requestId: string): Promise<boolean> => {
    try {
      await updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' });
      return true;
    } catch (e) {
      return false;
    }
  },

  declineFriendRequest: async (requestId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      return true;
    } catch (e) {
      return false;
    }
  },

  getLeaderboard: async (userId: string): Promise<PublicProfile[]> => {
    try {
      const q1 = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId), where('status', '==', 'accepted'), limit(100));
      const q2 = query(collection(db, 'friendRequests'), where('toUserId', '==', userId), where('status', '==', 'accepted'), limit(100));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const friendIds = new Set<string>();
      snap1.forEach(d => friendIds.add(d.data().toUserId));
      snap2.forEach(d => friendIds.add(d.data().fromUserId));
      
      // Include current user
      friendIds.add(userId);

      const profiles: PublicProfile[] = [];
      const idArray = Array.from(friendIds);

      // O3/BUG-014: Increased chunk size to 30 to reduce total query count for leaderboards.
      for (let i = 0; i < idArray.length; i += 30) {
        const chunk = idArray.slice(i, i + 30);
        const batchSnap = await getDocs(
          query(collection(db, 'publicProfiles'), where(documentId(), 'in', chunk))
        );
        batchSnap.forEach(d => profiles.push({ userId: d.id, ...d.data() } as PublicProfile));
      }

      return profiles.sort((a, b) => (b.weeklyXP || 0) - (a.weeklyXP || 0));
    } catch(e) {
      console.error('Error getting leaderboard:', e);
      return [];
    }
  },

  // Fetches all LifeOS users for the Discover tab with pagination support
  getAllUsers: async (currentUserId: string, lastVisibleDoc?: any): Promise<{ profiles: PublicProfile[], lastDoc: any }> => {
    try {
      let q = query(
        collection(db, 'publicProfiles'),
        orderBy('lastActive', 'desc'),
        limit(20)
      );

      if (lastVisibleDoc) {
        const { startAfter } = await import('firebase/firestore');
        q = query(q, startAfter(lastVisibleDoc));
      }

      const snap = await getDocs(q);
      const profiles: PublicProfile[] = [];
      snap.forEach(docSnap => {
        if (docSnap.id !== currentUserId) {
          profiles.push({ userId: docSnap.id, ...docSnap.data() } as PublicProfile);
        }
      });

      const lastDoc = snap.docs[snap.docs.length - 1];
      return { profiles, lastDoc };
    } catch(e) {
      console.error('Error getting all users:', e);
      return { profiles: [], lastDoc: null };
    }
  },

  // ─── Real-time Subscriptions ───────────────────────────────────────────────

  // Subscribe to friend requests (incoming and outgoing)
  subscribeToRequests: (userId: string, callback: (data: { incoming: { req: FriendRequest, profile: PublicProfile }[], outgoing: FriendRequest[] }) => void) => {
    const qIn = query(collection(db, 'friendRequests'), where('toUserId', '==', userId), where('status', '==', 'pending'));
    const qOut = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId), where('status', '==', 'pending'));

    let incomingReqs: FriendRequest[] = [];
    let outgoingReqs: FriendRequest[] = [];

    const update = async () => {
      const profiles: PublicProfile[] = [];
      const fromIds = incomingReqs.map(r => r.fromUserId).filter(Boolean);
      
      if (fromIds.length > 0) {
        // BUG-014: Support multiple chunks even in the real-time callback path (capped at 60 ids)
        for (let i = 0; i < Math.min(fromIds.length, 60); i += 30) {
          const chunk = fromIds.slice(i, i + 30);
          const batchSnap = await getDocs(query(collection(db, 'publicProfiles'), where(documentId(), 'in', chunk)));
          batchSnap.forEach(d => profiles.push({ userId: d.id, ...d.data() } as PublicProfile));
        }
      }

      callback({
        incoming: incomingReqs.map(req => ({
          req,
          profile: profiles.find(p => p.userId === req.fromUserId) || { userId: req.fromUserId, userName: 'Loading...', avatarUrl: null, level: 1, weeklyXP: 0, globalStreak: 0, lastActive: 0 }
        })),
        outgoing: outgoingReqs
      });
    };

    const unsub1 = onSnapshot(qIn, (snap) => {
      incomingReqs = snap.docs.map(d => d.data() as FriendRequest);
      update();
    });

    const unsub2 = onSnapshot(qOut, (snap) => {
      outgoingReqs = snap.docs.map(d => d.data() as FriendRequest);
      update();
    });

    return () => { unsub1(); unsub2(); };
  },

  // Subscribe to leaderboard (Friends + Me)
  subscribeToLeaderboard: (userId: string, callback: (profiles: PublicProfile[]) => void) => {
    // 1. Listen to friendships
    const q1 = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId), where('status', '==', 'accepted'));
    const q2 = query(collection(db, 'friendRequests'), where('toUserId', '==', userId), where('status', '==', 'accepted'));

    let friendIds = new Set<string>([userId]);
    let profileUnsubs: (() => void)[] = [];

    let lastRank = -1;
    let lastNotifyTime = 0;

    const setupProfileListeners = (ids: string[]) => {
      // Cleanup previous listeners
      profileUnsubs.forEach(u => u());
      profileUnsubs = [];
      
      if (ids.length === 0) {
        callback([]);
        return;
      }

      const allProfiles: Record<string, PublicProfile> = {};
      const totalChunks = Math.ceil(ids.length / 30);
      let chunksProcessed = 0;

      // Create a listener for each chunk of 30 IDs (Firestore limit)
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        const unsub = onSnapshot(query(collection(db, 'publicProfiles'), where(documentId(), 'in', chunk)), async (snap) => {
          snap.forEach(d => {
            allProfiles[d.id] = { userId: d.id, ...d.data() } as PublicProfile;
          });
          
          // Only callback when we have at least one response from each chunk
          // (or a reasonable subset if chunks are many)
          const sorted = Object.values(allProfiles).sort((a, b) => (b.weeklyXP || 0) - (a.weeklyXP || 0));
          
          // Surpass Logic: Check if rank improved (e.g. from 5 to 4)
          const currentRank = sorted.findIndex(p => p.userId === userId);
          const now = Date.now();
          const COOLDOWN = 60 * 60 * 1000; // 1 hour

          if (lastRank !== -1 && currentRank < lastRank && (now - lastNotifyTime > COOLDOWN)) {
            const surpassingUser = sorted[currentRank + 1]; 
            if (surpassingUser) {
              lastNotifyTime = now;
              const { notificationService } = await import('./notificationService');
              notificationService.sendImmediateNotification(
                'Rival Alert! ⚔️',
                `You just passed ${surpassingUser.userName} on the leaderboard!`,
                { type: 'WEEKLY_LEADERBOARD' }
              );
            }
          }
          lastRank = currentRank;
          
          callback(sorted);
        });
        profileUnsubs.push(unsub);
      }
    };

    const onFriendChange = () => {
      setupProfileListeners(Array.from(friendIds));
    };

    const unsub1 = onSnapshot(q1, (snap) => {
      snap.docs.forEach(d => friendIds.add(d.data().toUserId));
      onFriendChange();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      snap.docs.forEach(d => friendIds.add(d.data().fromUserId));
      onFriendChange();
    });

    return () => {
      unsub1();
      unsub2();
      profileUnsubs.forEach(u => u());
    };
  },
  // Gets all friend requests sent by me (pending)
  getSentRequests: async (userId: string): Promise<FriendRequest[]> => {
    try {
      const q = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as FriendRequest));
    } catch(e) {
      console.error('Error getting sent requests:', e);
      return [];
    }
  },
};

