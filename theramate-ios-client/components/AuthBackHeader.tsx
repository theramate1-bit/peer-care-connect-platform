import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router, type Href } from "expo-router";

import { Colors } from "@/constants/colors";
import { goBackOrReplace } from "@/lib/navigation";

type Props = {
  /** Used when there is no history (e.g. cold open). */
  fallbackHref: Href;
  /** Visible label next to the chevron. */
  label?: string;
  /**
   * When true, always `router.replace(fallbackHref)`. Use when normal back would hit a screen
   * that immediately redirects (e.g. guest Home tab → Explore).
   */
  alwaysReplace?: boolean;
};

/**
 * Consistent back control for auth flows: uses stack back when possible, otherwise `fallbackHref`.
 */
export function AuthBackHeader({
  fallbackHref,
  label = "Back",
  alwaysReplace = false,
}: Props) {
  const onPress = () => {
    if (alwaysReplace) {
      router.replace(fallbackHref);
    } else {
      goBackOrReplace(fallbackHref);
    }
  };

  return (
    <View style={styles.wrap} accessibilityElementsHidden={false}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.row}
        hitSlop={{ top: 14, bottom: 14, left: 8, right: 16 }}
        accessibilityRole="button"
        accessibilityLabel={`${label}, go back`}
      >
        <ChevronLeft size={22} color={Colors.sage[600]} strokeWidth={2.25} />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    marginTop: Platform.select({ ios: 0, default: 0 }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 12,
  },
  label: {
    marginLeft: 2,
    fontSize: 17,
    fontWeight: "600",
    color: Colors.sage[600],
  },
});
