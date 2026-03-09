import { ProgressMetric } from './types/progress';
import { HomeExerciseProgram } from './hep-service';

export interface Session {
  id: string;
  session_date: string;
  session_number?: number;
}

/**
 * Determines which session a metric belongs to based on date ranges.
 * This matches the logic used in TheramateTimeline for consistent data association.
 * 
 * @param metric - The progress metric to associate
 * @param sessions - Array of sessions sorted by date
 * @returns The session ID the metric belongs to, or null if it doesn't belong to any session
 */
export function getSessionForMetric(
  metric: ProgressMetric,
  sessions: Session[]
): string | null {
  // If metric has a session_id, use it directly
  if (metric.session_id) {
    return metric.session_id;
  }

  // If no session_date on metric, can't associate it
  if (!metric.session_date) {
    return null;
  }

  // If no sessions provided, can't associate
  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Sort sessions by date to ensure correct order
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

  const metricDate = new Date(metric.session_date).toISOString().split('T')[0];

  // Find which session period this metric belongs to
  // A metric belongs to a session if it's recorded on or after the session date,
  // but before the next session date
  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const nextSession = sortedSessions[i + 1];
    
    const sessionDate = new Date(session.session_date).toISOString().split('T')[0];
    const nextSessionDate = nextSession 
      ? new Date(nextSession.session_date).toISOString().split('T')[0]
      : null;

    // Metric must be on or after this session date
    if (metricDate >= sessionDate) {
      // If there's a next session, metric must be before that session date
      if (nextSessionDate) {
        if (metricDate < nextSessionDate) {
          return session.id;
        }
        // If metric date is >= next session date, continue to next iteration
        continue;
      }
      // If no next session, metric belongs to this session (it's the last session)
      return session.id;
    }
  }

  return null;
}

/**
 * Filters metrics that belong to a specific session.
 * Uses the same association logic as TheramateTimeline.
 * 
 * @param metrics - Array of progress metrics
 * @param sessionId - The session ID to filter by
 * @param sessions - Array of all sessions
 * @returns Filtered array of metrics belonging to the specified session
 */
export function filterMetricsBySession(
  metrics: ProgressMetric[],
  sessionId: string,
  sessions: Session[]
): ProgressMetric[] {
  if (!sessions || sessions.length === 0) {
    // If no sessions, only return metrics with matching session_id
    return metrics.filter(m => m.session_id === sessionId);
  }

  const filtered = metrics.filter(metric => {
    const associatedSessionId = getSessionForMetric(metric, sessions);
    return associatedSessionId === sessionId;
  });

  // Debug logging for troubleshooting
  if (filtered.length === 0 && metrics.length > 0) {
    const selectedSession = sessions.find(s => s.id === sessionId);
    console.log('[filterMetricsBySession] No metrics matched:', {
      sessionId,
      sessionDate: selectedSession?.session_date,
      totalMetrics: metrics.length,
      sessionsCount: sessions.length,
      sampleMetrics: metrics.slice(0, 3).map(m => ({
        id: m.id,
        session_id: m.session_id,
        session_date: m.session_date,
        type: m.metric_type,
        associatedSession: getSessionForMetric(m, sessions)
      }))
    });
  }

  return filtered;
}

/**
 * Gets the date range for a session (from session date to next session date).
 * Used for determining which metrics/items belong to a session period.
 * 
 * @param sessionId - The session ID
 * @param sessions - Array of all sessions
 * @returns Object with startDate and endDate, or null if session not found
 */
export function getSessionDateRange(
  sessionId: string,
  sessions: Session[]
): { startDate: string; endDate: string | null } | null {
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

  const sessionIndex = sortedSessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) return null;

  const session = sortedSessions[sessionIndex];
  const nextSession = sortedSessions[sessionIndex + 1];

  return {
    startDate: session.session_date,
    endDate: nextSession?.session_date || null
  };
}

/**
 * Gets the delivery date for an exercise program (HEP).
 * Matches the logic used in TheramateTimeline.
 * 
 * @param program - The home exercise program
 * @returns The delivery date as a string (YYYY-MM-DD format)
 */
