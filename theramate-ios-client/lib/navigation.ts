import { router, type Href } from "expo-router";

import { signedInTabPath } from "@/lib/signedInRoutes";

/** Stack back when possible; otherwise replace (cold open / deep link with no history). */
export function goBackOrReplace(fallbackHref: Href | string) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackHref as Href);
  }
}

/** Default in-app back target when a stack screen has no history (signed-in profile hub). */
export function defaultSignedInProfileHref(): string {
  return signedInTabPath("profile");
}

/** Practitioner primary tab shell (Home, Diary, Sessions, Messages, Profile). */
export const PRACTITIONER_PTABS_HREF = "/(practitioner)/(ptabs)" as const;
