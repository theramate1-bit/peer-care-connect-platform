/**
 * Treatment Exchange Credit Utilities
 * 
 * Handles credit checking and calculation for treatment exchange.
 * Credits are used as currency for peer-to-peer treatment exchanges.
 */

import { supabase } from '@/integrations/supabase/client';
import type { CreditBalanceResult } from './types';

/**
 * Check if user has sufficient credits for a treatment exchange
 * 
 * This validates that a practitioner has enough credits to book a treatment.
 * Credits are required upfront before a request can be sent.
 * 
 * @param userId - Practitioner user ID to check
 * @param requiredCredits - Number of credits needed (default: 1)
 * @returns Object with credit balance status and current balance
 * 
 * @example
 * ```typescript
 * const { hasSufficientCredits, currentBalance } = 
 *   await checkCreditBalance(userId, 60);
 * 
 * if (!hasSufficientCredits) {
 *   // Show message: "You need 60 credits but only have {currentBalance}"
 * }
 * ```
 */
export async function checkCreditBalance(
  userId: string,
  requiredCredits: number = 1
): Promise<CreditBalanceResult> {
  try {
    // Query credits table directly
    const { data: creditsData, error } = await supabase
      .from('credits')
      .select('current_balance, balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking credit balance:', error);
      return {
        hasSufficientCredits: false,
        currentBalance: 0,
        requiredCredits
      };
    }

    // Extract balance from credits table
    const currentBalance = creditsData?.current_balance || creditsData?.balance || 0;
    const hasSufficientCredits = currentBalance >= requiredCredits;

    return {
      hasSufficientCredits,
      currentBalance,
      requiredCredits
    };
  } catch (error) {
    console.error('Error checking credit balance:', error);
    return {
      hasSufficientCredits: false,
      currentBalance: 0,
      requiredCredits
    };
  }
}

/**
 * Calculate required credits based on session duration
 * 
 * Credit cost = duration_minutes (1 credit per minute)
 * NOTE: This is a fallback calculation. The actual cost should be fetched from
 * get_practitioner_credit_cost RPC function for accuracy.
 * 
 * @param durationMinutes - Duration of the session in minutes
 * @returns Number of credits required
 */
export function calculateRequiredCredits(durationMinutes: number): number {
  if (!durationMinutes || durationMinutes <= 0) {
    return 1; // Minimum 1 credit
  }
  
  // 1 credit per minute
  return durationMinutes;
}
