import React from "react";
import { View, Text, type ViewProps } from "react-native";
import { Colors } from "@/constants/colors";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
  className = "",
  ...props
}: ViewProps & {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={className}
      style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
      {...props}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          {eyebrow ? (
            <Text className="text-charcoal-500 text-xs uppercase font-semibold">
              {eyebrow}
            </Text>
          ) : null}
          <Text className="text-charcoal-900 text-2xl font-bold mt-1">
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-charcoal-500 mt-2">{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={{ paddingTop: eyebrow ? 2 : 6 }}>{right}</View> : null}
      </View>
      <View
        style={{
          height: 1,
          backgroundColor: Colors.cream[200],
          marginTop: 16,
        }}
      />
    </View>
  );
}

export default ScreenHeader;

