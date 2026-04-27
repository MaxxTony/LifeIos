import Purchases, { LOG_LEVEL, CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';

const ENTITLEMENT_ID = 'pro';

/**
 * RevenueCat Purchase Service
 * 
 * Handles all subscription-related logic:
 * - SDK initialization with platform-specific API keys
 * - User identification (linked to Firebase UID)
 * - Subscription status checking
 * - Built-in paywall presentation (designed on RC Dashboard)
 * - Purchase restoration
 * - Real-time subscription change listening
 */
export const purchaseService = {
  _initialized: false,

  /**
   * Initialize RevenueCat SDK. Called once after Firebase auth resolves.
   * Links the RC anonymous user to the Firebase UID for cross-platform sync.
   */
  async initialize(userId: string): Promise<void> {
    if (this._initialized) return;

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
        android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
      });

      if (!apiKey) {
        console.warn('[PurchaseService] No RevenueCat API key found for platform:', Platform.OS);
        return;
      }

      Purchases.configure({ apiKey });

      // Identify user with Firebase UID so subscriptions persist across devices
      await Purchases.logIn(userId);
      this._initialized = true;
      console.log('[PurchaseService] Initialized for user:', userId);
    } catch (error) {
      console.error('[PurchaseService] Initialization failed:', error);
    }
  },

  /**
   * Check if the current user has an active "pro" entitlement.
   * Returns both the status and expiry date for display purposes.
   */
  async checkProStatus(): Promise<{ isPro: boolean; expiryDate: string | null }> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return {
        isPro: !!entitlement,
        expiryDate: entitlement?.expirationDate || null,
      };
    } catch (error) {
      console.error('[PurchaseService] Failed to check pro status:', error);
      // Fail open — don't lock users out if RC is unreachable
      return { isPro: false, expiryDate: null };
    }
  },

  /**
   * Present the RevenueCat built-in paywall.
   * The paywall design is configured remotely on the RC Dashboard.
   * Returns the result of the paywall interaction.
   */
  async presentPaywall(): Promise<PAYWALL_RESULT> {
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
      });
      return result;
    } catch (error) {
      console.error('[PurchaseService] Paywall presentation failed:', error);
      return PAYWALL_RESULT.ERROR;
    }
  },

  /**
   * Restore previous purchases. Used for "Already purchased?" flows.
   * Returns true if the user now has pro access.
   */
  async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error) {
      console.error('[PurchaseService] Restore failed:', error);
      return false;
    }
  },

  /**
   * Listen for real-time subscription changes (purchase, expiry, renewal).
   * The callback fires whenever the customer's entitlement status changes.
   */
  addListener(callback: (isPro: boolean) => void): void {
    Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      const isPro = !!info.entitlements.active[ENTITLEMENT_ID];
      callback(isPro);
    });
  },

  /**
   * Get the entitlement ID used across the app.
   */
  getEntitlementId(): string {
    return ENTITLEMENT_ID;
  },
};
