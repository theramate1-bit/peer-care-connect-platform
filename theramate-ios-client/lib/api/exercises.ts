import { supabase } from "@/lib/supabase";

export type ProgramExercise = {
  id: string;
  name: string;
  sets: number | null;
  reps: number | null;
  duration_minutes: number | null;
  instructions: string | null;
};

export type HomeExerciseProgram = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  session_id: string | null;
  created_at: string | null;
  exercises: ProgramExercise[];
};

function normalizeExercises(raw: unknown): ProgramExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx): ProgramExercise | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const nameVal = row.name ?? row.title ?? row.exercise_name;
      const name =
        typeof nameVal === "string" ? nameVal : `Exercise ${idx + 1}`;
      const idVal = row.id;
      const id = typeof idVal === "string" ? idVal : `local-${idx + 1}`;
      const sets = typeof row.sets === "number" ? row.sets : null;
      const reps = typeof row.reps === "number" ? row.reps : null;
      const duration =
        typeof row.duration_minutes === "number" ? row.duration_minutes : null;
      const instructions =
        typeof row.instructions === "string" ? row.instructions : null;
      return { id, name, sets, reps, duration_minutes: duration, instructions };
    })
    .filter((x): x is ProgramExercise => !!x);
}

function mapProgramRow(row: Record<string, unknown>): HomeExerciseProgram {
  return {
    id: String(row.id),
    title: String(row.title || "Exercise Program"),
    description: (row.description as string | null) ?? null,
    instructions: (row.instructions as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    frequency_per_week:
      typeof row.frequency_per_week === "number"
        ? row.frequency_per_week
        : null,
    session_id: (row.session_id as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    exercises: normalizeExercises(row.exercises),
  };
}

export async function fetchHomeExercisePrograms(clientId: string): Promise<{
  data: HomeExerciseProgram[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("home_exercise_programs")
      .select(
        "id, title, description, instructions, status, start_date, end_date, frequency_per_week, session_id, created_at, exercises",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as Record<string, unknown>[];
    return { data: rows.map(mapProgramRow), error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function fetchHomeExerciseProgramById(params: {
  clientId: string;
  programId: string;
}): Promise<{ data: HomeExerciseProgram | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("home_exercise_programs")
      .select(
        "id, title, description, instructions, status, start_date, end_date, frequency_per_week, session_id, created_at, exercises",
      )
      .eq("client_id", params.clientId)
      .eq("id", params.programId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { data: null, error: null };
    return {
      data: mapProgramRow(data as Record<string, unknown>),
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}

export async function fetchProgramCompletionCount(params: {
  clientId: string;
  programId: string;
}): Promise<{ count: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from("exercise_program_progress")
      .select("*", { count: "exact", head: true })
      .eq("client_id", params.clientId)
      .eq("program_id", params.programId);
    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { count: 0, error: err };
  }
}

export async function markExerciseCompleted(params: {
  clientId: string;
  programId: string;
  exercise: ProgramExercise;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const payload: Record<string, unknown> = {
      program_id: params.programId,
      client_id: params.clientId,
      exercise_id: params.exercise.id.startsWith("local-")
        ? null
        : params.exercise.id,
      exercise_name: params.exercise.name,
      completed_date: today,
      completed_at: new Date().toISOString(),
      sets_completed: params.exercise.sets ?? null,
      reps_completed: params.exercise.reps ?? null,
      duration_minutes: params.exercise.duration_minutes ?? null,
      client_notes: null,
    };
    const { error } = await supabase
      .from("exercise_program_progress")
      .insert(payload);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
  }
}
