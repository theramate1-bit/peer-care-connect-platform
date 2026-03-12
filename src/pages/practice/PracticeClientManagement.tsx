import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Search, 
  Calendar, 
  MessageSquare, 
  Star, 
  Clock,
  TrendingUp,
  Heart,
  Activity,
  Phone,
  Mail,
  MapPin,
  Filter,
  Edit,
  Eye,
  FileText,
  Stethoscope,
  Plus,
  Save,
  X,
  User as UserIcon,
  ChevronRight,
  Dumbbell,
  ListChecks,
  History,
  UserPlus,
  Target,
} from 'lucide-react';
import { MessagingManager } from '@/lib/messaging';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkTreatmentNotesCompletion, markTreatmentNotesAsCompleted } from '@/lib/treatment-notes-utils';
import { logger } from '@/lib/logger';
import { 
  PAIN_AREAS, 
  JOINTS, 
  MOVEMENTS, 
  STRENGTH_GRADES,
  STRENGTH_VALUE_MAP
} from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { format } from 'date-fns';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';
import { resolveClientIdFromSession } from '@/lib/client-id-resolver';
import { usePlan } from '@/contexts/PlanContext';
import { transcribeFile, generateSoapNotes, uploadAudioReturnPath, Utterance } from '@/lib/transcription';
import { Mic, StopCircle, Sparkles, Loader2, CheckCircle2, Circle, CheckCircle, ThumbsUp, ThumbsDown, AlertTriangle, AlertCircle } from 'lucide-react';
import { autoInsertGoalsFromSOAP, showAutoInsertResults as showGoalInsertResults } from '@/lib/auto-insert-goals';
import { extractGoalsFromSoap, ExtractedGoal } from '@/lib/goal-extraction';
import { autoInsertMetricsFromSOAP, showAutoInsertResults as showMetricInsertResults } from '@/lib/auto-insert-metrics';
import { UnifiedExtractionReview } from '@/components/session/UnifiedExtractionReview';
import { EnhancedTreatmentNotes } from '@/components/session/EnhancedTreatmentNotes';
import { LiveSOAPNotes } from '@/components/session/LiveSOAPNotes';
import { HEPCreator } from '@/components/practice/HEPCreator';
import { PractitionerHEPProgress } from '@/components/practice/PractitionerHEPProgress';
import { PatientHistoryRequest } from '@/components/practice/PatientHistoryRequest';
import { PatientHistoryRequestList } from '@/components/practice/PatientHistoryRequestList';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpCircle, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SOAPNoteDocumentView } from '@/components/session/SOAPNoteDocumentView';
import { Printer } from 'lucide-react';
import { PreAssessmentStatus } from '@/components/forms/PreAssessmentStatus';
import { getSessionLocation } from '@/utils/sessionLocation';
import { getDisplaySessionStatus, getDisplaySessionStatusLabel, isPractitionerSessionVisible } from '@/lib/session-display-status';
import { CalendarTimeSelector } from '@/components/booking/CalendarTimeSelector';

interface Client {
  client_email: string;
  client_name: string;
  total_sessions: number;
  total_spent: number;
  last_session: string;
  average_rating: number;
  status: 'active' | 'inactive' | 'new';
  notes: string;
  health_goals: string[];
  preferred_therapy_types: string[];
}

interface ClientSession {
  id: string;
  /** Client user ID (UUID) - may be null for legacy sessions. Use resolveClientIdFromSession() to handle null cases. */
  client_id?: string | null;
  client_email: string;
  client_name: string;
  session_date: string;
  session_type: string;
  price: number;
  status: string;
  notes: string;
  duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
  payment_status?: string;
  session_number?: number; // Sequential session number per client-practitioner pair
  pre_assessment_required?: boolean;
  pre_assessment_completed?: boolean;
  pre_assessment_form_id?: string | null;
  start_time?: string | null;
  appointment_type?: string | null;
  visit_address?: string | null;
}

