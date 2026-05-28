/**
 * Home Exercise Program (HEP) Service
 * Handles exercise library, program creation, and progress tracking
 */

import { supabase } from '@/integrations/supabase/client';

export interface Exercise {
  id?: string;
  name: string;
  description?: string;
  category: 'strength' | 'flexibility' | 'cardio' | 'mobility' | 'balance' | 'rehabilitation';
  instructions: string;
  video_url?: string;
  image_url?: string;
  duration_minutes?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  muscle_groups?: string[];
  equipment_needed?: string[];
  contraindications?: string;
}

export interface ExerciseMediaAttachment {
  url: string;
  type: 'image' | 'video';
  filename: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface ProgramExercise extends Exercise {
  sets?: number;
  reps?: number;
  frequency_per_week?: number;
  notes?: string;
  media_attachments?: ExerciseMediaAttachment[]; // Media attached to this exercise in the program
}

export interface HomeExerciseProgram {
  id?: string;
  practitioner_id: string;
  client_id: string;
  session_id?: string;
  title: string;
  description?: string;
  exercises: ProgramExercise[];
  instructions?: string;
  start_date?: string;
  end_date?: string;
  frequency_per_week?: number;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  delivered_via?: 'messaging';
  delivered_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExerciseProgress {
  id?: string;
  program_id: string;
  client_id: string;
  exercise_id?: string;
  exercise_name: string;
  completed_date: string;
  completed_at?: string;
  session_id?: string; // Optional link to session for correlation with progress metrics
  sets_completed?: number;
  reps_completed?: number;
  duration_minutes?: number;
  client_notes?: string;
  pain_level?: number;
  difficulty_rating?: number;
}

export class HEPService {
  /**
   * Get exercises from library
   */
  static async getExercises(filters?: {
    category?: Exercise['category'];
    difficulty?: Exercise['difficulty_level'];
    search?: string;
  }): Promise<Exercise[]> {
    try {
      let query = supabase
        .from('exercise_library')
        .select('*')
        .eq('is_active', true);

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty) {
        query = query.eq('difficulty_level', filters.difficulty);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      
      // Remove duplicate exercises in library (by name, case-insensitive); prefer entries with more media/description
      const uniqueExercises = new Map<string, Exercise>();
      (data || []).forEach((ex: any) => {
        const normalizedName = ex.name.trim().toLowerCase();
        if (!uniqueExercises.has(normalizedName)) {
            uniqueExercises.set(normalizedName, ex as Exercise);
        } else {
            // Keep the one with more content (e.g. video_url or description)
            const existing = uniqueExercises.get(normalizedName)!;
            // Prioritize ones with video/images, then ones with descriptions
            const existingScore = (existing.video_url ? 2 : 0) + (existing.image_url ? 2 : 0) + (existing.description ? 1 : 0);
            const currentScore = (ex.video_url ? 2 : 0) + (ex.image_url ? 2 : 0) + (ex.description ? 1 : 0);
            
            if (currentScore > existingScore) {
                uniqueExercises.set(normalizedName, ex as Exercise);
            }
        }
      });

      return Array.from(uniqueExercises.values());
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
  }

  /**
   * Create a new exercise in library (practitioner-specific)
   */
  static async createExercise(exercise: Exercise & { created_by: string }): Promise<{ success: boolean; exercise?: Exercise; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .insert({
          name: exercise.name,
          description: exercise.description,
          category: exercise.category,
          instructions: exercise.instructions,
          video_url: exercise.video_url,
          image_url: exercise.image_url,
          duration_minutes: exercise.duration_minutes || 10,
          difficulty_level: exercise.difficulty_level,
          muscle_groups: exercise.muscle_groups || [],
          equipment_needed: exercise.equipment_needed || [],
          contraindications: exercise.contraindications,
          created_by: exercise.created_by,
          is_system_exercise: false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, exercise: data as Exercise };
    } catch (error) {
      console.error('Error creating exercise:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create exercise'
      };
    }
  }

  /**
   * Create a home exercise program
   */
  static async createProgram(program: HomeExerciseProgram): Promise<{ success: boolean; programId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('home_exercise_programs')
        .insert({
          practitioner_id: program.practitioner_id,
          client_id: program.client_id,
          session_id: program.session_id || null,
          title: program.title,
          description: program.description,
          exercises: program.exercises,
          instructions: program.instructions,
          start_date: program.start_date || new Date().toISOString().split('T')[0],
          end_date: program.end_date || null,
          frequency_per_week: program.frequency_per_week || 3,
          status: program.status || 'active',
          delivered_via: program.delivered_via || 'messaging'
        })
        .select('id')
        .single();

      if (error) throw error;
      return { success: true, programId: data.id };
    } catch (error) {
      console.error('Error creating HEP program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create program'
      };
    }
  }

