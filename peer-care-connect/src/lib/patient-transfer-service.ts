/**
 * Patient Transfer Service
 * Handles comprehensive transfer of patient records between practitioners
 * Includes: treatment notes, progress metrics, goals, exercise programs, and session history
 */

import { supabase } from '@/integrations/supabase/client';
import { HEPTransferService } from './hep-transfer-service';

export interface PatientTransferResult {
  success: boolean;
  error?: string;
  transferredItems?: {
    treatmentNotes: number;
    progressMetrics: number;
    progressGoals: number;
    exercisePrograms: number;
  };
  oldPractitionerId?: string;
  newPractitionerId?: string;
  clientId?: string;
}

export class PatientTransferService {
  /**
   * Transfer complete patient record to another practitioner
   * This includes:
   * - Treatment notes
   * - Progress metrics
   * - Progress goals
   * - Exercise programs (HEPs)
   * - Session history (read-only, for reference)
   */
  static async transferPatientRecord(
    clientId: string,
    newPractitionerId: string,
    oldPractitionerId: string,
    transferNotes?: string
  ): Promise<PatientTransferResult> {
    try {
      let transferredCounts = {
        treatmentNotes: 0,
        progressMetrics: 0,
        progressGoals: 0,
        exercisePrograms: 0
      };

      // 1. Transfer treatment notes
      const { data: treatmentNotes, error: notesError } = await supabase
        .from('treatment_notes')
        .update({ practitioner_id: newPractitionerId })
        .eq('client_id', clientId)
        .eq('practitioner_id', oldPractitionerId)
        .select('id');

      if (notesError) {
        console.error('Error transferring treatment notes:', notesError);
        return {
          success: false,
          error: `Failed to transfer treatment notes: ${notesError.message}`
        };
      }
      transferredCounts.treatmentNotes = treatmentNotes?.length || 0;

      // 2. Transfer progress metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('progress_metrics')
        .update({ practitioner_id: newPractitionerId })
        .eq('client_id', clientId)
        .eq('practitioner_id', oldPractitionerId)
        .select('id');

      if (metricsError) {
        console.error('Error transferring progress metrics:', metricsError);
        return {
          success: false,
          error: `Failed to transfer progress metrics: ${metricsError.message}`
        };
      }
      transferredCounts.progressMetrics = metrics?.length || 0;

      // 3. Transfer progress goals
      const { data: goals, error: goalsError } = await supabase
        .from('progress_goals')
        .update({ practitioner_id: newPractitionerId })
        .eq('client_id', clientId)
        .eq('practitioner_id', oldPractitionerId)
        .select('id');

      if (goalsError) {
        console.error('Error transferring progress goals:', goalsError);
        return {
          success: false,
          error: `Failed to transfer progress goals: ${goalsError.message}`
        };
      }
      transferredCounts.progressGoals = goals?.length || 0;

      // 4. Transfer exercise programs (HEPs)
      const { data: heps, error: hepsError } = await supabase
        .from('home_exercise_programs')
        .select('id')
        .eq('client_id', clientId)
        .eq('practitioner_id', oldPractitionerId);

      if (hepsError) {
        console.error('Error fetching exercise programs:', hepsError);
        return {
          success: false,
          error: `Failed to fetch exercise programs: ${hepsError.message}`
        };
      }

      // Transfer each HEP program
      for (const hep of heps || []) {
        const transferResult = await HEPTransferService.transferProgram(
          hep.id,
          newPractitionerId,
          transferNotes
        );
        if (transferResult.success) {
          transferredCounts.exercisePrograms++;
        }
      }

      // 5. Note: Session history (client_sessions) is not transferred as it's historical data
      // The new practitioner can view sessions but they remain linked to the original practitioner
      // This maintains data integrity and audit trail

      return {
        success: true,
        transferredItems: transferredCounts,
        oldPractitionerId,
        newPractitionerId,
        clientId
      };
    } catch (error) {
      console.error('Error transferring patient record:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer patient record'
      };
    }
  }

  /**
   * Transfer a single exercise program along with related patient data
   * This is a convenience method that transfers the program and optionally related data
   */
  static async transferProgramWithPatientData(
    programId: string,
    newPractitionerId: string,
    includePatientData: boolean = true,
    transferNotes?: string
  ): Promise<PatientTransferResult> {
    try {
      // First, get the program to find client and old practitioner
      const { data: program, error: programError } = await supabase
        .from('home_exercise_programs')
        .select('practitioner_id, client_id')
        .eq('id', programId)
        .single();

      if (programError || !program) {
        return {
          success: false,
          error: 'Program not found or access denied'
        };
      }

      // Transfer the program
      const programTransferResult = await HEPTransferService.transferProgram(
        programId,
        newPractitionerId,
        transferNotes
      );

      if (!programTransferResult.success) {
        return programTransferResult;
      }

      let transferredCounts = {
        treatmentNotes: 0,
        progressMetrics: 0,
        progressGoals: 0,
        exercisePrograms: 1 // The program we just transferred
      };

      // If requested, transfer related patient data
      if (includePatientData) {
        const patientTransferResult = await this.transferPatientRecord(
          program.client_id,
          newPractitionerId,
          program.practitioner_id,
          transferNotes
        );

        if (patientTransferResult.success && patientTransferResult.transferredItems) {
          transferredCounts = {
            ...transferredCounts,
            treatmentNotes: patientTransferResult.transferredItems.treatmentNotes,
            progressMetrics: patientTransferResult.transferredItems.progressMetrics,
            progressGoals: patientTransferResult.transferredItems.progressGoals,
            exercisePrograms: patientTransferResult.transferredItems.exercisePrograms
          };
        }
      }

      return {
        success: true,
        transferredItems: transferredCounts,
        oldPractitionerId: program.practitioner_id,
        newPractitionerId,
        clientId: program.client_id
      };
    } catch (error) {
      console.error('Error transferring program with patient data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transfer program with patient data'
      };
    }
  }

  /**
   * Get summary of what will be transferred for a patient
   */
  static async getTransferSummary(
    clientId: string,
    oldPractitionerId: string
  ): Promise<{
    treatmentNotes: number;
    progressMetrics: number;
    progressGoals: number;
    exercisePrograms: number;
    sessions: number;
  }> {
    try {
      const [notesResult, metricsResult, goalsResult, hepsResult, sessionsResult] = await Promise.all([
        supabase
          .from('treatment_notes')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('practitioner_id', oldPractitionerId),
        supabase
          .from('progress_metrics')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('practitioner_id', oldPractitionerId),
        supabase
          .from('progress_goals')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('practitioner_id', oldPractitionerId),
        supabase
          .from('home_exercise_programs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('practitioner_id', oldPractitionerId),
        supabase
          .from('client_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId)
          .eq('therapist_id', oldPractitionerId)
      ]);

      return {
        treatmentNotes: notesResult.count || 0,
        progressMetrics: metricsResult.count || 0,
        progressGoals: goalsResult.count || 0,
        exercisePrograms: hepsResult.count || 0,
        sessions: sessionsResult.count || 0
      };
    } catch (error) {
      console.error('Error getting transfer summary:', error);
      return {
        treatmentNotes: 0,
        progressMetrics: 0,
        progressGoals: 0,
        exercisePrograms: 0,
        sessions: 0
      };
    }
  }
}

