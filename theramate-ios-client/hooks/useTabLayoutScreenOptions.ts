import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import { Colors } from "@/constants/colors";
import { getTabBarBottomInset, getTabBarHeight } from "@/lib/tabBarMetrics";

/**
 * Shared bottom-tab chrome: safe-area-aware height, scene inset, blur background.
 */
export function useTabLayoutScreenOptions(): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);
  const tabBarBottomInset = getTabBarBottomInset(insets.bottom);

  return {
    headerShown: false,
    // RN tab navigator supports scene inset; types lag behind runtime.
    sceneContainerStyle: {
      paddingBottom: tabBarHeight,
    },
    tabBarStyle: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: tabBarHeight,
      paddingTop: 4,
      paddingBottom: tabBarBottomInset,
      backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.white,
      borderTopWidth: 0,
      elevation: 0,
    },
    tabBarItemStyle: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 2,
      height: "100%",
      justifyContent: "center",
    },
    tabBarShowLabel: false,
  } as BottomTabNavigationOptions;
}
