import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Save, 
  Clock, 
  User, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  BookOpen,
  ClipboardList,
  Type,
  Stethoscope,
  Target,
  Eye,
  Brain,
  Calendar,
  Play,
  Pause,
  StopCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface TreatmentNote {
  id: string;
  session_id: string;
  practitioner_id: string;
  client_id: string;
  note_type: 'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general';
  content: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedTreatmentNotesProps {
  sessionId: string;
  clientId: string;
  clientName: string;
  sessionStatus?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  onNotesUpdate?: (notes: TreatmentNote[]) => void;
}

type NoteFormat = 'soap' | 'dap' | 'free_text';
type NoteTiming = 'live' | 'post_session';

export const EnhancedTreatmentNotes: React.FC<EnhancedTreatmentNotesProps> = ({
  sessionId,
  clientId,
  clientName,
  sessionStatus = 'scheduled',
  onNotesUpdate
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TreatmentNote[]>([]);
  const [noteFormat, setNoteFormat] = useState<NoteFormat>('soap');
  const [noteTiming, setNoteTiming] = useState<NoteTiming>('live');
  const [currentNote, setCurrentNote] = useState('');
  const [selectedNoteType, setSelectedNoteType] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general'>('subjective');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [autoSave, setAutoSave] = useState(true);

  // Real-time subscription for treatment notes
  const { data: realtimeNotes } = useRealtimeSubscription(
    'treatment_notes',
    `session_id=eq.${sessionId}`,
    (payload) => {
      console.log('Real-time notes update:', payload);
      
      if (payload.eventType === 'INSERT') {
        setNotes(prev => [payload.new, ...prev]);
        if (onNotesUpdate) {
          onNotesUpdate([payload.new, ...notes]);
        }
      } else if (payload.eventType === 'UPDATE') {
        setNotes(prev => 
          prev.map(note => 
            note.id === payload.new.id ? payload.new : note
          )
        );
        if (onNotesUpdate) {
          onNotesUpdate(notes.map(note => 
            note.id === payload.new.id ? payload.new : note
          ));
        }
      } else if (payload.eventType === 'DELETE') {
        setNotes(prev => 
          prev.filter(note => note.id !== payload.old.id)
        );
        if (onNotesUpdate) {
          onNotesUpdate(notes.filter(note => note.id !== payload.old.id));
        }
      }
    }
  );

  useEffect(() => {
    fetchNotes();
  }, [sessionId]);

  useEffect(() => {
    // Auto-save functionality
    if (autoSave && currentNote.trim() && noteTiming === 'live') {
      const timer = setTimeout(() => {
        if (currentNote.trim()) {
          saveNote();
        }
      }, 3000); // Auto-save after 3 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [currentNote, autoSave, noteTiming]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_notes')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load treatment notes');
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!currentNote.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('treatment_notes')
        .insert({
          session_id: sessionId,
          practitioner_id: user?.id,
          client_id: clientId,
          note_type: selectedNoteType,
          content: currentNote.trim(),
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      setCurrentNote('');
      
      if (onNotesUpdate) {
        onNotesUpdate([data, ...notes]);
      }

      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const updateNote = async (noteId: string) => {
    if (!editContent.trim()) {
      toast.error('Please enter content');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('treatment_notes')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => 
        prev.map(note => 
          note.id === noteId 
            ? { ...note, content: editContent.trim(), updated_at: new Date().toISOString() }
            : note
        )
      );

      if (onNotesUpdate) {
        onNotesUpdate(notes.map(note => 
          note.id === noteId 
            ? { ...note, content: editContent.trim(), updated_at: new Date().toISOString() }
            : note
        ));
      }

      setEditingNote(null);
      setEditContent('');
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('treatment_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      if (onNotesUpdate) {
        onNotesUpdate(notes.filter(note => note.id !== noteId));
      }

      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const startEditing = (note: TreatmentNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'subjective': return <User className="h-4 w-4" />;
      case 'objective': return <Eye className="h-4 w-4" />;
      case 'assessment': return <Brain className="h-4 w-4" />;
      case 'plan': return <Target className="h-4 w-4" />;
      case 'data': return <ClipboardList className="h-4 w-4" />;
      case 'general': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'subjective': return 'bg-blue-100 text-blue-800';
      case 'objective': return 'bg-green-100 text-green-800';
      case 'assessment': return 'bg-purple-100 text-purple-800';
      case 'plan': return 'bg-orange-100 text-orange-800';
      case 'data': return 'bg-gray-100 text-gray-800';
      case 'general': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeLabel = (type: string) => {
    switch (type) {
      case 'subjective': return 'Subjective';
      case 'objective': return 'Objective';
      case 'assessment': return 'Assessment';
      case 'plan': return 'Plan';
      case 'data': return 'Data';
      case 'general': return 'General';
      default: return 'General';
    }
  };

  const getNoteFormatOptions = () => {
    switch (noteFormat) {
      case 'soap':
        return [
          { 
            value: 'subjective', 
            label: 'Subjective', 
            description: 'Patient-reported symptoms, history, pain levels, lifestyle factors',
            icon: <User className="h-4 w-4" />
          },
          { 
            value: 'objective', 
            label: 'Objective', 
            description: 'Therapist\'s measurable findings: posture, range of motion, palpation, test results',
            icon: <Eye className="h-4 w-4" />
          },
          { 
            value: 'assessment', 
            label: 'Assessment', 
            description: 'Clinical impression, progress compared to prior sessions, differential diagnosis',
            icon: <Brain className="h-4 w-4" />
          },
          { 
            value: 'plan', 
            label: 'Plan', 
            description: 'Treatment provided today, goals, home exercise advice, and next steps',
            icon: <Target className="h-4 w-4" />
          }
        ];
      case 'dap':
        return [
          { 
            value: 'data', 
            label: 'Data', 
            description: 'Combination of subjective + objective information',
            icon: <ClipboardList className="h-4 w-4" />
          },
          { 
            value: 'assessment', 
            label: 'Assessment', 
            description: 'Therapist\'s interpretation of progress/condition',
            icon: <Brain className="h-4 w-4" />
          },
          { 
            value: 'plan', 
            label: 'Plan', 
            description: 'Interventions, adjustments, follow-up',
            icon: <Target className="h-4 w-4" />
          }
        ];
      case 'free_text':
        return [
          { 
            value: 'general', 
            label: 'Free Text', 
            description: 'Unstructured notes and observations',
            icon: <Type className="h-4 w-4" />
          }
        ];
      default:
        return [];
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading treatment notes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Treatment Notes - {clientName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getSessionStatusColor(sessionStatus)}>
                {sessionStatus.replace('_', ' ')}
              </Badge>
              <Badge variant="outline">
                {notes.length} notes
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Note Format and Timing Selector */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Note Format Selector */}
              <div>
                <Label className="text-sm font-medium">Note Format</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={noteFormat === 'soap' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteFormat('soap')}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    SOAP Notes
                  </Button>
                  <Button
                    variant={noteFormat === 'dap' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteFormat('dap')}
                    className="flex items-center gap-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    DAP Notes
                  </Button>
                  <Button
                    variant={noteFormat === 'free_text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteFormat('free_text')}
                    className="flex items-center gap-2"
                  >
                    <Type className="h-4 w-4" />
                    Free Text
                  </Button>
                </div>
              </div>

              {/* Note Timing Selector */}
              <div>
                <Label className="text-sm font-medium">Note Timing</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={noteTiming === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteTiming('live')}
                    className="flex items-center gap-2"
                    disabled={sessionStatus === 'completed'}
                  >
                    <Play className="h-4 w-4" />
                    Live Notes
                  </Button>
                  <Button
                    variant={noteTiming === 'post_session' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNoteTiming('post_session')}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Post-Session
                  </Button>
                </div>
              </div>
            </div>

            {/* Note Format Description */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {noteFormat === 'soap' && (
                  <>
                    <strong>SOAP Notes:</strong> Most widely used in physiotherapy and chiropractic practice. 
                    Structured format with Subjective, Objective, Assessment, and Plan sections.
                  </>
                )}
                {noteFormat === 'dap' && (
                  <>
                    <strong>DAP Notes:</strong> Simpler than SOAP; often used when time is limited or where detail can be streamlined. 
                    Combines Data, Assessment, and Plan sections.
                  </>
                )}
                {noteFormat === 'free_text' && (
                  <>
                    <strong>Free Text:</strong> Unstructured notes for detailed observations and personalized documentation.
                    Follow best practices: be clear, concise, and objective.
                  </>
                )}
              </p>
            </div>

            {/* Auto-save Toggle for Live Notes */}
            {noteTiming === 'live' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoSave(!autoSave)}
                  className={autoSave ? 'bg-green-100 text-green-800' : ''}
                >
                  Auto-save {autoSave ? 'ON' : 'OFF'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Auto-saves notes after 3 seconds of inactivity
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Note Type</Label>
              <Select value={selectedNoteType} onValueChange={(value: any) => setSelectedNoteType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getNoteFormatOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={saveNote} 
                disabled={saving || !currentNote.trim()}
                className="w-full"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Note
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Note Content</Label>
            <Textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder={`Enter your ${getNoteTypeLabel(selectedNoteType).toLowerCase()} notes...`}
              className="min-h-[120px]"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {noteTiming === 'live' ? 'Live session notes' : 'Post-session documentation'}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentNote.length} characters
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No notes yet</p>
              <p className="text-sm">Start documenting your session above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getNoteTypeIcon(note.note_type)}
                      <Badge className={getNoteTypeColor(note.note_type)}>
                        {getNoteTypeLabel(note.note_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(note.created_at)} at {formatTime(note.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(note)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateNote(note.id)}>
                          Save Changes
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{note.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
