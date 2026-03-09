import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User as UserIcon, 
  Stethoscope,
  Eye,
  Target,
  Clipboard,
  Volume2,
  VolumeX,
  Settings,
  Zap,
  Sparkles,
  Loader2,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PAIN_AREAS, 
  JOINTS, 
  MOVEMENTS, 
  STRENGTH_GRADES,
  STRENGTH_VALUE_MAP
} from '@/lib/constants';

interface LiveSOAPNotesProps {
  sessionId: string;
  clientName: string;
  clientId: string;
  isCompleted?: boolean;
  onSave?: (soapData: SOAPData, status?: 'draft' | 'completed' | 'archived') => void;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chief_complaint: string;
  session_notes: string;
}

interface ObjectiveMeasurement {
  painScore?: number;
  painArea?: string;
  romMovement?: string;
  romDegrees?: number;
  strengthArea?: string;
  strengthGrade?: string;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  isFinal: boolean;
  source?: 'whisper' | 'browser'; // Track transcription source
}

// Add these interfaces at the top of the file
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export const LiveSOAPNotes: React.FC<LiveSOAPNotesProps> = ({
  sessionId,
  clientName,
  clientId,
  isCompleted = false,
  onSave
}) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isWhisperTranscribing, setIsWhisperTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
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

  // Objective Measurements State (Suggested Prompts)
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
  
  // Enhanced microphone settings
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>('');
  const [isStreamingWhisper, setIsStreamingWhisper] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const [audioQuality, setAudioQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const streamingChunksRef = useRef<Blob[]>([]);
  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load microphone preference from localStorage
  useEffect(() => {
    const savedMicId = localStorage.getItem('preferredMicrophoneId');
    if (savedMicId) {
      setSelectedMicrophoneId(savedMicId);
    }
  }, []);

  // Enumerate available microphones
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter(d => d.kind === 'audioinput');
        setAvailableMicrophones(microphones);
        
        // Auto-select first microphone if none selected
        if (!selectedMicrophoneId && microphones.length > 0) {
          const savedMicId = localStorage.getItem('preferredMicrophoneId');
          if (savedMicId && microphones.find(m => m.deviceId === savedMicId)) {
            setSelectedMicrophoneId(savedMicId);
          } else {
            setSelectedMicrophoneId(microphones[0].deviceId);
          }
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };
    
    enumerateDevices();
  }, [selectedMicrophoneId]);

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

  // Enhanced audio level monitoring with quality assessment
  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current) {
      const monitorAudio = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average);
        
        // Assess audio quality
        if (average < 10) {
          setAudioQuality('poor');
        } else if (average < 30) {
          setAudioQuality('fair');
        } else if (average < 60) {
          setAudioQuality('good');
        } else {
          setAudioQuality('excellent');
        }
        
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
          isFinal: true,
          source: 'browser' // Browser speech recognition
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
      // Enhanced audio constraints for better quality
      const audioConstraints: MediaTrackConstraints & Record<string, any> = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,        // Higher sample rate for better quality
        channelCount: 1,          // Mono for speech
        sampleSize: 16,           // 16-bit samples
        latency: 0.01,            // Low latency mode
        
        // Chrome-specific enhancements (using Record<string, any> to allow these)
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: true,
        googHighpassFilter: true,       // Filters low frequencies
        googTypingNoiseDetection: true, // Reduces keyboard noise
        googNoiseReduction: true,       // Additional noise reduction
      };

      // Add device selection if available
      if (selectedMicrophoneId) {
        audioConstraints.deviceId = { exact: selectedMicrophoneId };
      }

      // Request microphone access with enhanced settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      streamRef.current = stream;

      // Enhanced AudioContext with low latency
      audioContextRef.current = new AudioContext({
        sampleRate: 48000,
        latencyHint: 'interactive', // Low latency for real-time transcription
      });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Enhanced MediaRecorder with better quality
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000, // Higher bitrate = better quality (default is ~96k)
      });

      audioChunksRef.current = [];
      streamingChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          streamingChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = processRecording;

      // Start recording
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setStreamingError(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start real-time Whisper streaming
      startWhisperStreaming(stream);

      // Start browser speech recognition as fallback
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsTranscribing(true);
      }

      toast.success('Recording started with enhanced transcription');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        recognitionRef.current?.start();
        // Restart streaming if it was active
        if (streamRef.current && isStreamingWhisper) {
          startWhisperStreaming(streamRef.current);
        }
        setIsPaused(false);
        toast.success('Recording resumed');
      } else {
        mediaRecorderRef.current.pause();
        recognitionRef.current?.stop();
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        setIsPaused(true);
        toast.success('Recording paused');
      }
    }
  };

  // Real-time Whisper streaming function
  const startWhisperStreaming = async (stream: MediaStream) => {
    try {
      setIsStreamingWhisper(true);
      setStreamingError(null);

      // Use the existing MediaRecorder chunks for streaming
      // We'll process chunks from streamingChunksRef every 2 seconds
      let lastProcessedIndex = 0;

      // Send chunks every 2 seconds for real-time transcription
      streamingIntervalRef.current = setInterval(async () => {
        if (isRecording && !isPaused && streamingChunksRef.current.length > lastProcessedIndex) {
          try {
            // Get new chunks since last processing
            const newChunks = streamingChunksRef.current.slice(lastProcessedIndex);
            lastProcessedIndex = streamingChunksRef.current.length;

            if (newChunks.length === 0) return;

            // Combine recent chunks
            const chunkBlob = new Blob(newChunks, { type: 'audio/webm' });
            
            // Skip if chunk is too small (likely silence or incomplete)
            if (chunkBlob.size < 1000) return;
            
            // Convert to base64
            const reader = new FileReader();
            const base64Audio = await new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = reject;
              reader.readAsDataURL(chunkBlob);
            });

            // Send to Whisper streaming endpoint
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              console.log('Not authenticated for Whisper streaming');
              return;
            }

            const { data, error } = await supabase.functions.invoke('whisper-streaming', {
              body: { 
                audio: base64Audio,
                language: transcriptionLanguage.split('-')[0] // Extract language code
              },
            });

            if (error) {
              console.error('Whisper streaming error:', error);
              setStreamingError('Streaming temporarily unavailable');
              // Don't throw - continue with browser transcription as fallback
              return;
            }

            if (data?.text && data.text.trim().length > 0) {
              // Merge with existing transcription
              const newSegment: TranscriptionSegment = {
                id: `whisper-${Date.now()}`,
                text: data.text.trim(),
                timestamp: Date.now(),
                confidence: 0.95, // High confidence for Whisper
                isFinal: true,
                source: 'whisper' // Whisper AI transcription
              };

              setTranscription(prev => {
                // Avoid duplicates by checking if similar text already exists
                const lastSegment = prev[prev.length - 1];
                if (lastSegment && lastSegment.text === data.text.trim()) {
                  return prev;
                }
                // Prefer Whisper transcripts over browser ones
                return [...prev, newSegment];
              });

              // Auto-categorize the new text
              autoCategorizeText(data.text.trim(), 0.95);
            }
          } catch (error) {
            console.error('Error in streaming chunk:', error);
            // Continue silently - browser transcription is fallback
          }
        }
      }, 2000); // Send chunks every 2 seconds

    } catch (error) {
      console.error('Error starting Whisper streaming:', error);
      setStreamingError('Streaming unavailable - using browser transcription');
      setIsStreamingWhisper(false);
      // Graceful degradation - browser transcription will continue
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(false);
      setIsStreamingWhisper(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
        streamingIntervalRef.current = null;
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
      const browserTranscript = transcription.map(t => t.text).join(' ');
      
      // ALWAYS save browser transcription immediately for data safety
      const fileName = `session-${sessionId}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('session-recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Save to database with browser transcription
      const { data: soapRecord, error: soapError } = await (supabase
        .from('session_recordings') as any)
        .insert({
          session_id: sessionId,
          practitioner_id: user?.id,
          client_id: clientId,
          audio_file_path: fileName,
          transcript: browserTranscript,
          transcription_method: 'browser',
          soap_subjective: soapData.subjective,
          soap_objective: soapData.objective,
          soap_assessment: soapData.assessment,
          soap_plan: soapData.plan,
          chief_complaint: soapData.chief_complaint,
          session_notes: soapData.session_notes,
          duration_seconds: recordingTime,
          status: 'draft' // Mark as draft initially
        })
        .select()
        .single();

      if (soapError) throw soapError;

      toast.success('Recording saved. Enhancing with AI...');
      
      // Store for automatic Whisper enhancement
      setAudioBlob(audioBlob);
      
      // Automatically start Whisper enhancement in background
      // This is transparent to the user - no button needed
      enhanceWithWhisper(audioBlob, (soapRecord as any).id);

    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to save recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const enhanceWithWhisper = async (audioBlob: Blob, recordingId: string) => {
    try {
      setIsWhisperTranscribing(true);
      console.log('Auto-enhancing transcription with Whisper...');

      // Convert blob to base64
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Call Whisper Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Not authenticated for Whisper enhancement');
        return;
      }

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio },
      });

      if (error) throw error;

      const whisperTranscript = data.text;
      setWhisperTranscript(whisperTranscript);

      // Replace browser transcription with Whisper
      setTranscription([{
        id: 'whisper-1',
        text: whisperTranscript,
        timestamp: Date.now(),
        confidence: 1,
        isFinal: true,
        source: 'whisper' // Mark as Whisper transcription
      }]);

      // Update database with enhanced transcription
      const { error: updateError } = await (supabase
        .from('session_recordings') as any)
        .update({
          transcript: whisperTranscript,
          transcription_method: 'whisper',
          // Keep as draft to allow manual review/editing unless already completed
          status: isCompleted ? 'completed' : 'draft', 
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId)
        .eq('practitioner_id', user?.id);

      if (updateError) throw updateError;

      toast.success('✓ Enhanced with Whisper AI');
      console.log('Whisper enhancement completed successfully');

    } catch (error) {
      console.error('Whisper enhancement failed:', error);
      // Graceful degradation - browser transcription still saved
      toast.success('Recording saved (using browser transcription)');
    } finally {
      setIsWhisperTranscribing(false);
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

  const addPainScore = async () => {
    if (!painArea || !painScore) return;
    
    const textToAdd = `${painArea} Pain (VAS): ${painScore}/10`;
    
    // Check if this area's pain score is already in the text
    const regex = new RegExp(`${painArea} Pain \\(VAS\\): \\d+\\/10`, 'g');
    let newObjective = soapData.objective;
    
    if (regex.test(soapData.objective)) {
      // Replace existing
      newObjective = soapData.objective.replace(regex, textToAdd);
    } else {
      // Append new
      newObjective = soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd;
    }
    
    handleManualEdit('objective', newObjective);

    // Auto-create metric (optional)
    if (user && clientId && sessionId) {
      try {
        await supabase.from('progress_metrics').insert({
          client_id: clientId,
          practitioner_id: user.id,
          session_id: sessionId !== 'new-session' ? sessionId : null,
          metric_type: 'pain_level',
          metric_name: `${painArea} Pain (VAS)`,
          value: parseFloat(painScore),
          max_value: 10,
          unit: '/10',
          notes: `Auto-recorded from SOAP note`,
          session_date: new Date().toISOString().split('T')[0],
          metadata: {
            area: painArea,
            source: 'soap_objective'
          }
        } as any);
      } catch (error) {
        console.error('Failed to auto-create metric:', error);
        // Don't show error to user, as metric creation is optional
      }
    }
    
    setPainArea('');
    setPainScore('');
    toast.success('Pain score added to Objective');
  };

  const addRom = async () => {
    if (!romJoint || !romMovement || !romDegrees) return;
    
    const sideText = romSide === 'bilateral' ? 'bilateral' : romSide === 'right' ? 'right' : 'left';
    const textToAdd = `ROM: ${sideText} ${romJoint} ${romMovement} - ${romDegrees}°`;
    const newObjective = soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd;
    handleManualEdit('objective', newObjective);
    
    // Auto-create metric (optional)
    if (user && clientId && sessionId) {
      try {
        await supabase.from('progress_metrics').insert({
          client_id: clientId,
          practitioner_id: user.id,
          session_id: sessionId !== 'new-session' ? sessionId : null,
          metric_type: 'mobility',
          metric_name: `ROM - ${sideText} ${romJoint} ${romMovement}`,
          value: parseFloat(romDegrees),
          max_value: 180,
          unit: '°',
          notes: `Auto-recorded from SOAP note`,
          session_date: new Date().toISOString().split('T')[0],
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
    
    setRomJoint('');
    setRomSide('right');
    setRomMovement('');
    setRomDegrees('');
    toast.success('ROM added to Objective');
  };

  const addStrength = async () => {
    if (!strengthJoint || !strengthMovement || !strengthGrade) return;
    
    const gradeObj = STRENGTH_GRADES.find(g => g.value === strengthGrade);
    const gradeName = gradeObj ? gradeObj.label : strengthGrade;
    const sideText = strengthSide === 'bilateral' ? 'bilateral' : strengthSide === 'right' ? 'right' : 'left';
    const textToAdd = `Strength Testing: ${sideText} ${strengthJoint} ${strengthMovement} - Grade ${strengthGrade}/5 (${gradeName})`;
    const newObjective = soapData.objective ? `${soapData.objective}\n${textToAdd}` : textToAdd;
    handleManualEdit('objective', newObjective);
    
    // Auto-create metric (optional)
    if (user && clientId && sessionId) {
      try {
        // Convert Oxford Scale values to numeric for storage
        // Map: 0->0, 1->1, 2->2, 3->3, 4->4, 4-->3.5, 4+->4.5, 5->5
        const valueMap = STRENGTH_VALUE_MAP;
        
        await supabase.from('progress_metrics').insert({
          client_id: clientId,
          practitioner_id: user.id,
          session_id: sessionId !== 'new-session' ? sessionId : null,
          metric_type: 'strength',
          metric_name: `Strength - ${sideText} ${strengthJoint} ${strengthMovement}`,
          value: valueMap[strengthGrade] || 0,
          max_value: 5,
          unit: '/5',
          notes: `Auto-recorded from SOAP note - ${gradeName}`,
          session_date: new Date().toISOString().split('T')[0],
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
    
    setStrengthJoint('');
    setStrengthSide('right');
    setStrengthMovement('');
    setStrengthGrade('');
    toast.success('Strength test added to Objective');
  };

  const handleSave = async () => {
    if (onSave) {
      onSave(soapData, 'draft');
    }
    toast.success('SOAP notes saved as draft');
  };

  const handleComplete = async () => {
    if (onSave) {
      onSave(soapData, 'completed');
    }
    toast.success('SOAP notes completed and locked');
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
              {isStreamingWhisper && (
                <Badge variant="outline" className="text-blue-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Whisper Active
                </Badge>
              )}
              {isTranscribing && !isStreamingWhisper && (
                <Badge variant="outline" className="text-green-600">
                  <Zap className="h-3 w-3 mr-1" />
                  Browser Transcription
                </Badge>
              )}
              {isWhisperTranscribing && (
                <Badge variant="outline" className="text-purple-600">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Enhancing with AI
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

          {/* Enhanced Audio Level Indicator with Quality */}
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">Audio Level</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    audioQuality === 'excellent' ? 'text-green-600 border-green-600' :
                    audioQuality === 'good' ? 'text-blue-600 border-blue-600' :
                    audioQuality === 'fair' ? 'text-yellow-600 border-yellow-600' :
                    'text-red-600 border-red-600'
                  }
                >
                  {audioQuality.charAt(0).toUpperCase() + audioQuality.slice(1)} Quality
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-100 ${
                    audioQuality === 'excellent' ? 'bg-green-500' :
                    audioQuality === 'good' ? 'bg-blue-500' :
                    audioQuality === 'fair' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((audioLevel / 255) * 100, 100)}%` }}
                />
              </div>
              {audioQuality === 'poor' && (
                <p className="text-xs text-red-600">
                  ⚠️ Low audio level detected. Please check your microphone or move closer.
                </p>
              )}
            </div>
          )}
          
          {/* Streaming Status */}
          {isStreamingWhisper && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              <Sparkles className="h-3 w-3 mr-1" />
              Real-time Whisper Active
            </Badge>
          )}
          {streamingError && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              ⚠️ {streamingError}
            </Badge>
          )}

          {/* Recording Controls */}
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {whisperTranscript ? 'Whisper AI Transcription' : 'Live Transcription'}
            </CardTitle>
            {whisperTranscript && (
              <Badge variant="outline" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Enhanced with Whisper AI
              </Badge>
            )}
          </div>
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
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          segment.source === 'whisper' 
                            ? 'text-blue-600 border-blue-600' 
                            : 'text-green-600 border-green-600'
                        }`}
                      >
                        {segment.source === 'whisper' ? 'Whisper' : 'Browser'}
                      </Badge>
                      {segment.source === 'browser' && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(segment.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
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
                  disabled={isCompleted}
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
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>

            <TabsContent value="objective" className="space-y-4">
              {/* Suggested Prompts Section */}
              <div className={`bg-muted/30 p-4 rounded-lg border border-border/50 space-y-4 ${isCompleted ? 'opacity-50 pointer-events-none' : ''}`}>
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
                      <Select onValueChange={(value) => { setRomJoint(value); setRomMovement(''); }} value={romJoint}>
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
                      <Select onValueChange={(value) => { setStrengthJoint(value); setStrengthMovement(''); }} value={strengthJoint}>
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

              <div>
                <label className="text-sm font-medium">Objective Findings</label>
                <Textarea
                  value={soapData.objective}
                  onChange={(e) => handleManualEdit('objective', e.target.value)}
                  placeholder="Observations, palpation findings, range of motion measurements, etc..."
                  className="mt-2"
                  rows={4}
                  disabled={isCompleted}
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
                  disabled={isCompleted}
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
                  disabled={isCompleted}
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
                  disabled={isCompleted}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={handleSave} className="flex-1" disabled={isCompleted}>
              <Save className="h-4 w-4 mr-2" />
              Save Note
            </Button>
            {!isCompleted && (
              <Button onClick={handleComplete} variant="outline" className="flex-1 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700">
                <Target className="h-4 w-4 mr-2" />
                Complete Note
              </Button>
            )}
             {isCompleted && (
              <Button disabled variant="outline" className="flex-1 border-green-600 text-green-600 bg-green-50 opacity-100">
                <Target className="h-4 w-4 mr-2" />
                Note Completed
              </Button>
            )}
          </div>
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
                disabled={isRecording}
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
                disabled={isRecording}
              />
              <span className="text-xs text-muted-foreground">
                {Math.round(confidenceThreshold * 100)}%
              </span>
            </div>
          </div>
          
          {/* Microphone Selection */}
          {availableMicrophones.length > 0 && (
            <div>
              <label className="text-sm font-medium">Microphone</label>
              <select
                value={selectedMicrophoneId}
                onChange={(e) => {
                  setSelectedMicrophoneId(e.target.value);
                  localStorage.setItem('preferredMicrophoneId', e.target.value);
                }}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isRecording}
              >
                {availableMicrophones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select your preferred microphone for better audio quality
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};



