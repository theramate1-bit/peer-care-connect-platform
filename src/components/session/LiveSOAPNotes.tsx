import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Save, 
  FileText, 
  Clock, 
  User, 
  Stethoscope,
  Eye,
  Target,
  Clipboard,
  Volume2,
  VolumeX,
  Settings,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LiveSOAPNotesProps {
  sessionId: string;
  clientName: string;
  clientId: string;
  onSave?: (soapData: SOAPData) => void;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chief_complaint: string;
  session_notes: string;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
}

export const LiveSOAPNotes: React.FC<LiveSOAPNotesProps> = ({
  sessionId,
  clientName,
  clientId,
  onSave
}) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [soapData, setSoapData] = useState<SOAPData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    chief_complaint: '',
    session_notes: ''
  });

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Settings
  const [autoSave, setAutoSave] = useState(true);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('en-GB');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = transcriptionLanguage;
      
      recognitionRef.current.onresult = handleTranscriptionResult;
      recognitionRef.current.onerror = handleTranscriptionError;
      recognitionRef.current.onend = handleTranscriptionEnd;
    } else {
      toast.error('Speech recognition not supported in this browser');
    }
  }, [transcriptionLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Audio level monitoring
  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current) {
      const monitorAudio = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average);
        
        if (isRecording && !isPaused) {
          requestAnimationFrame(monitorAudio);
        }
      };
      monitorAudio();
    }
  }, [isRecording, isPaused]);

  const handleTranscriptionResult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence;
      const isFinal = event.results[i].isFinal;

      if (isFinal) {
        finalTranscript += transcript;
        
        // Add to transcription history
        const segment: TranscriptionSegment = {
          id: Date.now().toString(),
          text: transcript,
          timestamp: Date.now(),
          confidence,
          isFinal: true
        };
        
        setTranscription(prev => [...prev, segment]);
        
        // Auto-categorize into SOAP sections based on keywords
        autoCategorizeText(transcript, confidence);
      } else {
        interimTranscript += transcript;
      }
    }

    setCurrentTranscription(interimTranscript);
  };

  const handleTranscriptionError = (event: SpeechRecognitionErrorEvent) => {
    console.error('Transcription error:', event.error);
    toast.error(`Transcription error: ${event.error}`);
  };

  const handleTranscriptionEnd = () => {
    if (isRecording && !isPaused) {
      // Restart recognition if still recording
      recognitionRef.current?.start();
    }
  };

  const autoCategorizeText = (text: string, confidence: number) => {
    if (confidence < confidenceThreshold) return;

    const lowerText = text.toLowerCase();
    
    // Subjective indicators
    if (lowerText.includes('patient says') || lowerText.includes('client reports') || 
        lowerText.includes('feels') || lowerText.includes('experiences') ||
        lowerText.includes('complains of') || lowerText.includes('describes')) {
      setSoapData(prev => ({
        ...prev,
        subjective: prev.subjective + ' ' + text
      }));
    }
    
    // Objective indicators
    else if (lowerText.includes('observed') || lowerText.includes('palpation') ||
             lowerText.includes('range of motion') || lowerText.includes('strength') ||
             lowerText.includes('tension') || lowerText.includes('tenderness')) {
      setSoapData(prev => ({
        ...prev,
        objective: prev.objective + ' ' + text
      }));
    }
    
    // Assessment indicators
    else if (lowerText.includes('diagnosis') || lowerText.includes('assessment') ||
             lowerText.includes('findings') || lowerText.includes('conclusion') ||
             lowerText.includes('evaluation')) {
      setSoapData(prev => ({
        ...prev,
        assessment: prev.assessment + ' ' + text
      }));
    }
    
    // Plan indicators
    else if (lowerText.includes('treatment plan') || lowerText.includes('next steps') ||
             lowerText.includes('recommendations') || lowerText.includes('follow up') ||
             lowerText.includes('exercises') || lowerText.includes('homework')) {
      setSoapData(prev => ({
        ...prev,
        plan: prev.plan + ' ' + text
      }));
    }
    
    // Chief complaint
    else if (lowerText.includes('main issue') || lowerText.includes('primary concern') ||
             lowerText.includes('chief complaint') || lowerText.includes('reason for visit')) {
      setSoapData(prev => ({
        ...prev,
        chief_complaint: prev.chief_complaint + ' ' + text
      }));
    }
    
    // General session notes
    else {
      setSoapData(prev => ({
        ...prev,
        session_notes: prev.session_notes + ' ' + text
      }));
    }
  };

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = processRecording;

      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsTranscribing(true);
      }

      toast.success('Recording started with live transcription');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        recognitionRef.current?.start();
        setIsPaused(false);
        toast.success('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        recognitionRef.current?.stop();
        setIsPaused(true);
        toast.success('Recording paused');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      toast.success('Recording stopped');
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Save to Supabase storage
      const fileName = `session-${sessionId}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Save SOAP notes to database
      const { data: soapRecord, error: soapError } = await supabase
        .from('session_recordings')
        .insert({
          session_id: sessionId,
          practitioner_id: user?.id,
          client_id: clientId,
          audio_file_path: fileName,
          transcript: transcription.map(t => t.text).join(' '),
          soap_subjective: soapData.subjective,
          soap_objective: soapData.objective,
          soap_assessment: soapData.assessment,
          soap_plan: soapData.plan,
          chief_complaint: soapData.chief_complaint,
          session_notes: soapData.session_notes,
          duration_seconds: recordingTime,
          status: 'completed'
        })
        .select()
        .single();

      if (soapError) throw soapError;

      toast.success('Session recording saved successfully');
      
      if (onSave) {
        onSave(soapData);
      }

      // Reset state
      setTranscription([]);
      setCurrentTranscription('');
      setSoapData({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        chief_complaint: '',
        session_notes: ''
      });
      setRecordingTime(0);

    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to save recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualEdit = (field: keyof SOAPData, value: string) => {
    setSoapData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearTranscription = () => {
    setTranscription([]);
    setCurrentTranscription('');
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Live SOAP Notes with Speech-to-Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recording Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={isRecording ? 'default' : 'secondary'}>
                {isRecording ? 'Recording' : 'Ready'}
              </Badge>
              {isTranscribing && (
                <Badge variant="outline" className="text-green-600">
                  <Zap className="h-3 w-3 mr-1" />
                  Transcribing
                </Badge>
              )}
              {isPaused && (
                <Badge variant="outline" className="text-yellow-600">
                  Paused
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="font-mono text-lg">{formatTime(recordingTime)}</span>
            </div>
          </div>

          {/* Audio Level Indicator */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Audio Level</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-100"
                  style={{ width: `${(audioLevel / 255) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button onClick={startRecording} className="bg-red-600 hover:bg-red-700">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <>
                <Button onClick={pauseRecording} variant="outline">
                  {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={stopRecording} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              </>
            )}
            
            <Button onClick={clearTranscription} variant="outline" disabled={transcription.length === 0}>
              Clear Transcript
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Live Transcription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 w-full rounded-md border p-4">
            <div className="space-y-2">
              {transcription.map((segment) => (
                <div key={segment.id} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(segment.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-sm ${segment.isFinal ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {segment.text}
                  </span>
                  {segment.isFinal && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(segment.confidence * 100)}%
                    </Badge>
                  )}
                </div>
              ))}
              {currentTranscription && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="text-sm text-blue-600 italic">
                    {currentTranscription}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Live
                  </Badge>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* SOAP Notes Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            SOAP Notes Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subjective" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="subjective">Subjective</TabsTrigger>
              <TabsTrigger value="objective">Objective</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="subjective" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Chief Complaint</label>
                <Textarea
                  value={soapData.chief_complaint}
                  onChange={(e) => handleManualEdit('chief_complaint', e.target.value)}
                  placeholder="Patient's main concern..."
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subjective</label>
                <Textarea
                  value={soapData.subjective}
                  onChange={(e) => handleManualEdit('subjective', e.target.value)}
                  placeholder="Patient's reported symptoms and history..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="objective" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Objective Findings</label>
                <Textarea
                  value={soapData.objective}
                  onChange={(e) => handleManualEdit('objective', e.target.value)}
                  placeholder="Observations, palpation findings, range of motion..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Assessment</label>
                <Textarea
                  value={soapData.assessment}
                  onChange={(e) => handleManualEdit('assessment', e.target.value)}
                  placeholder="Clinical findings, diagnosis, evaluation..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Treatment Plan</label>
                <Textarea
                  value={soapData.plan}
                  onChange={(e) => handleManualEdit('plan', e.target.value)}
                  placeholder="Treatment approach, exercises, follow-up..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Notes</label>
                <Textarea
                  value={soapData.session_notes}
                  onChange={(e) => handleManualEdit('session_notes', e.target.value)}
                  placeholder="Additional session observations and notes..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Transcription Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Language</label>
              <select
                value={transcriptionLanguage}
                onChange={(e) => setTranscriptionLanguage(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="en-GB">English (UK)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Confidence Threshold</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                className="mt-2 w-full"
              />
              <span className="text-xs text-muted-foreground">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
