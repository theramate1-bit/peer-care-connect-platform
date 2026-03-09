import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, User as UserIcon, Clock, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ClientProgressChart } from '@/components/client/ClientProgressChart';
import { HEPViewer } from '@/components/client/HEPViewer';
import { ClientSOAPNotesViewer } from '@/components/client/ClientSOAPNotesViewer';
import { HEPService, HomeExerciseProgram } from '@/lib/hep-service';
import { toast } from 'sonner';
import { parseDateSafe } from '@/lib/date';
import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-loaders';
import { EmptyNotes } from '@/components/ui/empty-state';

interface TreatmentNoteData {
  id: string;
  session_id?: string;
  note_type: string;
  content: string;
  created_at: string;
  updated_at: string;
  practitioner_id: string;
  template_type?: string;
  session?: {
    session_date: string;
    start_time?: string;
    duration_minutes?: number;
    session_type?: string;
  };
}

interface SessionNote {
  id: string;
  session_id?: string;
  practitioner_name: string;
  practitioner_id: string;
  session_date: string;
  note_type: string;
  created_at: string;
  updated_at: string;
  program_id?: string; // For HEPs
  hep_data?: HomeExerciseProgram; // Full HEP data
  // For treatment notes - store all notes for this session
  treatment_notes?: TreatmentNoteData[];
  template_type?: string;
}

