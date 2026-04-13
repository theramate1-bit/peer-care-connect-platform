/**
 * Local voice memo capture for clinical SOAP prep (expo-av).
 * Not used on web — recording APIs are unreliable in browser for this flow.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";

function guessAudioMeta(uri: string): { fileName: string; mimeType: string } {
  const lower = uri.toLowerCase();
  if (lower.includes(".m4a") || lower.endsWith("m4a")) {
    return { fileName: `voice-${Date.now()}.m4a`, mimeType: "audio/m4a" };
  }
  if (lower.includes(".caf")) {
    return { fileName: `voice-${Date.now()}.caf`, mimeType: "audio/x-caf" };
  }
  if (lower.includes(".mp4") || lower.includes(".mpeg4")) {
    return { fileName: `voice-${Date.now()}.mp4`, mimeType: "audio/mp4" };
  }
  return { fileName: `voice-${Date.now()}.m4a`, mimeType: "audio/m4a" };
}

export function useVoiceSessionRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      const r = recordingRef.current;
      recordingRef.current = null;
      if (r) {
        void r.stopAndUnloadAsync();
      }
    };
  }, []);

  const start = useCallback(async (): Promise<{
    ok: boolean;
    error?: Error;
  }> => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        return {
          ok: false,
          error: new Error(
            "Microphone access is required to record a voice note.",
          ),
        };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setDurationSec(0);
      setIsRecording(true);

      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(async () => {
        const status = await rec.getStatusAsync();
        if (status.isRecording && status.durationMillis != null) {
          setDurationSec(Math.floor(status.durationMillis / 1000));
        }
      }, 400);

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }, []);

  const stop = useCallback(async (): Promise<{
    uri: string | null;
    fileName: string;
    mimeType: string;
    error: Error | null;
  }> => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);

    if (!rec) {
      return {
        uri: null,
        fileName: "",
        mimeType: "audio/m4a",
        error: new Error("Nothing to stop — start recording first."),
      };
    }

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        return {
          uri: null,
          fileName: "",
          mimeType: "audio/m4a",
          error: new Error("Recording produced no file."),
        };
      }
      const meta = guessAudioMeta(uri);
      return { uri, ...meta, error: null };
    } catch (e) {
      return {
        uri: null,
        fileName: "",
        mimeType: "audio/m4a",
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }, []);

  return { isRecording, durationSec, start, stop };
}
