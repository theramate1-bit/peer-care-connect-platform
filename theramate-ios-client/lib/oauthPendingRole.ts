import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "oauth_pending_signup_role";

export type SignupRole = "client" | "practitioner";

export async function setPendingOAuthSignupRole(role: SignupRole): Promise<void> {
  if (role !== "client" && role !== "practitioner") return;
  await AsyncStorage.setItem(KEY, role);
}

export async function clearPendingOAuthSignupRole(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function getPendingOAuthSignupRole(): Promise<
  "client" | "practitioner" | null
> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === "client" || raw === "practitioner") return raw;
  return null;
}
