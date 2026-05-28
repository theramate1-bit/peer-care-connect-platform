import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SessionRecorderProps {
  sessionId: string;
  clientName: string;
  onRecordingComplete?: (recordingId: string) => void;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({
  sessionId,
  clientName,
  onRecordingComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
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
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info('Recording paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      toast.info('Recording resumed');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Clean up audio context and stream
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      toast.info('Recording stopped, processing...');
    }
  };

  const processRecording = async () => {
    setIsProcessing(true);
    
    try {
      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Create session recording record
      const { data: recording, error: recordingError } = await supabase
        .from('session_recordings')
        .insert({
          session_id: sessionId,
          practitioner_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'processing',
          duration_seconds: recordingTime,
        })
        .select()
        .single();

      if (recordingError) throw recordingError;

      // Send for transcription
      const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke(
        'voice-to-text',
        {
          body: { audio: base64Audio }
        }
      );

      if (transcriptError) throw transcriptError;

      // Update with transcript
      const { error: updateError } = await supabase
        .from('session_recordings')
        .update({
          transcript: transcriptData.text,
          status: 'processing'
        })
        .eq('id', recording.id);

      if (updateError) throw updateError;

      // Send for AI summarization
      const { error: summaryError } = await supabase.functions.invoke(
        'summarize-session',
        {
          body: {
            recordingId: recording.id,
            transcript: transcriptData.text
          }
        }
      );

      if (summaryError) throw summaryError;

      toast.success('Session recorded and analyzed successfully!');
      onRecordingComplete?.(recording.id);

    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Mic className="w-5 h-5" />
          Session Recording
        </CardTitle>
        <p className="text-sm text-muted-foreground">Client: {clientName}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Status */}
        <div className="flex items-center justify-center gap-2">
          {isRecording && (
            <Badge variant={isPaused ? "secondary" : "destructive"} className="animate-pulse">
              {isPaused ? "Paused" : "Recording"}
            </Badge>
          )}
          {isProcessing && (
            <Badge variant="secondary">Processing...</Badge>
          )}
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">
            {formatTime(recordingTime)}
          </div>
        </div>

        {/* Audio Level Indicator */}
        {isRecording && !isPaused && (
          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">Audio Level</p>
            <Progress value={(audioLevel / 255) * 100} className="h-2" />
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!isRecording && !isProcessing && (
            <Button onClick={startRecording} className="gap-2">
              <Mic className="w-4 h-4" />
              Start Recording
            </Button>
          )}

          {isRecording && !isPaused && (
            <>
              <Button onClick={pauseRecording} variant="outline" size="sm" className="gap-2">
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2">
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </>
          )}

          {isRecording && isPaused && (
            <>
              <Button onClick={resumeRecording} variant="outline" size="sm" className="gap-2">
                <Play className="w-4 h-4" />
                Resume
              </Button>
              <Button onClick={stopRecording} variant="destructive" size="sm" className="gap-2">
                <Square className="w-4 h-4" />
                Stop
              </Button>
            </>
          )}

          {isProcessing && (
            <Button disabled className="gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Processing...
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>• Ensure good microphone quality for best transcription</p>
          <p>• Recording will be automatically transcribed and summarized</p>
        </div>
      </CardContent>
    </Card>
  );
};