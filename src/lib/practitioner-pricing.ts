/**
 * TheraMate Practitioner Pricing System
 * Handles practitioner subscriptions, custom pricing, and marketplace fees
 */

import { supabase } from '@/integrations/supabase/client';

export interface PractitionerSubscriptionPlan {
  id: string;
  stripe_product_id: string;
  stripe_price_id: string;
  plan_name: string;
  plan_tier: 'basic' | 'professional' | 'premium';
  monthly_fee: number;
  marketplace_fee_percentage: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PractitionerSubscription {
  id: string;
  practitioner_id: string;
  plan_id: string;
  stripe_subscription_id?: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  plan?: PractitionerSubscriptionPlan;
}

export interface CustomPricingProduct {
  id: string;
  stripe_product_id: string;
  product_type: 'individual_session' | 'group_session' | 'workshop';
  product_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface PractitionerCustomPricing {
  id: string;
  practitioner_id: string;
  product_type: 'individual_session' | 'group_session' | 'workshop';
  stripe_price_id: string;
  price_amount: number;
  currency: string;
  session_duration_minutes?: number;
  max_participants?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionTransaction {
  id: string;
  session_id: string;
  practitioner_id: string;
  client_id: string;
  total_amount: number;
  practitioner_amount: number;
  marketplace_fee: number;
  fee_percentage: number;
  stripe_payment_intent_id?: string;
  transaction_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface MarketplaceFeeStructure {
  id: string;
  stripe_product_id: string;
  fee_type: string;
  calculation_method: string;
  basic_plan_fee: number;
  professional_plan_fee: number;
  premium_plan_fee: number;
  is_active: boolean;
  created_at: string;
}

export class PractitionerPricingManager {
  /**
   * Get all available subscription plans
   */
  async getSubscriptionPlans(): Promise<PractitionerSubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('practitioner_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_fee', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get practitioner's current subscription
   */
  async getPractitionerSubscription(practitionerId: string): Promise<PractitionerSubscription | null> {
    const { data, error } = await supabase
      .from('practitioner_subscriptions')
      .select(`
        *,
        plan:practitioner_subscription_plans(*)
      `)
      .eq('practitioner_id', practitionerId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Create a new practitioner subscription
   */
  async createPractitionerSubscription(
    practitionerId: string,
    planId: string,
    stripeSubscriptionId?: string
  ): Promise<PractitionerSubscription> {
    const { data, error } = await supabase
      .from('practitioner_subscriptions')
      .insert({
        practitioner_id: practitionerId,
        plan_id: planId,
        stripe_subscription_id: stripeSubscriptionId,
        status: 'active'
      })
      .select(`
        *,
        plan:practitioner_subscription_plans(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update practitioner subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'active' | 'canceled' | 'past_due' | 'unpaid',
    currentPeriodStart?: string,
    currentPeriodEnd?: string,
    cancelAtPeriodEnd?: boolean
  ): Promise<void> {
    const updateData: any = { status };
    
    if (currentPeriodStart) updateData.current_period_start = currentPeriodStart;
    if (currentPeriodEnd) updateData.current_period_end = currentPeriodEnd;
    if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;

    const { error } = await supabase
      .from('practitioner_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    if (error) throw error;
  }

  /**
   * Get custom pricing products
   */
  async getCustomPricingProducts(): Promise<CustomPricingProduct[]> {
    const { data, error } = await supabase
      .from('custom_pricing_products')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get practitioner's custom pricing
   */
  async getPractitionerCustomPricing(practitionerId: string): Promise<PractitionerCustomPricing[]> {
    const { data, error } = await supabase
      .from('practitioner_custom_pricing')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create custom pricing for practitioner
   */
  async createCustomPricing(
    practitionerId: string,
    productType: 'individual_session' | 'group_session' | 'workshop',
    stripePriceId: string,
    priceAmount: number,
    currency: string = 'gbp',
    sessionDurationMinutes?: number,
    maxParticipants?: number
  ): Promise<PractitionerCustomPricing> {
    const { data, error } = await supabase
      .from('practitioner_custom_pricing')
      .insert({
        practitioner_id: practitionerId,
        product_type: productType,
        stripe_price_id: stripePriceId,
        price_amount: priceAmount,
        currency,
        session_duration_minutes: sessionDurationMinutes,
        max_participants: maxParticipants
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update custom pricing
   */
  async updateCustomPricing(
    pricingId: string,
    updates: Partial<Omit<PractitionerCustomPricing, 'id' | 'practitioner_id' | 'created_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('practitioner_custom_pricing')
      .update(updates)
      .eq('id', pricingId);

    if (error) throw error;
  }

  /**
   * Delete custom pricing
   */
  async deleteCustomPricing(pricingId: string): Promise<void> {
    const { error } = await supabase
      .from('practitioner_custom_pricing')
      .update({ is_active: false })
      .eq('id', pricingId);

    if (error) throw error;
  }

  /**
   * Get marketplace fee structure
   */
  async getMarketplaceFeeStructure(): Promise<MarketplaceFeeStructure[]> {
    const { data, error } = await supabase
      .from('marketplace_fee_structure')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate marketplace fee for a practitioner
   */
  async calculateMarketplaceFee(
    practitionerId: string,
    totalAmount: number
  ): Promise<{ fee: number; percentage: number; practitionerAmount: number }> {
    const subscription = await this.getPractitionerSubscription(practitionerId);
    
    if (!subscription?.plan) {
      // Default to basic plan if no subscription
      const fee = Math.round((totalAmount * 0.05) * 100) / 100;
      return {
        fee,
        percentage: 5.00,
        practitionerAmount: totalAmount - fee
      };
    }

    const percentage = subscription.plan.marketplace_fee_percentage;
    const fee = Math.round((totalAmount * percentage / 100) * 100) / 100;
    
    return {
      fee,
      percentage,
      practitionerAmount: totalAmount - fee
    };
  }

  /**
   * Create session transaction
   */
  async createSessionTransaction(
    sessionId: string,
    practitionerId: string,
    clientId: string,
    totalAmount: number,
    stripePaymentIntentId?: string
  ): Promise<SessionTransaction> {
    const { data, error } = await supabase.rpc('create_session_transaction', {
      session_uuid: sessionId,
      practitioner_uuid: practitionerId,
      client_uuid: clientId,
      total_amount: totalAmount,
      stripe_payment_intent_id: stripePaymentIntentId
    });

    if (error) throw error;

    // Get the created transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('session_transactions')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded'
  ): Promise<void> {
    const { error } = await supabase
      .from('session_transactions')
      .update({ transaction_status: status })
      .eq('id', transactionId);

    if (error) throw error;
  }

  /**
   * Get practitioner's transaction history
   */
  async getPractitionerTransactions(
    practitionerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionTransaction[]> {
    const { data, error } = await supabase
      .from('session_transactions')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get client's transaction history
   */
  async getClientTransactions(
    clientId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionTransaction[]> {
    const { data, error } = await supabase
      .from('session_transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get practitioner's earnings summary
   */
  async getPractitionerEarnings(practitionerId: string): Promise<{
    totalEarnings: number;
    totalFees: number;
    netEarnings: number;
    transactionCount: number;
  }> {
    const { data, error } = await supabase
      .from('session_transactions')
      .select('practitioner_amount, marketplace_fee')
      .eq('practitioner_id', practitionerId)
      .eq('transaction_status', 'completed');

    if (error) throw error;

    const totalEarnings = data?.reduce((sum, tx) => sum + tx.practitioner_amount, 0) || 0;
    const totalFees = data?.reduce((sum, tx) => sum + tx.marketplace_fee, 0) || 0;
    const netEarnings = totalEarnings;
    const transactionCount = data?.length || 0;

    return {
      totalEarnings,
      totalFees,
      netEarnings,
      transactionCount
    };
  }
}

// Export singleton instance
export const practitionerPricingManager = new PractitionerPricingManager();
