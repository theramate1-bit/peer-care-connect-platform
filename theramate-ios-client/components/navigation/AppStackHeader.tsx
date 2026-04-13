import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import type { Href } from "expo-router";

import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref, goBackOrReplace } from "@/lib/navigation";

type AppStackHeaderProps = {
  title: string;
  /** Used when the stack cannot pop (cold open). Defaults to signed-in Profile tab. */
  fallbackHref?: Href | string;
  showBack?: boolean;
  right?: React.ReactNode;
  /** When set, invoked instead of default go-back / fallback navigation. */
  onBackPress?: () => void;
};

/**
 * Standard top bar for pushed / modal screens: back affordance + title + optional trailing actions.
 */
export function AppStackHeader({
  title,
  fallbackHref,
  showBack = true,
  right,
  onBackPress,
}: AppStackHeaderProps) {
  const onBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    goBackOrReplace((fallbackHref ?? defaultSignedInProfileHref()) as Href);
  };

  return (
    <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
      {showBack ? (
        <TouchableOpacity
          onPress={onBack}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
      ) : null}
      <Text
        className={`text-charcoal-900 text-lg font-semibold flex-1 min-w-0 ${showBack ? "ml-2" : ""}`}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ? <View className="flex-shrink-0 pl-2">{right}</View> : null}
    </View>
  );
}

type MainTabHeaderProps = {
  title: string;
  right?: React.ReactNode;
};

/**
 * Top bar for primary tab roots (no back): matches stack header chrome so the app feels consistent.
 */
export function MainTabHeader({ title, right }: MainTabHeaderProps) {
  return (
    <View className="px-6 pt-3 pb-3 border-b border-cream-200">
      <View className="flex-row items-center justify-between min-h-[32px]">
        <Text className="text-charcoal-900 text-lg font-semibold">{title}</Text>
        {right ?? null}
      </View>
    </View>
  );
}
