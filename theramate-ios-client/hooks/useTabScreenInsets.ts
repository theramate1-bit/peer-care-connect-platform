import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabBarHeight } from "@/lib/tabBarMetrics";

/**
 * Layout metrics for screens inside a bottom-tab navigator.
 *
 * Tab layouts set `sceneContainerStyle.paddingBottom` (see useTabLayoutScreenOptions).
 * Scroll content only needs `extraBottom` breathing room when inside tabs.
 */
export function useTabScreenInsets(extraBottom = 24) {
  const insets = useSafeAreaInsets();
  const measuredTabBar = useBottomTabBarHeight();
  const tabBarHeight =
    measuredTabBar > 0 ? measuredTabBar : getTabBarHeight(insets.bottom);

  const insideTabNavigator = measuredTabBar > 0;

  return {
    tabBarHeight,
    contentPaddingBottom: insideTabNavigator
      ? extraBottom
      : tabBarHeight + extraBottom,
    insideTabNavigator,
  };
}

export function useTabScreenContentPadding(extraBottom = 24) {
  return useTabScreenInsets(extraBottom).contentPaddingBottom;
}

/** FlatList / ScrollView contentContainerStyle with correct tab clearance. */
export function useTabContentContainerStyle(
  extraBottom = 24,
  base?: StyleProp<ViewStyle>,
): StyleProp<ViewStyle> {
  const paddingBottom = useTabScreenContentPadding(extraBottom);
  return useMemo(
    () => [{ paddingBottom }, base] as StyleProp<ViewStyle>,
    [paddingBottom, base],
  );
}

/** Bottom offset for fixed composers above the tab bar (chat, etc.). */
export function useTabComposerPadding(extra = 12) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, extra) + 8;
}
