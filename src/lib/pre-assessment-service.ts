/**
 * Pre-Assessment Form Service
 * 
 * Handles CRUD operations for pre-assessment forms, including:
 * - Creating and submitting pre-assessment forms
 * - Loading existing forms for editing
 * - Saving draft forms
 * - Validating form data
 * - Managing guest and authenticated user form access
 * 
 * @module pre-assessment-service
 * @example
 * ```typescript
 * // Submit a form
 * const form = await PreAssessmentService.submitForm(
 *   sessionId,
 *   formData,
 *   clientId
 * );
 * 
 * // Load existing form
 * const form = await PreAssessmentService.getForm(sessionId, clientId);
 * 
 * // Save draft
 * await PreAssessmentService.saveDraft(sessionId, formData, clientId);
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import type { BodyMapMarker } from '@/components/forms/BodyMap';
import { logger } from '@/lib/logger';

export interface PreAssessmentFormData {
  // Background Information
  name?: string;
  date_of_birth?: string; // ISO date string
  contact_email?: string;
  contact_phone?: string;
  gp_name?: string;
  gp_address?: string;
  current_medical_conditions?: string;
  past_medical_history?: string;
  
  // Session Details
  area_of_body?: string;
  time_scale?: string;
  how_issue_began?: string;
  activities_affected?: string;
  
  // Body Map
  body_map_markers?: BodyMapMarker[];
}

export interface PreAssessmentForm {
  id: string;
  session_id: string;
  client_id?: string;
  client_email: string;
  client_name: string;
  name?: string;
  date_of_birth?: string;
  contact_email?: string;
  contact_phone?: string;
  gp_name?: string;
  gp_address?: string;
  current_medical_conditions?: string;
  past_medical_history?: string;
  area_of_body?: string;
  time_scale?: string;
  how_issue_began?: string;
  activities_affected?: string;
  body_map_markers: BodyMapMarker[];
  is_guest_booking: boolean;
  is_initial_session: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FormRequirementCheck {
  required: boolean;
  canSkip: boolean;
  reason: 'guest' | 'initial_session' | 'subsequent_session' | 'first_time_user' | 'returning_user';
}

export class PreAssessmentService {
  /**
   * Check if form is required for a session
   */
  static async checkFormRequirement(
    sessionId: string,
    clientId?: string
  ): Promise<FormRequirementCheck> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('client_id, therapist_id, client_email')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) {
        return { required: false, canSkip: true, reason: 'subsequent_session' };
      }

      const clientEmail = session.client_email?.trim() || '';

      // Missing or blank email → treat as unrecognised (first-time), require form
      if (!clientEmail) {
        return { required: true, canSkip: false, reason: 'first_time_user' };
      }

      // Check if email is recognised (has completed at least one pre-assessment form)
      const { data: emailRecognised, error: rpcError } = await supabase.rpc(
        'email_has_completed_pre_assessment',
        { p_email: clientEmail }
      );

      if (rpcError) {
        logger.error('Error checking email recognition:', rpcError);
        return { required: true, canSkip: false, reason: 'first_time_user' };
      }

      if (emailRecognised === true) {
        return { required: false, canSkip: true, reason: 'returning_user' };
      }

      // Unrecognised email → first-time user, form required
      return { required: true, canSkip: false, reason: 'first_time_user' };
    } catch (error) {
      logger.error('Error checking form requirement:', error);
      return { required: true, canSkip: false, reason: 'first_time_user' };
    }
  }

  /**
   * Get existing form for a session
   */
  static async getForm(sessionId: string): Promise<PreAssessmentForm | null> {
    try {
      const { data, error } = await supabase
        .from('pre_assessment_forms')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return this.mapToForm(data);
    } catch (error) {
      logger.error('Error getting form:', error);
      return null;
    }
  }

  /**
   * Auto-populate form data from user profile
   */
  static async autoPopulateFromProfile(clientId: string): Promise<Partial<PreAssessmentFormData>> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      return {
        name: `${user.first_name} ${user.last_name}`.trim(),
        contact_email: user.email,
        contact_phone: user.phone || undefined
      };
    } catch (error) {
      logger.error('Error auto-populating from profile:', error);
      return {};
    }
  }

  /**
   * Auto-populate form data from session (for guests)
   */
  static async autoPopulateFromSession(sessionId: string): Promise<Partial<PreAssessmentFormData>> {
    try {
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select('client_name, client_email, client_phone')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      return {
        name: session.client_name,
        contact_email: session.client_email || undefined,
        contact_phone: session.client_phone || undefined
      };
    } catch (error) {
      logger.error('Error auto-populating from session:', error);
      return {};
    }
  }

  /**
   * Save form as draft (without completing)
   * 
   * IMPORTANT: This method uses auth.uid() for RLS policy compliance.
   * - For authenticated users: client_id MUST equal auth.uid() for RLS to pass
   * - For guest bookings: client_id MUST be NULL and is_guest_booking MUST be true
   * 
   * The clientId parameter is ignored for RLS compliance - we always use auth.uid()
   * for authenticated users or NULL for guests, regardless of what's passed.
   */
  static async saveDraft(
    sessionId: string,
    formData: PreAssessmentFormData,
    clientId?: string
  ): Promise<PreAssessmentForm | null> {
    try {
      // Get authenticated user ID - this is critical for RLS policy compliance
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authenticatedUserId = authUser?.id || null;

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('client_id, client_email, client_name, therapist_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Determine client_id for RLS policy compliance
      // IMPORTANT: RLS policy requires:
      // - client_id = auth.uid() for authenticated users
      // - client_id IS NULL AND is_guest_booking = true for guests
      // Therefore, for guest bookings, we MUST use client_id = NULL regardless of guestUserId
      let effectiveClientId: string | null = null;
      let isGuest = true;

      if (authenticatedUserId) {
        // User is authenticated - use auth.uid() for RLS compliance
        effectiveClientId = authenticatedUserId;
        isGuest = false;
      } else {
        // User is NOT authenticated - this is a guest booking
        // Always use client_id = NULL for RLS compliance, even if guestUserId exists
        // The guestUserId may be used for session linking, but form RLS requires NULL
        effectiveClientId = null;
        isGuest = true;
      }

      // Check if this is the first session with this practitioner
      // Note: For guests (effectiveClientId is null), isInitial will be false
      // which is correct - all guest bookings are treated as first-time sessions
      const isInitial = effectiveClientId && session.therapist_id
        ? await this.isFirstSession(effectiveClientId, session.therapist_id)
        : false;

      // Check if form already exists
      const existing = await this.getForm(sessionId);

      const formPayload = {
        session_id: sessionId,
        client_id: effectiveClientId,
        client_email: session.client_email || formData.contact_email || '',
        client_name: session.client_name || formData.name || '',
        name: formData.name,
        date_of_birth: formData.date_of_birth || null,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        gp_name: formData.gp_name,
        gp_address: formData.gp_address,
        current_medical_conditions: formData.current_medical_conditions,
        past_medical_history: formData.past_medical_history,
        area_of_body: formData.area_of_body,
        time_scale: formData.time_scale,
        how_issue_began: formData.how_issue_began,
        activities_affected: formData.activities_affected,
        body_map_markers: formData.body_map_markers || [],
        is_guest_booking: isGuest,
        is_initial_session: isInitial,
        completed_at: null // Not completed yet
      };

      let result;
      if (existing) {
        // Update existing form
        const { data, error } = await supabase
          .from('pre_assessment_forms')
          .update(formPayload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new form
        const { data, error } = await supabase
          .from('pre_assessment_forms')
          .insert(formPayload)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Update session reference
      await supabase
        .from('client_sessions')
        .update({ pre_assessment_form_id: result.id })
        .eq('id', sessionId);

      return this.mapToForm(result);
    } catch (error) {
      logger.error('Error saving draft:', error);
      throw error;
    }
  }

  /**
   * Submit completed form
   * 
   * This method calls saveDraft() which handles RLS compliance automatically.
   * See saveDraft() documentation for details on auth.uid() usage.
   */
  static async submitForm(
    sessionId: string,
    formData: PreAssessmentFormData,
    clientId?: string
  ): Promise<PreAssessmentForm> {
    try {
      // Save as draft first (this handles RLS compliance)
      const form = await this.saveDraft(sessionId, formData, clientId);
      if (!form) throw new Error('Failed to save form');

      // Mark as completed
      const { data, error } = await supabase
        .from('pre_assessment_forms')
        .update({
          completed_at: new Date().toISOString()
        })
        .eq('id', form.id)
        .select()
        .single();

      if (error) throw error;

      // Update session to mark form as completed
      await supabase
        .from('client_sessions')
        .update({
          pre_assessment_completed: true,
          pre_assessment_form_id: form.id
        })
        .eq('id', sessionId);

      return this.mapToForm(data);
    } catch (error) {
      logger.error('Error submitting form:', error);
      throw error;
    }
  }

  /**
   * Helper: Check if first session
   */
  private static async isFirstSession(
    clientId: string,
    therapistId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_first_session_with_practitioner', {
          p_client_id: clientId,
          p_therapist_id: therapistId
        });

      if (error) {
        // Fallback: count manually
        const { count } = await supabase
          .from('client_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('therapist_id', therapistId)
          .in('status', ['completed', 'confirmed', 'scheduled', 'in_progress'])
          .in('payment_status', ['completed', 'succeeded']);

        return (count || 0) === 0;
      }

      return data === true;
    } catch (error) {
      logger.error('Error checking first session:', error);
      return false;
    }
  }

  /**
   * Skip form for a session (mark as completed without form data)
   */
  static async skipForm(sessionId: string): Promise<void> {
    try {
      // Update session to mark form as skipped
      await supabase
        .from('client_sessions')
        .update({
          pre_assessment_required: false,
          pre_assessment_completed: true,
          pre_assessment_form_id: null
        })
        .eq('id', sessionId);
    } catch (error) {
      logger.error('Error skipping form:', error);
      throw error;
    }
  }

  /**
   * Helper: Map database row to PreAssessmentForm
   */
  private static mapToForm(data: {
    id: string;
    session_id: string;
    client_id?: string | null;
    client_email: string;
    client_name: string;
    name?: string | null;
    date_of_birth?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    gp_name?: string | null;
    gp_address?: string | null;
    current_medical_conditions?: string | null;
    past_medical_history?: string | null;
    area_of_body?: string | null;
    time_scale?: string | null;
    how_issue_began?: string | null;
    activities_affected?: string | null;
    body_map_markers?: unknown;
    is_guest_booking: boolean;
    is_initial_session: boolean;
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  }): PreAssessmentForm {
    return {
      id: data.id,
      session_id: data.session_id,
      client_id: data.client_id,
      client_email: data.client_email,
      client_name: data.client_name,
      name: data.name,
      date_of_birth: data.date_of_birth,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      gp_name: data.gp_name,
      gp_address: data.gp_address,
      current_medical_conditions: data.current_medical_conditions,
      past_medical_history: data.past_medical_history,
      area_of_body: data.area_of_body,
      time_scale: data.time_scale,
      how_issue_began: data.how_issue_began,
      activities_affected: data.activities_affected,
      body_map_markers: (data.body_map_markers || []) as BodyMapMarker[],
      is_guest_booking: data.is_guest_booking,
      is_initial_session: data.is_initial_session,
      completed_at: data.completed_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}