const PracticeClientManagement = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(true);
  // State for resolving client ID in Progress tab
  const [resolvedProgressClientId, setResolvedProgressClientId] = useState<string | null>(null);
  const [resolvingProgressClientId, setResolvingProgressClientId] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && ['sessions', 'progress', 'goals'].includes(tabFromUrl) ? tabFromUrl : 'sessions';
  });
  // Update URL when tab changes
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab !== activeTab) {
      const newParams = new URLSearchParams(searchParams);
      if (activeTab === 'sessions') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', activeTab);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Sync URL params to activeTab on mount
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['sessions', 'progress', 'goals'].includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, []);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isClientSheetOpen, setIsClientSheetOpen] = useState(false);
  
  // Practitioner preferences (defaults from database)
  const [practitionerPreferences, setPractitionerPreferences] = useState<{
    default_session_time: string;
    default_duration_minutes: number;
    default_session_type: string;
  } | null>(null);
  
  // Booking form state - initialized with database defaults
  const [bookingData, setBookingData] = useState<{
    session_type: string;
    session_date: string;
    start_time: string;
    duration_minutes: number;
    price: number;
    appointment_type?: 'clinic' | 'mobile';
    visit_address?: string;
  }>({
    session_type: 'Treatment Session',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    duration_minutes: 60,
    price: 0,
    appointment_type: 'clinic',
    visit_address: ''
  });
  
  const [messageText, setMessageText] = useState('');
  const [newClientManagementNoteContent, setNewClientManagementNoteContent] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'new'>('all');
  
  // Session structured notes modal state
  const [isSessionNoteModalOpen, setIsSessionNoteModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClientSession | null>(null);
  const [treatmentNotesSearch, setTreatmentNotesSearch] = useState('');
  const [sessionsViewFilter, setSessionsViewFilter] = useState<'all' | 'past' | 'upcoming'>('all');
  const [viewingCompletedNote, setViewingCompletedNote] = useState(false);
  const [completedNoteData, setCompletedNoteData] = useState<any>(null);
  
  // AI SOAP Notes state
  const { isPro } = usePlan();
  const [transcript, setTranscript] = useState('');
  const [utterances, setUtterances] = useState<Utterance[] | null>(null);
  const [generatedSoap, setGeneratedSoap] = useState<{ subjective: string; objective: string; assessment: string; plan: string } | null>(null);
  const [loadingTranscribe, setLoadingTranscribe] = useState(false);
  const [loadingSoap, setLoadingSoap] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAiTools, setShowAiTools] = useState(false);
  const [soapFeedback, setSoapFeedback] = useState<'positive' | 'negative' | null>(null);
  const [lastGeneratedSoapMemoryId, setLastGeneratedSoapMemoryId] = useState<string | null>(null);
  const [autoProcessingStep, setAutoProcessingStep] = useState<'idle' | 'transcribing' | 'generating' | 'loading' | 'complete'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasTreatmentNotes, setHasTreatmentNotes] = useState(false);
  const [hepProgramCreated, setHepProgramCreated] = useState(false);
  const [sessionsWithNotes, setSessionsWithNotes] = useState<Set<string>>(new Set());
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  const chunksRef = useRef<BlobPart[]>([]);
  const [language, setLanguage] = useState('en');
  const [diarization, setDiarization] = useState(false);
  
  // Goal extraction state
  const [extractedGoals, setExtractedGoals] = useState<ExtractedGoal[]>([]);
  const [showGoalReview, setShowGoalReview] = useState(false);
  const [loadingGoalExtraction, setLoadingGoalExtraction] = useState(false);
  
  // Structured treatment notes state (kept for backward compatibility in other views)
  const [structuredNotes, setStructuredNotes] = useState<Array<{
    id: string;
    session_id: string | null;
    practitioner_id: string;
    client_id: string | null;
    note_type: 'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general';
    content: string;
    timestamp: string;
    created_at: string;
    updated_at: string;
    template_type?: 'SOAP' | 'DAP' | 'FREE_TEXT';
  }>>([]);
  
  // Unified note state for template view - supports both SOAP and DAP
  interface SOAPNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    noteIds?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
  }
  
  interface DAPNote {
    data: string;
    assessment: string;
    plan: string;
    noteIds?: {
      data?: string;
      assessment?: string;
      plan?: string;
    };
  }
  
  const [selectedTemplate, setSelectedTemplate] = useState<'SOAP' | 'DAP'>('SOAP');
  const [soapNote, setSoapNote] = useState<SOAPNote>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [dapNote, setDapNote] = useState<DAPNote>({
    data: '',
    assessment: '',
    plan: ''
  });
  const [isSavingSOAP, setIsSavingSOAP] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['subjective', 'objective', 'assessment', 'plan']); // Default to SOAP sections
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [isNoteCompleted, setIsNoteCompleted] = useState(false);
  const [recordingProcessingOrError, setRecordingProcessingOrError] = useState(false);
  const [showAddCorrectionModal, setShowAddCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [addendumNotes, setAddendumNotes] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Suggested Prompts State (for Objective section)
  const [painScore, setPainScore] = useState<string>('');
  const [painArea, setPainArea] = useState<string>('');
  const [romJoint, setRomJoint] = useState('');
  const [romSide, setRomSide] = useState<'right' | 'left' | 'bilateral'>('right');
  const [romMovement, setRomMovement] = useState('');
  const [romDegrees, setRomDegrees] = useState('');
  const [strengthJoint, setStrengthJoint] = useState('');
  const [strengthSide, setStrengthSide] = useState<'right' | 'left' | 'bilateral'>('right');
  const [strengthMovement, setStrengthMovement] = useState('');
  const [strengthGrade, setStrengthGrade] = useState('');
  
  
  // Legacy state (kept for backward compatibility)
  const [selectedNoteType, setSelectedNoteType] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general'>('subjective');
  const [newStructuredNoteContent, setNewStructuredNoteContent] = useState('');
  const [editingStructuredNoteId, setEditingStructuredNoteId] = useState<string | null>(null);
  const [aiEditingNoteId, setAiEditingNoteId] = useState<string | null>(null); // Track which note is being edited with AI
  const [sessionNoteModalTab, setSessionNoteModalTab] = useState('structured'); // Track active tab in modal
  

  // Debounce ref for real-time updates to prevent excessive reloads
  const reloadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadDataRef = useRef<() => Promise<void>>();
  
  // Store loadData in ref so it can be accessed in callbacks
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [userProfile?.id, selectedClient]);
  
  const debouncedLoadData = useCallback(() => {
    if (reloadDebounceRef.current) {
      clearTimeout(reloadDebounceRef.current);
    }
    reloadDebounceRef.current = setTimeout(() => {
      if (loadDataRef.current) {
        loadDataRef.current();
      }
    }, 500); // Debounce by 500ms
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
      }
    };
  }, []);

  // Real-time subscription for client sessions (debounced)
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${userProfile?.id}`,
    (payload) => {
      // Debounced refresh to prevent stuttering
      debouncedLoadData();
    }
  );

  // Note: Removed client_profiles subscription - we now query directly from client_sessions
  // This ensures we only show clients with completed payments in real-time

  // Real-time subscription for treatment notes (optimized - only update notes, not full reload)
  useRealtimeSubscription(
    'treatment_notes',
    `practitioner_id=eq.${userProfile?.id}`,
    (payload) => {
      // Update sessionsWithNotes set immediately (lightweight)
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new?.session_id) {
          setSessionsWithNotes(prev => new Set(prev).add(payload.new.session_id));
        }
      } else if (payload.eventType === 'DELETE') {
        // Only reload notes for specific session, not all data
        if (payload.old?.session_id) {
          loadStructuredNotes(payload.old.session_id, null);
        }
      }
      
      // Only reload notes, not full data
      if (editingSession?.id) {
        loadStructuredNotes(editingSession.id, editingSession.client_id);
      }
    }
  );

  // Real-time subscription for practitioner preferences
  useRealtimeSubscription(
    'practitioner_availability',
    `user_id=eq.${userProfile?.id}`,
    async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await loadPractitionerPreferences();
      }
    }
  );

  // Load practitioner preferences (default session time, duration, etc.)
  const loadPractitionerPreferences = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('default_session_time, default_duration_minutes, default_session_type')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching practitioner preferences', error, 'PracticeClientManagement');
        return;
      }

      if (data) {
        const preferences = {
          default_session_time: data.default_session_time || '10:00',
          default_duration_minutes: data.default_duration_minutes || 60,
          default_session_type: data.default_session_type || 'Treatment Session'
        };
        setPractitionerPreferences(preferences);
        
        // Update booking data with preferences
        setBookingData(prev => ({
          ...prev,
          start_time: preferences.default_session_time,
          duration_minutes: preferences.default_duration_minutes,
          session_type: preferences.default_session_type
        }));
      } else {
        // Use defaults if no preferences found
        const defaults = {
          default_session_time: '10:00',
          default_duration_minutes: 60,
          default_session_type: 'Treatment Session'
        };
        setPractitionerPreferences(defaults);
      }
    } catch (error) {
      logger.error('Error loading practitioner preferences', error, 'PracticeClientManagement');
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadData();
      loadStructuredNotes();
      loadPractitionerPreferences();
    }
  }, [userProfile, location.pathname]);

  // Load structured notes when session is selected
  useEffect(() => {
    if (editingSession?.id && userProfile?.id) {
      // Always load notes specifically for this session when modal opens
      loadStructuredNotes(editingSession.id, editingSession.client_id);
      
      // Restore draft from localStorage if exists (check both SOAP and DAP)
      const soapDraftKey = `soap-draft-${editingSession.id}`;
      const dapDraftKey = `dap-draft-${editingSession.id}`;
      const savedSoapDraft = localStorage.getItem(soapDraftKey);
      const savedDapDraft = localStorage.getItem(dapDraftKey);
      
      if (savedSoapDraft) {
        try {
          const draft = JSON.parse(savedSoapDraft);
          setSoapNote(draft);
          setSelectedTemplate('SOAP');
          setHasUnsavedChanges(true);
        } catch (error) {
          logger.error('Error restoring SOAP draft', error, 'PracticeClientManagement');
        }
      } else if (savedDapDraft) {
        try {
          const draft = JSON.parse(savedDapDraft);
          setDapNote(draft);
          setSelectedTemplate('DAP');
          setHasUnsavedChanges(true);
        } catch (error) {
          logger.error('Error restoring DAP draft', error, 'PracticeClientManagement');
        }
      }
    } else {
      // Clear notes when no session is selected
      setStructuredNotes([]);
      setSoapNote({ subjective: '', objective: '', assessment: '', plan: '' });
      setDapNote({ data: '', assessment: '', plan: '' });
      setSelectedTemplate('SOAP');
      setExpandedSections(['subjective', 'objective', 'assessment', 'plan']);
      setHasUnsavedChanges(false);
    }
  }, [editingSession?.id]);

  // Reset AI editing state when modal closes or session changes
  useEffect(() => {
    if (!isSessionNoteModalOpen || !editingSession) {
      setAiEditingNoteId(null);
      setSessionNoteModalTab('structured');
      setIsNoteCompleted(false);
    }
  }, [isSessionNoteModalOpen, editingSession]);

  // Refresh completion status when modal closes (to sync with database)
  useEffect(() => {
    if (!isSessionNoteModalOpen && editingSession?.id) {
      // Re-check completion status when modal closes to ensure UI is in sync
      checkCompletionStatusForSessions([editingSession.id]);
    }
  }, [isSessionNoteModalOpen, editingSession?.id]);

  // Check completion status for all sessions - checks BOTH session_recordings AND treatment_notes
  const checkCompletionStatusForSessions = async (sessionIds: string[]) => {
    if (!userProfile?.id || sessionIds.length === 0) return;
    
    try {
      // Check session_recordings for completed status
      const { data: recordings, error: recordingsError } = await supabase
        .from('session_recordings')
        .select('session_id, status')
        .eq('practitioner_id', userProfile.id)
        .in('session_id', sessionIds);
      
      if (recordingsError) {
        logger.error('Error checking session_recordings completion status', recordingsError, 'PracticeClientManagement');
      }
      
      // Check treatment_notes - use status field for completion check
      // This handles cases where practitioners use treatment_notes instead of session_recordings
      const { data: treatmentNotes, error: notesError } = await supabase
        .from('treatment_notes')
        .select('session_id, note_type, status, template_type')
        .eq('practitioner_id', userProfile.id)
        .eq('template_type', 'SOAP')
        .in('session_id', sessionIds);
      
      if (notesError) {
        logger.error('Error checking treatment_notes completion status', notesError, 'PracticeClientManagement');
      }
      
      // Group by session_id and check completion from BOTH sources
      const sessionStatusMap = new Map<string, boolean>();
      
      // Check session_recordings
      recordings?.forEach((recording: any) => {
        const sessionId = recording.session_id;
        if (recording.status === 'completed') {
          sessionStatusMap.set(sessionId, true);
        }
      });
      
      // Check treatment_notes - completed only when at least one note has status = 'completed'
      const notesBySession = new Map<string, { hasCompleted: boolean }>();
      treatmentNotes?.forEach((note: any) => {
        const sessionId = note.session_id;
        if (!notesBySession.has(sessionId)) {
          notesBySession.set(sessionId, { hasCompleted: false });
        }
        const sessionData = notesBySession.get(sessionId)!;
        if (note.status === 'completed') {
          sessionData.hasCompleted = true;
        }
      });
      
      // Mark as completed only when note status is 'completed' (not when all sections merely exist)
      notesBySession.forEach((sessionData, sessionId) => {
        if (sessionData.hasCompleted) {
          if (!sessionStatusMap.has(sessionId)) {
            sessionStatusMap.set(sessionId, true);
          }
        }
      });
      
      const completedIds = new Set<string>();
      sessionStatusMap.forEach((isCompleted, sessionId) => {
        if (isCompleted) {
          completedIds.add(sessionId);
        }
      });
      
      setCompletedSessions(prev => {
        const updated = new Set(prev);
        completedIds.forEach(id => updated.add(id));
        return updated;
      });
    } catch (error) {
      console.error('Error checking completion status:', error);
    }
  };

  // Role-appropriate default template per practitioner-roles.mdc (osteopath→SOAP, sports_therapist→DAP, massage_therapist→DAP)
  const getDefaultTemplateForRole = (): 'SOAP' | 'DAP' => {
    switch (userProfile?.user_role) {
      case 'osteopath': return 'SOAP';
      case 'sports_therapist': return 'DAP';
      case 'massage_therapist': return 'DAP';
      default: return 'SOAP';
    }
  };

  // Load structured treatment notes - defined early so handleSaveSOAPNote can use it
  const loadStructuredNotes = async (sessionId?: string | null, clientId?: string | null) => {
    if (!userProfile?.id) return;

    try {
      let query = supabase
        .from('treatment_notes')
        .select('*')
        .eq('practitioner_id', userProfile.id)
        .order('updated_at', { ascending: false });

      if (sessionId) {
        // If loading for a specific session, only get notes for that session
        query = query.eq('session_id', sessionId);
      } else if (clientId) {
        // If loading for a specific client, get all notes (session-linked and client management notes)
        query = query.eq('client_id', clientId);
      } else if (selectedClient) {
        // If no session/client specified but client is selected, get all notes for that client
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedClient.client_email)
          .single();
        if (clientUser) {
          query = query.eq('client_id', clientUser.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setStructuredNotes(data || []);
      
      // Update sessionsWithNotes set based on loaded notes
      const sessionIdsWithNotes = new Set<string>();
      if (data && data.length > 0) {
        data.forEach((note: any) => {
          if (note.session_id) {
            sessionIdsWithNotes.add(note.session_id);
          }
        });
        setSessionsWithNotes(prev => {
          const updated = new Set(prev);
          sessionIdsWithNotes.forEach(id => updated.add(id));
          return updated;
        });
      }
      
      // Check completion status for sessions (even if no treatment_notes exist)
      // If a specific sessionId is provided, check that one; otherwise check all sessions with notes
      const sessionsToCheck = sessionId 
        ? [sessionId] 
        : Array.from(sessionIdsWithNotes);
      
      if (sessionsToCheck.length > 0 && userProfile?.id) {
        // Use the shared completion check function that checks BOTH tables
        checkCompletionStatusForSessions(sessionsToCheck);
      }
      
      // If loading for a specific session, also populate unified note (SOAP or DAP)
      // IMPORTANT: Only show notes that belong to this specific session
      if (sessionId) {
        const sessionNotes = (data || []).filter(n => n.session_id === sessionId); // Double-check filtering
        
        // Detect template type from existing notes; if none, use role-appropriate default
        const templateType = sessionNotes.find(n => n.template_type === 'SOAP' || n.template_type === 'DAP')?.template_type || getDefaultTemplateForRole();
        setSelectedTemplate(templateType as 'SOAP' | 'DAP');
        
        if (templateType === 'SOAP') {
          const soapSections: SOAPNote = {
            subjective: '',
            objective: '',
            assessment: '',
            plan: '',
            noteIds: {}
          };
          
          // Merge multiple notes per section (keep most recent if duplicates exist)
          const sectionMap = new Map<string, { content: string; id: string; timestamp: string }>();
          
          sessionNotes.forEach((note) => {
            const noteType = note.note_type;
            if (['subjective', 'objective', 'assessment', 'plan'].includes(noteType)) {
              const existing = sectionMap.get(noteType);
              const noteTime = note.updated_at || note.timestamp || note.created_at;
              const existingTime = existing?.timestamp;
              if (!existing || (noteTime && existingTime && new Date(noteTime) > new Date(existingTime))) {
                sectionMap.set(noteType, {
                  content: note.content,
                  id: note.id,
                  timestamp: noteTime
                });
              }
            }
          });
          
          // Populate SOAP note sections
          sectionMap.forEach((value, key) => {
            soapSections[key as keyof Omit<SOAPNote, 'noteIds'>] = value.content;
            if (!soapSections.noteIds) soapSections.noteIds = {};
            soapSections.noteIds[key as keyof SOAPNote['noteIds']] = value.id;
          });
          
          setSoapNote(soapSections);
          setExpandedSections(['subjective', 'objective', 'assessment', 'plan']);
        } else {
          // DAP template
          const dapSections: DAPNote = {
            data: '',
            assessment: '',
            plan: '',
            noteIds: {}
          };
          
          const sectionMap = new Map<string, { content: string; id: string; timestamp: string }>();
          
          sessionNotes.forEach((note) => {
            const noteType = note.note_type;
            if (['data', 'assessment', 'plan'].includes(noteType)) {
              const existing = sectionMap.get(noteType);
              const noteTime = note.updated_at || note.timestamp || note.created_at;
              const existingTime = existing?.timestamp;
              if (!existing || (noteTime && existingTime && new Date(noteTime) > new Date(existingTime))) {
                sectionMap.set(noteType, {
                  content: note.content,
                  id: note.id,
                  timestamp: noteTime
                });
              }
            }
          });
          
          // Populate DAP note sections
          sectionMap.forEach((value, key) => {
            dapSections[key as keyof Omit<DAPNote, 'noteIds'>] = value.content;
            if (!dapSections.noteIds) dapSections.noteIds = {};
            dapSections.noteIds[key as keyof DAPNote['noteIds']] = value.id;
          });
          
          setDapNote(dapSections);
          setExpandedSections(['data', 'assessment', 'plan']);
        }
        
        // Reset unsaved changes flag when loading existing notes
        setHasUnsavedChanges(false);
        setLastSavedTime(new Date());
        
        // Check if note is completed using utility function (consistent check)
        if (sessionId && editingSession) {
          try {
            // Use utility function for consistent completion check
            const completionStatus = await checkTreatmentNotesCompletion(editingSession.id, userProfile.id);
            setIsNoteCompleted(completionStatus.isCompleted);
            setRecordingProcessingOrError(completionStatus.recordingProcessingOrError ?? false);

            // Update completedSessions state
            if (completionStatus.isCompleted) {
              setCompletedSessions(prev => {
                const updated = new Set(prev);
                updated.add(sessionId);
                return updated;
              });
            }
          } catch (error) {
            logger.error('Error checking completion status', error, 'PracticeClientManagement');
            // If error, default to not completed (safer than blocking access)
            setIsNoteCompleted(false);
          }
          
          // Clear any draft since we're loading saved notes
          localStorage.removeItem(`soap-draft-${sessionId}`);
          localStorage.removeItem(`dap-draft-${sessionId}`);
        }
      } else {
        // Reset notes if not loading for a specific session
        setSoapNote({
          subjective: '',
          objective: '',
          assessment: '',
          plan: ''
        });
        setDapNote({
          data: '',
          assessment: '',
          plan: ''
        });
        setSelectedTemplate('SOAP');
        setExpandedSections(['subjective', 'objective', 'assessment', 'plan']);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      logger.error('Error loading structured notes', error, 'PracticeClientManagement');
    }
  };

  const checkTreatmentNotes = async () => {
    if (!editingSession) return;
    
    try {
      // Check if structured notes exist
      const { data: structuredNotes } = await supabase
        .from('treatment_notes')
        .select('id')
        .eq('session_id', editingSession.id)
        .limit(1);
      
      const hasStructuredNotes = (structuredNotes?.length || 0) > 0;
      
      setHasTreatmentNotes(hasStructuredNotes || editingSession.status === 'completed');
    } catch (error) {
      console.error('Error checking treatment notes:', error);
    }
  };

  // Unified note save function - saves all sections atomically (supports SOAP and DAP)
  // Suggested Prompts Functions
  const addPainScore = async () => {
    if (!painArea || !painScore) return;
    
    const textToAdd = `${painArea} Pain (VAS): ${painScore}/10`;
    
    // Check if this area's pain score is already in the text
    const regex = new RegExp(`${painArea} Pain \\(VAS\\): \\d+/10`, 'g');
    let newObjective = soapNote.objective;
    
    if (regex.test(soapNote.objective)) {
      // Replace existing
      newObjective = soapNote.objective.replace(regex, textToAdd);
    } else {
      // Append new
      newObjective = soapNote.objective ? `${soapNote.objective}\n${textToAdd}` : textToAdd;
    }
    
    setSoapNote({ ...soapNote, objective: newObjective });
    setHasUnsavedChanges(true);
    
    // Auto-create metric (optional)
    if (userProfile && editingSession?.client_id && editingSession?.id) {
      try {
        await supabase.from('progress_metrics').insert({
          client_id: editingSession.client_id,
          practitioner_id: userProfile.id,
          session_id: editingSession.id,
          metric_type: 'pain_level',
          metric_name: `${painArea} Pain (VAS)`,
          value: parseFloat(painScore),
          max_value: 10,
          unit: '/10',
          notes: 'Auto-recorded from SOAP note',
          session_date: editingSession.session_date || new Date().toISOString().split('T')[0],
          metadata: {
            area: painArea,
            source: 'soap_objective'
          }
        } as any);
      } catch (error) {
        console.error('Failed to auto-create metric:', error);
        // Don't show error to user - metric creation is optional
      }
    }
    
    // Reset fields
    setPainArea('');
    setPainScore('');
    toast.success('Pain score added to objective');
  };

  const addRom = async () => {
    if (!romJoint || !romMovement || !romDegrees) return;
    
    const sideText = romSide === 'bilateral' ? 'bilateral' : romSide === 'right' ? 'right' : 'left';
    const textToAdd = `ROM: ${sideText} ${romJoint} ${romMovement} - ${romDegrees}°`;
    
    // Check if this specific ROM entry is already in the text (by side/joint/movement)
    const escapedJoint = romJoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedMovement = romMovement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`ROM: ${sideText} ${escapedJoint} ${escapedMovement} - -?\\d+\\.?\\d*°`, 'g');
    let newObjective = soapNote.objective;
    
    if (regex.test(soapNote.objective)) {
      // Replace existing
      newObjective = soapNote.objective.replace(regex, textToAdd);
    } else {
      // Append new
      newObjective = soapNote.objective ? `${soapNote.objective}\n${textToAdd}` : textToAdd;
    }
    
    setSoapNote({ ...soapNote, objective: newObjective });
    setHasUnsavedChanges(true);
    
    // Auto-create metric (optional)
    if (userProfile && editingSession?.client_id && editingSession?.id) {
      try {
        await supabase.from('progress_metrics').insert({
          client_id: editingSession.client_id,
          practitioner_id: userProfile.id,
          session_id: editingSession.id,
          metric_type: 'mobility',
          metric_name: `ROM - ${sideText} ${romJoint} ${romMovement}`,
          value: parseFloat(romDegrees),
          max_value: 180,
          unit: '°',
          notes: 'Auto-recorded from SOAP note',
          session_date: editingSession.session_date || new Date().toISOString().split('T')[0],
          metadata: {
            joint: romJoint,
            side: romSide,
            movement: romMovement,
            source: 'soap_objective'
          }
        } as any);
      } catch (error) {
        console.error('Failed to auto-create metric:', error);
      }
    }
    
    // Reset fields
    setRomJoint('');
    setRomSide('right');
    setRomMovement('');
    setRomDegrees('');
    toast.success('ROM added to objective');
  };

  const addStrength = async () => {
    if (!strengthJoint || !strengthMovement || !strengthGrade) return;
    
    const gradeObj = STRENGTH_GRADES.find(g => g.value === strengthGrade);
    const gradeName = gradeObj ? gradeObj.label : `Grade ${strengthGrade}`;
    const sideText = strengthSide === 'bilateral' ? 'bilateral' : strengthSide === 'right' ? 'right' : 'left';
    const textToAdd = `Strength Testing: ${sideText} ${strengthJoint} ${strengthMovement} - Grade ${strengthGrade}/5 (${gradeName})`;
    
    // Check if this specific strength entry is already in the text (by side/joint/movement)
    const escapedJoint = strengthJoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedMovement = strengthMovement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`Strength Testing: ${sideText} ${escapedJoint} ${escapedMovement} - Grade .+$`, 'gm');
    let newObjective = soapNote.objective;
    
    if (regex.test(soapNote.objective)) {
      // Replace existing
      newObjective = soapNote.objective.replace(regex, textToAdd);
    } else {
      // Append new
      newObjective = soapNote.objective ? `${soapNote.objective}\n${textToAdd}` : textToAdd;
    }
    
    setSoapNote({ ...soapNote, objective: newObjective });
    setHasUnsavedChanges(true);
    
    // Auto-create metric (optional)
    if (userProfile && editingSession?.client_id && editingSession?.id) {
      try {
        await supabase.from('progress_metrics').insert({
          client_id: editingSession.client_id,
          practitioner_id: userProfile.id,
          session_id: editingSession.id,
          metric_type: 'strength',
          metric_name: `Strength - ${sideText} ${strengthJoint} ${strengthMovement}`,
          value: STRENGTH_VALUE_MAP[strengthGrade] || 0,
          max_value: 5,
          unit: '/5',
          notes: `Auto-recorded from SOAP note - ${gradeName}`,
          session_date: editingSession.session_date || new Date().toISOString().split('T')[0],
          metadata: {
            joint: strengthJoint,
            side: strengthSide,
            movement: strengthMovement,
            grade: strengthGrade,
            grade_description: gradeName,
            source: 'soap_objective'
          }
        } as any);
      } catch (error) {
        console.error('Failed to auto-create metric:', error);
      }
    }
    
    // Reset fields
    setStrengthJoint('');
    setStrengthSide('right');
    setStrengthMovement('');
    setStrengthGrade('');
    toast.success('Strength test added to objective');
  };

  const handleCompleteNote = async () => {
    if (!editingSession?.id || !userProfile?.id) return;
    
    // First save the note if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSaveSOAPNote();
    }
    
    // ✅ OPTIMISTIC UPDATE - update UI immediately for instant feedback
    setCompletedSessions(prev => {
      const updated = new Set(prev);
      updated.add(editingSession.id);
      return updated;
    });
    setIsNoteCompleted(true);
    
    // Mark as completed by updating BOTH session_recordings AND treatment_notes
    try {
      // Get client_id from session if not available
      let clientId = editingSession.client_id;
      if (!clientId && editingSession.client_email) {
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', editingSession.client_email)
          .single();
        clientId = clientUser?.id;
      }
      
      // 1. Update/create session_recordings
      const { data: recordings } = await supabase
        .from('session_recordings')
        .select('id')
        .eq('session_id', editingSession.id)
        .eq('practitioner_id', userProfile.id);
      
      if (recordings && recordings.length > 0) {
        // Update ALL recordings to completed
        const { error: updateError } = await supabase
          .from('session_recordings')
          .update({ status: 'completed' } as any)
          .in('id', recordings.map(r => r.id));
        
        if (updateError) throw updateError;
      } else {
        // If no recording exists, create one with completed status
        const { data: newRecording, error: insertError } = await supabase
          .from('session_recordings')
          .insert({
            session_id: editingSession.id,
            practitioner_id: userProfile.id,
            client_id: clientId,
            status: 'completed',
            soap_subjective: soapNote.subjective || '',
            soap_objective: soapNote.objective || '',
            soap_assessment: soapNote.assessment || '',
            soap_plan: soapNote.plan || ''
          } as any)
          .select()
          .single();
        
        if (insertError) {
          console.error('Failed to create session_recording:', insertError);
          throw insertError;
        }
        
        if (!newRecording) {
          throw new Error('Failed to create session recording');
        }
      }
      
      // 2. Mark treatment_notes as completed (if they exist)
      // Update all treatment_notes for this session to status = 'completed'
      const { error: updateNotesError } = await supabase
        .from('treatment_notes')
        .update({ status: 'completed' })
        .eq('session_id', editingSession.id)
        .eq('practitioner_id', userProfile.id)
        .eq('status', 'draft'); // Only update draft notes
      
      if (updateNotesError) {
        console.error('Error updating treatment_notes status:', updateNotesError);
        // Don't throw - this is not critical, but log it
      }
      
      toast.success('Note completed. It can no longer be edited.');
    } catch (error) {
      console.error('Error completing note:', error);
      // Revert optimistic update on error
      setCompletedSessions(prev => {
        const updated = new Set(prev);
        updated.delete(editingSession.id);
        return updated;
      });
      setIsNoteCompleted(false);
      toast.error('Failed to complete note. Please try again.');
    }
  };

  const handleSaveSOAPNote = useCallback(async () => {
    if (!editingSession?.id || !userProfile?.id) {
      toast.error('Session information is required');
      return;
    }

    // Check if notes are already completed - prevent editing
    const completionStatus = await checkTreatmentNotesCompletion(editingSession.id, userProfile.id);
    if (completionStatus.isCompleted) {
      toast.error('Cannot edit completed notes. Notes have been finalized.');
      return;
    }

    setIsSavingSOAP(true);
    try {
      // Get client_id and session_date from session
      const { data: session } = await supabase
        .from('client_sessions')
        .select('client_id, session_date')
        .eq('id', editingSession.id)
        .single();
      
      if (!session?.client_id) {
        throw new Error('Could not find client for this session');
      }

      const clientId = session.client_id;
      const sessionDate = session.session_date || editingSession.session_date || new Date().toISOString().split('T')[0];
      const templateType = selectedTemplate;
      const sessionId = editingSession.id; // Always use the current session ID
      
      // Track corrections for learning
      const correctionsToStore: Array<{
        section: string;
        originalContent: string;
        correctedContent: string;
      }> = [];
      
      if (templateType === 'SOAP') {
        const sections = ['subjective', 'objective', 'assessment', 'plan'] as const;
        
        // Prepare upsert operations for all sections
        const operations = sections.map(async (section) => {
          const content = soapNote[section] || '';
          const existingNoteId = soapNote.noteIds?.[section];
          
          if (existingNoteId) {
            // Get original content to detect corrections
            const { data: existingNote } = await supabase
              .from('treatment_notes')
              .select('content')
              .eq('id', existingNoteId)
              .single();
            
            const originalContent = existingNote?.content || '';
            const correctedContent = content.trim();
            
            // Detect if content was changed (correction)
            if (originalContent !== correctedContent && originalContent.trim() !== '') {
              correctionsToStore.push({
                section,
                originalContent,
                correctedContent
              });
            }
            
            // Update existing note
            const { error } = await supabase
              .from('treatment_notes')
              .update({
                content: correctedContent,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingNoteId);
            
            if (error) throw error;
            return { section, id: existingNoteId, updated: true };
          } else {
            // Create new note (create even if empty to maintain structure)
            const { data, error } = await supabase
              .from('treatment_notes')
              .insert({
                session_id: sessionId, // Always use the session_id from editingSession
                practitioner_id: userProfile.id,
                client_id: clientId,
                note_type: section,
                content: content.trim(),
                template_type: 'SOAP',
                status: 'draft'
              })
              .select()
              .single();
            
            if (error) throw error;
            return { section, id: data.id, updated: false };
          }
        });

        // Execute all operations and get the results
        const results = await Promise.all(operations);
        
        // Store corrections in agent memory for learning
        if (correctionsToStore.length > 0) {
          try {
            // Get or create conversation
            const { data: convId } = await supabase.rpc('get_or_create_conversation', {
              p_user_id: userProfile.id,
              p_interface_type: 'soap-notes',
              p_context_id: sessionId || clientId || null,
              p_context_type: sessionId ? 'session' : clientId ? 'client' : null
            });

            if (convId) {
              // Store each correction
              for (const correction of correctionsToStore) {
                // Find the original AI-generated memory entry
                const { data: originalMemory } = await supabase
                  .from('agent_memory')
                  .select('id')
                  .eq('conversation_id', convId)
                  .eq('role', 'assistant')
                  .eq('content_type', 'soap-note')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();

                await supabase.from('agent_memory').insert({
                  conversation_id: convId,
                  user_id: userProfile.id,
                  role: 'user',
                  content: correction.correctedContent,
                  content_type: 'correction',
                  metadata: {
                    section: correction.section,
                    session_id: sessionId,
                    client_id: clientId
                  },
                  was_corrected: true,
                  correction_content: correction.originalContent,
                  correction_reason: 'Practitioner edited AI-generated content',
                  parent_memory_id: originalMemory?.id || null
                });
              }
              
              // Trigger learning from corrections (async, non-blocking)
              supabase.rpc('learn_from_corrections', { p_user_id: userProfile.id })
                .catch(() => {});
            }
          } catch (memoryError) {
            // Don't fail the save if memory storage fails
          }
        }
        
        // Update noteIds in soapNote state immediately with saved IDs
        const updatedNoteIds = { ...soapNote.noteIds };
        results.forEach((result) => {
          updatedNoteIds[result.section] = result.id;
        });
        
        // Update state with saved noteIds
        setSoapNote(prev => ({
          ...prev,
          noteIds: updatedNoteIds
        }));
      } else {
        // DAP template
        const sections = ['data', 'assessment', 'plan'] as const;
        
        const operations = sections.map(async (section) => {
          const content = dapNote[section] || '';
          const existingNoteId = dapNote.noteIds?.[section];
          
          if (existingNoteId) {
            const { error } = await supabase
              .from('treatment_notes')
              .update({
                content: content.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingNoteId);
            
            if (error) throw error;
            return { section, id: existingNoteId, updated: true };
          } else {
            const { data, error } = await supabase
              .from('treatment_notes')
              .insert({
                session_id: sessionId, // Always use the session_id from editingSession
                practitioner_id: userProfile.id,
                client_id: clientId,
                note_type: section,
                content: content.trim(),
                template_type: 'DAP',
                status: 'draft'
              })
              .select()
              .single();
            
            if (error) throw error;
            return { section, id: data.id, updated: false };
          }
        });

        const results = await Promise.all(operations);
        
        const updatedNoteIds = { ...dapNote.noteIds };
        results.forEach((result) => {
          updatedNoteIds[result.section] = result.id;
        });
        
        setDapNote(prev => ({
          ...prev,
          noteIds: updatedNoteIds
        }));
      }
      
      // Update session status to "completed" after saving SOAP note (only if currently "in_progress")
      if (sessionId && editingSession.status === 'in_progress') {
        try {
          const { error: statusError } = await supabase
            .from('client_sessions')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);
          
          if (statusError) {
            // Don't fail the save if status update fails
          } else {
            // Update local state to reflect the status change
            if (editingSession) {
              setEditingSession(prev => prev ? { ...prev, status: 'completed' } : prev);
            }
            // Refresh data to show updated status in UI
            debouncedLoadData();
          }
        } catch (statusUpdateError) {
          // Don't fail the save if status update fails
        }
      }
      
      toast.success(`${templateType} note saved successfully`, { duration: 3000 });
      
      // Update save status
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
      
      // Clear draft from localStorage after successful save
      if (editingSession.id) {
        localStorage.removeItem(`soap-draft-${editingSession.id}`);
        localStorage.removeItem(`dap-draft-${editingSession.id}`);
      }
      
      // Reset saving state immediately after successful save
      setIsSavingSOAP(false);
      
      // Automatically extract and insert metrics and goals from saved SOAP note (only for SOAP template)
      let shouldCloseModal = true;
      if (templateType === 'SOAP' && editingSession && clientId) {
        try {
          // Check if this is a new note (no existing notes) or an update
          // Only auto-extract on first save to avoid overwriting manually edited metrics
          const isNewNote = !soapNote.noteIds || 
            Object.values(soapNote.noteIds).every(id => !id);
          
          if (isNewNote && userProfile?.id) {
            const sessionDate = editingSession.session_date || new Date().toISOString().split('T')[0];
            
            // Auto-extract and insert metrics
            const metricResult = await autoInsertMetricsFromSOAP(
              editingSession.id,
              clientId,
              userProfile.id,
              sessionDate,
              soapNote.subjective || '',
              soapNote.objective || '',
              soapNote.assessment || '',
              soapNote.plan || '',
              {
                confidenceThreshold: 0.7,
                enableAutoInsert: true,
                skipDuplicates: true
              }
            );
            
            // Show results to user
            showMetricInsertResults(metricResult);
            
            // Auto-extract and insert goals
            const goals = await extractGoalsFromSoap(
              soapNote.subjective || '',
              soapNote.objective || '',
              soapNote.assessment || '',
              soapNote.plan || ''
            );
            
            if (goals.length > 0) {
              const goalResult = await autoInsertGoalsFromSOAP(
                editingSession.id,
                clientId,
                userProfile.id,
                goals,
                {
                  confidenceThreshold: 0.7,
                  enableAutoInsert: true,
                  skipDuplicates: true
                }
              );
              
              showGoalInsertResults(goalResult);
            }
          }
        } catch (error) {
          console.error('Error auto-extracting metrics/goals:', error);
          // Don't show error to user - SOAP note save was successful
          // Just log it for debugging
        }
      }
      
      // Close modal if no metrics to review or if DAP template
      if (shouldCloseModal) {
        setIsSessionNoteModalOpen(false);
      } else {
        // Reload notes to show saved content immediately
        await loadStructuredNotes(editingSession.id, clientId);
      }
      
      // Reload to refresh state - use a small delay to ensure DB commit
      setTimeout(async () => {
        await loadStructuredNotes(editingSession.id, clientId);
        // Check treatment notes after saving to enable HEP tab
        setTimeout(() => checkTreatmentNotes(), 200);
      }, 100);
    } catch (error: any) {
      console.error('Error saving note:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      let userFriendlyMessage = `Failed to save ${selectedTemplate} note.`;
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'You don\'t have permission to save this note. Please contact support if this persists.';
      } else if (errorMessage.length < 100) {
        userFriendlyMessage = `Failed to save ${selectedTemplate} note: ${errorMessage}`;
      }
      
      toast.error(userFriendlyMessage, { duration: 7000 });
      setIsSavingSOAP(false);
    }
  }, [editingSession, userProfile, soapNote, dapNote, selectedTemplate]);


  // Handle goal extraction from SOAP note
  const handleSuggestGoals = useCallback(async () => {
    if (!editingSession?.id || !userProfile?.id) {
      toast.error('Please select a session first');
      return;
    }

    if (!soapNote.subjective && !soapNote.objective && !soapNote.assessment && !soapNote.plan) {
      toast.error('Please enter SOAP note content first');
      return;
    }

    setLoadingGoalExtraction(true);
    try {
      const goals = await extractGoalsFromSoap(
        soapNote.subjective || '',
        soapNote.objective || '',
        soapNote.assessment || '',
        soapNote.plan || ''
      );

      if (goals.length === 0) {
        toast.info('No goals found in SOAP note. Goals are typically found in the Plan or Assessment sections.');
        setLoadingGoalExtraction(false);
        return;
      }

      setExtractedGoals(goals);
      setShowGoalReview(true);
    } catch (error: any) {
      console.error('Error extracting goals:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      let userFriendlyMessage = 'Failed to extract goals.';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      } else if (errorMessage.length < 100) {
        userFriendlyMessage = `Failed to extract goals: ${errorMessage}`;
      }
      toast.error(userFriendlyMessage, { duration: 7000 });
    } finally {
      setLoadingGoalExtraction(false);
    }
  }, [editingSession, userProfile, soapNote]);

  // Handle adding selected goals
  const handleAddSelectedGoals = useCallback(async (goals: ExtractedGoal[]) => {
    if (!editingSession?.id || !userProfile?.id || goals.length === 0) {
      return;
    }

    try {
      // Get client_id from session
      const { data: session } = await supabase
        .from('client_sessions')
        .select('client_id')
        .eq('id', editingSession.id)
        .single();

      if (!session?.client_id) {
        throw new Error('Could not find client for this session');
      }

      const clientId = session.client_id;

      // Insert goals using auto-insert function
      const result = await autoInsertGoalsFromSOAP(
        editingSession.id,
        clientId,
        userProfile.id,
        goals,
        { skipDuplicates: true }
      );

      showGoalInsertResults(result);
      setShowGoalReview(false);
      setExtractedGoals([]);
    } catch (error: any) {
      console.error('Error adding goals:', error);
      toast.error(`Failed to add goals: ${error.message || 'Unknown error'}`);
    }
  }, [editingSession, userProfile]);


  // Auto-save draft to localStorage every 30 seconds
  useEffect(() => {
    if (!editingSession?.id || !hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      const draftKey = selectedTemplate === 'SOAP' 
        ? `soap-draft-${editingSession.id}`
        : `dap-draft-${editingSession.id}`;
      const draft = selectedTemplate === 'SOAP' ? soapNote : dapNote;
      localStorage.setItem(draftKey, JSON.stringify(draft));
      // Don't show toast for auto-save to avoid interrupting user
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [soapNote, dapNote, editingSession?.id, hasUnsavedChanges, selectedTemplate]);

  // Keyboard shortcuts for SOAP note navigation
  useEffect(() => {
    if (!isSessionNoteModalOpen || !editingSession) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Ctrl/Cmd + S: Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          if (!isSavingSOAP && editingSession?.id && userProfile?.id) {
            handleSaveSOAPNote();
          }
          return;
        }
        return; // Don't handle other shortcuts when typing
      }

      // Ctrl/Cmd + 1-4 (SOAP) or 1-3 (DAP): Expand/collapse sections
      if (e.ctrlKey || e.metaKey) {
        const sections = selectedTemplate === 'SOAP' 
          ? ['subjective', 'objective', 'assessment', 'plan'] as const
          : ['data', 'assessment', 'plan'] as const;
        const sectionIndex = parseInt(e.key) - 1;
        
        if (sectionIndex >= 0 && sectionIndex < sections.length) {
          e.preventDefault();
          const section = sections[sectionIndex];
          setExpandedSections(prev => {
            if (prev.includes(section)) {
              // Collapse if already expanded
              return prev.filter(s => s !== section);
            } else {
              // Expand if collapsed
              return [...prev, section];
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionNoteModalOpen, editingSession, isSavingSOAP, userProfile?.id, handleSaveSOAPNote, selectedTemplate]);

  // Handle URL params for deep linking from messages
  useEffect(() => {
    const sessionId = searchParams.get('session');
    const subjectiveText = searchParams.get('subjective');
    const clientEmail = searchParams.get('client');
    const template = searchParams.get('template');

    if (sessionId && userProfile && sessions.length > 0 && clients.length > 0) {
      // Find the session and client
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        // Find and select the client
        const client = clients.find(c => c.client_email === session.client_email || c.client_email === clientEmail);
        if (client) {
          setSelectedClient(client);
          setActiveTab(searchParams.get('tab') || (template ? 'treatment-notes' : 'sessions'));
          
          // Check completion status BEFORE opening modal (prevents editing loophole)
          const checkAndOpenModal = async () => {
            if (userProfile?.id) {
              // Use utility function for consistent completion check
              const completionStatus = await checkTreatmentNotesCompletion(sessionId, userProfile.id);
              setIsNoteCompleted(completionStatus.isCompleted);
              setRecordingProcessingOrError(completionStatus.recordingProcessingOrError ?? false);

              // Update completedSessions state
              if (completionStatus.isCompleted) {
                setCompletedSessions(prev => {
                  const updated = new Set(prev);
                  updated.add(sessionId);
                  return updated;
                });
              }
              
              // Also call checkCompletionStatusForSessions for list view consistency
              await checkCompletionStatusForSessions([sessionId]);
            }
            
            // Open structured notes modal AFTER completion check
            setEditingSession(session);
            setIsSessionNoteModalOpen(true);
          };
          
          checkAndOpenModal();
          
          // If there's subjective text, populate the SOAP note template
          if (subjectiveText) {
            setTimeout(() => {
              setSoapNote(prev => ({
                ...prev,
                subjective: `**From client messages:**\n${decodeURIComponent(subjectiveText)}`
              }));
              setHasUnsavedChanges(true);
              setExpandedSections(['subjective', 'objective', 'assessment', 'plan']);
            }, 100);
          }
        }
      }
      
      // Clear URL params after handling
      setSearchParams({});
    }
  }, [searchParams, sessions, clients, userProfile, setSearchParams]);

  // Update clients when real-time data changes
  useEffect(() => {
    if (realtimeSessions && realtimeSessions.length > 0) {
      processClientData(realtimeSessions);
    }
  }, [realtimeSessions]);

  // Reload notes when client changes
  useEffect(() => {
    if (selectedClient) {
      // Load structured notes (including client management notes) for selected client
      const loadClientNotes = async () => {
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedClient.client_email)
          .single();
        if (clientUser) {
          await loadStructuredNotes(null, clientUser.id);
        }
      };
      loadClientNotes();
    }
  }, [selectedClient?.client_email]);

  // Resolve client ID for Progress tab when selectedClient changes
  useEffect(() => {
    const resolveProgressClientId = async () => {
      if (!selectedClient) {
        setResolvedProgressClientId(null);
        setResolvingProgressClientId(false);
        return;
      }

      setResolvingProgressClientId(true);
      // Get client_id from first session - filter sessions for this client
      const clientSessionsForClient = sessions.filter(s => s.client_email === selectedClient.client_email);
      const firstSession = clientSessionsForClient[0];
      if (firstSession) {
        const clientId = await resolveClientIdFromSession(firstSession);
        setResolvedProgressClientId(clientId);
      } else {
        // If no session found, try to resolve from email
        const { resolveClientId } = await import('@/lib/client-id-resolver');
        const clientId = await resolveClientId(selectedClient.client_email);
        setResolvedProgressClientId(clientId);
      }
      setResolvingProgressClientId(false);
    };
    resolveProgressClientId();
  }, [selectedClient?.client_email, sessions]);

  const processClientData = async (sessionsData: any[]) => {
    // Group sessions by client
    // Process all session statuses for navigation, but only count confirmed/completed with payment for totals
    const clientMap = new Map();
    
    sessionsData.forEach((session: any) => {
      // Process all session statuses (scheduled, confirmed, in_progress, completed)
      // This ensures navigation works from diary for all sessions
      // Filtering for payment status happens below for totals only
      
      // Only count sessions with completed payment status for totals
      // This ensures we show the correct amount paid
      if (session.payment_status && session.payment_status !== 'completed' && session.payment_status !== 'paid') {
        return;
      }
      
      const clientId = session.client_id;
      const clientName = session.client_name;
      const clientEmail = session.client_email;
      
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_email: clientEmail,
          client_name: clientName,
          total_sessions: 0,
          total_spent: 0,
          last_session: '',
          average_rating: 0,
          status: 'active',
          notes: '',
          health_goals: [],
          preferred_therapy_types: []
        });
      }
      
      const client = clientMap.get(clientId);
      client.total_sessions += 1;
      // Use the actual price from the session, ensuring it's a number
      client.total_spent += Number(session.price) || 0;
      
      if (session.session_date > client.last_session) {
        client.last_session = session.session_date;
      }
    });
    
    const clientsArray = Array.from(clientMap.values());
    
    // Note: Client notes are now loaded via loadStructuredNotes() when a client is selected
    // No need to load from client_notes table anymore
    
    setClients(clientsArray);
    setSessions(sessionsData);
  };


  // Create a structured treatment note
  const handleCreateStructuredNote = async (noteType: string, content: string, sessionId: string | null = null, templateType: 'SOAP' | 'DAP' | 'FREE_TEXT' = 'FREE_TEXT') => {
    if (!userProfile?.id || !content.trim()) {
      toast.error('Please provide note content');
      return;
    }

    try {
      // Get client_id from session if sessionId is provided
      let clientId = null;
      if (sessionId) {
        const { data: session } = await supabase
          .from('client_sessions')
          .select('client_id')
          .eq('id', sessionId)
          .single();
        if (session?.client_id) clientId = session.client_id;
      } else if (selectedClient) {
        // For standalone notes, get client_id from selectedClient
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedClient.client_email)
          .single();
        if (clientUser) clientId = clientUser.id;
      }

      const { data, error } = await supabase
        .from('treatment_notes')
        .insert({
          session_id: sessionId,
          practitioner_id: userProfile.id,
          client_id: clientId,
          note_type: noteType,
          content: content.trim(),
          template_type: templateType,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Note added successfully');
      setNewStructuredNoteContent('');
      await loadStructuredNotes(sessionId, clientId);
      // Check treatment notes after creating to enable HEP tab
      if (editingSession) {
        setTimeout(() => checkTreatmentNotes(), 200);
      }
    } catch (error: any) {
      console.error('Error creating structured note:', error);
      toast.error(`Failed to create note: ${error.message || 'Unknown error'}`);
    }
  };

  // Update a structured treatment note
  const handleUpdateStructuredNote = async (noteId: string, content: string) => {
    if (!content.trim()) {
      toast.error('Note content cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('treatment_notes')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Note updated successfully');
      setEditingStructuredNoteId(null);
      // Reload notes for the current session if editing
      if (editingSession?.id) {
        await loadStructuredNotes(editingSession.id, editingSession.client_id);
      } else {
        await loadStructuredNotes();
      }
      // Check treatment notes after updating to enable HEP tab
      if (editingSession) {
        setTimeout(() => checkTreatmentNotes(), 200);
      }
    } catch (error: any) {
      console.error('Error updating structured note:', error);
      toast.error(`Failed to update note: ${error.message || 'Unknown error'}`);
    }
  };

  // Delete a structured treatment note
  const handleDeleteStructuredNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const { error } = await supabase
        .from('treatment_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Note deleted successfully');
      // Reload notes for the current session if editing
      if (editingSession?.id) {
        await loadStructuredNotes(editingSession.id, editingSession.client_id);
      } else {
        await loadStructuredNotes();
      }
    } catch (error: any) {
      console.error('Error deleting structured note:', error);
      toast.error(`Failed to delete note: ${error.message || 'Unknown error'}`);
    }
  };

  // Helper function to calculate session number based on booking order
  const calculateSessionNumber = useCallback((session: ClientSession, allSessions: ClientSession[]): number => {
    // If session already has a number, use it
    if (session.session_number) {
      return session.session_number;
    }
    
    // Get all sessions for this client-practitioner pair (including all statuses for numbering)
    // Match by client_id if available, otherwise by client_email
    const clientSessions = allSessions
      .filter(s => {
        if (session.client_id) {
          return s.client_id === session.client_id;
        }
        return s.client_email === session.client_email;
      })
      .sort((a, b) => {
        // Sort by session_date first (ascending - earliest first)
        const dateA = new Date(a.session_date).getTime();
        const dateB = new Date(b.session_date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        // If same date, sort by created_at (ascending - earliest created first)
        const createdA = new Date(a.created_at || a.session_date).getTime();
        const createdB = new Date(b.created_at || b.session_date).getTime();
        return createdA - createdB;
      });
    
    // Find the index of this session (1-based)
    const index = clientSessions.findIndex(s => s.id === session.id);
    return index >= 0 ? index + 1 : 0;
  }, []);

  // Helper function to get adjacent sessions
  const getAdjacentSessions = useCallback((currentSession: ClientSession) => {
    // Get all sessions for this client-practitioner pair, sorted by booking order
    // Match by client_id if available, otherwise by client_email
    const clientSessions = sessions
      .filter(s => {
        if (currentSession.client_id) {
          return s.client_id === currentSession.client_id;
        }
        return s.client_email === currentSession.client_email;
      })
      .sort((a, b) => {
        // Sort by session_date first (ascending - earliest first)
        const dateA = new Date(a.session_date).getTime();
        const dateB = new Date(b.session_date).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        // If same date, sort by created_at (ascending - earliest created first)
        const createdA = new Date(a.created_at || a.session_date).getTime();
        const createdB = new Date(b.created_at || b.session_date).getTime();
        return createdA - createdB;
      });
    
    const currentIndex = clientSessions.findIndex(s => s.id === currentSession.id);
    
    return {
      previous: currentIndex > 0 ? clientSessions[currentIndex - 1] : null,
      next: currentIndex < clientSessions.length - 1 ? clientSessions[currentIndex + 1] : null,
    };
  }, [sessions]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (!userProfile?.id) {
        return;
      }

      // Lazy expiry: mark pending_payment bookings past expires_at as expired so they do not appear
      await supabase.rpc('expire_pending_payment_bookings').then(() => {}).catch(() => {});

      // Load client sessions for this practitioner (for session list display).
      // Include pending_payment so paid rows can normalize to confirmed in the UI.
      // Exclude treatment exchanges (is_peer_booking = true) - these are peer-to-peer, not clients
      const { data: allSessionsData, error: allSessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          client_id,
          client_email,
          client_name,
          session_date,
          start_time,
          session_type,
          price,
          status,
          notes,
          duration_minutes,
          created_at,
          updated_at,
          payment_status,
          session_number,
          is_peer_booking,
          pre_assessment_required,
          pre_assessment_completed,
          pre_assessment_form_id,
          appointment_type,
          visit_address
        `)
        .eq('therapist_id', userProfile.id)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'pending_payment'])
        .eq('is_peer_booking', false)  // Exclude treatment exchanges - these are peer-to-peer, not clients
        .order('session_date', { ascending: false });

      if (allSessionsError) {
        console.error('Error loading all client sessions:', allSessionsError);
        throw allSessionsError;
      }
      
      // Filter out peer bookings and non-actionable practitioner rows client-side as well (defensive)
      const clientSessionsOnly = (allSessionsData || []).filter((session: any) => 
        !session.is_peer_booking &&
        isPractitionerSessionVisible(session)
      );
      
      const sessionsArray = clientSessionsOnly.map(session => ({
        id: session.id,
        client_id: session.client_id,
        client_email: session.client_email || '',
        client_name: session.client_name || 'Unknown Client',
        session_date: session.session_date || '',
        session_type: session.session_type || '',
        price: session.price || 0,
        status: session.status || 'scheduled',
        notes: session.notes || '',
        duration_minutes: session.duration_minutes || 60,
        created_at: session.created_at,
        updated_at: session.updated_at,
        payment_status: session.payment_status,
        session_number: session.session_number,
        pre_assessment_required: session.pre_assessment_required ?? false,
        pre_assessment_completed: session.pre_assessment_completed ?? false,
        pre_assessment_form_id: session.pre_assessment_form_id || null,
        start_time: session.start_time ?? null,
        appointment_type: session.appointment_type ?? null,
        visit_address: session.visit_address ?? null
      }));
      
      setSessions(sessionsArray);
      
      // Check completion status for all sessions
      const sessionIds = sessionsArray.map(s => s.id);
      await checkCompletionStatusForSessions(sessionIds);

      // Load sessions with completed payments for client list
      // UX: Practitioners want to see clients who have paid, regardless of session status
      // This includes:
      //   - Scheduled sessions (upcoming, paid in advance)
      //   - In Progress sessions (currently happening, payment completed)
      //   - Completed sessions (past sessions, payment completed)
      // Excludes: 
      //   - cancelled and no_show (these don't represent active client relationships)
      //   - treatment exchanges (is_peer_booking = true) - these are peer-to-peer, not actual clients
      // This is the source of truth - no fallbacks, no assumptions
      const { data: paidSessionsData, error: paidSessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          client_id,
          client_email,
          client_name,
          session_date,
          session_type,
          price,
          status,
          payment_status,
          is_peer_booking
        `)
        .eq('therapist_id', userProfile.id)
        .in('payment_status', ['completed', 'paid'])
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'no_show')
        .eq('is_peer_booking', false)  // Exclude treatment exchanges - these are peer-to-peer, not clients
        .order('session_date', { ascending: false });

      if (paidSessionsError) {
        console.error('Error loading paid sessions:', paidSessionsError);
        console.error('Error details:', JSON.stringify(paidSessionsError, null, 2));
        throw paidSessionsError;
      }
      
      // Additional client-side filter to ensure we exclude cancelled/no_show and peer bookings (defensive)
      const validSessions = (paidSessionsData || []).filter((session: any) => 
        session.status !== 'cancelled' && 
        session.status !== 'no_show' &&
        !session.is_peer_booking  // Double-check: exclude treatment exchanges
      );

      // Aggregate clients from sessions with completed payments
      // Group by client_email (normalized) to handle guests and registered users
      // Each client appears once in the list, with aggregated stats from all their paid sessions
      // (scheduled, in_progress, and completed all count toward the client's total)
        const clientMap = new Map<string, Client>();
        
      validSessions.forEach((session: any) => {
        const email = session.client_email;
        if (!email) {
          return; // Skip sessions without email
        }
          
          // Normalize email: treat @gmail.com and @googlemail.com as the same
          const normalizedEmail = email.toLowerCase().replace('@googlemail.com', '@gmail.com');
          
          if (!clientMap.has(normalizedEmail)) {
            clientMap.set(normalizedEmail, {
              client_email: email, // Store the most recent email format
            client_name: session.client_name || email,
              total_sessions: 0,
              total_spent: 0,
            last_session: session.session_date || '',
              average_rating: 0,
            status: 'active',
              notes: '',
              health_goals: [],
              preferred_therapy_types: []
            });
          }
          
          const client = clientMap.get(normalizedEmail)!;
          client.total_sessions++;
        client.total_spent += Number(session.price) || 0;
          
        // Update last session date if this is more recent
          if (session.session_date && (!client.last_session || new Date(session.session_date) > new Date(client.last_session))) {
            client.last_session = session.session_date;
          }
        });

      // Fetch user details for clients who have client_id (registered users)
      const clientIds = Array.from(clientMap.values())
        .map(client => {
          // Find the client_id from the sessions for this email
          const session = validSessions.find((s: any) => {
            const normalized = (s.client_email || '').toLowerCase().replace('@googlemail.com', '@gmail.com');
            return normalized === client.client_email.toLowerCase().replace('@googlemail.com', '@gmail.com');
          });
          return session?.client_id;
        })
        .filter((id): id is string => id !== null && id !== undefined);

      let userDataMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone')
          .in('id', clientIds);
        
        if (usersData) {
          usersData.forEach((user: any) => {
            userDataMap.set(user.id, user);
          });
        }
      }

      // Enhance client data with user information where available
      const transformedClients = Array.from(clientMap.values()).map(client => {
        // Find matching session to get client_id
        const matchingSession = validSessions.find((s: any) => {
          const normalized = (s.client_email || '').toLowerCase().replace('@googlemail.com', '@gmail.com');
          return normalized === client.client_email.toLowerCase().replace('@googlemail.com', '@gmail.com');
        });
        
        // If we have user data, use it to enhance the client info
        if (matchingSession?.client_id && userDataMap.has(matchingSession.client_id)) {
          const userData = userDataMap.get(matchingSession.client_id);
          return {
            ...client,
            client_email: userData.email || client.client_email,
            client_name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || client.client_name,
          };
        }

        return client;
      });

      // Sort by last session date (most recent first)
      transformedClients.sort((a, b) => {
        if (!a.last_session) return 1;
        if (!b.last_session) return -1;
        return new Date(b.last_session).getTime() - new Date(a.last_session).getTime();
      });

      setClients(transformedClients);
      
      // Load structured notes for selected client if one is selected
      if (selectedClient) {
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedClient.client_email)
          .single();
        if (clientUser) {
          await loadStructuredNotes(null, clientUser.id);
        }
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(`Failed to load client data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  
  // Create a new client management note (standalone note, not linked to a session)
  const handleCreateClientManagementNote = async () => {
    if (!userProfile?.id || !selectedClient || !newClientManagementNoteContent.trim()) {
      toast.error('Please provide note content');
      return;
    }

    try {
      // Get client_id from selectedClient
      const { data: clientUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', selectedClient.client_email)
        .single();

      if (!clientUser) {
        toast.error('Could not find client user');
        return;
      }

      await handleCreateStructuredNote(
        'general',
        newClientManagementNoteContent,
        null, // session_id is null for client management notes
        'FREE_TEXT'
      );

      setNewClientManagementNoteContent('');
      // Reload notes to show the new one
      await loadStructuredNotes(null, clientUser.id);
    } catch (error: any) {
      console.error('Error creating client management note:', error);
      toast.error(`Failed to create note: ${error.message || 'Unknown error'}`);
    }
  };

  const getClientStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>;
      case 'inactive':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactive</Badge>;
      case 'new':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">New</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleMessageClient = async () => {
    if (!selectedClient || !userProfile) {
      toast.error('Please select a client first');
      return;
    }

    try {
      // Close any open modals/sheets before navigating
      setIsMessageModalOpen(false);
      setIsClientSheetOpen(false);
      setIsBookingModalOpen(false);

      // Get client user ID from email
      const { data: clientUser, error: clientError } = await supabase
        .from('users')
        .select('id')
        .eq('email', selectedClient.client_email)
        .single();

      if (clientError || !clientUser) {
        // Client doesn't have account - check if they have sessions (guest)
        const { data: guestSessions } = await supabase
          .from('client_sessions')
          .select('id')
          .eq('client_email', selectedClient.client_email)
          .eq('therapist_id', userProfile.id)
          .limit(1);

        if (guestSessions && guestSessions.length > 0) {
          // Guest has sessions - use guest messaging flow
          // Get or create guest conversation
          const { data: conversationId, error: convError } = await supabase
            .rpc('get_or_create_guest_conversation', {
              p_practitioner_id: userProfile.id,
              p_guest_email: selectedClient.client_email
            });

          if (convError || !conversationId) {
            toast.error('Failed to create conversation. Please try again.');
            return;
          }

          // Navigate to messages with conversation pre-selected
          navigate(`/messages?conversation=${conversationId}`);
          toast.success('Opening conversation...');
        } else {
          toast.error('Client not found. Please ensure the client has booked a session.');
        }
        return;
      }

      // Client has account - use normal flow
      // Create/get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        userProfile.id,
        clientUser.id
      );

      // Navigate to messages with conversation pre-selected
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleBookSession = () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      // Here you would typically send the message via your messaging system
      // For now, we'll just show a success message
      toast.success(`Message sent to ${selectedClient?.client_name}`);
      setMessageText('');
      setIsMessageModalOpen(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedClient || !userProfile) {
      toast.error('Please select a client first');
      return;
    }

    const appointmentType = bookingData.appointment_type ?? 'clinic';
    if (appointmentType === 'mobile' && !bookingData.visit_address?.trim()) {
      toast.error('Visit address is required for mobile sessions.');
      return;
    }
    if (!bookingData.session_date || !bookingData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get client user ID from email if available
      let clientId = null;
      try {
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', selectedClient.client_email)
          .single();
        if (clientUser) clientId = clientUser.id;
      } catch (err) {
        // Client ID lookup failed, continue without it
      }

      // Generate idempotency key
      const idempotencyKey = `${clientId || 'guest'}-${userProfile.id}-${bookingData.session_date}-${bookingData.start_time}`;

      // Create session using RPC function with validation
      const { data: bookingResult, error: rpcError } = await supabase
        .rpc('create_booking_with_validation', {
          p_therapist_id: userProfile.id,
          p_client_id: clientId,
          p_client_name: selectedClient.client_name,
          p_client_email: selectedClient.client_email,
          p_session_date: bookingData.session_date,
          p_start_time: bookingData.start_time,
          p_duration_minutes: bookingData.duration_minutes,
          p_session_type: bookingData.session_type,
          p_price: bookingData.price || 0,
          p_client_phone: null,
          p_notes: null,
          p_payment_status: 'pending',
          p_status: 'scheduled',
          p_idempotency_key: idempotencyKey,
          p_appointment_type: appointmentType,
          p_visit_address: appointmentType === 'mobile' ? bookingData.visit_address?.trim() || null : null
        });

      if (rpcError) throw rpcError;

      // Check RPC response (RPC returns JSONB, need to type assert)
      const result = bookingResult as any;
      if (!result || !result.success) {
        const errorCode = result?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = result?.error_message || 'Failed to create booking';
        
        if (errorCode === 'CONFLICT_BOOKING' || errorCode === 'CONFLICT_BLOCKED') {
          toast.error(errorMessage);
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Get the created session ID and fetch full data
      const sessionId = result.session_id;
      const { data: newSession, error: fetchError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      toast.success(`Session created successfully for ${selectedClient.client_name}`);
      setIsBookingModalOpen(false);
      
      // Reset form
      setBookingData({
        session_type: practitionerPreferences?.default_session_type || 'Treatment Session',
        session_date: new Date().toISOString().split('T')[0],
        start_time: practitionerPreferences?.default_session_time || '10:00',
        duration_minutes: practitionerPreferences?.default_duration_minutes || 60,
        price: 0,
        appointment_type: 'clinic',
        visit_address: ''
      });

      // Refresh data to show new session
      await loadData();
      
      // Optionally open note editor for the new session
      if (newSession) {
        const newClientSession: ClientSession = {
          id: newSession.id,
          client_id: clientId || undefined,
          client_email: selectedClient.client_email,
          client_name: selectedClient.client_name,
          session_date: newSession.session_date,
          session_type: newSession.session_type || bookingData.session_type,
          price: newSession.price || 0,
          status: newSession.status || 'scheduled',
          notes: '',
          duration_minutes: newSession.duration_minutes || bookingData.duration_minutes,
          created_at: newSession.created_at,
          updated_at: newSession.updated_at
        };
        // Optionally auto-open note editor
        // handleEditSessionNote(newClientSession);
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(`Failed to create booking: ${error.message || 'Unknown error'}`);
    }
  };

  // Check for treatment notes when session is selected
  useEffect(() => {
    if (editingSession) {
      checkTreatmentNotes();
    } else {
      setHasTreatmentNotes(false);
    }
  }, [editingSession]);

  // Open structured notes modal for session
  const handleEditSessionNote = async (session: ClientSession) => {
    if (!userProfile?.id) return;
    
    // Use utility function for consistent completion check (prevents loophole)
    try {
      const completionStatus = await checkTreatmentNotesCompletion(session.id, userProfile.id);
      setIsNoteCompleted(completionStatus.isCompleted);
      setRecordingProcessingOrError(completionStatus.recordingProcessingOrError ?? false);

      // Update completedSessions state
      if (completionStatus.isCompleted) {
        setCompletedSessions(prev => {
          const updated = new Set(prev);
          updated.add(session.id);
          return updated;
        });
        
        // Load completed note data for view-only mode
        let noteData: any = null;
        
        // Try to get data from session_recordings first
        const { data: recordings } = await supabase
          .from('session_recordings')
          .select('*')
          .eq('session_id', session.id)
          .eq('practitioner_id', userProfile.id);
        
        const completedRecording = recordings?.find((r: any) => r.status === 'completed');
        if (completedRecording) {
          noteData = {
            session_id: session.id,
            client_name: session.client_name,
            session_date: session.session_date,
            therapy_type: session.session_type,
            status: 'completed',
            soap_subjective: completedRecording.soap_subjective || '',
            soap_objective: completedRecording.soap_objective || '',
            soap_assessment: completedRecording.soap_assessment || '',
            soap_plan: completedRecording.soap_plan || '',
            session_notes: completedRecording.session_notes || '',
            chief_complaint: completedRecording.chief_complaint || ''
          };
        } else {
          // Fallback to treatment_notes
          const { data: treatmentNotes } = await supabase
            .from('treatment_notes')
            .select('*')
            .eq('session_id', session.id)
            .eq('practitioner_id', userProfile.id)
            .eq('template_type', 'SOAP');
          
          if (treatmentNotes && treatmentNotes.length > 0) {
            noteData = {
              session_id: session.id,
              client_name: session.client_name,
              session_date: session.session_date,
              therapy_type: session.session_type,
              status: 'completed',
              soap_subjective: treatmentNotes.find(n => n.note_type === 'subjective')?.content || '',
              soap_objective: treatmentNotes.find(n => n.note_type === 'objective')?.content || '',
              soap_assessment: treatmentNotes.find(n => n.note_type === 'assessment')?.content || '',
              soap_plan: treatmentNotes.find(n => n.note_type === 'plan')?.content || '',
              session_notes: '',
              chief_complaint: ''
            };
          }
        }
        
        setViewingCompletedNote(true);
        setCompletedNoteData(noteData);
        // Fetch addendum notes (corrections) for completed view
        const { data: addenda } = await supabase
          .from('treatment_notes')
          .select('id, content, created_at')
          .eq('session_id', session.id)
          .eq('practitioner_id', userProfile.id)
          .eq('note_type', 'general')
          .eq('template_type', 'FREE_TEXT')
          .eq('status', 'completed')
          .order('created_at', { ascending: true });
        setAddendumNotes((addenda || []).map((a) => ({ id: a.id, content: a.content || '', created_at: a.created_at || '' })));
      } else {
        setViewingCompletedNote(false);
        setCompletedNoteData(null);
        setAddendumNotes([]);
      }
    } catch (error) {
      console.error('Error checking completion status:', error);
      // On error, default to edit mode (safer than blocking access)
      setIsNoteCompleted(false);
      setViewingCompletedNote(false);
      setCompletedNoteData(null);
    }
    
    // Set editing session AFTER completion check (prevents timing loophole)
    setEditingSession(session);
    
    setIsSessionNoteModalOpen(true);
    
    // Check for existing treatment notes (only if not completed)
    if (!completionStatus.isCompleted) {
      setTimeout(() => checkTreatmentNotes(), 100);
    }
  };

  const getStatusBadge = (session: { status?: string | null; payment_status?: string | null }) => {
    const displayStatus = getDisplaySessionStatus(session);
    switch (displayStatus) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'confirmed':
        return <Badge variant="secondary">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/40">In Progress</Badge>;
      case 'pending_approval':
        return <Badge variant="outline">Pending Approval</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'pending_payment':
        return <Badge variant="outline">Pending Payment</Badge>;
      default:
        return <Badge variant="outline">{getDisplaySessionStatusLabel(session)}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type?.toLowerCase() || '';
    if (lowerType.includes('assessment')) return <Stethoscope className="h-4 w-4" />;
    if (lowerType.includes('massage')) return <Heart className="h-4 w-4" />;
    if (lowerType.includes('therapy')) return <Activity className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Helper function to format transcript from utterances
  const formatTranscriptFromUtterances = (utterances: Utterance[]): string => {
    return utterances.map(utterance => `Speaker ${utterance.speaker}: ${utterance.text}`).join('\n\n');
  };

  // Get formatted transcript - use utterances if available and diarization was enabled, otherwise use plain text
  // If transcript has been manually edited (doesn't match formatted utterances), use the edited version
  const getFormattedTranscript = (): string => {
    if (diarization && utterances && utterances.length > 0) {
      const formattedFromUtterances = formatTranscriptFromUtterances(utterances);
      // If transcript matches the formatted version, use it (or if transcript is empty, use formatted)
      // Otherwise, user has edited it, so use their edited version
      if (transcript === formattedFromUtterances || !transcript) {
        return formattedFromUtterances;
      }
    }
    return transcript;
  };

  // AI SOAP Notes functions
  const handleTranscribe = async () => {
    if (!recording) {
      toast.error('Please record audio first');
      return;
    }
    // Transcription is handled automatically when recording stops
  };

  const handleGenerateSoap = async () => {
    if (!transcript.trim()) {
      toast.error('Please transcribe audio first or enter a transcript');
      return;
    }
    try {
      setLoadingSoap(true);
      // Extract plain text from transcript (remove speaker labels if present)
      // This handles both formatted transcripts with speaker labels and plain text
      const plainText = transcript.replace(/^Speaker [A-Z]:\s*/gm, '').trim();
      const soap = await generateSoapNotes(plainText, {
        sessionType: editingSession?.session_type,
        clientId: editingSession?.client_id,
        sessionId: editingSession?.id
      });
      setGeneratedSoap(soap);
      setSoapFeedback(null); // Reset feedback when new SOAP is generated
      
      // Get the memory ID of the last generated SOAP note for feedback tracking
      if (editingSession?.id && userProfile?.id) {
        try {
          const { data: convId } = await supabase.rpc('get_or_create_conversation', {
            p_user_id: userProfile.id,
            p_interface_type: 'soap-notes',
            p_context_id: editingSession.id,
            p_context_type: 'session'
          });
          
          if (convId) {
            // Find the most recent assistant memory entry (the SOAP note we just generated)
            const { data: memoryEntry } = await supabase
              .from('agent_memory')
              .select('id')
              .eq('conversation_id', convId)
              .eq('role', 'assistant')
              .eq('content_type', 'soap-note')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (memoryEntry) {
              setLastGeneratedSoapMemoryId(memoryEntry.id);
            }
          }
        } catch (error) {
          // Error tracking SOAP memory ID - non-fatal
        }
      }
      
      toast.success('SOAP notes generated successfully');
    } catch (error: any) {
      // Log full error details for debugging
      console.error('SOAP generation error:', {
        message: error?.message,
        status: error?.status,
        originalError: error?.originalError,
        context: error?.context,
        stack: error?.stack,
      });

      // Extract error message
      let errorMessage = error?.message || 'Unknown error occurred';
      
      // Detect common error types and provide user-friendly messages
      if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.';
      } else if (error?.status === 403) {
        errorMessage = 'Pro plan required. Please upgrade to use AI SOAP notes generation.';
      } else if (error?.status === 400) {
        // Keep the detailed validation error message from backend
        errorMessage = error?.message || 'Invalid request. Please check your transcript.';
      } else if (error?.status === 500) {
        // Check for missing API key error
        if (error?.message?.includes('GROQ_API_KEY') || error?.message?.includes('API key')) {
          errorMessage = 'AI service configuration error. Please contact support.';
        } else {
          errorMessage = error?.message || 'Server error. Please try again later.';
        }
      }
      
      toast.error(`Failed to generate SOAP notes: ${errorMessage}`);
    } finally {
      setLoadingSoap(false);
    }
  };

  // Store feedback for SOAP notes
  const storeSoapFeedback = async (feedback: 'positive' | 'negative', memoryId: string) => {
    if (!userProfile?.id || !editingSession?.id) return;
    
    try {
      // Update the memory entry with feedback
      await supabase
        .from('agent_memory')
        .update({
          feedback_score: feedback === 'positive' ? 5 : 1,
          feedback_notes: feedback === 'positive' ? 'User found SOAP note helpful' : 'User found SOAP note not helpful'
        })
        .eq('id', memoryId);
      
      // Trigger learning from feedback
      await supabase.rpc('learn_from_corrections', { p_user_id: userProfile.id })
        .catch(() => {});
    } catch (error) {
      // Error storing feedback - non-fatal
    }
  };

  const insertGeneratedSoap = async () => {
    if (!generatedSoap) return;
    
    // If editing a specific note with AI, update that note directly
    if (aiEditingNoteId) {
      try {
        // Find which section this note belongs to
        const note = structuredNotes.find(n => n.id === aiEditingNoteId);
        if (!note) {
          toast.error('Note not found');
          return;
        }
        
        // Get the appropriate content based on note type
        let contentToUpdate = '';
        if (note.note_type === 'subjective') {
          contentToUpdate = generatedSoap.subjective || '';
        } else if (note.note_type === 'objective') {
          contentToUpdate = generatedSoap.objective || '';
        } else if (note.note_type === 'assessment') {
          contentToUpdate = generatedSoap.assessment || '';
        } else if (note.note_type === 'plan') {
          contentToUpdate = generatedSoap.plan || '';
        } else if (note.note_type === 'general') {
          // For client management notes, combine all SOAP sections or use transcript
          // Prefer a summary combining all sections, or fall back to transcript
          const combinedContent = [
            generatedSoap.subjective,
            generatedSoap.objective,
            generatedSoap.assessment,
            generatedSoap.plan
          ].filter(Boolean).join('\n\n');
          contentToUpdate = combinedContent || transcript || '';
        }
        
        if (contentToUpdate) {
          // Update the specific note
          const { error } = await supabase
            .from('treatment_notes')
            .update({ 
              content: contentToUpdate.trim(), 
              updated_at: new Date().toISOString() 
            })
            .eq('id', aiEditingNoteId);
          
          if (error) throw error;
          
          toast.success('Note updated with AI-generated content');
          setAiEditingNoteId(null);
          setGeneratedSoap(null);
          setSessionNoteModalTab('structured'); // Switch back to structured notes tab
          
          // Reload notes - handle both session notes and client management notes
          if (editingSession?.id) {
            await loadStructuredNotes(editingSession.id, editingSession.client_id);
          } else if (selectedClient) {
            // For client management notes, reload by client_id
            const { data: clientUser } = await supabase
              .from('users')
              .select('id')
              .eq('email', selectedClient.client_email)
              .single();
            if (clientUser) {
              await loadStructuredNotes(null, clientUser.id);
            }
          }
        } else {
          toast.error('No content generated for this note type');
        }
      } catch (error: any) {
        console.error('Error updating note with AI content:', error);
        toast.error(`Failed to update note: ${error.message || 'Unknown error'}`);
      }
      return;
    }
  };

  const startRecording = async () => {
    const consent = window.confirm('With your consent, we will record audio for transcription and store it securely. Proceed?');
    if (!consent) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          // Step 1: Transcribe
          setAutoProcessingStep('transcribing');
          setLoadingTranscribe(true);
          const storagePath = await uploadAudioReturnPath(blob);
          const res = await transcribeFile(storagePath, { isStoragePath: true, languageCode: language, speakerLabels: diarization });
          
          if (res.status === 'completed' && res.text) {
            // Store utterances if available
            if (res.utterances && res.utterances.length > 0) {
              setUtterances(res.utterances);
              // Set transcript to formatted version if diarization is enabled
              if (diarization) {
                setTranscript(formatTranscriptFromUtterances(res.utterances));
              } else {
                setTranscript(res.text);
              }
            } else {
              // No utterances, use plain text
              setUtterances(null);
              setTranscript(res.text);
            }
            
            // Step 2: Auto-generate SOAP notes (if session is selected)
            if (editingSession?.id && res.text.trim()) {
              try {
                setAutoProcessingStep('generating');
                setLoadingSoap(true);
                
                // Extract plain text from transcript (remove speaker labels if present)
                const plainText = res.text.replace(/^Speaker [A-Z]:\s*/gm, '').trim();
                const soap = await generateSoapNotes(plainText, {
                  sessionType: editingSession?.session_type,
                  clientId: editingSession?.client_id,
                  sessionId: editingSession?.id
                });
                
                setGeneratedSoap(soap);
                setSoapFeedback(null); // Reset feedback when new SOAP is generated
                
                // Get the memory ID of the last generated SOAP note for feedback tracking
                if (userProfile?.id) {
                  try {
                    const { data: convId } = await supabase.rpc('get_or_create_conversation', {
                      p_user_id: userProfile.id,
                      p_interface_type: 'soap-notes',
                      p_context_id: editingSession.id,
                      p_context_type: 'session'
                    });
                    
                    if (convId) {
                      // Find the most recent assistant memory entry (the SOAP note we just generated)
                      const { data: memoryEntry } = await supabase
                        .from('agent_memory')
                        .select('id')
                        .eq('conversation_id', convId)
                        .eq('role', 'assistant')
                        .eq('content_type', 'soap-note')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                      
                      if (memoryEntry) {
                        setLastGeneratedSoapMemoryId(memoryEntry.id);
                      }
                    }
                  } catch (error) {
                    // Error tracking SOAP memory ID - non-fatal
                  }
                }
                
                // AI notes generated successfully
                setAutoProcessingStep('complete');
                toast.success('SOAP notes generated successfully');
              } catch (error: any) {
                console.error('SOAP generation error:', error);
                setAutoProcessingStep('idle');
                
                // Extract error message
                let errorMessage = error?.message || 'Unknown error occurred';
                
                // Detect common error types and provide user-friendly messages
                if (error?.status === 401) {
                  errorMessage = 'Authentication failed. Please sign in again.';
                } else if (error?.status === 403) {
                  errorMessage = 'Pro plan required. Please upgrade to use AI SOAP notes generation.';
                } else if (error?.status === 400) {
                  errorMessage = error?.message || 'Invalid request. Please check your transcript.';
                } else if (error?.status === 500) {
                  if (error?.message?.includes('API key')) {
                    errorMessage = 'AI service configuration error. Please contact support.';
                  } else {
                    errorMessage = error?.message || 'Server error. Please try again later.';
                  }
                }
                
                toast.error(`Failed to generate SOAP notes: ${errorMessage}. You can try generating manually.`);
              } finally {
                setLoadingSoap(false);
              }
            } else {
              // No session selected or no transcript, just show transcription success
              setAutoProcessingStep('complete');
              toast.success('Audio transcribed successfully');
            }
          } else {
            setAutoProcessingStep('idle');
            toast.info('Transcription processing, please try again shortly.');
          }
        } catch (error: any) {
          console.error('Transcription error:', error);
          setAutoProcessingStep('idle');
          toast.error(`Transcription failed: ${error.message || 'Unknown error'}. Please try again.`);
        } finally {
          setLoadingTranscribe(false);
          // Reset auto-processing step after a delay if not already complete
          setTimeout(() => {
            setAutoProcessingStep(prev => prev === 'complete' ? 'complete' : 'idle');
          }, 2000);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.error(e);
      toast.error('Microphone permission denied or unavailable.');
    }
  };

  const stopRecording = async () => {
    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } finally {
      setRecording(false);
      setRecordingTime(0);
    }
  };

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset AI tools when modal closes
  useEffect(() => {
    if (!isSessionNoteModalOpen) {
      setTranscript('');
      setUtterances(null);
      setGeneratedSoap(null);
      setShowAiTools(false);
      setRecording(false);
      setRecordingTime(0);
      setAutoProcessingStep('idle');
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isSessionNoteModalOpen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Deprecated single-note saver replaced by history-based CRUD


  const clientSessions = sessions
    .filter(session => {
    if (!isPractitionerSessionVisible(session)) {
      return false;
    }
    // Filter by selected client (case-insensitive email matching, normalize @googlemail.com to @gmail.com)
    if (selectedClient) {
      const sessionEmail = session.client_email?.toLowerCase().replace('@googlemail.com', '@gmail.com') || '';
      const clientEmail = selectedClient.client_email?.toLowerCase().replace('@googlemail.com', '@gmail.com') || '';
      if (sessionEmail !== clientEmail) {
        return false;
      }
    }
    return true;
    })
    .sort((a, b) => {
      // Sort by session_date descending (most recent first)
      const dateA = new Date(a.session_date).getTime();
      const dateB = new Date(b.session_date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      // If same date, sort by session_number descending (higher number = more recent)
      const numA = a.session_number || 0;
      const numB = b.session_number || 0;
      if (numB !== numA) {
        return numB - numA;
      }
      // If same session_number, sort by created_at descending (most recently created first)
      const createdA = new Date(a.created_at || 0).getTime();
      const createdB = new Date(b.created_at || 0).getTime();
      return createdB - createdA;
  });

  // Search functionality is now integrated into Sessions tab

  // Memoize filtered clients to prevent unnecessary recalculations
  // IMPORTANT: This must be called before any early returns to maintain hook order
  const filteredClients = useMemo(() => {
    if (!clients.length) return [];
    
    return clients
      .filter(client => {
        const matchesSearch = !searchTerm || 
          client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.client_email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by last_session_date descending (most recent activity first)
        // If no last_session, put at the end
        if (!a.last_session && !b.last_session) return 0;
        if (!a.last_session) return 1;
        if (!b.last_session) return -1;
        return new Date(b.last_session).getTime() - new Date(a.last_session).getTime();
      });
  }, [clients, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="p-6">
                <div className="h-6 bg-muted animate-pulse rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show loading skeleton during initial load
  if (loading && clients.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <FadeIn>
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <Skeleton className="h-10 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}</style>
      <div className="w-full max-w-none p-6 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)]">
          {/* Clients List - Desktop Sidebar (fixed width) */}
          <aside className="hidden lg:flex lg:w-80 xl:w-80 lg:shrink-0 flex-col gap-4 lg:h-full">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col h-full overflow-hidden min-h-0">
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-slate-400 text-xl" />
                </span>
                <input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-[border-color,background-color] duration-200 outline-none dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  type="text"
                />
                  </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredClients.length === 0 ? (
                <div className="p-12 text-center">
                    <Users className="h-12 w-12 text-slate-400/30 mx-auto mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                    {searchTerm || statusFilter !== 'all' ? 'No clients found' : 'No clients yet'}
                  </p>
                </div>
              ) : (
                  filteredClients.map((client) => {
                    const isSelected = selectedClient?.client_email === client.client_email;
                    return (
                      <div
                      key={client.client_email}
                      onClick={() => setSelectedClient(client)}
                        className={`group relative flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-[border-color,background-color] duration-200 ease-out ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
                      }`}
                    >
                        {isSelected && (
                          <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full"></div>
                        )}
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected
                            ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors'
                        }`}>
                            {client.client_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm truncate ${
                            isSelected
                              ? 'font-semibold text-slate-900 dark:text-white'
                              : 'font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}>
                              {client.client_name}
                          </h3>
                          <p className={`text-xs truncate ${
                            isSelected
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {client.total_sessions} sessions • £{client.total_spent.toFixed(2)}
                          </p>
                          </div>
                        {isSelected && (
                          <ChevronRight className="h-4 w-4 text-emerald-500 opacity-100" />
                        )}
                        </div>
                    );
                  })
              )}
        </div>
            </div>
          </aside>

        {/* Clients List - Mobile Sheet */}
        <div className="lg:hidden">
          <Sheet open={isClientSheetOpen} onOpenChange={setIsClientSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full mb-4" aria-label="Open client list">
                <Menu className="h-4 w-4 mr-2" />
                {selectedClient ? selectedClient.client_name : 'Select Client'}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Clients</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 transition-[border-color,background-color] duration-200 ease-out"
                    aria-label="Search clients"
                    type="search"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>
                <div className="divide-y divide-border/60 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No clients found</p>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.client_email}
                        className={`group relative p-4 cursor-pointer transition-[border-color,background-color] duration-200 ease-out hover:bg-muted/60 ${
                          selectedClient?.client_email === client.client_email 
                            ? 'bg-primary/5 border-l-2 border-l-primary shadow-sm' 
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedClient(client);
                          setIsClientSheetOpen(false);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedClient(client);
                            setIsClientSheetOpen(false);
                          }
                        }}
                        aria-label={`Select client ${client.client_name}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-border/40 transition-[border-color,box-shadow] duration-200 group-hover:ring-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {client.client_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm truncate transition-colors duration-200 group-hover:text-foreground">
                                {client.client_name}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {client.client_email}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {client.total_sessions} {client.total_sessions === 1 ? 'session' : 'sessions'}
                              </Badge>
                              <Badge variant="outline" className="text-xs font-semibold">
                                £{client.total_spent.toFixed(2)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

          {/* Client Details - Main Content (fills space beside sidebar) */}
          <main className="flex-1 min-w-0 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pb-6">
          {selectedClient ? (() => {
            // Calculate actual total from sessions to ensure accuracy
            // Include all paid sessions: scheduled, confirmed, in_progress, and completed
            // This gives practitioners a complete view of their relationship with the client
            const clientSessions = sessions.filter(s => 
              s.client_email === selectedClient.client_email &&
              (getDisplaySessionStatus(s) === 'scheduled' ||
                getDisplaySessionStatus(s) === 'confirmed' ||
                getDisplaySessionStatus(s) === 'in_progress' ||
                getDisplaySessionStatus(s) === 'completed') &&
              (s.payment_status === 'completed' || s.payment_status === 'paid')
            );
            const actualTotalSessions = clientSessions.length;
            const actualTotalSpent = clientSessions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
            // Use calculated values if they differ from client_profiles (more accurate)
            const displaySessions = actualTotalSessions > 0 ? actualTotalSessions : selectedClient.total_sessions;
            const displayTotal = actualTotalSpent > 0 ? actualTotalSpent : selectedClient.total_spent;
            
            return (
            <>
              {/* Client Header Card */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedClient.client_name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{selectedClient.client_email}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {displaySessions} sessions
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span>£{displayTotal.toFixed(2)} total</span>
                      </div>
                      </div>
                  <div className="flex flex-wrap gap-2">
                      {resolvedProgressClientId && (
                          <PatientHistoryRequest
                            clientId={resolvedProgressClientId}
                            clientName={selectedClient.client_name}
                          onRequestCreated={() => {}}
                          />
                      )}
                    <Button
                        onClick={handleMessageClient}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                      <MessageSquare className="h-4 w-4" />
                        Message
                    </Button>
                    </div>
                  </div>
              </div>
              <div className="flex flex-col gap-6">
                {/* Tab Navigation */}
                <div className="border-b border-slate-200 dark:border-slate-700">
                  <nav aria-label="Tabs" className="-mb-px flex flex-wrap gap-x-4 gap-y-2">
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                        activeTab === 'sessions'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Sessions</span>
                      <span className="sm:hidden">Sessions</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('progress')}
                      className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                        activeTab === 'progress'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Progress
                    </button>
                    <button
                      onClick={() => setActiveTab('goals')}
                      className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                        activeTab === 'goals'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Goals
                    </button>
                    <button
                      onClick={() => setActiveTab('exercise-programs')}
                      className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                        activeTab === 'exercise-programs'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <ListChecks className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden md:inline">Exercise Programs</span>
                      <span className="md:hidden">Exercises</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('history-requests')}
                      className={`whitespace-nowrap py-3 px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                        activeTab === 'history-requests'
                          ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden md:inline">History Requests</span>
                      <span className="md:hidden">History</span>
                    </button>
                  </nav>
                </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                <TabsContent value="sessions" className="space-y-6 mt-0">
                    {(() => {
                      const allClientSessions = sessions.filter(s => s.client_email === selectedClient.client_email);
                      const filteredSessions = allClientSessions.filter(session => {
                        if (!treatmentNotesSearch.trim()) return true;
                        const searchLower = treatmentNotesSearch.toLowerCase().trim();
                        const sessionType = (session.session_type || '').toLowerCase();
                        if (sessionType.includes(searchLower)) return true;
                        if ((session.notes || '').toLowerCase().includes(searchLower)) return true;
                        if ((session.client_name || '').toLowerCase().includes(searchLower)) return true;
                        const statusLabel = getDisplaySessionStatusLabel(session).toLowerCase();
                        if (statusLabel.includes(searchLower)) return true;
                        try {
                          const d = new Date(session.session_date);
                          if (format(d, 'MMMM d, yyyy').toLowerCase().includes(searchLower)) return true;
                          if (format(d, 'MMM d').toLowerCase().includes(searchLower)) return true;
                          if (format(d, 'd') === searchLower || format(d, 'yyyy') === searchLower) return true;
                        } catch (e) {}
                        if (session.start_time && String(session.start_time).toLowerCase().includes(searchLower)) return true;
                        const num = calculateSessionNumber(session, sessions);
                        if (num > 0 && String(num).includes(searchLower)) return true;
                        return false;
                      });

                      const now = new Date();
                      const toSessionTime = (s: typeof filteredSessions[0]) => new Date(`${s.session_date}T${s.start_time || '00:00:00'}`).getTime();
                      const pastSessions = filteredSessions.filter(s => toSessionTime(s) < now)
                        .sort((a, b) => toSessionTime(b) - toSessionTime(a));
                      const upcomingSessions = filteredSessions.filter(s => toSessionTime(s) >= now)
                        .sort((a, b) => toSessionTime(a) - toSessionTime(b));

                      // Single list: most recent / upcoming first (date descending), then older
                      const rowsForTable =
                        sessionsViewFilter === 'all'
                          ? [...filteredSessions].sort((a, b) => toSessionTime(b) - toSessionTime(a))
                          : sessionsViewFilter === 'past'
                            ? pastSessions
                            : upcomingSessions;
                      const hasRows = rowsForTable.length > 0;

                      if (filteredSessions.length === 0) {
                        return (
                          <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                              <Calendar className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">
                              {treatmentNotesSearch ? 'No sessions found' : 'No sessions yet'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {treatmentNotesSearch ? 'Try adjusting your search terms' : 'Sessions will appear here once scheduled'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          {/* Toolbar: segmented pills + search (reference style, our colours) */}
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="inline-flex rounded-[5px] overflow-hidden border border-border bg-card">
                              {(['all', 'past', 'upcoming'] as const).map((key, i) => {
                                const isActive = sessionsViewFilter === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSessionsViewFilter(key)}
                                    className={`h-10 px-4 py-2.5 flex items-center gap-2.5 border-r border-border last:border-r-0 text-sm font-medium transition-colors ${
                                      isActive
                                        ? 'bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                  >
                                    {key === 'all' ? 'All' : key === 'past' ? 'Past' : 'Upcoming'}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="relative flex-1 min-w-[220px] max-w-md w-full sm:w-auto">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <input
                                placeholder="Search sessions..."
                                value={treatmentNotesSearch}
                                onChange={(e) => setTreatmentNotesSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 rounded-[5px] border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-[border-color] duration-200"
                                type="text"
                              />
                            </div>
                          </div>

                          {/* Table: white/card rows, rounded first/last row, h-14 cells, column separation */}
                          <div className="rounded-[10px] border border-border bg-card">
                            <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground sm:hidden">
                              Swipe to see all session columns
                            </div>
                            <div className="w-full overflow-x-auto">
                            <Table className="min-w-[960px]">
                              <TableHeader>
                                <TableRow className="h-14 border-b border-border bg-card hover:bg-transparent">
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground w-[100px] rounded-tl-[10px] border-r border-border">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Calendar className="h-4 w-4" />
                                      Date
                                    </span>
                                  </TableHead>
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground min-w-[140px] border-r border-border">
                                    <span className="inline-flex items-center gap-1.5">
                                      <FileText className="h-4 w-4" />
                                      Session
                                    </span>
                                  </TableHead>
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Type</TableHead>
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">
                                    <span className="inline-flex items-center gap-1.5">
                                      <CheckCircle className="h-4 w-4" />
                                      Note
                                    </span>
                                  </TableHead>
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground border-r border-border">Pre-assessment</TableHead>
                                  <TableHead className="h-14 px-3.5 py-2.5 font-semibold text-foreground text-right w-12 rounded-tr-[10px]"> </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rowsForTable.map((session) => {
                                  const hasNotes = sessionsWithNotes.has(session.id);
                                  const isCompleted = completedSessions.has(session.id);
                                  const sessionDate = new Date(session.session_date);
                                  const sessionNum = calculateSessionNumber(session, sessions);
                                  return (
                                    <TableRow key={session.id} className="h-14 border-b border-border bg-card hover:bg-muted/50 group">
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle text-muted-foreground font-normal border-r border-border">
                                        <div className="flex items-center gap-2">
                                          <span className="text-foreground font-medium">{format(sessionDate, 'MMM d, yyyy')}</span>
                                          {session.start_time && (
                                            <span className="text-muted-foreground">{String(session.start_time).slice(0, 5)}</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle text-muted-foreground font-normal border-r border-border">
                                        {sessionNum > 0 && <span className="block text-foreground font-medium">Session #{sessionNum}</span>}
                                        {session.notes && <p className="text-sm line-clamp-2 max-w-[220px]">{session.notes}</p>}
                                      </TableCell>
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle text-muted-foreground font-normal border-r border-border">{session.session_type}</TableCell>
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle border-r border-border">
                                        {!hasNotes ? (
                                          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted-foreground/30 font-normal">
                                            Not Started
                                          </Badge>
                                        ) : isCompleted ? (
                                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Completed
                                          </span>
                                        ) : (
                                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-900/40 font-normal">
                                            In Progress
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle border-r border-border">
                                        <PreAssessmentStatus
                                          sessionId={session.id}
                                          preAssessmentCompleted={session.pre_assessment_completed}
                                          preAssessmentRequired={session.pre_assessment_required}
                                          showViewButton={false}
                                        />
                                      </TableCell>
                                      <TableCell className="h-14 px-3.5 py-2.5 align-middle text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditSessionNote(session)}
                                          className="text-muted-foreground hover:text-teal-600 hover:bg-teal-100/50 dark:hover:bg-teal-950/30"
                                        >
                                          View
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {!hasRows && (
                                  <TableRow className="border-b border-border bg-card">
                                    <TableCell colSpan={6} className="h-14 px-3.5 py-2.5 text-center text-muted-foreground text-sm">
                                      No sessions in this view. Try another filter or search.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>

                <TabsContent value="progress" className="space-y-6 mt-0">
                  {!selectedClient ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Select a client</h3>
                      <p className="text-sm text-muted-foreground">Choose a client to view their progress</p>
                    </div>
                  ) : resolvingProgressClientId ? (
                    <div className="text-center py-16">
                      <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading progress...</p>
                    </div>
                  ) : !resolvedProgressClientId ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Unable to load progress</h3>
                      <p className="text-sm text-muted-foreground">Please try selecting the client again</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <ClientProgressTracker
                        clientId={resolvedProgressClientId}
                        clientName={selectedClient.client_name}
                        readOnly={false}
                        defaultTab="progress"
                        hideInternalTabs={true}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="goals" className="space-y-6 mt-0">
                  {!selectedClient ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <Target className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Select a client</h3>
                      <p className="text-sm text-muted-foreground">Choose a client to manage their goals</p>
                    </div>
                  ) : resolvingProgressClientId ? (
                    <div className="text-center py-16">
                      <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading goals...</p>
                    </div>
                  ) : !resolvedProgressClientId ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Unable to load goals</h3>
                      <p className="text-sm text-muted-foreground">Please try selecting the client again</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <ClientProgressTracker
                        clientId={resolvedProgressClientId}
                        clientName={selectedClient.client_name}
                        readOnly={false}
                        defaultTab="goals"
                        hideInternalTabs={true}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="exercise-programs" className="space-y-6 mt-0">
                  {!selectedClient ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <Activity className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Select a client</h3>
                      <p className="text-sm text-muted-foreground">Choose a client to view their exercise programs</p>
                    </div>
                  ) : resolvingProgressClientId ? (
                    <div className="text-center py-16">
                      <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading programs...</p>
                    </div>
                  ) : !resolvedProgressClientId ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Unable to load programs</h3>
                      <p className="text-sm text-muted-foreground">Please try selecting the client again</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <ClientProgressTracker
                        clientId={resolvedProgressClientId}
                        clientName={selectedClient.client_name}
                        readOnly={false}
                        defaultTab="exercises"
                        hideInternalTabs={true}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history-requests" className="space-y-8 mt-0">
                  {!selectedClient ? (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-base font-semibold mb-1">Select a client</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a client to view history requests
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Incoming Requests</h3>
                          <p className="text-sm text-muted-foreground">
                            Requests from other practitioners to access {selectedClient.client_name}'s history
                          </p>
                        </div>
                        <PatientHistoryRequestList
                          mode="incoming"
                          onRequestUpdated={() => {
                            // Refresh any relevant data
                          }}
                        />
                      </div>
                      <div className="space-y-4 pt-6 border-t border-border/50">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">My Requests</h3>
                          <p className="text-sm text-muted-foreground">
                            Requests you've sent to access patient history from other practitioners
                          </p>
                        </div>
                        <PatientHistoryRequestList
                          mode="outgoing"
                          onRequestUpdated={() => {
                            // Refresh any relevant data
                          }}
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            </>
            );
          })() : (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a client</h3>
              <p className="text-sm text-muted-foreground">
                Choose a client from the list to view their details
                </p>
            </div>
          )}
          </main>
        </div>
        </div>

      {/* Message Modal */}
      <Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Book Session</DialogTitle>
            <DialogDescription>
              Create a new session booking for {selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="session-type">Session Type *</Label>
              <Select
                value={bookingData.session_type}
                onValueChange={(value) => setBookingData(prev => ({ ...prev, session_type: value }))}
              >
                <SelectTrigger id="session-type">
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial Consultation">Initial Consultation</SelectItem>
                  <SelectItem value="Treatment Session">Treatment Session</SelectItem>
                  <SelectItem value="Follow-up Session">Follow-up Session</SelectItem>
                  <SelectItem value="Sports Therapy">Sports Therapy</SelectItem>
                  <SelectItem value="Massage Therapy">Massage Therapy</SelectItem>
                  <SelectItem value="Osteopathic Treatment">Osteopathic Treatment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="session-duration">Duration (minutes) *</Label>
              <Select
                value={bookingData.duration_minutes.toString()}
                onValueChange={(value) => setBookingData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger id="session-duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="75">75 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userProfile?.therapist_type === 'hybrid' && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={bookingData.appointment_type ?? 'clinic'}
                  onValueChange={(v: 'clinic' | 'mobile') => setBookingData(prev => ({ ...prev, appointment_type: v, visit_address: v === 'clinic' ? '' : prev.visit_address }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinic">At clinic</SelectItem>
                    <SelectItem value="mobile">At client&apos;s address (mobile visit)</SelectItem>
                  </SelectContent>
                </Select>
                {bookingData.appointment_type === 'mobile' && (
                  <div>
                    <Label htmlFor="visit-address">Visit address *</Label>
                    <Input
                      id="visit-address"
                      placeholder="Client's full address"
                      value={bookingData.visit_address ?? ''}
                      onChange={(e) => setBookingData(prev => ({ ...prev, visit_address: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
            {userProfile && (
              <div>
                <Label>Date & Time *</Label>
                <CalendarTimeSelector
                  therapistId={userProfile.id}
                  duration={bookingData.duration_minutes}
                  requestedAppointmentType={(bookingData.appointment_type ?? 'clinic') as 'clinic' | 'mobile'}
                  therapistType={userProfile.therapist_type as 'clinic_based' | 'mobile' | 'hybrid' | null}
                  selectedDate={bookingData.session_date}
                  selectedTime={bookingData.start_time}
                  onDateTimeSelect={(date, time) => setBookingData(prev => ({ ...prev, session_date: date, start_time: time }))}
                  className="mt-2"
                />
              </div>
            )}
            <div>
              <Label htmlFor="session-price">Price (£)</Label>
              <Input
                id="session-price"
                type="number"
                step="0.01"
                min="0"
                value={bookingData.price || 0}
                onChange={(e) => setBookingData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBooking}>
              <Calendar className="h-4 w-4 mr-2" />
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Notes Modal */}
      <Dialog open={isSessionNoteModalOpen} onOpenChange={(open) => {
        setIsSessionNoteModalOpen(open);
        if (!open) {
          setViewingCompletedNote(false);
          setCompletedNoteData(null);
          setRecordingProcessingOrError(false);
          setAddendumNotes([]);
          setShowAddCorrectionModal(false);
          setCorrectionText('');
        }
      }}>
        <DialogContent className={viewingCompletedNote ? "max-w-5xl max-h-[95vh] overflow-y-auto" : "max-w-4xl max-h-[90vh] overflow-y-auto"}>
          <DialogHeader>
            <DialogTitle>
              {editingSession ? (
                <>
                  {viewingCompletedNote ? 'View Session Notes' : 'Session Notes'} • Session #{calculateSessionNumber(editingSession, sessions)} • {editingSession.session_type}
                </>
              ) : (
                'Session Notes'
              )}
            </DialogTitle>
            <DialogDescription>
              {editingSession && (
                <>
                  {format(new Date(editingSession.session_date), 'MMM dd, yyyy')}
                  {(() => {
                    const { sessionLocation, locationLabel } = getSessionLocation(editingSession, userProfile ?? undefined);
                    const locationText = sessionLocation
                      ? locationLabel === 'Visit address'
                        ? (sessionLocation === 'Visit address to be confirmed' ? 'Visit address to be confirmed' : `Visit at ${sessionLocation}`)
                        : `Clinic at ${sessionLocation}`
                      : null;
                    return locationText ? ` • Location: ${locationText}` : null;
                  })()}
                </>
              )}
              {viewingCompletedNote && ' • Completed Note (Read-only)'}
            </DialogDescription>
            {editingSession && (() => {
              const { sessionLocation, locationLabel } = getSessionLocation(editingSession, userProfile ?? undefined);
              const hasMappableVisitAddress =
                locationLabel === 'Visit address' &&
                !!sessionLocation &&
                sessionLocation !== 'Visit address to be confirmed';

              if (!hasMappableVisitAddress) return null;

              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sessionLocation)}`;
              return (
                <div className="pt-1">
                  <Button variant="outline" size="sm" asChild>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="h-4 w-4 mr-2" />
                      Get Directions
                    </a>
                  </Button>
                </div>
              );
            })()}
          </DialogHeader>
          
          {/* Session Navigation */}
          {editingSession && (() => {
            const { previous, next } = getAdjacentSessions(editingSession);
            return (previous || next) ? (
              <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-border" role="navigation" aria-label="Session navigation">
                  <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (previous && userProfile?.id) {
                      // Check completion status BEFORE navigating (prevents loophole)
                      const completionStatus = await checkTreatmentNotesCompletion(previous.id, userProfile.id);
                      setIsNoteCompleted(completionStatus.isCompleted);
                      setRecordingProcessingOrError(completionStatus.recordingProcessingOrError ?? false);

                      // Update completedSessions state
                      if (completionStatus.isCompleted) {
                        setCompletedSessions(prev => {
                          const updated = new Set(prev);
                          updated.add(previous.id);
                          return updated;
                        });
                        
                        // Load completed note data for view-only mode
                        let noteData: any = null;
                        const { data: recordings } = await supabase
                          .from('session_recordings')
                          .select('*')
                          .eq('session_id', previous.id)
                          .eq('practitioner_id', userProfile.id);
                        
                        const completedRecording = recordings?.find((r: any) => r.status === 'completed');
                        if (completedRecording) {
                          noteData = {
                            session_id: previous.id,
                            client_name: previous.client_name,
                            session_date: previous.session_date,
                            therapy_type: previous.session_type,
                            status: 'completed',
                            soap_subjective: completedRecording.soap_subjective || '',
                            soap_objective: completedRecording.soap_objective || '',
                            soap_assessment: completedRecording.soap_assessment || '',
                            soap_plan: completedRecording.soap_plan || '',
                            session_notes: completedRecording.session_notes || '',
                            chief_complaint: completedRecording.chief_complaint || ''
                          };
                        } else {
                          const { data: treatmentNotes } = await supabase
                            .from('treatment_notes')
                            .select('*')
                            .eq('session_id', previous.id)
                            .eq('practitioner_id', userProfile.id)
                            .eq('template_type', 'SOAP');
                          
                          if (treatmentNotes && treatmentNotes.length > 0) {
                            noteData = {
                              session_id: previous.id,
                              client_name: previous.client_name,
                              session_date: previous.session_date,
                              therapy_type: previous.session_type,
                              status: 'completed',
                              soap_subjective: treatmentNotes.find(n => n.note_type === 'subjective')?.content || '',
                              soap_objective: treatmentNotes.find(n => n.note_type === 'objective')?.content || '',
                              soap_assessment: treatmentNotes.find(n => n.note_type === 'assessment')?.content || '',
                              soap_plan: treatmentNotes.find(n => n.note_type === 'plan')?.content || '',
                              session_notes: '',
                              chief_complaint: ''
                            };
                          }
                        }
                        
                        setViewingCompletedNote(true);
                        setCompletedNoteData(noteData);
                        const { data: addenda } = await supabase
                          .from('treatment_notes')
                          .select('id, content, created_at')
                          .eq('session_id', previous.id)
                          .eq('practitioner_id', userProfile.id)
                          .eq('note_type', 'general')
                          .eq('template_type', 'FREE_TEXT')
                          .eq('status', 'completed')
                          .order('created_at', { ascending: true });
                        setAddendumNotes((addenda || []).map((a) => ({ id: a.id, content: a.content || '', created_at: a.created_at || '' })));
                      } else {
                        setViewingCompletedNote(false);
                        setCompletedNoteData(null);
                        setAddendumNotes([]);
                      }
                      
                      // Set editing session AFTER completion check
                      setEditingSession(previous);
                      loadStructuredNotes(previous.id, previous.client_id);
                    }
                  }}
                  disabled={!previous}
                  className="text-xs"
                  aria-label={previous ? `Navigate to previous session #${calculateSessionNumber(previous, sessions)}` : 'No previous session'}
                >
                  ← {previous ? `Session #${calculateSessionNumber(previous, sessions)}` : 'Previous'}
                </Button>
                <span className="text-xs text-muted-foreground" aria-live="polite">
                  Navigate between sessions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (next && userProfile?.id) {
                      // Check completion status BEFORE navigating (prevents loophole)
                      const completionStatus = await checkTreatmentNotesCompletion(next.id, userProfile.id);
                      setIsNoteCompleted(completionStatus.isCompleted);
                      setRecordingProcessingOrError(completionStatus.recordingProcessingOrError ?? false);

                      // Update completedSessions state
                      if (completionStatus.isCompleted) {
                        setCompletedSessions(prev => {
                          const updated = new Set(prev);
                          updated.add(next.id);
                          return updated;
                        });
                        
                        // Load completed note data for view-only mode
                        let noteData: any = null;
                        const { data: recordings } = await supabase
                          .from('session_recordings')
                          .select('*')
                          .eq('session_id', next.id)
                          .eq('practitioner_id', userProfile.id);
                        
                        const completedRecording = recordings?.find((r: any) => r.status === 'completed');
                        if (completedRecording) {
                          noteData = {
                            session_id: next.id,
                            client_name: next.client_name,
                            session_date: next.session_date,
                            therapy_type: next.session_type,
                            status: 'completed',
                            soap_subjective: completedRecording.soap_subjective || '',
                            soap_objective: completedRecording.soap_objective || '',
                            soap_assessment: completedRecording.soap_assessment || '',
                            soap_plan: completedRecording.soap_plan || '',
                            session_notes: completedRecording.session_notes || '',
                            chief_complaint: completedRecording.chief_complaint || ''
                          };
                        } else {
                          const { data: treatmentNotes } = await supabase
                            .from('treatment_notes')
                            .select('*')
                            .eq('session_id', next.id)
                            .eq('practitioner_id', userProfile.id)
                            .eq('template_type', 'SOAP');
                          
                          if (treatmentNotes && treatmentNotes.length > 0) {
                            noteData = {
                              session_id: next.id,
                              client_name: next.client_name,
                              session_date: next.session_date,
                              therapy_type: next.session_type,
                              status: 'completed',
                              soap_subjective: treatmentNotes.find(n => n.note_type === 'subjective')?.content || '',
                              soap_objective: treatmentNotes.find(n => n.note_type === 'objective')?.content || '',
                              soap_assessment: treatmentNotes.find(n => n.note_type === 'assessment')?.content || '',
                              soap_plan: treatmentNotes.find(n => n.note_type === 'plan')?.content || '',
                              session_notes: '',
                              chief_complaint: ''
                            };
                          }
                        }
                        
                        setViewingCompletedNote(true);
                        setCompletedNoteData(noteData);
                        const { data: addenda } = await supabase
                          .from('treatment_notes')
                          .select('id, content, created_at')
                          .eq('session_id', next.id)
                          .eq('practitioner_id', userProfile.id)
                          .eq('note_type', 'general')
                          .eq('template_type', 'FREE_TEXT')
                          .eq('status', 'completed')
                          .order('created_at', { ascending: true });
                        setAddendumNotes((addenda || []).map((a) => ({ id: a.id, content: a.content || '', created_at: a.created_at || '' })));
                      } else {
                        setViewingCompletedNote(false);
                        setCompletedNoteData(null);
                        setAddendumNotes([]);
                      }
                      
                      // Set editing session AFTER completion check
                      setEditingSession(next);
                      loadStructuredNotes(next.id, next.client_id);
                    }
                  }}
                  disabled={!next}
                  className="text-xs"
                  aria-label={next ? `Navigate to next session #${calculateSessionNumber(next, sessions)}` : 'No next session'}
                >
                  {next ? `Session #${calculateSessionNumber(next, sessions)}` : 'Next'} →
                </Button>
              </div>
            ) : null;
          })()}
          
          <div className="space-y-4">
            {viewingCompletedNote && completedNoteData ? (
              // Document View for Completed Notes - PDF-style formatting
              <div className="space-y-4">
                <div className="flex items-center pb-4 border-b">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Note Completed
                  </Badge>
                </div>
                <SOAPNoteDocumentView 
                  session={completedNoteData}
                  onBack={() => setIsSessionNoteModalOpen(false)}
                  addenda={addendumNotes}
                  onAddCorrection={() => setShowAddCorrectionModal(true)}
                />
              </div>
            ) : (
              // Editable Notes View
              <Tabs value={sessionNoteModalTab} onValueChange={setSessionNoteModalTab} className="w-full">
                {recordingProcessingOrError && !isNoteCompleted && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    AI transcription in progress or unavailable. You can complete notes manually below.
                  </div>
                )}
                <TabsList>
                  <TabsTrigger value="structured">Session Notes</TabsTrigger>
                </TabsList>

                {/* Session Notes Tab */}
                <TabsContent value="structured" className="space-y-4">
                  {editingSession ? (
                <div className="space-y-4">

                    {/* AI Recording Widget - Compact */}
                    {isPro && (
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold">AI Recording</span>
                            </div>
                          </div>
                          
                          {!recording && !transcript && (
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="default"
                                onClick={startRecording}
                                disabled={loadingTranscribe}
                                className="transition-[background-color,border-color] duration-200 ease-out active:scale-[0.98]"
                                aria-label="Start recording audio"
                              >
                                <Mic className="h-4 w-4 mr-2" />
                                Record Audio
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Record session audio to generate notes automatically
                              </span>
                            </div>
                          )}

                          {recording && (
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={stopRecording}
                                className="transition-[background-color,border-color] duration-200 ease-out active:scale-[0.98]"
                                aria-label="Stop recording audio"
                              >
                                <StopCircle className="h-4 w-4 mr-2" />
                                Stop Recording
                              </Button>
                              <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" aria-hidden="true" />
                                <span className="text-sm font-mono font-semibold text-destructive">
                                  {formatRecordingTime(recordingTime)}
                                </span>
                              </div>
                            </div>
                          )}

                          {transcript && !recording && (
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-muted-foreground">Transcript Ready</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded border border-border/40">
                                    {transcript.substring(0, 150)}{transcript.length > 150 ? '...' : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!generatedSoap && (
                                  <Button
                                    onClick={handleGenerateSoap}
                                    disabled={loadingSoap || !transcript.trim()}
                                    size="sm"
                                    className="transition-[background-color,border-color] duration-200 ease-out active:scale-[0.98]"
                                  >
                                    {loadingSoap ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3 mr-2" />
                                        Generate {selectedTemplate} Notes
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          {loadingTranscribe && !recording && (
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span className="text-xs text-muted-foreground">
                                Transcribing audio...
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Unified SOAP Note Template - Simplified */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{selectedTemplate} Note</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedTemplate === 'SOAP' ? '4 sections' : '3 sections'}
                            {hasUnsavedChanges && ' • Unsaved changes'}
                                  </p>
                          </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={selectedTemplate === 'SOAP' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTemplate('SOAP')}
                            disabled={isNoteCompleted}
                          >
                            SOAP
                          </Button>
                          <Button
                            variant={selectedTemplate === 'DAP' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTemplate('DAP')}
                            disabled={isNoteCompleted}
                          >
                            DAP
                          </Button>
                        </div>
                          </div>
                      
                      <div className="space-y-4">
                          {selectedTemplate === 'SOAP' ? (
                            <>
                            <div>
                              <Label htmlFor="subjective" className="text-sm font-medium mb-2 block">
                                Subjective (S)
                              </Label>
                                <Textarea
                                id="subjective"
                                placeholder="Patient-reported symptoms, history, chief complaint..."
                                  value={soapNote.subjective}
                                  onChange={(e) => {
                                    setSoapNote({ ...soapNote, subjective: e.target.value });
                                    setHasUnsavedChanges(true);
                                  }}
                                className="min-h-[120px]"
                                disabled={isNoteCompleted}
                                />
                              </div>

                            <div>
                              <Label htmlFor="objective" className="text-sm font-medium mb-2 block">
                                Objective (O)
                              </Label>
                              
                              {/* Suggested Prompts Section */}
                              {!isNoteCompleted && (
                                <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4 mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="font-semibold text-sm">Suggested Prompts (Optional)</span>
                                    <Badge variant="outline" className="ml-auto text-xs">Auto-populates metrics</Badge>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Pain Score */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium">Pain Score (VAS)</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <Select onValueChange={setPainArea} value={painArea}>
                                          <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Area of Pain" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {PAIN_AREAS.map((area) => (
                                              <SelectItem key={area} value={area}>
                                                {area}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select onValueChange={setPainScore} value={painScore}>
                                          <SelectTrigger className="w-full bg-background">
                                            <SelectValue placeholder="Score (0-10)" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[...Array(11)].map((_, i) => (
                                              <SelectItem key={i} value={i.toString()}>
                                                {i} - {i === 0 ? 'No Pain' : i === 10 ? 'Worst' : i < 4 ? 'Mild' : i < 7 ? 'Mod' : 'Severe'}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button onClick={addPainScore} size="sm" variant="secondary" className="w-full" disabled={!painArea || !painScore}>
                                        <Plus className="h-3 w-3 mr-1" /> Add to Objective
                                      </Button>
                                    </div>

                                    {/* Range of Motion */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium">Range of Motion (ROM)</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        <Select
                                          onValueChange={(value) => { setRomJoint(value); setRomMovement(''); }}
                                          value={romJoint}
                                        >
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue placeholder="Body Part" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {JOINTS.map((joint) => (
                                              <SelectItem key={joint} value={joint}>
                                                {joint}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Select onValueChange={(value: any) => setRomSide(value)} value={romSide}>
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="right">Right</SelectItem>
                                            <SelectItem value="left">Left</SelectItem>
                                            <SelectItem value="bilateral">Bilateral</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Select onValueChange={setRomMovement} value={romMovement} disabled={!romJoint}>
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue placeholder="Movement" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {romJoint && MOVEMENTS[romJoint]?.map((movement) => (
                                              <SelectItem key={movement} value={movement}>
                                                {movement}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <div className="relative">
                                          <Input 
                                            placeholder="Deg" 
                                            type="number"
                                            value={romDegrees}
                                            onChange={(e) => setRomDegrees(e.target.value)}
                                            className="bg-background pr-6 h-9 text-sm"
                                          />
                                          <span className="absolute right-2 top-2 text-muted-foreground text-xs">°</span>
                                        </div>
                                      </div>
                                      <Button onClick={addRom} size="sm" variant="secondary" className="w-full" disabled={!romJoint || !romMovement || !romDegrees}>
                                        <Plus className="h-3 w-3 mr-1" /> Add to Objective
                                      </Button>
                                    </div>

                                    {/* Strength Testing */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium">Strength Testing</Label>
                                      <div className="grid grid-cols-4 gap-2">
                                        <Select
                                          onValueChange={(value) => { setStrengthJoint(value); setStrengthMovement(''); }}
                                          value={strengthJoint}
                                        >
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue placeholder="Body Part" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {JOINTS.map((joint) => (
                                              <SelectItem key={joint} value={joint}>
                                                {joint}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Select onValueChange={(value: any) => setStrengthSide(value)} value={strengthSide}>
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="right">Right</SelectItem>
                                            <SelectItem value="left">Left</SelectItem>
                                            <SelectItem value="bilateral">Bilateral</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Select onValueChange={setStrengthMovement} value={strengthMovement} disabled={!strengthJoint}>
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue placeholder="Movement" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {strengthJoint && MOVEMENTS[strengthJoint]?.map((movement) => (
                                              <SelectItem key={movement} value={movement}>
                                                {movement}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Select onValueChange={setStrengthGrade} value={strengthGrade}>
                                          <SelectTrigger className="bg-background h-9">
                                            <SelectValue placeholder="Grade" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {STRENGTH_GRADES.map((grade) => (
                                              <SelectItem key={grade.value} value={grade.value}>
                                                {grade.value}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button onClick={addStrength} size="sm" variant="secondary" className="w-full" disabled={!strengthJoint || !strengthMovement || !strengthGrade}>
                                        <Plus className="h-3 w-3 mr-1" /> Add to Objective
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                                <Textarea
                                id="objective"
                                placeholder="Observable findings, measurements, examination results..."
                                  value={soapNote.objective}
                                  onChange={(e) => {
                                    setSoapNote({ ...soapNote, objective: e.target.value });
                                    setHasUnsavedChanges(true);
                                  }}
                                className="min-h-[120px]"
                                disabled={isNoteCompleted}
                                />
                              </div>
                            
                            <div>
                              <Label htmlFor="assessment" className="text-sm font-medium mb-2 block">
                                Assessment (A)
                              </Label>
                                <Textarea
                                id="assessment"
                                placeholder="Clinical impression, diagnosis, evaluation..."
                                  value={soapNote.assessment}
                                  onChange={(e) => {
                                    setSoapNote({ ...soapNote, assessment: e.target.value });
                                    setHasUnsavedChanges(true);
                                  }}
                                className="min-h-[120px]"
                                disabled={isNoteCompleted}
                                />
                              </div>
                            
                            <div>
                              <Label htmlFor="plan" className="text-sm font-medium mb-2 block">
                                Plan (P)
                              </Label>
                                <Textarea
                                id="plan"
                                placeholder="Treatment plan, interventions, exercises, follow-up..."
                                  value={soapNote.plan}
                                  onChange={(e) => {
                                    setSoapNote({ ...soapNote, plan: e.target.value });
                                    setHasUnsavedChanges(true);
                                  }}
                                className="min-h-[120px]"
                                disabled={isNoteCompleted}
                                />
                              </div>
                        </>
                          ) : (
                            <>
                            <div>
                              <Label htmlFor="data" className="text-sm font-medium mb-2 block">
                                Data (D)
                              </Label>
                                    <Textarea
                                id="data"
                                placeholder="Objective data, observations, measurements..."
                                      value={dapNote.data}
                                      onChange={(e) => {
                                        setDapNote({ ...dapNote, data: e.target.value });
                                        setHasUnsavedChanges(true);
                                      }}
                                className="min-h-[120px]"
                                    />
                                  </div>
                            
                            <div>
                              <Label htmlFor="dap-assessment" className="text-sm font-medium mb-2 block">
                                Assessment (A)
                              </Label>
                                    <Textarea
                                id="dap-assessment"
                                placeholder="Clinical judgment, diagnosis, analysis..."
                                      value={dapNote.assessment}
                                      onChange={(e) => {
                                        setDapNote({ ...dapNote, assessment: e.target.value });
                                        setHasUnsavedChanges(true);
                                      }}
                                className="min-h-[120px]"
                                    />
                                  </div>
                            
                            <div>
                              <Label htmlFor="dap-plan" className="text-sm font-medium mb-2 block">
                                Plan (P)
                              </Label>
                                    <Textarea
                                id="dap-plan"
                                placeholder="Treatment plan, interventions, follow-up..."
                                      value={dapNote.plan}
                                      onChange={(e) => {
                                        setDapNote({ ...dapNote, plan: e.target.value });
                                        setHasUnsavedChanges(true);
                                      }}
                                className="min-h-[120px]"
                                    />
                                  </div>
                            </>
                          )}
                              </div>
                      
                      {/* Save and Complete Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          {hasUnsavedChanges ? 'Unsaved changes' : lastSavedTime ? `Saved ${format(lastSavedTime, 'HH:mm')}` : ''}
                          {isNoteCompleted && ' • Completed'}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                              onClick={handleSaveSOAPNote}
                              disabled={isSavingSOAP || isNoteCompleted}
                          className="min-w-[140px]"
                            >
                              {isSavingSOAP ? (
                                <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Note
                                </>
                              )}
                            </Button>
                            {!isNoteCompleted && (
                              <Button
                                onClick={handleCompleteNote}
                                variant="outline"
                                className="flex-1 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                                disabled={isSavingSOAP}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Complete Note
                              </Button>
                            )}
                          </div>
                          </div>
                        </div>
                                </div>
                                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Please select a session to create or edit SOAP notes.
                      </p>
                    </div>
                </div>
                )}
              </TabsContent>
            </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Correction Modal (workaround for completed notes – RLS blocks direct edit) */}
      <Dialog open={showAddCorrectionModal} onOpenChange={(open) => {
        setShowAddCorrectionModal(open);
        if (!open) setCorrectionText('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add correction</DialogTitle>
            <DialogDescription>
              Add a correction or addendum to this completed note. The original note cannot be edited directly.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            placeholder="Enter correction or addendum..."
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddCorrectionModal(false); setCorrectionText(''); }}>
              Cancel
            </Button>
            <Button
              disabled={!correctionText.trim() || savingCorrection}
              onClick={async () => {
                if (!editingSession?.id || !userProfile?.id || !correctionText.trim()) return;
                setSavingCorrection(true);
                try {
                  const content = `[Correction - ${format(new Date(), 'dd MMM yyyy, HH:mm')}]: ${correctionText.trim()}`;
                  const { data, error } = await supabase
                    .from('treatment_notes')
                    .insert({
                      session_id: editingSession.id,
                      practitioner_id: userProfile.id,
                      client_id: editingSession.client_id ?? null,
                      note_type: 'general',
                      template_type: 'FREE_TEXT',
                      content,
                      status: 'completed',
                      timestamp: new Date().toISOString()
                    })
                    .select('id, content, created_at')
                    .single();
                  if (error) throw error;
                  setAddendumNotes((prev) => [...prev, { id: data.id, content: data.content || '', created_at: data.created_at || '' }]);
                  setShowAddCorrectionModal(false);
                  setCorrectionText('');
                  toast.success('Correction added');
                } catch (err: any) {
                  console.error('Error adding correction:', err);
                  toast.error('Failed to add correction');
                } finally {
                  setSavingCorrection(false);
                }
              }}
            >
              {savingCorrection ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Extraction Review Modal */}
      <UnifiedExtractionReview
        open={showGoalReview}
        onOpenChange={setShowGoalReview}
        goals={extractedGoals}
        onAddGoals={handleAddSelectedGoals}
        onSkip={() => {
          setShowGoalReview(false);
          setExtractedGoals([]);
        }}
      />
    </>
  );
};

export default PracticeClientManagement;
