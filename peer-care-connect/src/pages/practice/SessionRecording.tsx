import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { SessionRecorder } from '@/components/session/SessionRecorder';
import { SOAPNotesViewer } from '@/components/session/SOAPNotesViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, Clock, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ClientSession {
  id: string;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  has_recording: boolean;
  recording_consent: boolean;
}

const SessionRecording = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('record');

  useEffect(() => {
    fetchSession();
  }, [sessionId, user]);

  const fetchSession = async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('therapist_id', user.id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const updateRecordingConsent = async (consent: boolean) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('client_sessions')
        .update({ recording_consent: consent })
        .eq('id', sessionId);

      if (error) throw error;
      
      setSession(prev => prev ? { ...prev, recording_consent: consent } : null);
      toast.success(consent ? 'Recording consent granted' : 'Recording consent revoked');
    } catch (error) {
      console.error('Error updating consent:', error);
      toast.error('Failed to update recording consent');
    }
  };

  const handleRecordingComplete = (recordingId: string) => {
    setActiveTab('notes');
    toast.success('Session recorded and analyzed successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-2">Session Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The requested session could not be found or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Client Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Session Recording"
        description="Record and manage AI-powered session notes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Client Management', href: '/dashboard' },
          { label: 'Session Recording' }
        ]}
      />

      {/* Session Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Session with {session.client_name}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {new Date(session.session_date).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {session.start_time} ({session.duration_minutes}min)
              </span>
            </div>
            <div>
              <Badge variant="secondary">{session.session_type}</Badge>
            </div>
            <div>
              <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording Consent */}
      {!session.recording_consent && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-amber-800">Recording Consent Required</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Client consent is required before recording sessions. Please confirm you have obtained verbal consent.
                </p>
              </div>
              <Button
                onClick={() => updateRecordingConsent(true)}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                Grant Consent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording Interface */}
      {session.recording_consent && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record">Record Session</TabsTrigger>
            <TabsTrigger value="notes">SOAP Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-6">
            <SessionRecorder
              sessionId={session.id}
              clientName={session.client_name}
              onRecordingComplete={handleRecordingComplete}
            />
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <SOAPNotesViewer 
              sessionId={session.id}
              clientView={false}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SessionRecording;
