import { StateCreator } from 'zustand';
import { UserState, SubscriptionActions } from '../types';
import { purchaseService } from '@/services/purchaseService';
import { dbService } from '@/services/dbService';
import { getTodayLocal } from '@/utils/dateUtils';

/**
 * Subscription Slice
 * 
 * Manages Pro subscription state in Zustand:
 * - isPro flag (persisted locally for offline access)
 * - Daily AI message counter (5/day for free users, unlimited for Pro)
 * - Entitlement checking via RevenueCat
 */
export const createSubscriptionSlice: StateCreator<
  UserState,
  [["zustand/persist", unknown]],
  [],
  SubscriptionActions
> = (set, get) => ({
  /**
   * Check entitlements from RevenueCat and update local state.
   * Called on app init and after purchases/restores.
   */
  checkEntitlements: async () => {
    try {
      const { isPro, expiryDate } = await purchaseService.checkProStatus();
      set({ isPro, subscriptionExpiryDate: expiryDate });
      
      // Sync to Firebase
      const { userId } = get();
      if (userId) {
        dbService.saveUserProfile(userId, { isPro, subscriptionExpiryDate: expiryDate });
      }
    } catch (error) {
      console.error('[SubscriptionSlice] Failed to check entitlements:', error);
    }
  },

  /**
   * Directly set Pro status. Called by the RevenueCat listener
   * when subscription state changes in real-time.
   */
  setProStatus: (isPro: boolean, expiry?: string | null) => {
    set({
      isPro,
      subscriptionExpiryDate: expiry ?? null,
    });

    // Sync to Firebase
    const { userId } = get();
    if (userId) {
      dbService.saveUserProfile(userId, { isPro, subscriptionExpiryDate: expiry ?? null });
    }
  },

  /**
   * Increment the daily AI message counter.
   * Returns true if the message is allowed, false if limit reached.
   * Free users: 5 messages/day. Pro users: unlimited.
   */
  incrementAIMessageCount: (): boolean => {
    const state = get();

    // Pro users have no limit
    if (state.isPro) return true;

    // Auto-reset counter if the date has changed
    const today = getTodayLocal();
    if (state.lastAIMessageCountReset !== today) {
      set({
        dailyAIMessageCount: 1,
        lastAIMessageCountReset: today,
      });
      return true;
    }

    // Check limit (20 messages/day for free users)
    if (state.dailyAIMessageCount >= 20) {
      return false;
    }

    set({ dailyAIMessageCount: state.dailyAIMessageCount + 1 });
    return true;
  },

  /**
   * Reset the daily AI message counter. Called during daily reset.
   */
  resetDailyAICount: () => {
    set({
      dailyAIMessageCount: 0,
      lastAIMessageCountReset: getTodayLocal(),
    });
  },
});
