/**
 * Button Component
 * Soft cream theme with sage/terracotta accents
 */

import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

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
}

const variantStyles = {
  primary: {
    container: "bg-sage-500 active:bg-sage-600",
    text: "text-white font-semibold",
  },
  secondary: {
    container: "bg-terracotta-500 active:bg-terracotta-600",
    text: "text-white font-semibold",
  },
  outline: {
    container: "bg-transparent border-2 border-sage-500 active:bg-sage-500/10",
    text: "text-sage-500 font-semibold",
  },
  ghost: {
    container: "bg-transparent active:bg-charcoal-100",
    text: "text-charcoal-700 font-medium",
  },
  destructive: {
    container: "bg-error active:bg-error/90",
    text: "text-white font-semibold",
  },
};

const sizeStyles = {
  sm: {
    container: "px-4 py-2 rounded-md",
    text: "text-sm",
  },
  md: {
    container: "px-6 py-3 rounded-lg",
    text: "text-base",
  },
  lg: {
    container: "px-8 py-4 rounded-xl",
    text: "text-lg",
  },
};

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
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.97, { damping: 15 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.(e);
  };

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || isLoading;

  return (
    <AnimatedTouchableOpacity
      style={animatedStyle}
      className={`
        flex-row items-center justify-center
        ${variantStyle.container}
        ${sizeStyle.container}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-50" : ""}
        ${className}
      `}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost" ? "#7A9E7E" : "#FFFFFF"
          }
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            className={`
              ${variantStyle.text}
              ${sizeStyle.text}
              ${leftIcon ? "ml-2" : ""}
              ${rightIcon ? "mr-2" : ""}
            `}
          >
            {children}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </AnimatedTouchableOpacity>
  );
}

export default Button;
