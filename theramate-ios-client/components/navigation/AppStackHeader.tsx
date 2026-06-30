import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import type { Href } from "expo-router";

import { Colors } from "@/constants/colors";
import { defaultSignedInProfileHref, goBackOrReplace } from "@/lib/navigation";

type AppStackHeaderProps = {
  title: string;
  subtitle?: string;
  /** Used when the stack cannot pop (cold open). Defaults to signed-in Profile tab. */
  fallbackHref?: Href | string;
  showBack?: boolean;
  right?: React.ReactNode;
  /** Optional node between back and title (e.g. chat avatar). */
  leading?: React.ReactNode;
  /** When set, invoked instead of default go-back / fallback navigation. */
  onBackPress?: () => void;
};

/**
 * Standard top bar for pushed / modal screens: back affordance + title + optional trailing actions.
 */
export function AppStackHeader({
  title,
  subtitle,
  fallbackHref,
  showBack = true,
  right,
  leading,
  onBackPress,
}: AppStackHeaderProps) {
  const onBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    goBackOrReplace((fallbackHref ?? defaultSignedInProfileHref()) as Href);
  };

  if (subtitle) {
    return (
      <View className="px-4 pt-2 pb-4 border-b border-cream-200">
        <View className="flex-row items-start">
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
          <View className={`flex-1 min-w-0 ${showBack ? "ml-2" : ""}`}>
            <Text className="text-charcoal-900 text-lg font-semibold">
              {title}
            </Text>
            <Text className="text-charcoal-500 text-xs mt-0.5">{subtitle}</Text>
          </View>
          {right ? (
            <View className="flex-shrink-0 pl-2 pt-0.5">{right}</View>
          ) : null}
        </View>
      </View>
    );
  }

  const titleOffset = showBack || leading ? "ml-2" : "";

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
      {leading ? <View className="flex-shrink-0">{leading}</View> : null}
      <Text
        className={`text-charcoal-900 text-lg font-semibold flex-1 min-w-0 ${titleOffset}`}
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
  eyebrow?: string;
  subtitle?: string;
  right?: React.ReactNode;
};

/**
 * Top bar for primary tab roots (no back): matches stack header chrome so the app feels consistent.
 * Optional eyebrow/subtitle for practitioner practice tabs — one header primitive for client + practice.
 */
export function MainTabHeader({
  title,
  eyebrow,
  subtitle,
  right,
}: MainTabHeaderProps) {
  const rich = Boolean(eyebrow || subtitle);

  if (!rich) {
    return (
      <View className="px-6 pt-3 pb-3 border-b border-cream-200">
        <View className="flex-row items-center justify-between min-h-[32px]">
          <Text className="text-charcoal-900 text-lg font-semibold">
            {title}
          </Text>
          {right ?? null}
        </View>
      </View>
    );
  }

  return (
    <View className="px-6 pt-3 pb-3 border-b border-cream-200">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text className="text-charcoal-500 text-xs uppercase font-semibold">
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-charcoal-900 text-lg font-semibold mt-1">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-charcoal-500 text-sm mt-2">{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View className="pt-0.5">{right}</View> : null}
      </View>
    </View>
  );
}
