/**
 * HEP Transfer Service
 * Handles transfer of home exercise programs between practitioners
 */

import { supabase } from '@/integrations/supabase/client';

export interface HEPTransferResult {
  success: boolean;
  error?: string;
  programId?: string;
  oldPractitionerId?: string;
  newPractitionerId?: string;
}

export class HEPTransferService {
  /**
   * Transfer a program to another practitioner
   */
  static async transferProgram(
    programId: string,
    newPractitionerId: string,
    transferNotes?: string
  ): Promise<HEPTransferResult> {
    try {
      // Verify the program exists and current user is the practitioner
      const { data: program, error: fetchError } = await supabase
        .from('home_exercise_programs')
        .select('practitioner_id, client_id')
        .eq('id', programId)
        .single();

      if (fetchError || !program) {
        return {
          success: false,
          error: 'Program not found or access denied'
        };
      }

      // Call the database function to transfer
      const { data, error } = await supabase.rpc('transfer_hep_program', {
        p_program_id: programId,
        p_new_practitioner_id: newPractitionerId,
        p_transfer_notes: transferNotes || null
      });

      if (error) {
        console.error('Error transferring program:', error);
        return {
          success: false,
          error: error.message || 'Failed to transfer program'
        };
      }

      if (data && data.success) {
        return {
          success: true,
          programId: data.program_id,
          oldPractitionerId: data.old_practitioner_id,
          newPractitionerId: data.new_practitioner_id
        };
      }

      return {
        success: false,
        error: 'Transfer failed'
      };
    } catch (error) {
      console.error('Error transferring program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer program'
      };
    }
  }

  /**
   * Get list of practitioners that can receive the transfer
   * (e.g., other practitioners who have worked with the same client)
   */
  static async getAvailablePractitioners(clientId: string, excludePractitionerId: string): Promise<Array<{
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
  }>> {
    try {
      // Get practitioners who have sessions with this client
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('therapist_id')
        .eq('client_id', clientId)
        .neq('therapist_id', excludePractitionerId);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        return [];
      }

      const practitionerIds = [...new Set(sessions?.map(s => s.therapist_id) || [])];

      if (practitionerIds.length === 0) {
        return [];
      }

      // Get practitioner details
      const { data: practitioners, error: practitionersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, user_role')
        .in('id', practitionerIds)
        .eq('user_role', 'practitioner');

      if (practitionersError) {
        console.error('Error fetching practitioners:', practitionersError);
        return [];
      }

      return (practitioners || []).map(p => ({
        id: p.id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        user_role: p.user_role || 'practitioner'
      }));
    } catch (error) {
      console.error('Error getting available practitioners:', error);
      return [];
    }
  }
}

