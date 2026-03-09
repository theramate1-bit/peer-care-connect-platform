/**
 * Utility functions for treatment notes
 * Provides consistent completion checking across all components
 */

import { supabase } from '@/integrations/supabase/client';

export interface TreatmentNoteStatus {
  isCompleted: boolean;
  hasAllSOAPSections?: boolean;
  completedVia?: 'session_recordings' | 'treatment_notes' | 'both';
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
    // Check session_recordings
    const { data: recordings } = await supabase
      .from('session_recordings')
      .select('status')
      .eq('session_id', sessionId)
      .eq('practitioner_id', practitionerId)
      .limit(1);

    const hasCompletedRecording = recordings?.some((r) => r.status === 'completed');

    // Check treatment_notes status
    const { data: treatmentNotes } = await supabase
      .from('treatment_notes')
      .select('status, note_type, template_type')
      .eq('session_id', sessionId)
      .eq('practitioner_id', practitionerId)
      .eq('template_type', 'SOAP');

    // Check if any note has status = 'completed'
    const hasCompletedNote = treatmentNotes?.some((n) => n.status === 'completed');

    // Check if all 4 SOAP sections exist
    const noteTypes = new Set(treatmentNotes?.map((n) => n.note_type) || []);
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
    };
  } catch (error) {
    console.error('Error checking treatment notes completion:', error);
    return {
      isCompleted: false,
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
