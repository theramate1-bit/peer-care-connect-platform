import { Redirect } from "expo-router";

/** Stack entry: tab shell lives under `(ptabs)`. */
export default function PractitionerEntry() {
  return <Redirect href="/(practitioner)/(ptabs)" />;
}
