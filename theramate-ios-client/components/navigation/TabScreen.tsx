import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

const DEFAULT_CLASS = "flex-1 bg-cream-50";

type TabScreenProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  /** Top only by default — tab scene handles bottom inset. */
  edges?: Edge[];
};

/** Root wrapper for any screen shown with the bottom tab bar visible. */
export function TabScreen({
  children,
  style,
  className = DEFAULT_CLASS,
  edges = ["top"],
}: TabScreenProps) {
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

/** Flex column body below a header inside TabScreen. */
export function TabScreenBody({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
}) {
  if (className) {
    return (
      <View className={className} style={[styles.flex, style]}>
        {children}
      </View>
    );
  }
  return <View style={[styles.flex, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
