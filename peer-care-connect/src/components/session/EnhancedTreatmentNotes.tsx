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
  User as UserIcon, 
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
  StopCircle,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { MessagingManager } from '@/lib/messaging';

interface TreatmentNote {
  id: string;
  session_id: string;
  practitioner_id: string;
  client_id: string | null;
  note_type: 'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general';
  content: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedTreatmentNotesProps {
  sessionId: string;
  /** Client user ID; null for guest sessions (DB allows nullable client_id) */
  clientId: string | null | undefined;
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
  const [editNoteType, setEditNoteType] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | 'data' | 'general'>('subjective');
  const [autoSave, setAutoSave] = useState(true);

  // Real-time subscription for treatment notes
  const { data: realtimeNotes } = useRealtimeSubscription(
    'treatment_notes',
    `session_id=eq.${sessionId}`,
    (payload) => {
      console.log('Real-time notes update:', payload);

      if (payload.eventType === 'INSERT') {
        setNotes((prev) => {
          const next = [payload.new, ...prev];
          onNotesUpdate?.(next);
          return next;
        });
      } else if (payload.eventType === 'UPDATE') {
        setNotes((prev) => {
          const next = prev.map((note) =>
            note.id === payload.new.id ? payload.new : note
          );
          onNotesUpdate?.(next);
          return next;
        });
      } else if (payload.eventType === 'DELETE') {
        setNotes((prev) => {
          const next = prev.filter((note) => note.id !== payload.old.id);
          onNotesUpdate?.(next);
          return next;
        });
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

  // Warn before leaving with unsaved note content (mitigates loss when navigating before auto-save)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentNote.trim().length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentNote]);

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
          client_id: clientId ?? null,
          note_type: selectedNoteType,
          template_type: 'FREE_TEXT',
          content: currentNote.trim(),
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setNotes((prev) => {
        const next = [data, ...prev];
        onNotesUpdate?.(next);
        return next;
      });
      setCurrentNote('');

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

    // Validate that the note type matches the current format
    const validTypesForFormat = getNoteFormatOptions().map(opt => opt.value);
    if (!validTypesForFormat.includes(editNoteType)) {
      toast.error(`Invalid note type for ${noteFormat.toUpperCase()} format`);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('treatment_notes')
        .update({
          note_type: editNoteType,
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;

      setNotes((prev) => {
        const next = prev.map((note) =>
          note.id === noteId
            ? { ...note, note_type: editNoteType, content: editContent.trim(), updated_at: new Date().toISOString() }
            : note
        );
        onNotesUpdate?.(next);
        return next;
      });

      setEditingNote(null);
      setEditContent('');
      setEditNoteType('subjective');
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

      setNotes((prev) => {
        const next = prev.filter((note) => note.id !== noteId);
        onNotesUpdate?.(next);
        return next;
      });

      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleShareNoteWithClient = async () => {
    if (!user || notes.length === 0) return;
    if (!clientId) {
      toast.error('Cannot share notes with guest bookings—no client account to message');
      return;
    }

    try {
      // Create conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        clientId
      );

      // Generate summary (combine all notes, limit length)
      const allNotes = notes
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(note => `**${note.note_type.toUpperCase()}:** ${note.content}`)
        .join('\n\n');

      const summary = `📋 **Treatment Summary for ${clientName}**\n\nDate: ${new Date().toLocaleDateString()}\n\n${allNotes.substring(0, 800)}${allNotes.length > 800 ? '...\n\nFull notes are available in your session history.' : ''}`;

      // Send message
      await MessagingManager.sendMessage(
        conversationId,
        user.id,
        summary,
        'text'
      );

      toast.success('Treatment summary sent to client');
    } catch (error) {
      console.error('Error sharing note:', error);
      toast.error('Failed to share note');
    }
  };

  const startEditing = (note: TreatmentNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
    setEditNoteType(note.note_type);
    
    // Determine the note format based on the note type
    // SOAP: subjective, objective, assessment, plan
    // DAP: data, assessment, plan
    // Free Text: general
    if (['subjective', 'objective', 'assessment', 'plan'].includes(note.note_type)) {
      setNoteFormat('soap');
    } else if (['data', 'assessment', 'plan'].includes(note.note_type)) {
      setNoteFormat('dap');
    } else {
      setNoteFormat('free_text');
    }
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
    setEditNoteType('subjective');
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'subjective': return <UserIcon className="h-4 w-4" />;
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
            icon: <UserIcon className="h-4 w-4" />
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
    <div className="space-y-4">
      {/* Compact Header - Settings */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              {clientName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={getSessionStatusColor(sessionStatus)}>
                {sessionStatus.replace('_', ' ')}
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-muted transition-colors"
                onClick={() => {
                  // Scroll to notes history section
                  const notesSection = document.getElementById('session-notes-history');
                  notesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                title="Click to view notes history"
              >
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 pb-4">
          {/* Compact Format and Timing Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Note Format Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Note Format</Label>
              <div className="flex gap-3">
                <Button
                  variant={noteFormat === 'soap' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteFormat('soap')}
                  className="flex-1"
                >
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  SOAP Notes
                </Button>
                <Button
                  variant={noteFormat === 'dap' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteFormat('dap')}
                  className="flex-1"
                >
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  DAP Notes
                </Button>
                <Button
                  variant={noteFormat === 'free_text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteFormat('free_text')}
                  className="flex-1"
                >
                  <Type className="h-4 w-4 mr-1.5" />
                  Free Text
                </Button>
              </div>
            </div>

            {/* Note Timing Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Note Timing</Label>
              <div className="flex gap-3">
                <Button
                  variant={noteTiming === 'live' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteTiming('live')}
                  className="flex-1"
                  disabled={sessionStatus === 'completed'}
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Live Notes
                </Button>
                <Button
                  variant={noteTiming === 'post_session' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteTiming('post_session')}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Post-Session
                </Button>
              </div>
            </div>
          </div>

          {/* Note Format Description */}
          <div className="bg-muted/50 p-4 rounded-lg mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
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
        </CardContent>
      </Card>

      {/* Prominent Note Input Card - Main Focus */}
      <Card className="border-2 border-primary/20 shadow-xl mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Note Type</Label>
            <Select value={selectedNoteType} onValueChange={(value: any) => setSelectedNoteType(value)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getNoteFormatOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2 py-1">
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
            {/* Show description when note type is selected */}
            {getNoteFormatOptions().find(opt => opt.value === selectedNoteType) && (
              <p className="text-xs text-muted-foreground mt-1">
                {getNoteFormatOptions().find(opt => opt.value === selectedNoteType)?.description}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Note Content</Label>
            <Textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder={`Enter your ${getNoteTypeLabel(selectedNoteType).toLowerCase()} notes...`}
              className="min-h-[160px] resize-y text-base"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {noteTiming === 'live' ? 'Live' : 'Post-Session'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentNote.length} characters
                </span>
              </div>
              <Button 
                onClick={saveNote} 
                disabled={saving || !currentNote.trim()}
                size="default"
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
        </CardContent>
      </Card>

      {/* Notes History */}
      <Card id="session-notes-history">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p className="text-base mb-2">No notes yet</p>
              <p className="text-sm">Start documenting your session above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
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
                    <div className="space-y-4 pt-2">
                      {/* Note Type Selector - Structured Format */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Note Type</Label>
                        <Select 
                          value={editNoteType} 
                          onValueChange={(value: any) => setEditNoteType(value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getNoteFormatOptions().map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2 py-1">
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
                        <p className="text-xs text-muted-foreground mt-2">
                          Format: <strong>{noteFormat.toUpperCase()}</strong> - Only structured note types are allowed
                        </p>
                      </div>
                      
                      {/* Note Content */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Note Content</Label>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder={`Enter your ${getNoteTypeLabel(editNoteType).toLowerCase()} notes...`}
                          className="min-h-[140px] resize-y"
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateNote(note.id)}
                          disabled={!editContent.trim()}
                        >
                          <Save className="h-4 w-4 mr-2" />
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