const ClientNotes = () => {
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const hasFetchedNotes = useRef(false);

  useEffect(() => {
    if (userProfile && !hasFetchedNotes.current) {
      hasFetchedNotes.current = true;
      fetchNotes();
    }
  }, [userProfile]);

  const fetchNotes = async () => {
    if (!userProfile?.id) {
      console.warn('Cannot fetch notes: userProfile.id is missing');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch treatment notes - use left join to include notes even if session doesn't exist
      const { data: treatmentNotesData, error: treatmentNotesError } = await supabase
        .from('treatment_notes')
        .select(`
          id,
          session_id,
          note_type,
          content,
          created_at,
          updated_at,
          practitioner_id,
          template_type,
          session:client_sessions(
            session_date,
            start_time,
            duration_minutes,
            session_type
          )
        `)
        .eq('client_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (treatmentNotesError) {
        console.error('Error fetching treatment notes:', treatmentNotesError);
        const errorMessage = treatmentNotesError.message || 'Failed to load treatment notes';
        toast.error('Failed to load treatment notes', {
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => fetchNotes()
          },
          duration: 5000
        });
      }

      // Fetch HEPs (Home Exercise Programs / Exercise Prescription Sheets)
      const heps = await HEPService.getClientPrograms(userProfile.id);

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

      // Group treatment notes by session_id
      const notesBySession = new Map<string, TreatmentNoteData[]>();
      const notesWithoutSession: TreatmentNoteData[] = [];

      (treatmentNotesData || []).forEach(note => {
        if (note.session_id) {
          if (!notesBySession.has(note.session_id)) {
            notesBySession.set(note.session_id, []);
          }
          notesBySession.get(note.session_id)!.push(note);
        } else {
          notesWithoutSession.push(note);
        }
      });

      // Format treatment notes - create one entry per session
      const formattedTreatmentNotes: SessionNote[] = [];

      // Add grouped session notes
      notesBySession.forEach((notes, sessionId) => {
        if (notes.length === 0) return;
        
        const firstNote = notes[0];
        const practitioner = practitionerMap.get(firstNote.practitioner_id);
        
        // Determine template type more robustly
        // First check if any note has explicit template_type
        const explicitTemplate = notes.find(n => n.template_type && ['SOAP', 'DAP', 'FREE_TEXT'].includes(n.template_type))?.template_type;
        
        // If no explicit template, infer from note types
        let templateType: string;
        if (explicitTemplate) {
          templateType = explicitTemplate;
        } else {
          // Check for SOAP pattern (subjective, objective, assessment, plan)
          const hasSOAPTypes = notes.some(n => ['subjective', 'objective', 'assessment', 'plan'].includes(n.note_type));
          // Check for DAP pattern (data, assessment, plan)
          const hasDAPTypes = notes.some(n => ['data', 'assessment', 'plan'].includes(n.note_type));
          
          if (hasSOAPTypes && !hasDAPTypes) {
            templateType = 'SOAP';
          } else if (hasDAPTypes && !hasSOAPTypes) {
            templateType = 'DAP';
          } else if (hasSOAPTypes && hasDAPTypes) {
            // If both patterns exist, prefer SOAP if it has more notes
            const soapCount = notes.filter(n => ['subjective', 'objective', 'assessment', 'plan'].includes(n.note_type)).length;
            const dapCount = notes.filter(n => ['data', 'assessment', 'plan'].includes(n.note_type)).length;
            templateType = soapCount >= dapCount ? 'SOAP' : 'DAP';
          } else {
            templateType = 'FREE_TEXT';
          }
        }

        // Determine note type label for display
        let noteTypeLabel = templateType;
        if (templateType === 'SOAP') {
          noteTypeLabel = 'SOAP';
        } else if (templateType === 'DAP') {
          noteTypeLabel = 'DAP';
        } else {
          // For FREE_TEXT, use the most common note_type or first note's type
          const noteTypeCounts = new Map<string, number>();
          notes.forEach(n => {
            noteTypeCounts.set(n.note_type, (noteTypeCounts.get(n.note_type) || 0) + 1);
          });
          const mostCommonType = Array.from(noteTypeCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || notes[0].note_type;
          noteTypeLabel = mostCommonType === 'general' ? 'General Note' : mostCommonType;
        }

        formattedTreatmentNotes.push({
          id: `session-${sessionId}`,
          session_id: sessionId,
          practitioner_name: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unknown Practitioner',
          practitioner_id: firstNote.practitioner_id,
          session_date: firstNote.session?.session_date || firstNote.created_at,
          note_type: noteTypeLabel,
          created_at: notes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0].created_at,
          updated_at: notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0].updated_at,
          treatment_notes: notes,
          template_type: templateType
        });
      });

      // Add individual notes without sessions
      notesWithoutSession.forEach(note => {
        const practitioner = practitionerMap.get(note.practitioner_id);
        formattedTreatmentNotes.push({
          id: note.id,
          session_id: undefined,
          practitioner_name: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unknown Practitioner',
          practitioner_id: note.practitioner_id,
          session_date: note.created_at,
          note_type: note.template_type || note.note_type,
          created_at: note.created_at,
          updated_at: note.updated_at,
          treatment_notes: [note],
          template_type: note.template_type
        });
      });

      // Format HEPs as notes
      const formattedHEPNotes: SessionNote[] = heps.map(hep => {
        const practitioner = practitionerMap.get(hep.practitioner_id);
        return {
          id: `hep-${hep.id}`,
          program_id: hep.id,
          session_id: hep.session_id || undefined,
          practitioner_name: practitioner ? `${practitioner.first_name} ${practitioner.last_name}` : 'Unknown Practitioner',
          session_date: hep.start_date || hep.created_at || new Date().toISOString(),
          note_type: 'hep',
          created_at: hep.created_at || new Date().toISOString(),
          updated_at: hep.updated_at || new Date().toISOString(),
          hep_data: hep
        };
      });

      // Deduplicate HEPs by program_id to prevent showing the same HEP twice
      // Keep the most recent one if duplicates exist (prefer one with session_id)
      const seenHEPIds = new Map<string, SessionNote>();
      formattedHEPNotes.forEach(hep => {
        if (hep.program_id) {
          const existing = seenHEPIds.get(hep.program_id);
          if (!existing) {
            // First occurrence - keep it
            seenHEPIds.set(hep.program_id, hep);
          } else {
            // Duplicate found - keep the one with session_id if available, or most recent
            const shouldReplace = 
              (!existing.session_id && hep.session_id) || // New one has session_id, old doesn't
              (existing.session_id && hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)) || // Both have session_id, new is more recent
              (!existing.session_id && !hep.session_id && new Date(hep.created_at) > new Date(existing.created_at)); // Neither has session_id, new is more recent
            
            if (shouldReplace) {
              seenHEPIds.set(hep.program_id, hep);
            }
          }
        }
      });
      const uniqueHEPNotes = Array.from(seenHEPIds.values());

      // Combine and sort by created_at (most recent first)
      const allNotes = [...formattedTreatmentNotes, ...uniqueHEPNotes].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotes(allNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNoteTypeColor = (noteType: string) => {
    switch (noteType.toLowerCase()) {
      case 'soap':
        return 'bg-blue-100 text-blue-800';
      case 'dap':
        return 'bg-green-100 text-green-800';
      case 'free_text':
        return 'bg-purple-100 text-purple-800';
      case 'hep':
        return 'bg-orange-100 text-orange-800';
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
      default:
        return noteType.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    const date = parseDateSafe(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <ListSkeleton count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notes with Your Practitioners</h1>
          <p className="text-gray-600">
            View treatment notes, exercise programs (HEPs), and session documentation from your practitioners
          </p>
        </div>

        {notes.length === 0 ? (
          <EmptyNotes onFindPractitioners={() => window.location.href = '/marketplace'} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Session Notes
                  </CardTitle>
                  <CardDescription>
                    {notes.length} note{notes.length !== 1 ? 's' : ''} available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedNote?.id === note.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{note.practitioner_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(note.session_date)}
                          </p>
                        </div>
                        <Badge className={getNoteTypeColor(note.note_type)}>
                          {getNoteTypeLabel(note.note_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Created {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Note Viewer */}
            <div className="lg:col-span-2">
              {selectedNote ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {selectedNote.note_type === 'hep' ? (
                        <Activity className="h-5 w-5" />
                      ) : (
                        <UserIcon className="h-5 w-5" />
                      )}
                      {selectedNote.practitioner_name}
                    </CardTitle>
                    <CardDescription>
                      {selectedNote.note_type === 'hep' ? (
                        <>Exercise Program on {formatDate(selectedNote.session_date)} • Home Exercise Program (HEP)</>
                      ) : (
                        <>Session on {formatDate(selectedNote.session_date)} • {getNoteTypeLabel(selectedNote.note_type)} Note</>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedNote.note_type === 'hep' && selectedNote.program_id ? (
                      <HEPViewer programId={selectedNote.program_id} clientId={userProfile.id} />
                    ) : selectedNote.treatment_notes && selectedNote.treatment_notes.length > 0 ? (
                      <ClientSOAPNotesViewer
                        notes={selectedNote.treatment_notes}
                        sessionId={selectedNote.session_id}
                        sessionDate={selectedNote.session_date}
                        practitionerName={selectedNote.practitioner_name}
                      />
                    ) : selectedNote.session_id ? (
                      <ClientProgressChart 
                        clientId={userProfile.id} 
                        sessionId={selectedNote.session_id} 
                        readOnly={true} 
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Note content not available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a Note</h3>
                    <p className="text-muted-foreground">
                      Choose a note or exercise program from the list to view its contents
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientNotes;



