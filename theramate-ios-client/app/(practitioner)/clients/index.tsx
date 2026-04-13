import { Redirect } from "expo-router";

/** Legacy alias: old stack path now lives under practitioner tabs. */
export default function PractitionerClientsLegacyAlias() {
  return <Redirect href="/clients" />;
}
