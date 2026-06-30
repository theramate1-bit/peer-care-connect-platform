import { Platform } from "react-native";

/** Icon row + label inside the tab bar (excluding home-indicator inset). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

export function getTabBarBottomInset(bottomSafeInset: number): number {
  if (Platform.OS === "ios") {
    return bottomSafeInset;
  }
  return Math.max(bottomSafeInset, 8);
}

/** Total floating tab bar height: content + home indicator / gesture inset. */
export function getTabBarHeight(bottomSafeInset: number): number {
  return TAB_BAR_CONTENT_HEIGHT + getTabBarBottomInset(bottomSafeInset);
}
