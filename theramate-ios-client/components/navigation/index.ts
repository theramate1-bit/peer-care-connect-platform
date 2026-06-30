/**
 * App navigation chrome — import from here for tab/stack layout consistency.
 *
 * Tab bar visible:  TabScreen + TabScreenScroll | TabScreenList | StickyBottomActionBar
 * Stack / modal:    AppScreen + AppStackHeader
 * Tab layout only:  useTabLayoutScreenOptions (in app/(tabs)/_layout.tsx)
 */

export { AppStackHeader, MainTabHeader } from "./AppStackHeader";
export { AppScreen } from "./AppScreen";
export { TabBarIcon } from "./TabBarIcon";
export { TabScreen, TabScreenBody } from "./TabScreen";
export { TabScreenScroll } from "./TabScreenScroll";
export { TabScreenList } from "./TabScreenList";
export {
  StickyBottomActionBar,
  STICKY_MULTI_ACTION_BAR_EXTRA,
} from "./StickyBottomActionBar";

export {
  useTabScreenInsets,
  useTabScreenContentPadding,
  useTabContentContainerStyle,
  useTabComposerPadding,
} from "@/hooks/useTabScreenInsets";

export { getTabBarHeight, TAB_BAR_CONTENT_HEIGHT } from "@/lib/tabBarMetrics";

/** @deprecated Use TabScreenScroll */
export { TabScreenScroll as TabScreenScrollView } from "./TabScreenScroll";
/** @deprecated Use TabScreen */
export { TabScreen as TabScreenSafeArea } from "./TabScreen";
