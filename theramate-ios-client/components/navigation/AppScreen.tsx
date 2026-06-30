import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  edges?: Edge[];
};

/**
 * Root wrapper for stack/modal screens (no tab bar).
 * Use TabScreen* components when the bottom tab bar is visible.
 */
export function AppScreen({
  children,
  className = "flex-1 bg-cream-50",
  style,
  edges = ["top"],
}: Props) {
  return (
    <SafeAreaView
      className={className}
      style={[styles.flex, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
