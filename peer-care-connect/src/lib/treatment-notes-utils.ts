/**
 * Utility functions for treatment notes
 * Provides consistent completion checking across all components
 */

import { supabase } from '@/integrations/supabase/client';

export interface TreatmentNoteStatus {
  isCompleted: boolean;
  hasAllSOAPSections?: boolean;
  completedVia?: 'session_recordings' | 'treatment_notes' | 'both';
  /** True when session_recordings has processing/error (AI transcription in progress or failed); practitioner can complete manually */
  recordingProcessingOrError?: boolean;
}

/**
 * Check if treatment notes for a session are completed
 * Checks both session_recordings and treatment_notes tables
 */
export async function checkTreatmentNotesCompletion(
  sessionId: string,
  practitionerId: string
): Promise<TreatmentNoteStatus> {
  try {
    // Check session_recordings (may have multiple rows per session; any completed counts)
    const { data: recordings } = await supabase
      .from('session_recordings')
      .select('status')
      .eq('session_id', sessionId)
      .eq('practitioner_id', practitionerId);

    const hasCompletedRecording = recordings?.some((r) => r.status === 'completed') ?? false;
    const recordingProcessingOrError =
      (recordings?.some((r) => r.status === 'processing' || r.status === 'error') ?? false) && !hasCompletedRecording;

    // Check treatment_notes status (SOAP, DAP, FREE_TEXT all count)
    const { data: treatmentNotes } = await supabase
      .from('treatment_notes')
      .select('status, note_type, template_type')
      .eq('session_id', sessionId)
      .eq('practitioner_id', practitionerId);

    // Check if any note has status = 'completed' (any template type)
    const hasCompletedNote = treatmentNotes?.some((n) => n.status === 'completed');

    // For SOAP: check if all 4 sections exist
    const soapNotes = treatmentNotes?.filter((n) => n.template_type === 'SOAP') || [];
    const noteTypes = new Set(soapNotes.map((n) => n.note_type));
    const hasAllSOAPSections =
      noteTypes.has('subjective') &&
      noteTypes.has('objective') &&
      noteTypes.has('assessment') &&
      noteTypes.has('plan');

    // Completed only when explicitly finalized (recording or note status), not when all sections exist
    const isCompleted = hasCompletedRecording || hasCompletedNote;

    let completedVia: 'session_recordings' | 'treatment_notes' | 'both' | undefined;
    if (hasCompletedRecording && hasCompletedNote) {
      completedVia = 'both';
    } else if (hasCompletedRecording) {
      completedVia = 'session_recordings';
    } else if (hasCompletedNote) {
      completedVia = 'treatment_notes';
    }

    return {
      isCompleted,
      hasAllSOAPSections,
      completedVia,
      recordingProcessingOrError,
    };
  } catch (error) {
    console.error('Error checking treatment notes completion:', error);
    return {
      isCompleted: false,
      recordingProcessingOrError: false,
    };
  }
}

/**
 * Mark treatment notes as completed
 * Updates all treatment_notes for a session to status = 'completed'
 */
export async function markTreatmentNotesAsCompleted(
  sessionId: string,
  practitionerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update all treatment_notes for this session
    const { error } = await supabase
      .from('treatment_notes')
      .update({ status: 'completed' })
      .eq('session_id', sessionId)
      .eq('practitioner_id', practitionerId)
      .eq('status', 'draft'); // Only update draft notes

    if (error) {
      console.error('Error marking treatment notes as completed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error marking treatment notes as completed:', error);
    return { success: false, error: error.message };
  }
}
