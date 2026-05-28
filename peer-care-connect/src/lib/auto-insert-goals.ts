import { supabase } from '@/integrations/supabase/client';
import { extractGoalsFromSoap, ExtractedGoal, normalizeGoal } from '@/lib/goal-extraction';
import { toast } from 'sonner';

export interface AutoInsertResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

export interface AutoInsertOptions {
  skipDuplicates?: boolean; // Default: true
}

/**
 * Automatically extract and insert goals from SOAP notes
 * Goals are inserted only after practitioner approval (manual trigger)
 */
export async function autoInsertGoalsFromSOAP(
  sessionId: string,
  clientId: string,
  practitionerId: string,
  goals: ExtractedGoal[],
  options: AutoInsertOptions = {}
): Promise<AutoInsertResult> {
  const {
    skipDuplicates = true
  } = options;

  const result: AutoInsertResult = {
    inserted: 0,
    skipped: 0,
    errors: []
  };

  if (goals.length === 0) {
    return result;
  }

  try {
    // Normalize and validate all goals
    const normalizedGoals = goals.map(goal => normalizeGoal(goal));
    
    // Validate goals
    const validGoals: ExtractedGoal[] = [];
    for (const goal of normalizedGoals) {
      if (isValidGoal(goal)) {
        validGoals.push(goal);
      } else {
        result.errors.push(`Invalid goal: ${goal.goal_name} - validation failed`);
      }
    }

    if (validGoals.length === 0) {
      return result;
    }

    // Insert goals with duplicate checking
    const insertResults = await insertGoals(
      clientId,
      practitionerId,
      validGoals,
      skipDuplicates
    );

    result.inserted = insertResults.inserted;
    result.skipped = insertResults.skipped;
    result.errors.push(...insertResults.errors);

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error during goal insertion';
    result.errors.push(`Insertion failed: ${errorMessage}`);
    console.error('[autoInsertGoalsFromSOAP] Error:', error);
  }

  return result;
}

/**
 * Validate a goal before insertion
 */
function isValidGoal(goal: ExtractedGoal): boolean {
  // Check goal name is not empty
  if (!goal.goal_name || goal.goal_name.trim().length === 0) {
    return false;
  }

  // Check target_value is positive
  if (goal.target_value <= 0) {
    return false;
  }

  // Check target_value is a valid number
  if (isNaN(goal.target_value) || !isFinite(goal.target_value)) {
    return false;
  }

  // Check target_date is valid
  try {
    const date = new Date(goal.target_date);
    if (isNaN(date.getTime())) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Insert goals into database with duplicate checking
 */
async function insertGoals(
  clientId: string,
  practitionerId: string,
  goals: ExtractedGoal[],
  skipDuplicates: boolean
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const result = {
    inserted: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // Check for existing goals if skipDuplicates is enabled
  const goalsToInsert: ExtractedGoal[] = [];

  if (skipDuplicates) {
    for (const goal of goals) {
      try {
        // Check if goal already exists (same goal_name for same client)
        const { data: existing, error: checkError } = await supabase
          .from('progress_goals')
          .select('id')
          .eq('client_id', clientId)
          .eq('goal_name', goal.goal_name.trim())
          .eq('status', 'active')
          .limit(1);

        if (checkError) {
          console.warn('[insertGoals] Error checking for duplicate:', checkError);
          // Continue anyway - better to try insert than skip
          goalsToInsert.push(goal);
        } else if (existing && existing.length > 0) {
          result.skipped++;
        } else {
          goalsToInsert.push(goal);
        }
      } catch (error) {
        console.warn('[insertGoals] Error checking duplicate, proceeding with insert:', error);
        goalsToInsert.push(goal);
      }
    }
  } else {
    goalsToInsert.push(...goals);
  }

  if (goalsToInsert.length === 0) {
    return result;
  }

  // Prepare inserts - map to database schema
  const inserts = goalsToInsert.map(goal => ({
    client_id: clientId,
    practitioner_id: practitionerId,
    goal_name: goal.goal_name.trim(),
    description: goal.description.trim() || '',
    target_value: goal.target_value,
    current_value: 0, // Start at 0, will be updated as progress is made
    target_date: goal.target_date,
    status: 'active' as const
  }));

  // Insert goals with error handling per goal
  try {
    const { data, error } = await supabase
      .from('progress_goals')
      .insert(inserts)
      .select();

    if (error) {
      // Try inserting one by one to identify which ones fail
      for (const insert of inserts) {
        try {
          const { error: singleError } = await supabase
            .from('progress_goals')
            .insert(insert)
            .select()
            .single();

          if (singleError) {
            // Check if it's a duplicate error
            if (singleError.code === '23505' || singleError.message?.includes('duplicate')) {
              result.skipped++;
            } else {
              result.errors.push(`Failed to insert ${insert.goal_name}: ${singleError.message}`);
            }
          } else {
            result.inserted++;
          }
        } catch (singleError: any) {
          result.errors.push(`Failed to insert ${insert.goal_name}: ${singleError.message || 'Unknown error'}`);
        }
      }
    } else {
      result.inserted = data?.length || 0;
    }
  } catch (error: any) {
    result.errors.push(`Bulk insert failed: ${error.message || 'Unknown error'}`);
    console.error('[insertGoals] Bulk insert error:', error);
  }

  return result;
}

/**
 * Show user-friendly toast notifications based on results
 */
export function showAutoInsertResults(result: AutoInsertResult): void {
  if (result.inserted > 0) {
    toast.success(
      `${result.inserted} goal${result.inserted !== 1 ? 's' : ''} added to Progress. View in the Progress tab.`,
      {
        duration: 4000
      }
    );
  }

  if (result.skipped > 0) {
    toast.info(
      `${result.skipped} goal${result.skipped !== 1 ? 's' : ''} skipped (already exists)`,
      {
        duration: 2000
      }
    );
  }

  if (result.errors.length > 0) {
    console.error('[showAutoInsertResults] Errors:', result.errors);
    // Don't show all errors to user, just log them
    if (result.inserted === 0) {
      toast.error('Failed to add goals to Progress', {
        duration: 3000
      });
    }
  }
}

