/**
 * Cancellation Policy Service
 * Handles cancellation policy retrieval, calculation, and enforcement
 */

import { supabase } from '@/integrations/supabase/client';

export interface CancellationPolicy {
  advance_notice_hours: number;
  full_refund_hours: number;
  partial_refund_hours: number;
  partial_refund_percent: number;
  no_refund_hours: number;
}

export interface RefundCalculation {
  success: boolean;
  refund_amount?: number;
  refund_percent?: number;
  refund_type?: 'full' | 'partial' | 'none';
  hours_before_session?: number;
  session_datetime?: string;
  cancellation_time?: string;
  policy_used?: {
    full_refund_hours: number;
    partial_refund_hours: number;
    partial_refund_percent: number;
    no_refund_hours: number;
  };
  error?: string;
}

export class CancellationPolicyService {
  /**
   * Get cancellation policy for a practitioner
   */
  static async getPolicy(practitionerId: string): Promise<CancellationPolicy> {
    try {
      const { data, error } = await supabase
        .rpc('get_cancellation_policy', {
          p_practitioner_id: practitionerId
        });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0] as CancellationPolicy;
      }

      // Return default policy if none exists
      // Updated defaults: 24+ hours = full, 12-24 hours = 50%, <12 hours = none
      return {
        advance_notice_hours: 24,
        full_refund_hours: 24,
        partial_refund_hours: 12,  // Updated from 2 to 12
        partial_refund_percent: 50.00,
        no_refund_hours: 12  // Updated from 2 to 12
      };
    } catch (error: any) {
      // Suppress error logs for missing RPC function (PGRST202) - function doesn't exist yet
      // Only log if it's a different type of error
      if (error?.code !== 'PGRST202') {
        console.error('Error fetching cancellation policy:', error);
      }
      // Return default policy on error
      // Updated defaults: 24+ hours = full, 12-24 hours = 50%, <12 hours = none
      return {
        advance_notice_hours: 24,
        full_refund_hours: 24,
        partial_refund_hours: 12,  // Updated from 2 to 12
        partial_refund_percent: 50.00,
        no_refund_hours: 12  // Updated from 2 to 12
      };
    }
  }

  /**
   * Calculate refund for a cancellation
   */
  static async calculateRefund(
    sessionId: string,
    cancellationTime?: Date
  ): Promise<RefundCalculation> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_cancellation_refund', {
          p_session_id: sessionId,
          p_cancellation_time: cancellationTime?.toISOString() || new Date().toISOString()
        });

      if (error) throw error;

      return data as RefundCalculation;
    } catch (error) {
      console.error('Error calculating refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate refund'
      };
    }
  }

  /**
   * Format policy for display
   */
  static formatPolicy(policy: CancellationPolicy): string {
    const parts: string[] = [];
    
    if (policy.full_refund_hours >= 24) {
      const days = Math.floor(policy.full_refund_hours / 24);
      parts.push(`${days} day${days > 1 ? 's' : ''} notice: Full refund`);
    } else {
      parts.push(`${policy.full_refund_hours} hours notice: Full refund`);
    }

    if (policy.partial_refund_hours > 0) {
      parts.push(
        `${policy.partial_refund_hours}-${policy.full_refund_hours} hours notice: ${policy.partial_refund_percent}% refund`
      );
    }

    if (policy.no_refund_hours > 0) {
      parts.push(
        `Less than ${policy.no_refund_hours} hours notice: No refund`
      );
    }

    return parts.join('\n');
  }

  /**
   * Get policy summary text for booking flow
   */
  static getPolicySummary(policy: CancellationPolicy): string {
    if (policy.full_refund_hours >= 24) {
      const days = Math.floor(policy.full_refund_hours / 24);
      return `Cancellations made ${days}+ day${days > 1 ? 's' : ''} in advance receive a full refund. Cancellations made within ${policy.partial_refund_hours}-${policy.full_refund_hours} hours receive a ${policy.partial_refund_percent}% refund. Cancellations made less than ${policy.no_refund_hours} hours before the session are non-refundable.`;
    }
    
    return `Cancellations made ${policy.full_refund_hours}+ hours in advance receive a full refund. Cancellations made within ${policy.partial_refund_hours}-${policy.full_refund_hours} hours receive a ${policy.partial_refund_percent}% refund. Cancellations made less than ${policy.no_refund_hours} hours before the session are non-refundable.`;
  }

  /**
   * Save or update cancellation policy for a practitioner
   */
  static async savePolicy(
    practitionerId: string,
    policy: Partial<CancellationPolicy>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('cancellation_policies')
        .upsert({
          practitioner_id: practitionerId,
          advance_notice_hours: policy.advance_notice_hours,
          full_refund_hours: policy.full_refund_hours,
          partial_refund_hours: policy.partial_refund_hours,
          partial_refund_percent: policy.partial_refund_percent,
          no_refund_hours: policy.no_refund_hours,
          is_active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'practitioner_id'
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error saving cancellation policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save policy'
      };
    }
  }
}