  /**
   * Get programs for a client
   */
  static async getClientPrograms(clientId: string, status?: HomeExerciseProgram['status']): Promise<HomeExerciseProgram[]> {
    try {
      let query = supabase
        .from('home_exercise_programs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as HomeExerciseProgram[];
    } catch (error) {
      console.error('Error fetching client programs:', error);
      return [];
    }
  }

  /**
   * Get programs created by a practitioner
   */
  static async getPractitionerPrograms(practitionerId: string, clientId?: string): Promise<HomeExerciseProgram[]> {
    try {
      let query = supabase
        .from('home_exercise_programs')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as HomeExerciseProgram[];
    } catch (error) {
      console.error('Error fetching practitioner programs:', error);
      return [];
    }
  }

  /**
   * Delete a program
   */
  static async deleteProgram(programId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('home_exercise_programs')
        .delete()
        .eq('id', programId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete program'
      };
    }
  }

  /**
   * Update program status
   */
  static async updateProgramStatus(programId: string, status: HomeExerciseProgram['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('home_exercise_programs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', programId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating program status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update program'
      };
    }
  }

  /**
   * Update program content (exercises, title, description, etc.)
   * Automatically creates a version before updating
   */
  static async updateProgram(
    programId: string, 
    updates: Partial<HomeExerciseProgram>,
    changedBy?: string,
    changeNotes?: string
  ): Promise<{ success: boolean; error?: string; versionNumber?: number }> {
    try {
      // Create version before updating (if changedBy is provided)
      let versionNumber: number | undefined;
      if (changedBy) {
        const { data: versionData, error: versionError } = await supabase.rpc('create_program_version', {
          p_program_id: programId,
          p_changed_by: changedBy,
          p_change_notes: changeNotes || null
        });

        if (versionError) {
          console.warn('Error creating program version:', versionError);
          // Continue with update even if versioning fails
        } else {
          versionNumber = versionData;
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.instructions !== undefined) updateData.instructions = updates.instructions;
      if (updates.exercises !== undefined) updateData.exercises = updates.exercises;
      if (updates.frequency_per_week !== undefined) updateData.frequency_per_week = updates.frequency_per_week;
      if (updates.start_date !== undefined) updateData.start_date = updates.start_date;
      if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { error } = await supabase
        .from('home_exercise_programs')
        .update(updateData)
        .eq('id', programId);

      if (error) throw error;
      return { success: true, versionNumber };
    } catch (error) {
      console.error('Error updating program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update program'
      };
    }
  }

  /**
   * Get program versions
   */
  static async getProgramVersions(programId: string): Promise<Array<{
    id: string;
    version_number: number;
    exercises: ProgramExercise[];
    title?: string;
    description?: string;
    instructions?: string;
    frequency_per_week?: number;
    changed_by?: string;
    changed_at: string;
    change_notes?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('home_exercise_program_versions')
        .select('*')
        .eq('program_id', programId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Error fetching program versions:', error);
      return [];
    }
  }

  /**
   * Detect exercise gaps (periods with no completions)
   */
  static async detectExerciseGaps(
    programId: string,
    gapThresholdDays: number = 7
  ): Promise<Array<{
    gap_start_date: string;
    gap_end_date: string;
    gap_days: number;
    expected_completions: number;
    actual_completions: number;
  }>> {
    try {
      const { data, error } = await supabase.rpc('detect_exercise_gaps', {
        p_program_id: programId,
        p_gap_threshold_days: gapThresholdDays
      });

      if (error) throw error;
      return (data || []) as any;
    } catch (error) {
      console.error('Error detecting exercise gaps:', error);
      return [];
    }
  }

  /**
   * Log exercise progress
   */
  static async logProgress(progress: ExerciseProgress): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if this exercise was already logged today
      const { data: existing } = await supabase
        .from('exercise_program_progress')
        .select('id')
        .eq('program_id', progress.program_id)
        .eq('client_id', progress.client_id)
        .eq('exercise_name', progress.exercise_name)
        .eq('completed_date', progress.completed_date)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: 'This exercise has already been logged for today. You can only log each exercise once per day.'
        };
      }

