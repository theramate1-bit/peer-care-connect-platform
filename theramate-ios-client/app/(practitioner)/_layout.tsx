import { Stack } from "expo-router";

import { TabRootProvider } from "@/contexts/TabRootContext";

/**
 * Practitioner shell: stack holds tab navigator plus all deep / stack-only routes
 * so they never register as tab bar items (unlike sibling routes under the same Tabs group).
 *
 * Tab root is provided here so stack-only routes (e.g. clinical-notes) still resolve
 * `tabPath(...)` the same as screens under `(ptabs)`.
 */
export default function PractitionerLayout() {
  return (
    <TabRootProvider value="/(practitioner)/(ptabs)">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </TabRootProvider>
  );
}
