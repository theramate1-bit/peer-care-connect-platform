/**
 * Patient History Request Service
 * Handles requests from new therapists to access patient history from previous practitioners
 */

import { supabase } from '@/integrations/supabase/client';
import { PatientTransferService } from './patient-transfer-service';

export interface PatientHistoryRequest {
  id: string;
  requesting_practitioner_id: string;
  previous_practitioner_id: string;
  client_id: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  request_notes?: string;
  response_notes?: string;
  requested_at: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  requesting_practitioner?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  previous_practitioner?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  client?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateHistoryRequestParams {
  clientId: string;
  previousPractitionerId: string;
  requestNotes?: string;
}

export interface HistoryRequestSummary {
  treatmentNotes: number;
  progressMetrics: number;
  progressGoals: number;
  exercisePrograms: number;
  sessions: number;
}

export class PatientHistoryRequestService {
  /**
   * Create a new patient history request
   */
  static async createRequest(
    params: CreateHistoryRequestParams,
    requestingPractitionerId: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Check if a pending request already exists
      const { data: existingRequest } = await supabase
        .from('patient_history_requests')
        .select('id, status')
        .eq('client_id', params.clientId)
        .eq('requesting_practitioner_id', requestingPractitionerId)
        .eq('previous_practitioner_id', params.previousPractitionerId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        return {
          success: false,
          error: 'You already have a pending request for this patient and practitioner. Please wait for a response, or cancel the existing request in the History Requests tab.'
        };
      }

      const { data, error } = await supabase
        .from('patient_history_requests')
        .insert({
          requesting_practitioner_id: requestingPractitionerId,
          previous_practitioner_id: params.previousPractitionerId,
          client_id: params.clientId,
          request_notes: params.requestNotes || null,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating history request:', error);
        return {
          success: false,
          error: error.message || 'Failed to create request'
        };
      }

      return {
        success: true,
        requestId: data.id
      };
    } catch (error) {
      console.error('Error creating history request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create request'
      };
    }
  }

  /**
   * Get requests where current user is the requesting practitioner
   */
  static async getMyRequests(practitionerId: string): Promise<PatientHistoryRequest[]> {
    try {
      const { data, error } = await supabase
        .from('patient_history_requests')
        .select(`
          *,
          requesting_practitioner:users!requesting_practitioner_id(first_name, last_name, email),
          previous_practitioner:users!previous_practitioner_id(first_name, last_name, email),
          client:users!client_id(first_name, last_name, email)
        `)
        .eq('requesting_practitioner_id', practitionerId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching my requests:', error);
        return [];
      }

      return (data || []).map(req => ({
        ...req,
        requesting_practitioner: req.requesting_practitioner?.[0] || req.requesting_practitioner,
        previous_practitioner: req.previous_practitioner?.[0] || req.previous_practitioner,
        client: req.client?.[0] || req.client
      })) as PatientHistoryRequest[];
    } catch (error) {
      console.error('Error fetching my requests:', error);
      return [];
    }
  }

