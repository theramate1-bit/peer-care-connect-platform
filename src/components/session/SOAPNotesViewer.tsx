import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Clock, User as UserIcon, Download, Stethoscope, Eye, Target, Clipboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SessionRecording {
  id: string;
  session_id: string;
  practitioner_id: string;
  client_id: string;
  transcript: string;
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
  chief_complaint: string;
  ai_summary: string;
  ai_key_points: string[];
  status: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

interface SOAPNotesViewerProps {
  sessionId?: string;
  clientView?: boolean;
}

export const SOAPNotesViewer: React.FC<SOAPNotesViewerProps> = ({
  sessionId,
  clientView = false
}) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<SessionRecording | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, [sessionId, user]);

  const fetchRecordings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('session_recordings')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      if (clientView) {
        query = query.eq('client_id', user.id);
      } else {
        query = query.eq('practitioner_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRecordings(data || []);
      if (data && data.length > 0) {
        setSelectedRecording(data[0]);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load session recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadSOAPNote = (recording: SessionRecording) => {
    const content = `SOAP NOTE - ${formatDate(recording.created_at)}
Duration: ${formatDuration(recording.duration_seconds)}

CHIEF COMPLAINT:
${recording.chief_complaint || 'Not specified'}

SUBJECTIVE:
${recording.soap_subjective || 'No subjective data recorded'}

OBJECTIVE:
${recording.soap_objective || 'No objective data recorded'}

ASSESSMENT:
${recording.soap_assessment || 'No assessment recorded'}

PLAN:
${recording.soap_plan || 'No plan recorded'}

────────────────────────────────────

SUMMARY:
${recording.ai_summary || 'No summary available'}

KEY POINTS:
${recording.ai_key_points?.map(point => `• ${point}`).join('\n') || 'No key points recorded'}

FULL TRANSCRIPT:
${recording.transcript || 'No transcript available'}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOAP-note-${formatDate(recording.created_at).replace(/[^\w\-_\.]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No SOAP Notes Available</h3>
          <p className="text-muted-foreground">
            {clientView 
              ? "Your practitioner hasn't shared any SOAP notes yet."
              : "Start recording sessions to generate professional SOAP notes here."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recording List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            SOAP Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRecording?.id === recording.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRecording(recording)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {formatDate(recording.created_at)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration_seconds)}
                        {recording.chief_complaint && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span className="truncate max-w-32">{recording.chief_complaint}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      SOAP
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Recording SOAP Note */}
      {selectedRecording && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                SOAP Note - {formatDate(selectedRecording.created_at)}
              </CardTitle>
              <Button
                onClick={() => downloadSOAPNote(selectedRecording)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="soap" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="soap">SOAP Note</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="soap" className="space-y-6">
                {selectedRecording.chief_complaint && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-primary">
                      Chief Complaint
                    </h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                      {selectedRecording.chief_complaint}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Subjective */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-blue-600 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      Subjective
                    </h4>
                    <div className="border rounded-lg p-4 bg-blue-50/50 min-h-32">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedRecording.soap_subjective || 'No subjective data recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Objective */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-green-600 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Objective
                    </h4>
                    <div className="border rounded-lg p-4 bg-green-50/50 min-h-32">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedRecording.soap_objective || 'No objective data recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Assessment */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-amber-600 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Assessment
                    </h4>
                    <div className="border rounded-lg p-4 bg-amber-50/50 min-h-32">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedRecording.soap_assessment || 'No assessment recorded'}
                      </p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-purple-600 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Plan
                    </h4>
                    <div className="border rounded-lg p-4 bg-purple-50/50 min-h-32">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedRecording.soap_plan || 'No plan recorded'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Session Summary</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedRecording.ai_summary || 'No summary available'}
                  </p>
                </div>
                
                {selectedRecording.ai_key_points && selectedRecording.ai_key_points.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Key Points</h4>
                      <ul className="space-y-2">
                        {selectedRecording.ai_key_points.map((point, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                              {index + 1}
                            </span>
                            <p className="text-sm leading-relaxed">{point}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Full Session Transcript</h4>
                  <ScrollArea className="h-96 border rounded-lg p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedRecording.transcript || 'No transcript available'}
                    </p>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};


