/**
 * Input Component
 * Soft cream theme text input
 */

import React, { forwardRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  TextInputProps,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Eye, EyeOff } from "lucide-react-native";
import { Colors } from "@/constants/colors";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      isPassword = false,
      disabled = false,
      className = "",
      containerClassName = "",
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const borderColor = useSharedValue<string>(Colors.cream[300]);

    const animatedStyle = useAnimatedStyle(() => ({
      borderColor: borderColor.value,
    }));

    const handleFocus = (e: any) => {
      setIsFocused(true);
      borderColor.value = withTiming(Colors.sage[500], { duration: 150 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      borderColor.value = withTiming(error ? Colors.error : Colors.cream[300], {
        duration: 150,
      });
      onBlur?.(e);
    };

    const boxStatic: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderRadius: 12,
      backgroundColor: disabled ? Colors.cream[100] : Colors.white,
      opacity: disabled ? 0.5 : 1,
    };

    const inputTextStyle: TextStyle = {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: Colors.charcoal[900],
      ...(leftIcon ? { paddingLeft: 0 } : null),
      ...(rightIcon || isPassword ? { paddingRight: 0 } : null),
    };

    return (
      <View className={`mb-4 ${containerClassName}`}>
        {label && (
          <Text className="text-sm font-medium text-charcoal-700 mb-2">
            {label}
          </Text>
        )}

        <Animated.View
          style={[animatedStyle, boxStatic] as React.ComponentProps<
            typeof Animated.View
          >["style"]}
        >
          {leftIcon && (
            <View style={{ paddingLeft: 16, paddingRight: 8 }}>{leftIcon}</View>
          )}

          <TextInput
            ref={ref}
            style={inputTextStyle}
            className={className}
            placeholderTextColor={Colors.charcoal[300]}
            editable={!disabled}
            secureTextEntry={isPassword && !showPassword}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              style={{ paddingRight: 16, paddingLeft: 8 }}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {showPassword ? (
                <EyeOff size={20} color={Colors.charcoal[400]} />
              ) : (
                <Eye size={20} color={Colors.charcoal[400]} />
              )}
            </TouchableOpacity>
          )}

          {rightIcon && !isPassword && (
            <View style={{ paddingRight: 16, paddingLeft: 8 }}>{rightIcon}</View>
          )}
        </Animated.View>

        {error && (
          <Text className="text-sm text-error mt-1.5 ml-1">{error}</Text>
        )}

        {hint && !error && (
          <Text className="text-sm text-charcoal-400 mt-1.5 ml-1">{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";

export default Input;
