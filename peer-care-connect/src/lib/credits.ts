import { supabase } from '@/integrations/supabase/client';

export interface CreditBalance {
  balance: number;
  user_id: string;
}

export interface CreditTransaction {
  id: string;
  transaction_type: 'earn' | 'spend' | 'purchase' | 'refund' | 'transfer';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface CreditRate {
  id: string;
  service_type: string;
  duration_minutes: number;
  credit_cost: number;
  credit_earned: number;
  is_active: boolean;
}

/**
 * CreditManager - Handles all credit-related operations
 * 
 * Credits are a currency system for practitioners to exchange treatments.
 * Only practitioners can earn and spend credits. Clients pay with real money.
 * 
 * Key concepts:
 * - Credits are earned by providing treatments (1 credit per booking)
 * - Credits are spent to receive treatments from other practitioners
 * - All credit transactions are recorded for audit purposes
 * 
 * @example
 * ```typescript
 * // Get balance
 * const balance = await CreditManager.getBalance(userId);
 * 
 * // Earn credits
 * await CreditManager.earnCredits(userId, 1, sessionId);
 * 
 * // Spend credits
 * await CreditManager.spendCredits(userId, 5, sessionId);
 * ```
 */
export class CreditManager {
  /**
   * Get user's current credit balance
   * 
   * IMPORTANT: Only practitioners can have credits. Clients pay with real money.
   * 
   * @param userId - The user ID to check balance for
   * @returns Current credit balance (0 if user is not a practitioner or has no credits)
   * 
   * @example
   * ```typescript
   * const balance = await CreditManager.getBalance('user-123');
   * if (balance >= 5) {
   *   // User has enough credits
   * }
   * ```
   */
  static async getBalance(userId: string): Promise<number> {
    try {
      // First check if user is a practitioner
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', userId)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found:', profileError);
        return 0;
      }

      // Only practitioners can have credits
      const practitionerRoles = ['sports_therapist', 'massage_therapist', 'osteopath'];
      if (!practitionerRoles.includes(userProfile.user_role)) {
        console.log('Credits are only available for practitioners');
        return 0;
      }

      const { data, error } = await supabase
        .rpc('get_credit_balance', { p_user_id: userId });

      if (error) {
        console.error('Error getting credit balance:', error);
        return 0;
      }

      // get_credit_balance returns a table (array of objects), extract the balance
      if (Array.isArray(data) && data.length > 0) {
        // Use balance field, fallback to current_balance if balance doesn't exist
        return data[0].balance ?? data[0].current_balance ?? 0;
      }

      // If data is already a number (shouldn't happen, but handle gracefully)
      if (typeof data === 'number') {
        return data;
      }

