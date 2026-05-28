import React from 'react';
import { EnhancedSOAPNotesDashboard } from '@/components/session/EnhancedSOAPNotesDashboard';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { transcribeFile, generateSoapNotes, uploadAudioReturnPath } from '@/lib/transcription';
import { Mic, StopCircle } from 'lucide-react';
import { toast } from 'sonner';

const EnhancedTreatmentNotes: React.FC = () => {
  const { isPro, loading } = usePlan();
  if (loading) return null;
  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h2 className="text-xl font-semibold">Pro plan required</h2>
          <p className="text-sm text-muted-foreground">AI-powered notes and transcription are available on the Pro plan.</p>
          <Button onClick={() => (window.location.href = '/pricing')}>View plans</Button>
        </div>
      </div>
    );
  }
  const [audioUrl, setAudioUrl] = React.useState('');
  const [transcript, setTranscript] = React.useState('');
  const [soap, setSoap] = React.useState<{ subjective: string; objective: string; assessment: string; plan: string } | null>(null);
  const [loadingTranscribe, setLoadingTranscribe] = React.useState(false);
  const [loadingSoap, setLoadingSoap] = React.useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = React.useState(false);
  const chunksRef = React.useRef<BlobPart[]>([]);
  const [language, setLanguage] = React.useState<string>('en');
  const [diarization, setDiarization] = React.useState<boolean>(false);
  const [sessionId, setSessionId] = React.useState<string>('');

  const handleTranscribe = async () => {
    if (!audioUrl) return;
    try {
      setLoadingTranscribe(true);
      const res = await transcribeFile(audioUrl, { languageCode: language, speakerLabels: diarization });
      if (res.status === 'completed' && res.text) setTranscript(res.text);
    } finally {
      setLoadingTranscribe(false);
    }
  };

  const handleGenerateSoap = async () => {
    if (!transcript) return;
    try {
      setLoadingSoap(true);
      const s = await generateSoapNotes(transcript);
      setSoap(s);
    } finally {
      setLoadingSoap(false);
    }
  };

  const handleSaveToChart = async () => {
    if (!transcript) return;
    if (!sessionId) {
      toast.info('Enter a session ID to link notes.');
      return;
    }
    try {
      setLoadingSoap(true);
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase.functions.invoke('soap-notes', {
        body: { transcript, session_id: sessionId, save: true },
      });
      if (error) throw error;
      toast.success('Notes saved to chart');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save notes');
    } finally {
      setLoadingSoap(false);
    }
  };

  const startMic = async () => {
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
          setLoadingTranscribe(true);
          const storagePath = await uploadAudioReturnPath(blob);
          setAudioUrl('');
          const res = await transcribeFile(storagePath, { isStoragePath: true });
          if (res.status === 'completed' && res.text) setTranscript(res.text);
          else toast.info('Transcription processing, please try again shortly.');
        } finally {
          setLoadingTranscribe(false);
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error('Microphone permission denied or unavailable.');
    }
  };

  const stopMic = async () => {
    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI SOAP Notes (AssemblyAI)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {!recording ? (
              <Button type="button" variant="secondary" onClick={startMic}>
                <Mic className="h-4 w-4 mr-2" /> Use microphone
              </Button>
            ) : (
              <Button type="button" variant="destructive" onClick={stopMic}>
                <StopCircle className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            <Input placeholder="Audio file URL (https)" value={audioUrl} onChange={e => setAudioUrl(e.target.value)} />
            <Button onClick={handleTranscribe} disabled={loadingTranscribe}>{loadingTranscribe ? 'Transcribing…' : 'Transcribe'}</Button>
          </div>
          <div className="flex gap-2 items-center">
            <select className="border rounded px-2 py-1 text-sm" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={diarization} onChange={e => setDiarization(e.target.checked)} /> Diarization</label>
            <Input placeholder="Session ID (to save)" value={sessionId} onChange={e => setSessionId(e.target.value)} />
            <Button variant="outline" onClick={handleSaveToChart} disabled={loadingSoap || !transcript}>Save to chart</Button>
          </div>
          <div>
            <textarea className="w-full min-h-[120px] border rounded p-2 text-sm" placeholder="Transcript" value={transcript} onChange={e => setTranscript(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateSoap} disabled={loadingSoap || !transcript}>{loadingSoap ? 'Generating…' : 'Generate SOAP'}</Button>
          </div>
          {soap && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Subjective</h4>
                <pre className="text-sm whitespace-pre-wrap break-words border rounded p-2">{soap.subjective}</pre>
              </div>
              <div>
                <h4 className="font-medium mb-1">Objective</h4>
                <pre className="text-sm whitespace-pre-wrap break-words border rounded p-2">{soap.objective}</pre>
              </div>
              <div>
                <h4 className="font-medium mb-1">Assessment</h4>
                <pre className="text-sm whitespace-pre-wrap break-words border rounded p-2">{soap.assessment}</pre>
              </div>
              <div>
                <h4 className="font-medium mb-1">Plan</h4>
                <pre className="text-sm whitespace-pre-wrap break-words border rounded p-2">{soap.plan}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EnhancedSOAPNotesDashboard />
    </div>
  );
};

export default EnhancedTreatmentNotes;