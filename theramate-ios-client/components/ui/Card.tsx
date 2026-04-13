/**
 * Card Component
 * Soft cream theme card with subtle shadows
 */

import React from "react";
import {
  View,
  ViewProps,
  TouchableOpacity,
  TouchableOpacityProps,
  type ViewStyle,
  Text,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

interface PressableCardProps extends Omit<TouchableOpacityProps, "style"> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  style?: ViewStyle;
}

const paddingPx: Record<NonNullable<CardProps["padding"]>, number> = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
};

function cardContainerStyle(
  variant: NonNullable<CardProps["variant"]>,
  padding: NonNullable<CardProps["padding"]>,
): ViewStyle {
  const p = paddingPx[padding];
  const base: ViewStyle = {
    borderRadius: 12,
    padding: p,
  };

  switch (variant) {
    case "default":
      return {
        ...base,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.cream[200],
      };
    case "elevated":
      return {
        ...base,
        backgroundColor: Colors.white,
        shadowColor: "#2D2A26",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      };
    case "outlined":
      return {
        ...base,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: Colors.cream[300],
      };
    case "filled":
      return {
        ...base,
        backgroundColor: Colors.cream[100],
      };
    default:
      return base;
  }
}

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  style,
  ...props
}: CardProps) {
  return (
    <View
      className={className}
      style={[cardContainerStyle(variant, padding), style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  children,
  variant = "default",
  padding = "md",
  className = "",
  style: styleProp,
  onPressIn,
  onPressOut,
  ...props
}: PressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: Parameters<NonNullable<TouchableOpacityProps["onPressIn"]>>[0]) => {
    scale.value = withSpring(0.98, { damping: 15 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<TouchableOpacityProps["onPressOut"]>>[0]) => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.(e);
  };

  const boxStyle = cardContainerStyle(variant, padding);
  const touchableStyle: ViewStyle[] = [
    animatedStyle,
    boxStyle,
    ...(className.trim() ? [{ width: "100%" as const }] : []),
    ...(styleProp ? [styleProp] : []),
  ];

  const touchable = (
    <AnimatedTouchableOpacity
      style={touchableStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );

  if (className.trim()) {
    return <View className={className}>{touchable}</View>;
  }

  return touchable;
}

// Card subcomponents
export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`mb-3 ${className}`}>
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={`text-lg font-semibold text-charcoal-900 ${className}`}
    >
      {children}
    </Text>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text className={`text-sm text-charcoal-500 mt-1 ${className}`}>
      {children}
    </Text>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={className}>{children}</View>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`mt-4 flex-row items-center ${className}`}>
      {children}
    </View>
  );
}

export default Card;