  /**
   * Get requests where current user is the previous practitioner (needs to approve/deny)
   */
  static async getPendingRequestsForMe(practitionerId: string): Promise<PatientHistoryRequest[]> {
    try {
      const { data, error } = await supabase
        .from('patient_history_requests')
        .select(`
          *,
          requesting_practitioner:users!requesting_practitioner_id(first_name, last_name, email),
          previous_practitioner:users!previous_practitioner_id(first_name, last_name, email),
          client:users!client_id(first_name, last_name, email)
        `)
        .eq('previous_practitioner_id', practitionerId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return [];
      }

      return (data || []).map(req => ({
        ...req,
        requesting_practitioner: req.requesting_practitioner?.[0] || req.requesting_practitioner,
        previous_practitioner: req.previous_practitioner?.[0] || req.previous_practitioner,
        client: req.client?.[0] || req.client
      })) as PatientHistoryRequest[];
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  /**
   * Approve a history request and transfer patient data
   */
  static async approveRequest(
    requestId: string,
    previousPractitionerId: string,
    responseNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the request
      const { data: request, error: fetchError } = await supabase
        .from('patient_history_requests')
        .select('*')
        .eq('id', requestId)
        .eq('previous_practitioner_id', previousPractitionerId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !request) {
        return {
          success: false,
          error: 'Request not found or already processed'
        };
      }

      // Transfer patient record
      const transferResult = await PatientTransferService.transferPatientRecord(
        request.client_id,
        request.requesting_practitioner_id,
        previousPractitionerId,
        responseNotes || `Approved history request #${requestId}`
      );

      if (!transferResult.success) {
        // Update request status to denied if transfer failed
        await supabase
          .from('patient_history_requests')
          .update({
            status: 'denied',
            response_notes: `Transfer failed: ${transferResult.error}`,
            responded_at: new Date().toISOString()
          })
          .eq('id', requestId);

        return {
          success: false,
          error: transferResult.error || 'Failed to transfer patient record'
        };
      }

      // Update request status to approved
      const { error: updateError } = await supabase
        .from('patient_history_requests')
        .update({
          status: 'approved',
          response_notes: responseNotes || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        return {
          success: false,
          error: 'Patient data transferred but failed to update request status'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error approving request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve request'
      };
    }
  }

  /**
   * Deny a history request
   */
  static async denyRequest(
    requestId: string,
    previousPractitionerId: string,
    responseNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('patient_history_requests')
        .update({
          status: 'denied',
          response_notes: responseNotes || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('previous_practitioner_id', previousPractitionerId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error denying request:', error);
        return {
          success: false,
          error: error.message || 'Failed to deny request'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error denying request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deny request'
      };
    }
  }

  /**
   * Cancel a pending request (by requesting practitioner)
   */
  static async cancelRequest(
    requestId: string,
    requestingPractitionerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('patient_history_requests')
        .update({
          status: 'cancelled',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('requesting_practitioner_id', requestingPractitionerId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error cancelling request:', error);
        return {
          success: false,
          error: error.message || 'Failed to cancel request'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error cancelling request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel request'
      };
    }
  }

  /**
   * Get summary of what would be transferred for a patient
   */
  static async getTransferSummary(
    clientId: string,
    previousPractitionerId: string
  ): Promise<HistoryRequestSummary> {
    return await PatientTransferService.getTransferSummary(clientId, previousPractitionerId);
  }

  /**
   * Get list of previous practitioners for a client
   */
  static async getPreviousPractitioners(clientId: string, excludePractitionerId?: string): Promise<Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    session_count: number;
    last_session_date?: string;
  }>> {
    try {
      // Get practitioners who have sessions with this client
      const { data: sessions, error: sessionsError } = await supabase
        .from('client_sessions')
        .select('therapist_id, session_date')
        .eq('client_id', clientId)
        .order('session_date', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        return [];
      }

      // Group by practitioner and count sessions
      const practitionerMap = new Map<string, {
        id: string;
        session_count: number;
        last_session_date?: string;
      }>();

      sessions?.forEach(session => {
        const therapistId = session.therapist_id;
        if (excludePractitionerId && therapistId === excludePractitionerId) return;

        const existing = practitionerMap.get(therapistId);
        if (existing) {
          existing.session_count++;
          if (!existing.last_session_date || 
              new Date(session.session_date) > new Date(existing.last_session_date)) {
            existing.last_session_date = session.session_date;
          }
        } else {
          practitionerMap.set(therapistId, {
            id: therapistId,
            session_count: 1,
            last_session_date: session.session_date
          });
        }
      });

      const practitionerIds = Array.from(practitionerMap.keys());

      if (practitionerIds.length === 0) {
        return [];
      }

      // Get practitioner details
      const { data: practitioners, error: practitionersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', practitionerIds)
        .eq('user_role', 'practitioner');

      if (practitionersError) {
        console.error('Error fetching practitioners:', practitionersError);
        return [];
      }

      return (practitioners || []).map(p => {
        const stats = practitionerMap.get(p.id);
        return {
          id: p.id,
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          email: p.email || '',
          session_count: stats?.session_count || 0,
          last_session_date: stats?.last_session_date
        };
      }).sort((a, b) => {
        // Sort by last session date (most recent first)
        if (a.last_session_date && b.last_session_date) {
          return new Date(b.last_session_date).getTime() - new Date(a.last_session_date).getTime();
        }
        return b.session_count - a.session_count;
      });
    } catch (error) {
      console.error('Error getting previous practitioners:', error);
      return [];
    }
  }
}