      return 0;
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return 0;
    }
  }

  /**
   * Update credit balance (earn or spend credits)
   * 
   * This is the core function for all credit transactions. It:
   * 1. Validates the transaction
   * 2. Updates the balance in the database
   * 3. Creates a transaction record for audit
   * 
   * @param userId - User ID to update balance for
   * @param amount - Amount to add (positive) or subtract (negative)
   * @param transactionType - Type of transaction: 'earn', 'spend', 'purchase', 'refund', 'transfer'
   * @param description - Optional description of the transaction
   * @param referenceId - Optional ID linking to related record (e.g., session_id)
   * @param referenceType - Optional type of reference (e.g., 'session', 'purchase')
   * @returns Transaction ID if successful, null if error
   * 
   * @example
   * ```typescript
   * // Earn 1 credit for providing a treatment
   * await CreditManager.updateBalance(
   *   userId,
   *   1,
   *   'earn',
   *   'Completed patient booking',
   *   sessionId,
   *   'session'
   * );
   * 
   * // Spend 5 credits to receive treatment
   * await CreditManager.updateBalance(
   *   userId,
   *   -5,
   *   'spend',
   *   'Booked treatment session',
   *   sessionId,
   *   'session'
   * );
   * ```
   */
  static async updateBalance(
    userId: string,
    amount: number,
    transactionType: 'earn' | 'spend' | 'purchase' | 'refund' | 'transfer',
    description?: string,
    referenceId?: string,
    referenceType?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('update_credit_balance', {
          p_user_id: userId,
          p_amount: amount,
          p_transaction_type: transactionType,
          p_description: description || null,
          p_reference_id: referenceId || null,
          p_reference_type: referenceType || null
        });

      if (error) {
        console.error('Error updating credit balance:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error updating credit balance:', error);
      throw error;
    }
  }

  /**
   * Earn credits for providing a service
   * 
   * Practitioners earn 1 credit for each patient booking they complete,
   * regardless of service type or duration.
   * 
   * @param userId - Practitioner user ID
   * @param amount - Number of credits to earn (typically 1)
   * @param sessionId - Session ID this credit is for
   * @param description - Optional custom description
   * @returns Transaction ID if successful
   * 
   * @example
   * ```typescript
   * // Earn 1 credit after completing a session
   * await CreditManager.earnCredits(
   *   practitionerId,
   *   1,
   *   sessionId,
   *   'Completed 60-minute massage session'
   * );
   * ```
   */
  static async earnCredits(
    userId: string,
    amount: number,
    sessionId: string,
    description?: string
  ): Promise<string | null> {
    return this.updateBalance(
      userId,
      amount,
      'earn',
      description || `Earned ${amount} credits for providing service`,
      sessionId,
      'session'
    );
  }

  /**
   * Spend credits to book a treatment from another practitioner
   * 
   * Credits are deducted when a practitioner books a treatment exchange.
   * The amount depends on the service duration (1 credit per minute).
   * 
   * @param userId - Practitioner user ID spending credits
   * @param amount - Number of credits to spend
   * @param sessionId - Session ID this credit is for
   * @param description - Optional custom description
   * @returns Transaction ID if successful
   * 
   * @example
   * ```typescript
   * // Spend 60 credits for a 60-minute session
   * await CreditManager.spendCredits(
   *   practitionerId,
   *   60,
   *   sessionId,
   *   'Booked 60-minute osteopathy session'
   * );
   * ```
   */
  static async spendCredits(
    userId: string,
    amount: number,
    sessionId: string,
    description?: string
  ): Promise<string | null> {
    return this.updateBalance(
      userId,
      amount,
      'spend',
      description || `Spent ${amount} credits for booking session`,
      sessionId,
      'session'
    );
  }

  /**
   * Purchase credits
   */
  static async purchaseCredits(
    userId: string,
    amount: number,
    purchaseId: string,
    description?: string
  ): Promise<string | null> {
    return this.updateBalance(
      userId,
      amount,
      'purchase',
      description || `Purchased ${amount} credits`,
      purchaseId,
      'purchase'
    );
  }

  /**
   * Get credit transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_credit_transactions', {
          p_user_id: userId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Error getting transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Get credit rates for services
   */
  static async getCreditRates(): Promise<CreditRate[]> {
    try {
      const { data, error } = await supabase
        .from('credit_rates')
        .select('*')
        .eq('is_active', true)
        .order('service_type', { ascending: true })
        .order('duration_minutes', { ascending: true });

      if (error) {
        console.error('Error getting credit rates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting credit rates:', error);
      return [];
    }
  }

  /**
   * Get credit cost for a specific service
   */
  static async getCreditCost(
    serviceType: string,
    durationMinutes: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('credit_rates')
        .select('credit_cost')
        .eq('service_type', serviceType)
        .eq('duration_minutes', durationMinutes)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error getting credit cost:', error);
        return 0;
      }

      return data?.credit_cost || 0;
    } catch (error) {
      console.error('Error getting credit cost:', error);
      return 0;
    }
  }

  /**
   * Get credit earned for a specific service
   * NEW SYSTEM: 1 credit per patient booking (regardless of service type or duration)
   */
  static async getCreditEarned(
    serviceType: string,
    durationMinutes: number
  ): Promise<number> {
    // Fixed: 1 credit per patient booking
    return 1;
  }

  /**
   * Check if user has sufficient credits
   */
  static async hasSufficientCredits(
    userId: string,
    requiredAmount: number
  ): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= requiredAmount;
  }

  /**
   * Process credit transactions for a completed session
   * 
   * This handles the credit flow when a session is completed:
   * - Practitioner earns 1 credit (regardless of service type/duration)
   * - Client pays with real money (no credits involved)
   * 
   * NEW SYSTEM: Fixed at 1 credit per patient booking
   * 
   * @param sessionId - The completed session ID
   * @param clientId - Client user ID (for reference, doesn't affect credits)
   * @param practitionerId - Practitioner user ID who earns the credit
   * @param serviceType - Type of service provided (for reference)
   * @param durationMinutes - Session duration (for reference)
   * @returns Object with practitioner transaction ID
   * 
   * @example
   * ```typescript
   * // After a session is completed
   * const result = await CreditManager.processSessionCredits(
   *   sessionId,
   *   clientId,
   *   practitionerId,
   *   'massage',
   *   60
   * );
   * // Practitioner earns 1 credit automatically
   * ```
   */
  static async processSessionCredits(
    sessionId: string,
    clientId: string,
    practitionerId: string,
    serviceType: string,
    durationMinutes: number
  ): Promise<{ practitionerTransactionId: string }> {
    try {
      // NEW SYSTEM: 1 credit per patient booking (regardless of service type or duration)
      const creditEarned = 1;

      // Only practitioners earn credits - clients pay with real money
      const practitionerTransactionId = await this.earnCredits(
        practitionerId,
        creditEarned,
        sessionId,
        `Completed patient booking - 1 credit per booking`
      );

      return {
        practitionerTransactionId: practitionerTransactionId!
      };
    } catch (error) {
      console.error('Error processing session credits:', error);
      throw error;
    }
  }
}
