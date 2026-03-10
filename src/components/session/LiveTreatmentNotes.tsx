import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Mic, 
  Save, 
  Clock, 
  User as UserIcon, 
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

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

interface LiveTreatmentNotesProps {
  sessionId: string;
  /** Client user ID; null for guest sessions (DB allows nullable client_id) */
  clientId: string | null | undefined;
  clientName: string;
  onNotesUpdate?: (notes: TreatmentNote[]) => void;
}

export const LiveTreatmentNotes: React.FC<LiveTreatmentNotesProps> = ({
  sessionId,
  clientId,
  clientName,
  onNotesUpdate
}) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TreatmentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'subjective' | 'objective' | 'assessment' | 'plan' | 'general'>('general');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (autoSave && newNote.length > 10) {
      const timeoutId = setTimeout(() => {
        saveNote();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [newNote, autoSave]);

  // Warn before leaving with unsaved note content (mitigates loss when navigating before auto-save)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (newNote.trim().length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [newNote]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_notes')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

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
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_notes')
        .insert({
          session_id: sessionId,
          practitioner_id: user?.id,
          client_id: clientId ?? null,
          note_type: noteType,
          template_type: 'FREE_TEXT',
          content: newNote.trim(),
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
      setNewNote('');

      toast.success('Note saved');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

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

      setNotes((prev) => {
        const next = prev.map((note) =>
          note.id === noteId
            ? { ...note, content: editContent.trim(), updated_at: new Date().toISOString() }
            : note
        );
        onNotesUpdate?.(next);
        return next;
      });

      setEditingNote(null);
      setEditContent('');

      toast.success('Note updated');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'subjective': return 'bg-blue-100 text-blue-800';
      case 'objective': return 'bg-green-100 text-green-800';
      case 'assessment': return 'bg-purple-100 text-purple-800';
      case 'plan': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'subjective': return <UserIcon className="h-4 w-4" />;
      case 'objective': return <Activity className="h-4 w-4" />;
      case 'assessment': return <TrendingUp className="h-4 w-4" />;
      case 'plan': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Live Treatment Notes - {clientName}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Note Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="note-type">Note Type</Label>
              <select
                id="note-type"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as any)}
                className="w-full p-2 border border-input rounded-md"
              >
                <option value="general">General Note</option>
                <option value="subjective">Subjective (Client Reports)</option>
                <option value="objective">Objective (Observations)</option>
                <option value="assessment">Assessment (Clinical Opinion)</option>
                <option value="plan">Plan (Treatment Plan)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSave(!autoSave)}
                className={autoSave ? 'bg-green-100 text-green-800' : ''}
              >
                Auto-save {autoSave ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
          
          <div>
            <Label htmlFor="new-note">Note Content</Label>
            <Textarea
              id="new-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Record observations, treatments, client responses, or treatment plans..."
              className="min-h-[120px]"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={saveNote}
              disabled={loading || !newNote.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>No notes recorded yet</p>
              <p className="text-sm">Start adding notes to track the session progress</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getNoteTypeColor(note.note_type)}>
                        <div className="flex items-center gap-1">
                          {getNoteTypeIcon(note.note_type)}
                          {note.note_type.charAt(0).toUpperCase() + note.note_type.slice(1)}
                        </div>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTimestamp(note.timestamp)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(note)}
                        disabled={editingNote === note.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        disabled={loading}
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
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateNote(note.id)}
                          disabled={loading || !editContent.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
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



