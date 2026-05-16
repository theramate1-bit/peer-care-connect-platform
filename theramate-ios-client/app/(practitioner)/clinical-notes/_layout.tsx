import { Stack } from "expo-router";

/**
 * Modal presentation aligns with web practice client hub (session notes as overlay),
 * while keeping the same route for deep links and bookings → notes.
 */
export default function ClinicalNotesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="[sessionId]"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
