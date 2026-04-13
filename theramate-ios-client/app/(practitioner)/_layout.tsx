import { Stack } from "expo-router";

/**
 * Practitioner shell: stack holds tab navigator plus all deep / stack-only routes
 * so they never register as tab bar items (unlike sibling routes under the same Tabs group).
 */
export default function PractitionerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    />
  );
}
