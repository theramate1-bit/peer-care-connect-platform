/**
 * Type-safe Supabase wrapper to fix TypeScript inconsistencies
 */

import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types';

// Type-safe wrapper for Supabase operations
export class TypeSafeSupabase {
  /**
   * Type-safe user profile fetch
   */
  static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }

  /**
   * Type-safe user profile creation
   */
  static async createUserProfile(user: any): Promise<UserProfile | null> {
    try {
      const profileData = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || 'User',
        last_name: user.user_metadata?.last_name || 'User',
        user_role: user.user_metadata?.user_role || null,
        onboarding_status: 'pending' as const,
        profile_completed: false,
        phone: null,
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Unexpected error creating profile:', err);
      return null;
    }
  }

  /**
   * Type-safe user profile update
   */
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.error('Unexpected error updating profile:', err);
      return null;
    }
  }

  /**
   * Type-safe subscription check
   */
  static async checkUserSubscription(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error checking subscription:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Unexpected error checking subscription:', err);
      return null;
    }
  }

  /**
   * Type-safe user role check
   */
  static async getUserRole(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.user_role || null;
    } catch (err) {
      console.error('Unexpected error fetching user role:', err);
      return null;
    }
  }
}

