import { Redirect } from "expo-router";

export default function AuthCallbackAlias() {
  return <Redirect href="/oauth-callback" />;
}
