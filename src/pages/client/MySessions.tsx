import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Star, 
  MessageSquare, 
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  CalendarPlus,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Filter,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatTimeWithoutSeconds } from '@/lib/date';
import { MessagingManager } from '@/lib/messaging';
import { PrivateRatingModal } from '@/components/reviews/PrivateRatingModal';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';
import { HEPService, HomeExerciseProgram } from '@/lib/hep-service';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { RebookingService } from '@/lib/rebooking-service';
import { filterHEPNotesBySession } from '@/lib/session-metrics-association';
import { filterSessions as filterSessionsUtil, getUniquePractitioners } from '@/lib/my-sessions-filters';
import { getDisplaySessionStatus, isClientSessionVisible } from '@/lib/session-display-status';
import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-loaders';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Session {
  id: string;
  therapist_id: string;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  price: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'pending_payment';
  payment_status: 'pending' | 'paid' | 'failed' | 'completed';
  notes: string;
  created_at: string;
  therapist: {
    first_name: string;
    last_name: string;
    user_role: string;
    location: string;
    hourly_rate: number;
  };
}

interface SessionNote {
  id: string;
  session_id?: string;
  practitioner_name: string;
  session_date: string;
  note_type: string;
  content?: string; // Content for treatment notes
  created_at: string;
  updated_at: string;
  program_id?: string;
  hep_data?: HomeExerciseProgram;
}

