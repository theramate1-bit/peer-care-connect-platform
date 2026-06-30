import { Alert, Linking, Platform } from "react-native";
import * as Calendar from "expo-calendar";

export type SessionCalendarInput = {
  title: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  location?: string | null;
  notes?: string | null;
};

function sessionStartEnd(input: SessionCalendarInput): {
  start: Date;
  end: Date;
} | null {
  const time = input.startTime.trim().slice(0, 5);
  const start = new Date(`${input.sessionDate}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(
    start.getTime() + Math.max(15, input.durationMinutes) * 60 * 1000,
  );
  return { start, end };
}

export async function addSessionToDeviceCalendar(
  input: SessionCalendarInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const range = sessionStartEnd(input);
  if (!range) {
    return { ok: false, error: "Invalid session date or time" };
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    if (Platform.OS === "ios") {
      Alert.alert(
        "Calendar access needed",
        "Allow calendar access in Settings to add this session.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
    }
    return {
      ok: false,
      error: "Calendar permission was not granted.",
    };
  }

  try {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    await Calendar.createEventAsync(defaultCalendar.id, {
      title: input.title,
      startDate: range.start,
      endDate: range.end,
      location: input.location?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      timeZone: undefined,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not add to calendar",
    };
  }
}
