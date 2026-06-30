/**
 * Tab Layout
 * Main app navigation with bottom tabs
 */

import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Home,
  Search,
  Calendar,
  MessageCircle,
  User,
} from "lucide-react-native";
import { TabRootProvider } from "@/contexts/TabRootContext";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { useAuth } from "@/hooks/useAuth";
import { useTabLayoutScreenOptions } from "@/hooks/useTabLayoutScreenOptions";

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const guestOnlyExplore = !isAuthenticated;
  const tabScreenOptions = useTabLayoutScreenOptions();

  return (
    <TabRootProvider value="/(tabs)">
      <Tabs
        screenOptions={{
          ...tabScreenOptions,
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
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: guestOnlyExplore ? null : "/(tabs)",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Home} label="Home" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Search} label="Explore" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="bookings"
          options={{
            href: guestOnlyExplore ? null : "/bookings",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Calendar} label="Sessions" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            href: guestOnlyExplore ? null : "/messages",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                icon={MessageCircle}
                label="Messages"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            href: guestOnlyExplore ? null : "/profile",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={User} label="Profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </TabRootProvider>
  );
}
