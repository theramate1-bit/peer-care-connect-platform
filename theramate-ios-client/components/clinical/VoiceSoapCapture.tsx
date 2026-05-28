import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Mic, Square } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useVoiceSessionRecorder } from "@/hooks/useVoiceSessionRecorder";

function formatVoiceDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export type VoiceSoapCaptureProps = {
  disabled?: boolean;
  transcribing?: boolean;
  onRecordingReady: (file: {
    fileUri: string;
    fileName: string;
    mimeType: string;
  }) => void;
  onError?: (message: string) => void;
};

/**
 * Voice memo → transcript for SOAP drafting (Pro / Clinic).
 */
export function VoiceSoapCapture({
  disabled = false,
  transcribing = false,
  onRecordingReady,
  onError,
}: VoiceSoapCaptureProps) {
  const voice = useVoiceSessionRecorder();
  const voiceSupported = Platform.OS !== "web";
  const busy = disabled || transcribing || voice.isRecording;

  const onStart = async () => {
    const res = await voice.start();
    if (!res.ok && res.error) {
      onError?.(res.error.message);
    }
  };

  const onStop = async () => {
    const stopped = await voice.stop();
    if (stopped.error) {
      onError?.(stopped.error.message);
      return;
    }
    if (!stopped.uri) {
      onError?.("Recording was empty. Try again.");
      return;
    }
    onRecordingReady({
      fileUri: stopped.uri,
      fileName: stopped.fileName,
      mimeType: stopped.mimeType,
    });
  };

  if (!voiceSupported) {
    return (
      <Text className="text-charcoal-500 text-sm leading-5 mb-3">
        Voice capture is available on iOS and Android. Paste a transcript below
        on web.
      </Text>
    );
  }

  return (
    <View className="mb-3">
      {voice.isRecording ? (
        <View className="flex-row items-center bg-white border border-red-200 rounded-xl px-3 py-3">
          <View className="w-3 h-3 rounded-full bg-red-500 mr-3" />
          <View className="flex-1">
            <Text className="text-charcoal-900 font-semibold">
              Recording {formatVoiceDuration(voice.durationSec)}
            </Text>
            <Text className="text-charcoal-400 text-xs mt-0.5">
              Speak clearly, then tap Stop. Max ~5 minutes recommended.
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center bg-charcoal-800 px-4 py-2.5 rounded-xl"
            onPress={() => void onStop()}
            disabled={transcribing}
            accessibilityRole="button"
            accessibilityLabel="Stop recording and transcribe"
          >
            <Square size={16} color="#fff" fill="#fff" />
            <Text className="text-white font-semibold ml-2">Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Button
          variant="outline"
          disabled={busy}
          leftIcon={<Mic size={18} color={Colors.sage[600]} />}
          onPress={() => void onStart()}
        >
          <Text className="text-charcoal-800 font-semibold">
            {transcribing ? "Transcribing…" : "Record voice memo"}
          </Text>
        </Button>
      )}
      {transcribing ? (
        <View className="flex-row items-center mt-3">
          <ActivityIndicator color={Colors.sage[500]} />
          <Text className="text-charcoal-500 text-sm ml-2">
            Uploading and transcribing…
          </Text>
        </View>
      ) : null}
    </View>
  );
}