const MySessions = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [ratingSession, setRatingSession] = useState<Session | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [sessionRatings, setSessionRatings] = useState<Record<string, any>>({});
  
  // Notes state
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const hasFetchedNotes = useRef(false);
  
  // Exercise program completion state (program_id -> isCompleted)
  const [programCompletions, setProgramCompletions] = useState<Record<string, boolean>>({});
  const [completionLoading, setCompletionLoading] = useState<Record<string, boolean>>({});
  
  // Expanded sessions state (track which session cards have notes expanded)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  // Booking flow state
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
  const [rebookingData, setRebookingData] = useState<{
    rebookingData: any;
    nextSlot: any;
  } | null>(null);
  
  const sessionIdParam = searchParams.get('sessionId');

  // Filter state (synced to URL for persistence)
  const filterPractitioner = searchParams.get('practitioner') ?? '';
  const filterDate = (searchParams.get('date') as 'this_month' | 'last_3_months' | 'all_time') ?? 'all_time';
  const filterStatus = (searchParams.get('status') as 'all' | 'completed' | 'scheduled' | 'cancelled') ?? 'all';

  const setFilters = (updates: { practitioner?: string; date?: string; status?: string }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (updates.practitioner !== undefined) (updates.practitioner ? next.set('practitioner', updates.practitioner) : next.delete('practitioner'));
      if (updates.date !== undefined) (updates.date && updates.date !== 'all_time' ? next.set('date', updates.date) : next.delete('date'));
      if (updates.status !== undefined) (updates.status && updates.status !== 'all' ? next.set('status', updates.status) : next.delete('status'));
      return next;
    });
  };

  const clearFilters = () => setFilters({ practitioner: '', date: 'all_time', status: 'all' });
  const hasActiveFilters = !!filterPractitioner || filterDate !== 'all_time' || filterStatus !== 'all';

  // Toggle expanded state for a session
  const toggleSessionNotes = (sessionId: string) => {
    setExpandedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };
  
  // Get notes for a specific session
  // SOAP note type order for proper sorting
  const getSOAPOrder = (noteType: string): number => {
    const order: Record<string, number> = {
      'subjective': 1,
      'objective': 2,
      'assessment': 3,
      'plan': 4,
      'data': 1, // DAP format - Data comes first
      'general': 5 // General notes come last
    };
    return order[noteType.toLowerCase()] || 99; // Unknown types go to the end
  };

  // Separate HEPs from treatment notes for a session
  // Uses the same association logic as TheramateTimeline for consistency
  const getSessionHEPs = (sessionId: string, sessionDate?: string): SessionNote[] => {
    // Use the shared utility function to filter HEPs by session
    const filteredHEPs = filterHEPNotesBySession(notes, sessionId, sessions);
    
    // Deduplicate by program_id to prevent showing the same HEP twice
    const seenProgramIds = new Set<string>();
    return filteredHEPs.filter(hep => {
      if (hep.program_id) {
        if (seenProgramIds.has(hep.program_id)) {
          return false; // Already seen this program
        }
        seenProgramIds.add(hep.program_id);
        return true;
      }
      return true; // Keep HEPs without program_id (shouldn't happen, but safe)
    });
  };

  // Real-time subscription for sessions
  const { data: realtimeSessions } = useRealtimeSubscription(
    'client_sessions',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time session update:', payload);
      if (user) {
        loadSessions();
      }
    }
  );

  // Real-time subscription for treatment notes
  const { data: realtimeNotes } = useRealtimeSubscription(
    'treatment_notes',
    `client_id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('Real-time notes update:', payload);
      if (userProfile) {
        // Immediately update local state for real-time feel
        if (payload.eventType === 'INSERT' && payload.new) {
          const newNote: SessionNote = {
            id: payload.new.id,
            session_id: payload.new.session_id || undefined,
            practitioner_name: 'Practitioner', // Will be updated on next fetch
            session_date: payload.new.created_at,
            note_type: payload.new.note_type,
            content: payload.new.content || '',
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at || payload.new.created_at
          };
          setNotes(prev => {
            // Check if note already exists to avoid duplicates
            if (prev.some(n => n.id === newNote.id)) {
              return prev.map(n => n.id === newNote.id ? newNote : n);
            }
            return [newNote, ...prev];
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setNotes(prev => 
            prev.map(note => 
              note.id === payload.new.id 
                ? { ...note, content: payload.new.content || '', updated_at: payload.new.updated_at || note.updated_at }
                : note
            )
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setNotes(prev => prev.filter(note => note.id !== payload.old.id));
        }
        // Also refresh to get practitioner names and session details
        fetchNotes();
      }
    }
  );

  useEffect(() => {
    if (user) {
      loadSessions();
      fetchSessionRatings();
    }
  }, [user]);

  useEffect(() => {
    if (userProfile && !hasFetchedNotes.current) {
      hasFetchedNotes.current = true;
      fetchNotes();
    }
  }, [userProfile]);

  // Real-time subscription for exercise program progress
  useRealtimeSubscription(
    'exercise_program_progress',
    userProfile?.id ? `client_id=eq.${userProfile.id}` : '',
    (payload) => {
      console.log('Real-time exercise progress update:', payload);
      if (userProfile && notes.length > 0) {
        // Refresh completion status when progress changes
        const hepNotes = notes.filter(note => note.note_type === 'hep' && note.program_id);
        fetchProgramCompletions(hepNotes);
      }
    }
  );

  // Auto-expand session notes if sessionId is in URL params
  useEffect(() => {
    if (sessionIdParam && notes.length > 0) {
      // Expand the session card if it has notes
      const sessionNotes = notes.filter(note => note.session_id === sessionIdParam);
      if (sessionNotes.length > 0 && !expandedSessions.has(sessionIdParam)) {
        setExpandedSessions(prev => new Set(prev).add(sessionIdParam));
      }
    }
  }, [sessionIdParam, notes, expandedSessions]);

  // Open review modal when navigated from booking success with ?sessionId=...&prompt=review
  useEffect(() => {
    const reviewPrompt = searchParams.get('prompt') === 'review';
    if (!sessionIdParam || !reviewPrompt || sessionsLoading || sessions.length === 0) return;
    const sessionToRate = sessions.find(s => s.id === sessionIdParam);
    if (sessionToRate) {
      setRatingSession(sessionToRate);
      setRatingOpen(true);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('prompt');
        return next;
      });
    }
  }, [sessionIdParam, searchParams, sessionsLoading, sessions]);

  const fetchSessionRatings = async () => {
    if (!user?.id) return;

    try {
      // Fetch ratings from practitioner_ratings table
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('practitioner_ratings')
        .select('session_id, rating, review_text, created_at')
        .eq('client_id', user.id);

      if (ratingsError && ratingsError.code !== 'PGRST116') {
        console.error('Error fetching ratings:', ratingsError);
      }

      // Also check session_feedback table as fallback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('session_feedback')
        .select('session_id, rating, feedback, created_at')
        .eq('client_id', user.id);

      if (feedbackError && feedbackError.code !== 'PGRST116') {
        console.error('Error fetching feedback:', feedbackError);
      }

      // Combine both sources, prioritizing practitioner_ratings
      const ratingsMap: Record<string, any> = {};
      
      if (ratingsData) {
        ratingsData.forEach((rating: any) => {
          if (rating.session_id) {
            ratingsMap[rating.session_id] = {
              rating: rating.rating,
              review_text: rating.review_text,
              feedback: rating.review_text,
              created_at: rating.created_at
            };
          }
        });
      }

      if (feedbackData) {
        feedbackData.forEach((feedback: any) => {
          if (feedback.session_id && !ratingsMap[feedback.session_id]) {
            ratingsMap[feedback.session_id] = {
              rating: feedback.rating,
              feedback: feedback.feedback,
              created_at: feedback.created_at
            };
          }
        });
      }

      setSessionRatings(ratingsMap);
    } catch (error) {
      console.error('Error fetching session ratings:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      
      const { data, error } = await supabase
        .from('client_sessions')
        .select(`
          id,
          therapist_id,
          client_id,
          client_name,
          client_email,
          session_date,
          start_time,
          duration_minutes,
          session_type,
          price,
          status,
          payment_status,
          notes,
          created_at
        `)
        .eq('client_id', user?.id)
        .order('session_date', { ascending: false });

      if (error) throw error;

      // Deduplicate sessions by id (in case of any duplicates)
      const uniqueSessionsMap = new Map<string, typeof data[0]>();
      (data || []).forEach(session => {
        if (!uniqueSessionsMap.has(session.id)) {
          uniqueSessionsMap.set(session.id, session);
        }
      });
      const uniqueSessions = Array.from(uniqueSessionsMap.values());
      const visibleSessions = uniqueSessions.filter((session) => isClientSessionVisible(session));

      // Get therapist details for each session
      const sessionsWithTherapists = await Promise.all(
        visibleSessions.map(async (session) => {
          const { data: therapist, error: therapistError } = await supabase
            .from('users')
            .select('first_name, last_name, user_role, location, hourly_rate')
            .eq('id', session.therapist_id)
            .maybeSingle();

          if (therapistError || !therapist) {
            console.error('Error loading therapist:', therapistError);
            return {
              ...session,
              therapist: {
                first_name: 'Unknown',
                last_name: 'Therapist',
                user_role: 'unknown',
                location: 'Unknown',
                hourly_rate: 0
              }
            };
          }

          return {
            ...session,
            therapist
          };
        })
      );

      setSessions(sessionsWithTherapists);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      const errorMessage = error?.message || 'Failed to load sessions';
      toast.error('Failed to load sessions', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => loadSessions()
        },
        duration: 5000
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchNotes = async () => {
    if (!userProfile?.id) {
      console.warn('Cannot fetch notes: userProfile.id is missing');
      setNotesLoading(false);
      return;
    }
    
    try {
      setNotesLoading(true);
      
      // Fetch treatment notes - fetch without join first to avoid RLS issues
      const { data: treatmentNotesData, error: treatmentNotesError } = await supabase
        .from('treatment_notes')
        .select(`
          id,
          session_id,
          note_type,
          content,
          created_at,
          updated_at,
          practitioner_id
        `)
        .eq('client_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (treatmentNotesError) {
        console.error('Error fetching treatment notes:', {
          error: treatmentNotesError,
          message: treatmentNotesError.message,
          details: treatmentNotesError.details,
          hint: treatmentNotesError.hint,
          code: treatmentNotesError.code
        });
        toast.error(`Failed to load treatment notes: ${treatmentNotesError.message || 'Unknown error'}`);
        setNotesLoading(false);
        return;
      }
      
      // Treatment notes are fetched but not displayed to clients (only HEPs are shown)

      // Fetch HEPs (Home Exercise Programs / Exercise Prescription Sheets)
      const heps = await HEPService.getClientPrograms(userProfile.id);
      
      // Debug: Log HEPs to check for duplicates
      console.log('[MySessions] Fetched HEPs:', heps.length, 'programs');
      const hepIds = heps.map(h => h.id);
      const duplicateIds = hepIds.filter((id, index) => hepIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('[MySessions] Found duplicate HEP IDs from database:', duplicateIds);
      }
      
      // Check for duplicate content (same title, exercises, practitioner, client)
      const hepContentMap = new Map<string, string[]>();
      heps.forEach(hep => {
        const contentKey = `${hep.practitioner_id}-${hep.client_id}-${hep.title}-${JSON.stringify(hep.exercises)}`;
        if (!hepContentMap.has(contentKey)) {
          hepContentMap.set(contentKey, []);
        }
        hepContentMap.get(contentKey)!.push(hep.id || 'no-id');
      });
      
      const duplicateContent = Array.from(hepContentMap.entries()).filter(([_, ids]) => ids.length > 1);
      if (duplicateContent.length > 0) {
        console.warn('[MySessions] Found HEPs with duplicate content (same title/exercises):', duplicateContent);
      }

      // Get all practitioner IDs (from both treatment notes and HEPs)
      const treatmentPractitionerIds = [...new Set(treatmentNotesData?.map(note => note.practitioner_id) || [])];
      const hepPractitionerIds = [...new Set(heps.map(hep => hep.practitioner_id))];
      const allPractitionerIds = [...new Set([...treatmentPractitionerIds, ...hepPractitionerIds])];

      // Fetch practitioner details
      const { data: practitioners, error: practitionersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', allPractitionerIds);

      if (practitionersError) {
        console.error('Error fetching practitioners:', practitionersError);
      }

      const practitionerMap = new Map(practitioners?.map(p => [p.id, p]) || []);

      // Fetch session details for notes that have session_id
      const sessionIds = [...new Set((treatmentNotesData || [])
        .filter(note => note.session_id)
        .map(note => note.session_id))];
      
      let sessionMap = new Map();
      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('client_sessions')
          .select('id, session_date, start_time, duration_minutes, session_type')
          .in('id', sessionIds)
          .eq('client_id', userProfile.id);
        
        if (sessionsData) {
          sessionMap = new Map(sessionsData.map(s => [s.id, s]));
        }
      }

      // Format treatment notes - preserve all content including empty strings
      const formattedTreatmentNotes: SessionNote[] = (treatmentNotesData || []).map(note => {
        const practitioner = practitionerMap.get(note.practitioner_id);
        const session = note.session_id ? sessionMap.get(note.session_id) : null;
        return {
          id: note.id,
          session_id: note.session_id || undefined, // Ensure session_id is set correctly
          practitioner_name: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unknown Practitioner',
          session_date: session?.session_date || note.created_at,
          note_type: note.note_type,
          content: note.content || '', // Include the note content, default to empty string if null
          created_at: note.created_at,
          updated_at: note.updated_at
        };
      });
      
      // Note: Treatment notes are fetched but not displayed to clients (only HEPs are shown)

      // Format HEPs as notes
      const formattedHEPNotes: SessionNote[] = heps.map(hep => {
        const practitioner = practitionerMap.get(hep.practitioner_id);
        return {
          id: `hep-${hep.id}`,
          program_id: hep.id,
          session_id: hep.session_id || undefined, // Preserve session_id so HEPs show in session cards
          practitioner_name: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unknown Practitioner',
          session_date: hep.start_date || hep.created_at || new Date().toISOString(),
          note_type: 'hep',
          created_at: hep.created_at || new Date().toISOString(),
          updated_at: hep.updated_at || new Date().toISOString(),
          hep_data: hep
        };
      });

      // Combine and sort by created_at (most recent first)
      // Deduplicate HEPs by program_id AND by content to prevent showing the same HEP twice
      // This handles cases where the same HEP might exist with different database IDs
      const seenHEPIds = new Map<string, SessionNote>();
      const seenHEPContent = new Map<string, SessionNote>(); // Track by content hash for additional deduplication
      
      formattedHEPNotes.forEach(hep => {
        // Create a content hash based on title, exercises, and client_id to catch duplicates even with different IDs
        const contentHash = `${hep.practitioner_name}-${hep.session_date}-${hep.hep_data?.title || ''}-${JSON.stringify(hep.hep_data?.exercises || [])}`;
        
        // First check by program_id (primary deduplication)
        if (hep.program_id) {
          const existing = seenHEPIds.get(hep.program_id);
          if (!existing) {
            // Check if we've seen this content before (secondary deduplication)
            const existingByContent = seenHEPContent.get(contentHash);
            if (!existingByContent) {
              // First occurrence - keep it
              seenHEPIds.set(hep.program_id, hep);
              seenHEPContent.set(contentHash, hep);
            } else {
              // Same content but different program_id - prefer the one with session_id or most recent
              const shouldReplace = 
                (!existingByContent.session_id && hep.session_id) || // New one has session_id, old doesn't
                (existingByContent.session_id && hep.session_id && new Date(hep.created_at) > new Date(existingByContent.created_at)) || // Both have session_id, new is more recent
                (!existingByContent.session_id && !hep.session_id && new Date(hep.created_at) > new Date(existingByContent.created_at)); // Neither has session_id, new is more recent
            
              if (shouldReplace) {
                // Remove old entry and add new one
                if (existingByContent.program_id) {
                  seenHEPIds.delete(existingByContent.program_id);
                }
                seenHEPIds.set(hep.program_id, hep);
                seenHEPContent.set(contentHash, hep);
              }
            }
          } else {
            // Duplicate program_id found - keep the one with session_id if available, or most recent
            const shouldReplace = 
              (!existing.session_id && hep.session_id) || // New one has session_id, old doesn't
              (existing.session_id && hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)) || // Both have session_id, new is more recent
              (!existing.session_id && !hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)); // Neither has session_id, new is more recent
            
            if (shouldReplace) {
              seenHEPIds.set(hep.program_id, hep);
              seenHEPContent.set(contentHash, hep);
            }
          }
        } else {
          // HEP without program_id - check by content only
          const existingByContent = seenHEPContent.get(contentHash);
          if (!existingByContent) {
            seenHEPContent.set(contentHash, hep);
          } else {
            // Duplicate content - prefer one with session_id or most recent
            const shouldReplace = 
              (!existingByContent.session_id && hep.session_id) ||
              (existingByContent.session_id && hep.session_id && new Date(hep.created_at) > new Date(existingByContent.created_at)) ||
              (!existingByContent.session_id && !hep.session_id && new Date(hep.created_at) > new Date(existingByContent.created_at));
            
            if (shouldReplace) {
              seenHEPContent.set(contentHash, hep);
            }
          }
        }
      });
      
      // Get unique HEPs - combine both maps, preferring entries from seenHEPIds (by program_id)
      // Also include HEPs from seenHEPContent that don't have a program_id match
      const uniqueHEPNotesById = Array.from(seenHEPIds.values());
      const uniqueHEPNotesByContent = Array.from(seenHEPContent.values()).filter(hep => {
        // Only include if it's not already in the by-ID list
        return !hep.program_id || !seenHEPIds.has(hep.program_id);
      });
      const uniqueHEPNotes = [...uniqueHEPNotesById, ...uniqueHEPNotesByContent];

      const allNotes = [...formattedTreatmentNotes, ...uniqueHEPNotes].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotes(allNotes);

      // Fetch exercise program completion status
      await fetchProgramCompletions(uniqueHEPNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Fetch completion status for exercise programs
  const fetchProgramCompletions = async (hepNotes: SessionNote[]) => {
    if (!userProfile?.id) return;

    try {
      const programIds = hepNotes
        .filter(note => note.program_id)
        .map(note => note.program_id!);

      if (programIds.length === 0) {
        setProgramCompletions({});
        return;
      }

      // For each program, check if all exercises have been completed today
      const today = new Date().toISOString().split('T')[0];
      const completions: Record<string, boolean> = {};

      for (const programId of programIds) {
        const hepNote = hepNotes.find(n => n.program_id === programId);
        if (!hepNote?.hep_data?.exercises) continue;

        const exerciseCount = hepNote.hep_data.exercises.length;
        if (exerciseCount === 0) {
          completions[programId] = false;
          continue;
        }

        // Check if all exercises in the program have been completed today
        const { data: progressData, error } = await supabase
          .from('exercise_program_progress')
          .select('exercise_name, exercise_id')
          .eq('program_id', programId)
          .eq('client_id', userProfile.id)
          .eq('completed_date', today);

        if (error) {
          console.error('Error fetching program completion:', error);
          completions[programId] = false;
          continue;
        }

        // Get unique completed exercises
        const completedExercises = new Set(
          (progressData || []).map(p => p.exercise_id || p.exercise_name)
        );

        // Check if all exercises are completed
        const allExercisesCompleted = hepNote.hep_data.exercises.every(exercise => {
          const exerciseKey = exercise.id || exercise.name;
          return completedExercises.has(exerciseKey);
        });

        completions[programId] = allExercisesCompleted;
      }

      setProgramCompletions(completions);
    } catch (error) {
      console.error('Error fetching program completions:', error);
    }
  };

  // Toggle exercise program completion
  const toggleProgramCompletion = async (programId: string, hepData: HomeExerciseProgram, sessionId?: string) => {
    if (!userProfile?.id || !hepData.exercises || hepData.exercises.length === 0) return;

    const isCurrentlyCompleted = programCompletions[programId] || false;
    setCompletionLoading(prev => ({ ...prev, [programId]: true }));

    try {
      const today = new Date().toISOString().split('T')[0];

      if (isCurrentlyCompleted) {
        // Unmark: Delete today's completions for all exercises in this program
        const { error } = await supabase
          .from('exercise_program_progress')
          .delete()
          .eq('program_id', programId)
          .eq('client_id', userProfile.id)
          .eq('completed_date', today);

        if (error) throw error;

        setProgramCompletions(prev => ({ ...prev, [programId]: false }));
        toast.success('Exercise program marked as not completed');
      } else {
        // Mark as completed: Create completion records for all exercises
        const completionPromises = hepData.exercises.map(exercise => {
          const exerciseKey = exercise.id || exercise.name;
          
          // Check if already completed today
          return supabase
            .from('exercise_program_progress')
            .select('id')
            .eq('program_id', programId)
            .eq('client_id', userProfile.id)
            .eq('exercise_name', exercise.name)
            .eq('completed_date', today)
            .maybeSingle()
            .then(({ data: existing }) => {
              if (existing) return null; // Already completed

              return supabase
                .from('exercise_program_progress')
                .insert({
                  program_id: programId,
                  client_id: userProfile.id,
                  exercise_id: exercise.id || null,
                  exercise_name: exercise.name,
                  completed_date: today,
                  session_id: sessionId || hepData.session_id || null,
                  sets_completed: exercise.sets || null,
                  reps_completed: exercise.reps || null,
                  duration_minutes: exercise.duration_minutes || null
                });
            });
        });

        await Promise.all(completionPromises);
        setProgramCompletions(prev => ({ ...prev, [programId]: true }));
        toast.success('Exercise program marked as completed');
      }
    } catch (error) {
      console.error('Error toggling program completion:', error);
      toast.error('Failed to update completion status');
    } finally {
      setCompletionLoading(prev => ({ ...prev, [programId]: false }));
    }
  };

  const handleMessageTherapist = async (session: Session) => {
    if (!user) return;

    try {
      // Create/get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        session.therapist_id
      );

      // Navigate to messages with conversation pre-selected
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleBookAgain = async (session: Session) => {
    if (!user) return;

    try {
      // Fetch full practitioner data (include therapist_type, base/radius for clinic vs mobile routing)
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          location,
          hourly_rate,
          specializations,
          bio,
          experience_years,
          user_role,
          average_rating,
          total_sessions,
          therapist_type,
          base_latitude,
          base_longitude,
          mobile_service_radius_km,
          stripe_connect_account_id,
          clinic_latitude,
          clinic_longitude
        `)
        .eq('id', session.therapist_id)
        .single();

      if (practitionerError || !practitionerData) {
        throw new Error('Failed to load practitioner details');
      }

      const { data: productsData } = await supabase
        .from('practitioner_products')
        .select('id, name, description, price_amount, currency, duration_minutes, service_type, is_active, stripe_price_id')
        .eq('practitioner_id', session.therapist_id)
        .eq('is_active', true);

      // Prepare practitioner object for BookingFlow (data shape supports clinic vs mobile routing)
      const practitioner = {
        id: practitionerData.id,
        user_id: practitionerData.id,
        first_name: practitionerData.first_name || '',
        last_name: practitionerData.last_name || '',
        location: practitionerData.location || '',
        hourly_rate: practitionerData.hourly_rate || 0,
        specializations: practitionerData.specializations || [],
        bio: practitionerData.bio || '',
        experience_years: practitionerData.experience_years || 0,
        user_role: practitionerData.user_role || '',
        average_rating: practitionerData.average_rating || 0,
        total_sessions: practitionerData.total_sessions || 0,
        therapist_type: practitionerData.therapist_type ?? undefined,
        base_latitude: practitionerData.base_latitude ?? undefined,
        base_longitude: practitionerData.base_longitude ?? undefined,
        mobile_service_radius_km: practitionerData.mobile_service_radius_km ?? undefined,
        stripe_connect_account_id: practitionerData.stripe_connect_account_id ?? undefined,
        clinic_latitude: practitionerData.clinic_latitude ?? undefined,
        clinic_longitude: practitionerData.clinic_longitude ?? undefined,
        products: productsData ?? []
      };

      // Prepare rebooking data
      const rebookingPayload = await RebookingService.prepareRebookingPayload(session.id);

      if (!rebookingPayload.rebookingData) {
        toast.error('Unable to prepare booking data. Please try booking from the marketplace.');
        return;
      }

      setSelectedPractitioner(practitioner);
      setRebookingData(rebookingPayload);
      setShowBookingFlow(true);
    } catch (error: any) {
      console.error('Error preparing rebooking:', error);
      toast.error(error.message || 'Failed to open booking flow. Please try again.');
    }
  };



  const getNoteTypeColor = (noteType: string) => {
    switch (noteType.toLowerCase()) {
      case 'subjective':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'objective':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'assessment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'plan':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'data':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'soap':
        return 'bg-blue-100 text-blue-800';
      case 'dap':
        return 'bg-green-100 text-green-800';
      case 'free_text':
        return 'bg-purple-100 text-purple-800';
      case 'hep':
        return 'bg-orange-100 text-orange-800';
      case 'general':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeLabel = (noteType: string) => {
    switch (noteType.toLowerCase()) {
      case 'hep':
        return 'HEP';
      case 'eps':
        return 'EPS';
      case 'subjective':
        return 'SUBJECTIVE';
      case 'objective':
        return 'OBJECTIVE';
      case 'assessment':
        return 'ASSESSMENT';
      case 'plan':
        return 'PLAN';
      case 'data':
        return 'DATA';
      case 'general':
        return 'GENERAL';
      default:
        return noteType.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Unique practitioners from sessions (for filter dropdown), sorted by name
  const practitionersList = React.useMemo(() => getUniquePractitioners(sessions), [sessions]);

  // Apply practitioner, date, and status filters
  const filteredSessions = React.useMemo(
    () =>
      filterSessionsUtil(sessions, {
        practitionerId: filterPractitioner,
        date: filterDate,
        status: filterStatus,
      }),
    [sessions, filterPractitioner, filterDate, filterStatus]
  );

  if (sessionsLoading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-10">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <ListSkeleton count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-semibold mb-2 text-[#37352f]">My Sessions</h1>
          <p className="text-[#787774] text-[15px]">
            View and manage your therapy sessions and treatment notes
          </p>
        </div>

        {/* Filters */}
        {sessions.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3" role="group" aria-label="Filter sessions">
            <span className="flex items-center gap-2 text-sm text-[#787774]">
              <Filter className="h-4 w-4" />
              Filter
            </span>
            <Select
              value={filterPractitioner || 'all'}
              onValueChange={(v) => setFilters({ practitioner: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="w-[200px] bg-white border-[#e9e9e7] text-[#37352f]" aria-label="Filter by practitioner">
                <SelectValue placeholder="All practitioners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All practitioners</SelectItem>
                {practitionersList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterDate}
              onValueChange={(v) => setFilters({ date: v as typeof filterDate })}
            >
              <SelectTrigger className="w-[180px] bg-white border-[#e9e9e7] text-[#37352f]" aria-label="Filter by date">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All time</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_3_months">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilters({ status: v as typeof filterStatus })}
            >
              <SelectTrigger className="w-[160px] bg-white border-[#e9e9e7] text-[#37352f]" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-[#787774] hover:text-[#37352f] hover:bg-[#f1f1ef]"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-12 w-12 text-[#9b9a97] mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2 text-[#37352f]">
                  {hasActiveFilters && sessions.length > 0 ? 'No sessions match your filters' : 'No sessions found'}
                </h3>
                <p className="text-[#787774] mb-6 text-[15px]">
                  {hasActiveFilters && sessions.length > 0
                    ? 'Try changing or clearing your filters to see more sessions.'
                    : "You haven't booked any sessions yet."}
                </p>
                {hasActiveFilters && sessions.length > 0 ? (
                  <Button variant="outline" onClick={clearFilters} className="border-[#e9e9e7] text-[#37352f]">
                    Clear filters
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/marketplace')}
                    className="bg-[#37352f] hover:bg-[#2e2d2a] text-white"
                  >
                    Browse Therapists
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSessions.map((session) => {
                  const displayStatus = getDisplaySessionStatus(session);
                  const sessionHEPs = getSessionHEPs(session.id, session.session_date);
                  // Client-facing "Notes available" should only reflect visible HEP content,
                  // not practitioner draft/in-progress treatment notes.
                  const hasNotes = sessionHEPs.length > 0;
                  const isExpanded = expandedSessions.has(session.id);
                  
                  return (
                  <div 
                    key={session.id} 
                    className="group bg-white rounded-lg hover:bg-[#f7f6f3] transition-colors duration-150 border border-transparent hover:border-[#e9e9e7]"
                  >
                    {/* Session Header - Always Visible */}
                    <div 
                      className="px-5 py-4 cursor-pointer"
                      onClick={() => toggleSessionNotes(session.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f1f1ef] flex items-center justify-center text-[#37352f] font-medium text-sm">
                              {session.therapist?.first_name?.[0]}{session.therapist?.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-medium text-[#37352f] leading-snug">
                                {session.therapist?.first_name} {session.therapist?.last_name}
                              </h3>
                              <div className="flex items-center gap-3 mt-1 text-[13px] text-[#787774]">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {format(new Date(session.session_date), 'MMM dd, yyyy')}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatTimeWithoutSeconds(session.start_time)} ({session.duration_minutes} min)
                                </span>
                                <span className="text-[#9b9a97]">•</span>
                                <span className="text-[#37352f] font-medium">£{session.price.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Session Type Badge */}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="secondary" 
                              className="bg-[#f1f1ef] text-[#37352f] border-0 text-[12px] font-normal px-2 py-0.5"
                            >
                              {session.session_type}
                            </Badge>
                            {hasNotes && (
                              <Badge 
                                variant="secondary" 
                                className="bg-[#e3f2fd] text-[#1976d2] border-0 text-[12px] font-normal px-2 py-0.5"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Notes available
                              </Badge>
                            )}
                          </div>

                          {/* KAN-74: Prominent Book Again for completed sessions */}
                          {displayStatus === 'completed' && (
                            <Button
                              variant="default"
                              size="lg"
                              className="mt-3 w-full sm:w-auto min-h-[44px] h-11 px-4 gap-2 font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookAgain(session);
                              }}
                              aria-label={`Book again with ${session.therapist?.first_name ?? ''} ${session.therapist?.last_name ?? 'practitioner'}`}
                            >
                              <Calendar className="h-5 w-5 shrink-0" aria-hidden />
                              Book Again with {session.therapist?.first_name} {session.therapist?.last_name}
                            </Button>
                          )}
                        </div>
                        
                        {/* Expand/Collapse Icon */}
                        <ChevronDown 
                          className={`h-4 w-4 text-[#9b9a97] flex-shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Content - Notes and Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-[#e9e9e7] pt-4 space-y-5">
                        {/* Session Progress Metrics */}
                        {session.id && userProfile?.id && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity className="h-4 w-4 text-[#787774]" />
                              <h4 className="text-[14px] font-medium text-[#37352f]">Session Progress</h4>
                            </div>
                            <div className="bg-[#f7f6f3] rounded-md p-4 border border-[#e9e9e7]">
                              <ClientProgressTracker 
                                clientId={userProfile.id} 
                                clientName={userProfile?.first_name && userProfile?.last_name 
                                  ? `${userProfile.first_name} ${userProfile.last_name}` 
                                  : 'Client'} 
                                sessionId={session.id} 
                                readOnly={true}
                                hideInternalTabs={true}
                                defaultTab="progress"
                              />
                            </div>
                          </div>
                        )}

                        {/* Exercise Programs (HEPs) */}
                        {sessionHEPs.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity className="h-4 w-4 text-[#787774]" />
                              <h4 className="text-[14px] font-medium text-[#37352f]">Exercise Programs</h4>
                            </div>
                            <div className="space-y-3">
                              {sessionHEPs.map((hep) => (
                                <div 
                                  key={`hep-${session.id}-${hep.program_id || hep.id}`} 
                                  className="bg-[#f7f6f3] rounded-md p-4 border border-[#e9e9e7]"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="text-[13px] font-medium text-[#37352f]">
                                        {hep.practitioner_name}
                                      </p>
                                      <p className="text-[12px] text-[#787774] mt-0.5">
                                        {formatDate(hep.session_date)}
                                      </p>
                                    </div>
                                    <Badge className={getNoteTypeColor(hep.note_type)}>
                                      {getNoteTypeLabel(hep.note_type)}
                                    </Badge>
                                  </div>
                                  {hep.program_id ? (
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          {hep.hep_data?.title && (
                                            <p className="text-[13px] font-medium text-[#37352f] mb-1">
                                              {hep.hep_data.title}
                                            </p>
                                          )}
                                          {hep.hep_data?.description && (
                                            <p className="text-[12px] text-[#787774] mb-2 line-clamp-2">
                                              {hep.hep_data.description}
                                            </p>
                                          )}
                                        </div>
                                        {/* Completion Checkbox - Read-only client view */}
                                        <button
                                          onClick={() => hep.program_id && hep.hep_data && toggleProgramCompletion(hep.program_id, hep.hep_data, session.id)}
                                          disabled={completionLoading[hep.program_id]}
                                          className={`flex-shrink-0 mt-0.5 transition-[opacity] duration-200 ${
                                            completionLoading[hep.program_id] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                                          }`}
                                          title={programCompletions[hep.program_id] ? 'Mark as not completed' : 'Mark as completed'}
                                        >
                                          {programCompletions[hep.program_id] ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                          ) : (
                                            <Circle className="h-5 w-5 text-[#787774] hover:text-[#37352f]" />
                                          )}
                                        </button>
                                      </div>
                                      <div className="flex items-center justify-between pt-2 border-t border-[#e9e9e7]">
                                        <div className="flex items-center gap-2 text-[12px] text-[#787774]">
                                          <Activity className="h-3.5 w-3.5" />
                                          <span>
                                            {hep.hep_data?.exercises?.length || 0} {hep.hep_data?.exercises?.length === 1 ? 'exercise' : 'exercises'} prescribed
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => navigate('/client/exercises')}
                                          className="text-[11px] h-auto py-1 px-2 text-primary hover:text-primary/80"
                                        >
                                          View exercises in My Exercises tab
                                          <ChevronRight className="h-3 w-3 ml-1" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-[#787774]">Exercise program not available</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Additional Session Notes */}
                        {session.notes && session.notes.trim() && 
                         !session.notes.toLowerCase().includes('location:') && 
                         session.notes !== session.therapist?.location && (
                          <div className="space-y-2">
                            <h4 className="text-[14px] font-medium text-[#37352f]">Additional Notes</h4>
                            <p className="text-[14px] text-[#37352f] leading-relaxed whitespace-pre-wrap bg-[#f7f6f3] rounded-md p-3 border border-[#e9e9e7]">
                              {session.notes}
                            </p>
                          </div>
                        )}

                        {/* No Notes Message */}
                        {!hasNotes && (
                          <div className="text-center py-8 text-[#9b9a97]">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-[13px]">No treatment notes yet for this session</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-[#e9e9e7]">
                          {(displayStatus === 'completed' || displayStatus === 'confirmed') && (
                            <>
                              {/* Book Again is shown prominently on the card header for completed sessions (KAN-74) */}
                              {sessionRatings[session.id] ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#e8f5e9] border border-[#c8e6c9]">
                                  <Badge className="bg-[#4caf50] text-white border-0 text-[11px] px-2 py-0">
                                    <Star className="h-3 w-3 mr-1 fill-white" />
                                    Rated {sessionRatings[session.id].rating}/5
                                  </Badge>
                                  {sessionRatings[session.id].review_text && (
                                    <span className="text-[12px] text-[#787774] max-w-[120px] truncate">
                                      {sessionRatings[session.id].review_text}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRatingSession(session);
                                    setRatingOpen(true);
                                  }}
                                  className="text-[13px] h-8 px-3 text-[#37352f] hover:bg-[#f1f1ef]"
                                >
                                  <Star className="h-3.5 w-3.5 mr-1.5" />
                                  Rate Session
                                </Button>
                              )}
                            </>
                          )}
                          {(displayStatus === 'scheduled' || displayStatus === 'confirmed' || displayStatus === 'pending_payment') && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMessageTherapist(session);
                              }}
                              className="text-[13px] h-8 px-3 text-[#37352f] hover:bg-[#f1f1ef]"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                              Message Therapist
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Private post-session rating modal */}
        {ratingSession && user && (
          <PrivateRatingModal
            open={ratingOpen}
            onOpenChange={setRatingOpen}
            sessionId={ratingSession.id}
            therapistId={ratingSession.therapist_id}
            clientId={user.id}
            therapistName={`${ratingSession.therapist?.first_name} ${ratingSession.therapist?.last_name}`}
            onSubmitted={() => {
              // Refresh sessions and ratings after feedback
              loadSessions();
              fetchSessionRatings();
            }}
          />
        )}

        {/* Booking Flow Modal */}
        {selectedPractitioner && (
          <BookingFlow
            open={showBookingFlow}
            onOpenChange={(open) => {
              setShowBookingFlow(open);
              if (!open) {
                // Refresh sessions after booking
                loadSessions();
                setSelectedPractitioner(null);
                setRebookingData(null);
              }
            }}
            practitioner={selectedPractitioner}
            initialRebookingData={rebookingData || undefined}
            onRedirectToMobile={() => {
              setShowBookingFlow(false);
              navigate(`/client/booking?practitioner=${selectedPractitioner.user_id}&mode=mobile`);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MySessions;

