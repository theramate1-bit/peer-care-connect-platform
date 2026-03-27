/**
 * Tab Layout
 * Main app navigation with bottom tabs
 */

import React from "react";
import { View, Text, Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Home,
  Search,
  Calendar,
  MessageCircle,
  User,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface TabIconProps {
  icon: IconComponent;
  label: string;
  focused: boolean;
}

function TabIcon({ icon: Icon, label, focused }: TabIconProps) {
  return (
    <View className="items-center justify-center pt-2">
      <View
        className={`
          w-10 h-10 rounded-xl items-center justify-center
          ${focused ? "bg-sage-500/10" : "bg-transparent"}
        `}
      >
        <Icon
          size={24}
          color={focused ? Colors.sage[500] : Colors.charcoal[400]}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text
        className={`
          text-xs mt-1
          ${focused ? "text-sage-500 font-semibold" : "text-charcoal-400"}
        `}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.white,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 88 : 70,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="light"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ) : null,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Search} label="Explore" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Calendar} label="Sessions" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessageCircle} label="Messages" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
