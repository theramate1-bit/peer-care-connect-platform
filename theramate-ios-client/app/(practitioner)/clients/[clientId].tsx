import { Redirect, useLocalSearchParams } from "expo-router";

/** Legacy alias: old stack client detail now lives under practitioner tabs. */
export default function PractitionerClientLegacyAlias() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  if (!clientId) {
    return <Redirect href="/clients" />;
  }
  return <Redirect href={`/clients/${clientId}`} />;
}