      // Infer session_id if not provided
      let sessionId = progress.session_id;
      if (!sessionId) {
        try {
          // Try to get session_id from the program
          const { data: program, error: programError } = await supabase
            .from('home_exercise_programs')
            .select('session_id')
            .eq('id', progress.program_id)
            .maybeSingle();

          if (programError) {
            console.warn('[HEPService] Error fetching program session_id:', programError);
          }

          if (program?.session_id) {
            sessionId = program.session_id;
            console.log('[HEPService] Using session_id from program:', sessionId);
          } else {
            // Find the most recent session before or on the completion date
            // Handle edge cases: no sessions, future dates, etc.
            const completionDate = new Date(progress.completed_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Only look for sessions if completion date is not in the future
            if (completionDate <= today) {
              const { data: recentSession, error: sessionError } = await supabase
                .from('client_sessions')
                .select('id, session_date')
                .eq('client_id', progress.client_id)
                .lte('session_date', progress.completed_date)
                .order('session_date', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (sessionError) {
                console.warn('[HEPService] Error fetching recent session:', sessionError);
              }

              if (recentSession?.id) {
                sessionId = recentSession.id;
                console.log('[HEPService] Using most recent session before completion date:', sessionId, 'session_date:', recentSession.session_date);
              } else {
                console.log('[HEPService] No session found before or on completion date:', progress.completed_date);
              }
            } else {
              console.log('[HEPService] Completion date is in the future, skipping session lookup:', progress.completed_date);
            }
          }
        } catch (error) {
          console.error('[HEPService] Error inferring session_id:', error);
          // Continue without session_id if inference fails
        }
      } else {
        console.log('[HEPService] Using provided session_id:', sessionId);
      }

      const { error } = await supabase
        .from('exercise_program_progress')
        .insert({
          program_id: progress.program_id,
          client_id: progress.client_id,
          exercise_id: progress.exercise_id || null,
          exercise_name: progress.exercise_name,
          completed_date: progress.completed_date,
          session_id: sessionId || null,
          sets_completed: progress.sets_completed || null,
          reps_completed: progress.reps_completed || null,
          duration_minutes: progress.duration_minutes || null,
          client_notes: progress.client_notes || null,
          pain_level: progress.pain_level || null,
          difficulty_rating: progress.difficulty_rating || null
        });

      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505') {
          return {
            success: false,
            error: 'This exercise has already been logged for today. You can only log each exercise once per day.'
          };
        }
        throw error;
      }
      return { success: true };
    } catch (error) {
      console.error('Error logging progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log progress'
      };
    }
  }

  /**
   * Get program adherence
   */
  static async getProgramAdherence(programId: string): Promise<{
    days_since_start: number;
    expected_completions: number;
    actual_completions: number;
    adherence_percent: number;
  } | null> {
    try {
      const { data, error } = await supabase.rpc('calculate_program_adherence', {
        p_program_id: programId
      });

      if (error) throw error;
      return data as any;
    } catch (error) {
      console.error('Error calculating adherence:', error);
      return null;
    }
  }

  /**
   * Get client exercise progress for practitioner view
   */
  static async getClientProgressForPractitioner(
    practitionerId: string,
    clientId: string
  ): Promise<{
    programs: Array<{
      program: HomeExerciseProgram;
      adherence: {
        days_since_start: number;
        expected_completions: number;
        actual_completions: number;
        adherence_percent: number;
      } | null;
      completions: ExerciseProgress[];
    }>;
  }> {
    try {
      // Get all programs for this client created by this practitioner
      const programs = await this.getPractitionerPrograms(practitionerId, clientId);

      // For each program, get adherence and completions with session information
      const programsWithProgress = await Promise.all(
        programs.map(async (program) => {
          const adherence = program.id ? await this.getProgramAdherence(program.id) : null;

          // Get all completions for this program with session information
          const { data: completions, error } = await supabase
            .from('exercise_program_progress')
            .select(`
              *,
              session:client_sessions (
                id,
                session_date,
                session_type,
                session_number
              )
            `)
            .eq('program_id', program.id!)
            .eq('client_id', clientId)
            .order('completed_date', { ascending: false })
            .order('completed_at', { ascending: false });

          if (error) {
            console.error('Error fetching completions:', error);
          }

          return {
            program,
            adherence,
            completions: (completions || []) as ExerciseProgress[]
          };
        })
      );

      return {
        programs: programsWithProgress
      };
    } catch (error) {
      console.error('Error fetching client progress:', error);
      return { programs: [] };
    }
  }

  /**
   * Deliver program to client via messaging
   */
  static async deliverProgram(programId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get program details
      const { data: program, error: programError } = await supabase
        .from('home_exercise_programs')
        .select('*, client:users!home_exercise_programs_client_id_fkey(first_name, last_name), practitioner:users!home_exercise_programs_practitioner_id_fkey(first_name, last_name)')
        .eq('id', programId)
        .single();

      if (programError || !program) {
        throw new Error('Program not found');
      }

      // Mark as delivered
      const { error: updateError } = await supabase
        .from('home_exercise_programs')
        .update({
          delivered_via: 'messaging',
          delivered_at: new Date().toISOString()
        })
        .eq('id', programId);

      if (updateError) throw updateError;

      // Send via messaging
      try {
        // Create conversation if needed
        // Check if conversation exists where practitioner is participant1 or participant2
        const { data: conversation1 } = await supabase
          .from('conversations')
          .select('id')
          .eq('participant1_id', program.practitioner_id)
          .eq('participant2_id', program.client_id)
          .maybeSingle();

        const { data: conversation2 } = await supabase
          .from('conversations')
          .select('id')
          .eq('participant1_id', program.client_id)
          .eq('participant2_id', program.practitioner_id)
          .maybeSingle();

        let conversationId = conversation1?.id || conversation2?.id;

        if (!conversationId) {
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              participant1_id: program.practitioner_id,
              participant2_id: program.client_id
            })
            .select('id')
            .single();

          if (convError) throw convError;
          conversationId = newConversation.id;
        }

        // Send message with program details
        const programSummary = `🏋️ **${program.title}**\n\n${program.description || ''}\n\n**Exercises:**\n${program.exercises.map((ex: any, i: number) => `${i + 1}. ${ex.name}${ex.sets && ex.reps ? ` - ${ex.sets} sets × ${ex.reps} reps` : ''}`).join('\n')}\n\n${program.instructions ? `**Instructions:**\n${program.instructions}` : ''}`;

        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: program.practitioner_id,
            content: programSummary,
            message_type: 'program'
          });

        if (messageError) throw messageError;
      } catch (messagingError) {
        console.warn('Failed to send via messaging (non-critical):', messagingError);
        // Don't fail the whole operation if messaging fails
      }

      return { success: true };
    } catch (error) {
      console.error('Error delivering program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deliver program'
      };
    }
  }
}

