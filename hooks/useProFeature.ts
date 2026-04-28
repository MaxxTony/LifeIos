import { useStore } from '@/store/useStore';
import { purchaseService } from '@/services/purchaseService';

/**
 * Hook for checking Pro feature access throughout the app.
 * 
 * Usage:
 *   const { isPro, canUseAI, remainingAIMessages, openPaywall } = useProGate();
 *   
 *   if (!isPro) openPaywall(); // Shows RevenueCat built-in paywall
 */
export function useProGate() {
  const isPro = useStore(s => s.isPro);
  const dailyAIMessageCount = useStore(s => s.dailyAIMessageCount);

  return {
    /** Whether the user has an active Pro subscription */
    isPro,

    /** Whether the user can send an AI message (Pro = always, Free = under 20/day) */
    canUseAI: isPro || dailyAIMessageCount < 20,

    /** Number of AI messages remaining today (Infinity for Pro) */
    remainingAIMessages: isPro ? Infinity : Math.max(0, 20 - dailyAIMessageCount),

    /** Current AI message count today */
    dailyAIMessageCount,

    /**
     * Present the RevenueCat paywall (built-in template designed on dashboard).
     * Returns the paywall result (PURCHASED, RESTORED, CANCELLED, ERROR).
     */
    openPaywall: () => purchaseService.presentPaywall(),
  };
}
