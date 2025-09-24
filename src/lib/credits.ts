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

export class CreditManager {
  /**
   * Get user's current credit balance (PRACTITIONERS ONLY)
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

      return data || 0;
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return 0;
    }
  }

  /**
   * Update credit balance (earn or spend)
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
   * Spend credits for booking a service
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
   */
  static async getCreditEarned(
    serviceType: string,
    durationMinutes: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('credit_rates')
        .select('credit_earned')
        .eq('service_type', serviceType)
        .eq('duration_minutes', durationMinutes)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error getting credit earned:', error);
        return 0;
      }

      return data?.credit_earned || 0;
    } catch (error) {
      console.error('Error getting credit earned:', error);
      return 0;
    }
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
   * Process session credit transactions (PRACTITIONERS ONLY)
   * Clients pay with real money, practitioners earn credits
   */
  static async processSessionCredits(
    sessionId: string,
    clientId: string,
    practitionerId: string,
    serviceType: string,
    durationMinutes: number
  ): Promise<{ practitionerTransactionId: string }> {
    try {
      // Get credit earned for practitioner
      const creditEarned = await this.getCreditEarned(serviceType, durationMinutes);

      if (creditEarned === 0) {
        throw new Error('Invalid credit rates for service');
      }

      // Only practitioners earn credits - clients pay with real money
      const practitionerTransactionId = await this.earnCredits(
        practitionerId,
        creditEarned,
        sessionId,
        `Provided ${serviceType} session (${durationMinutes}min)`
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
