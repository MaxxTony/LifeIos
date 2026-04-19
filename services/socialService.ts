import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, limit, serverTimestamp } from 'firebase/firestore';
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
      const q = query(
        collection(db, 'publicProfiles'),
        where('userName', '>=', searchQuery),
        where('userName', '<=', searchQuery + '\uf8ff'),
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
      const q = query(collection(db, 'friendRequests'), where('toUserId', '==', userId), where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const requests = snap.docs.map(d => d.data() as FriendRequest);
      
      const profiles: PublicProfile[] = [];
      for (const req of requests) {
        const pSnap = await getDoc(doc(db, 'publicProfiles', req.fromUserId));
        if (pSnap.exists()) {
          profiles.push({ userId: pSnap.id, ...pSnap.data() } as PublicProfile);
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
      const q1 = query(collection(db, 'friendRequests'), where('fromUserId', '==', userId), where('status', '==', 'accepted'));
      const q2 = query(collection(db, 'friendRequests'), where('toUserId', '==', userId), where('status', '==', 'accepted'));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const friendIds = new Set<string>();
      snap1.forEach(d => friendIds.add(d.data().toUserId));
      snap2.forEach(d => friendIds.add(d.data().fromUserId));
      
      // Include current user
      friendIds.add(userId);

      const profiles: PublicProfile[] = [];
      for (const fId of Array.from(friendIds)) {
        const pSnap = await getDoc(doc(db, 'publicProfiles', fId));
        if (pSnap.exists()) {
          profiles.push({ userId: pSnap.id, ...pSnap.data() } as PublicProfile);
        }
      }

      return profiles.sort((a, b) => (b.weeklyXP || 0) - (a.weeklyXP || 0));
    } catch(e) {
      console.error('Error getting leaderboard:', e);
      return [];
    }
  },

  // Fetches all LifeOS users for the Discover tab (limited to 50 recent active)
  getAllUsers: async (currentUserId: string): Promise<PublicProfile[]> => {
    try {
      const q = query(
        collection(db, 'publicProfiles'),
        limit(50)
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
      console.error('Error getting all users:', e);
      return [];
    }
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