export function getHEPDeliveryDate(program: HomeExerciseProgram): string {
  if (program.delivered_at) {
    return program.delivered_at.split('T')[0];
  }
  if (program.created_at) {
    return program.created_at.split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Determines which session an exercise program (HEP) belongs to based on date ranges.
 * This matches the logic used in TheramateTimeline for consistent data association.
 * 
 * @param program - The home exercise program to associate
 * @param sessions - Array of sessions sorted by date
 * @returns The session ID the program belongs to, or null if it doesn't belong to any session
 */
export function getSessionForHEP(
  program: HomeExerciseProgram,
  sessions: Session[]
): string | null {
  // If program has a session_id, use it directly
  if (program.session_id) {
    return program.session_id;
  }

  // Get the delivery date
  const deliveryDate = getHEPDeliveryDate(program);
  if (!deliveryDate) {
    return null;
  }

  // Sort sessions by date to ensure correct order
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

  const programDate = new Date(deliveryDate).toISOString().split('T')[0];

  // Find which session period this program belongs to
  // A program belongs to a session if it's delivered on or after the session date,
  // but before the next session date
  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const nextSession = sortedSessions[i + 1];
    
    const sessionDate = new Date(session.session_date).toISOString().split('T')[0];
    const nextSessionDate = nextSession 
      ? new Date(nextSession.session_date).toISOString().split('T')[0]
      : null;

    // Program must be on or after this session date
    if (programDate >= sessionDate) {
      // If there's a next session, program must be before that session date
      if (nextSessionDate && programDate < nextSessionDate) {
        return session.id;
      }
      // If no next session, program belongs to this session
      if (!nextSessionDate) {
        return session.id;
      }
    }
  }

  return null;
}

/**
 * Filters exercise programs (HEPs) that belong to a specific session.
 * Uses the same association logic as TheramateTimeline.
 * 
 * @param programs - Array of home exercise programs
 * @param sessionId - The session ID to filter by
 * @param sessions - Array of all sessions
 * @returns Filtered array of programs belonging to the specified session
 */
export function filterHEPsBySession(
  programs: HomeExerciseProgram[],
  sessionId: string,
  sessions: Session[]
): HomeExerciseProgram[] {
  return programs.filter(program => {
    const associatedSessionId = getSessionForHEP(program, sessions);
    return associatedSessionId === sessionId;
  });
}

/**
 * Helper to convert a SessionNote with HEP data to HomeExerciseProgram format.
 * Used for filtering HEPs from session notes.
 */
export interface SessionNoteWithHEP {
  id: string;
  session_id?: string;
  session_date: string;
  note_type: string;
  program_id?: string;
  hep_data?: HomeExerciseProgram;
  delivered_at?: string;
  created_at?: string;
}

/**
 * Determines which session a SessionNote (HEP) belongs to.
 * Works with the SessionNote structure used in MySessions.
 * 
 * @param note - The session note containing HEP data
 * @param sessions - Array of sessions sorted by date
 * @returns The session ID the note belongs to, or null if it doesn't belong to any session
 */
export function getSessionForHEPNote(
  note: SessionNoteWithHEP,
  sessions: Session[]
): string | null {
  // If note has a session_id, use it directly
  if (note.session_id) {
    return note.session_id;
  }

  // Get the delivery date from hep_data or note fields
  let deliveryDate: string | null = null;
  
  if (note.hep_data) {
    deliveryDate = getHEPDeliveryDate(note.hep_data);
  } else if (note.delivered_at) {
    deliveryDate = note.delivered_at.split('T')[0];
  } else if (note.session_date) {
    deliveryDate = note.session_date.split('T')[0];
  } else if (note.created_at) {
    deliveryDate = note.created_at.split('T')[0];
  }

  if (!deliveryDate) {
    return null;
  }

  // Sort sessions by date to ensure correct order
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
  );

  const noteDate = new Date(deliveryDate).toISOString().split('T')[0];

  // Find which session period this note belongs to
  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];
    const nextSession = sortedSessions[i + 1];
    
    const sessionDate = new Date(session.session_date).toISOString().split('T')[0];
    const nextSessionDate = nextSession 
      ? new Date(nextSession.session_date).toISOString().split('T')[0]
      : null;

    // Note must be on or after this session date
    if (noteDate >= sessionDate) {
      // If there's a next session, note must be before that session date
      if (nextSessionDate && noteDate < nextSessionDate) {
        return session.id;
      }
      // If no next session, note belongs to this session
      if (!nextSessionDate) {
        return session.id;
      }
    }
  }

  return null;
}

/**
 * Filters SessionNotes (HEPs) that belong to a specific session.
 * Uses the same association logic as TheramateTimeline.
 * 
 * @param notes - Array of session notes
 * @param sessionId - The session ID to filter by
 * @param sessions - Array of all sessions
 * @returns Filtered array of HEP notes belonging to the specified session
 */
export function filterHEPNotesBySession<T extends SessionNoteWithHEP>(
  notes: T[],
  sessionId: string,
  sessions: Session[]
): T[] {
  return notes.filter(note => {
    // Only filter HEP notes
    if (note.note_type !== 'hep') return false;
    
    const associatedSessionId = getSessionForHEPNote(note, sessions);
    return associatedSessionId === sessionId;
  });
}

