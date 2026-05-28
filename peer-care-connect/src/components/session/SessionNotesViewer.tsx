import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Clock, User as UserIcon, Download, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SessionRecording {
  id: string;
  session_id: string;
  practitioner_id: string;
  client_id: string;
  transcript: string;
  ai_summary: string;
  ai_key_points: string[];
  ai_action_items: string[];
  status: string;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

interface SessionNotesViewerProps {
  sessionId?: string;
  clientView?: boolean;
}

export const SessionNotesViewer: React.FC<SessionNotesViewerProps> = ({
  sessionId,
  clientView = false
}) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<SessionRecording | null>(null);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

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

  const downloadTranscript = (recording: SessionRecording) => {
    const content = `Session Recording Transcript
Date: ${formatDate(recording.created_at)}
Duration: ${formatDuration(recording.duration_seconds)}

SUMMARY:
${recording.ai_summary}

KEY POINTS:
${recording.ai_key_points?.map(point => `• ${point}`).join('\n')}

ACTION ITEMS:
${recording.ai_action_items?.map(item => `• ${item}`).join('\n')}

FULL TRANSCRIPT:
${recording.transcript}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-transcript-${formatDate(recording.created_at)}.txt`;
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
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Session Notes Available</h3>
          <p className="text-muted-foreground">
            {clientView 
              ? "Your practitioner hasn't shared any session recordings yet."
              : "Start recording sessions to see AI-generated notes and summaries here."
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
            <FileText className="w-5 h-5" />
            Session Recordings
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
                        <Badge variant="secondary" className="text-xs">
                          {recording.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Recording Details */}
      {selectedRecording && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Session Notes - {formatDate(selectedRecording.created_at)}
              </CardTitle>
              <Button
                onClick={() => downloadTranscript(selectedRecording)}
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
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="key-points">Key Points</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">AI Summary</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedRecording.ai_summary}
                  </p>
                </div>
                
                {selectedRecording.ai_action_items && selectedRecording.ai_action_items.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Action Items</h4>
                      <ul className="space-y-1">
                        {selectedRecording.ai_action_items.map((item, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="key-points" className="space-y-4">
                {selectedRecording.ai_key_points && selectedRecording.ai_key_points.length > 0 ? (
                  <ul className="space-y-3">
                    {selectedRecording.ai_key_points.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No key points extracted from this session.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Full Transcript</h4>
                  <Button
                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    {showFullTranscript ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Expand
                      </>
                    )}
                  </Button>
                </div>
                
                <ScrollArea className={showFullTranscript ? "h-96" : "h-48"}>
                  <div className="space-y-2 pr-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {selectedRecording.transcript}
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
