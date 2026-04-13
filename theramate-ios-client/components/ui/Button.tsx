/**
 * Button Component
 * Soft cream theme with sage/terracotta accents.
 * Core visuals use StyleSheet — Reanimated's animated TouchableOpacity does not reliably
 * receive NativeWind `className`, which caused invisible controls and a "white screen" landing.
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  style?: ViewStyle;
}

const sizePadding: Record<
  NonNullable<ButtonProps["size"]>,
  { py: number; px: number; radius: number; fontSize: number }
> = {
  sm: { py: 8, px: 16, radius: 8, fontSize: 14 },
  md: { py: 12, px: 24, radius: 12, fontSize: 16 },
  lg: { py: 16, px: 32, radius: 16, fontSize: 18 },
};

function containerStyle(
  variant: NonNullable<ButtonProps["variant"]>,
  size: NonNullable<ButtonProps["size"]>,
  fullWidth: boolean,
  disabled: boolean,
): ViewStyle {
  const s = sizePadding[size];
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: s.py,
    paddingHorizontal: s.px,
    borderRadius: s.radius,
    alignSelf: fullWidth ? "stretch" : "center",
    opacity: disabled ? 0.5 : 1,
  };

  switch (variant) {
    case "primary":
      return { ...base, backgroundColor: Colors.sage[500] };
    case "secondary":
      return { ...base, backgroundColor: Colors.terracotta[500] };
    case "outline":
      return {
        ...base,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: Colors.sage[500],
      };
    case "ghost":
      return { ...base, backgroundColor: "transparent" };
    case "destructive":
      return { ...base, backgroundColor: Colors.error };
    default:
      return base;
  }
}

function textStyle(
  variant: NonNullable<ButtonProps["variant"]>,
  size: NonNullable<ButtonProps["size"]>,
): TextStyle {
  const s = sizePadding[size];
  const base: TextStyle = {
    fontSize: s.fontSize,
    fontWeight: "600",
  };

  switch (variant) {
    case "primary":
    case "secondary":
    case "destructive":
      return { ...base, color: "#FFFFFF" };
    case "outline":
      return { ...base, color: Colors.sage[500] };
    case "ghost":
      return { ...base, color: Colors.charcoal[700], fontWeight: "500" };
    default:
      return { ...base, color: Colors.charcoal[900] };
  }
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  style: styleProp,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: Parameters<NonNullable<TouchableOpacityProps["onPressIn"]>>[0]) => {
    scale.value = withSpring(0.97, { damping: 15 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<TouchableOpacityProps["onPressOut"]>>[0]) => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.(e);
  };

  const isDisabled = disabled || isLoading;
  const cStyle = containerStyle(variant, size, fullWidth, isDisabled);
  const tStyle = textStyle(variant, size);

  const inner = (
    <AnimatedTouchableOpacity
      style={[animatedStyle, cStyle, styleProp]}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.85}
      accessibilityRole="button"
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost"
              ? Colors.sage[500]
              : "#FFFFFF"
          }
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            style={[
              tStyle,
              leftIcon ? { marginLeft: 8 } : null,
              rightIcon ? { marginRight: 8 } : null,
            ]}
          >
            {children}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </AnimatedTouchableOpacity>
  );

  if (className.trim()) {
    return <View className={className}>{inner}</View>;
  }

  return inner;
}

export default Button;
