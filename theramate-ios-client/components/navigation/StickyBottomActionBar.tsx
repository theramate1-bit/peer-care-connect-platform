import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";

/** Reserve scroll space when content sits above a multi-button sticky bar. */
export const STICKY_MULTI_ACTION_BAR_EXTRA = 200;

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** When true, pins to the physical bottom (no tab bar offset). */
  fullBleedBottom?: boolean;
};

/**
 * Fixed bottom action area above the tab bar.
 * When used inside tab stacks, scene padding already clears the tab bar — bar sits at bottom: 0.
 */
export function StickyBottomActionBar({
  children,
  style,
  fullBleedBottom = false,
}: Props) {
  const { tabBarHeight, insideTabNavigator } = useTabScreenInsets(0);
  const insets = useSafeAreaInsets();

  const bottomOffset = fullBleedBottom
    ? 0
    : insideTabNavigator
      ? 0
      : tabBarHeight;

  return (
    <View
      style={[
        styles.bar,
        {
          bottom: bottomOffset,
          paddingBottom: Math.max(
            insets.bottom > 0 && fullBleedBottom ? insets.bottom : 12,
            12,
          ),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.cream[50],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.cream[200],
    ...Platform.select({
      ios: {
        shadowColor: Colors.charcoal[900],
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
});
