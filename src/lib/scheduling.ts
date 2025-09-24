import { supabase } from '@/integrations/supabase/client';

export interface RecurringPattern {
  id: string;
  user_id: string;
  therapist_id: string;
  pattern_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  frequency: number;
  days_of_week: number[];
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  session_duration_minutes: number;
  session_type: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringInstance {
  id: string;
  pattern_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  client_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  therapist_id: string;
  client_id: string;
  session_type: string;
  preferred_duration_minutes: number;
  preferred_days: number[];
  preferred_times: string[];
  max_wait_days: number;
  priority: number;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  session_id: string;
  reminder_type: 'email' | 'sms' | 'push';
  reminder_time: string;
  message: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_reminders: boolean;
  sms_reminders: boolean;
  push_reminders: boolean;
  reminder_advance_hours: number;
  email_address: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export class SchedulingManager {
  /**
   * Create recurring sessions
   */
  static async createRecurringSessions(
    userId: string,
    therapistId: string,
    patternType: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom',
    frequency: number,
    daysOfWeek: number[],
    startDate: string,
    endDate: string | null,
    durationMinutes: number,
    sessionType: string,
    notes?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('create_recurring_sessions', {
          p_user_id: userId,
          p_therapist_id: therapistId,
          p_pattern_type: patternType,
          p_frequency: frequency,
          p_days_of_week: daysOfWeek,
          p_start_date: startDate,
          p_end_date: endDate,
          p_duration_minutes: durationMinutes,
          p_session_type: sessionType,
          p_notes: notes || null
        });

      if (error) {
        console.error('Error creating recurring sessions:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      throw error;
    }
  }

  /**
   * Get user's recurring patterns
   */
  static async getUserRecurringPatterns(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_recurring_patterns', { p_user_id: userId });

      if (error) {
        console.error('Error getting recurring patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recurring patterns:', error);
      return [];
    }
  }

  /**
   * Add user to waitlist
   */
  static async addToWaitlist(
    therapistId: string,
    clientId: string,
    sessionType: string,
    durationMinutes: number,
    preferredDays: number[],
    preferredTimes: string[],
    maxWaitDays: number = 30,
    priority: number = 0,
    notes?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('add_to_waitlist', {
          p_therapist_id: therapistId,
          p_client_id: clientId,
          p_session_type: sessionType,
          p_duration_minutes: durationMinutes,
          p_preferred_days: preferredDays,
          p_preferred_times: preferredTimes,
          p_max_wait_days: maxWaitDays,
          p_priority: priority,
          p_notes: notes || null
        });

      if (error) {
        console.error('Error adding to waitlist:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      throw error;
    }
  }

  /**
   * Get therapist's waitlist
   */
  static async getTherapistWaitlist(therapistId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_therapist_waitlist', { p_therapist_id: therapistId });

      if (error) {
        console.error('Error getting waitlist:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting waitlist:', error);
      return [];
    }
  }

  /**
   * Create reminder for session
   */
  static async createReminder(
    sessionId: string,
    reminderType: 'email' | 'sms' | 'push',
    advanceHours: number,
    message?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('create_reminder', {
          p_session_id: sessionId,
          p_reminder_type: reminderType,
          p_advance_hours: advanceHours,
          p_message: message || null
        });

      if (error) {
        console.error('Error creating reminder:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error getting notification preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating notification preferences:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Cancel recurring pattern
   */
  static async cancelRecurringPattern(patternId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recurring_patterns')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', patternId);

      if (error) {
        console.error('Error cancelling recurring pattern:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error cancelling recurring pattern:', error);
      throw error;
    }
  }

  /**
   * Remove from waitlist
   */
  static async removeFromWaitlist(waitlistId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('waitlists')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', waitlistId);

      if (error) {
        console.error('Error removing from waitlist:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error removing from waitlist:', error);
      throw error;
    }
  }

  /**
   * Get upcoming recurring instances
   */
  static async getUpcomingInstances(
    userId: string,
    limit: number = 10
  ): Promise<RecurringInstance[]> {
    try {
      const { data, error } = await supabase
        .from('recurring_session_instances')
        .select(`
          *,
          recurring_patterns!inner(
            user_id,
            therapist_id,
            session_type,
            session_duration_minutes
          )
        `)
        .eq('recurring_patterns.user_id', userId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting upcoming instances:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting upcoming instances:', error);
      return [];
    }
  }

  /**
   * Check for waitlist matches when new availability is added
   */
  static async checkWaitlistMatches(
    therapistId: string,
    sessionDate: string,
    startTime: string,
    durationMinutes: number
  ): Promise<void> {
    try {
      // Get active waitlist entries for this therapist
      const { data: waitlistEntries, error: waitlistError } = await supabase
        .from('waitlists')
        .select('*')
        .eq('therapist_id', therapistId)
        .eq('status', 'active')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (waitlistError) {
        console.error('Error checking waitlist matches:', waitlistError);
        return;
      }

      if (!waitlistEntries || waitlistEntries.length === 0) {
        return;
      }

      // Check for matches
      for (const entry of waitlistEntries) {
        const sessionDateObj = new Date(sessionDate);
        const dayOfWeek = sessionDateObj.getDay() + 1; // Convert to 1-7 format
        const sessionTime = startTime;

        // Check if this matches the waitlist entry preferences
        const matchesDay = entry.preferred_days.includes(dayOfWeek);
        const matchesTime = entry.preferred_times.some(time => 
          Math.abs(new Date(`2000-01-01T${time}`).getTime() - new Date(`2000-01-01T${sessionTime}`).getTime()) < 60 * 60 * 1000 // Within 1 hour
        );
        const matchesDuration = Math.abs(entry.preferred_duration_minutes - durationMinutes) <= 15; // Within 15 minutes
        const matchesType = entry.session_type === 'any' || entry.session_type === 'massage'; // Simplified matching

        if (matchesDay && matchesTime && matchesDuration && matchesType) {
          // Create a match record (this would typically trigger a notification)
          await supabase
            .from('waitlist_matches')
            .insert({
              waitlist_id: entry.id,
              session_id: '', // This would be filled when the actual session is created
              matched_at: new Date().toISOString()
            });

          // Update waitlist entry status
          await supabase
            .from('waitlists')
            .update({ status: 'fulfilled', updated_at: new Date().toISOString() })
            .eq('id', entry.id);
        }
      }
    } catch (error) {
      console.error('Error checking waitlist matches:', error);
    }
  }

  /**
   * Get user's scheduling statistics
   */
  static async getSchedulingStats(userId: string): Promise<{
    totalRecurringPatterns: number;
    activePatterns: number;
    upcomingInstances: number;
    waitlistEntries: number;
    totalReminders: number;
  }> {
    try {
      const [
        patternsResult,
        instancesResult,
        waitlistResult,
        remindersResult
      ] = await Promise.all([
        supabase
          .from('recurring_patterns')
          .select('id, is_active')
          .eq('user_id', userId),
        supabase
          .from('recurring_session_instances')
          .select('id, status')
          .eq('status', 'scheduled')
          .gte('session_date', new Date().toISOString().split('T')[0])
          .in('pattern_id', 
            supabase
              .from('recurring_patterns')
              .select('id')
              .eq('user_id', userId)
          ),
        supabase
          .from('waitlists')
          .select('id, status')
          .eq('client_id', userId),
        supabase
          .from('reminders')
          .select('id')
          .in('session_id',
            supabase
              .from('client_sessions')
              .select('id')
              .or(`client_email.eq.${(await supabase.auth.getUser()).data.user?.email},therapist_id.eq.${userId}`)
          )
      ]);

      return {
        totalRecurringPatterns: patternsResult.data?.length || 0,
        activePatterns: patternsResult.data?.filter(p => p.is_active).length || 0,
        upcomingInstances: instancesResult.data?.length || 0,
        waitlistEntries: waitlistResult.data?.length || 0,
        totalReminders: remindersResult.data?.length || 0
      };
    } catch (error) {
      console.error('Error getting scheduling stats:', error);
      return {
        totalRecurringPatterns: 0,
        activePatterns: 0,
        upcomingInstances: 0,
        waitlistEntries: 0,
        totalReminders: 0
      };
    }
  }
}
