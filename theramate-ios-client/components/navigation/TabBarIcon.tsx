import React from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { TAB_BAR_CONTENT_HEIGHT } from "@/lib/tabBarMetrics";

export type TabBarIconProps = {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  iconSize?: number;
};

/**
 * Tab item content sized to fit TAB_BAR_CONTENT_HEIGHT (no clipping on home indicator devices).
 */
export function TabBarIcon({
  icon: Icon,
  label,
  focused,
  iconSize = 22,
}: TabBarIconProps) {
  return (
    <View
      style={styles.outer}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, focused ? styles.iconWrapFocused : null]}>
        <Icon
          size={iconSize}
          color={focused ? Colors.sage[500] : Colors.charcoal[400]}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[styles.label, focused ? styles.labelFocused : styles.labelIdle]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "100%",
    minHeight: TAB_BAR_CONTENT_HEIGHT,
    paddingTop: 4,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapFocused: {
    backgroundColor: "rgba(122, 158, 126, 0.1)",
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
    textAlign: "center",
    alignSelf: "stretch",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  labelFocused: {
    color: Colors.sage[500],
    fontWeight: "600",
  },
  labelIdle: {
    color: Colors.charcoal[400],
    fontWeight: "400",
  },
});
