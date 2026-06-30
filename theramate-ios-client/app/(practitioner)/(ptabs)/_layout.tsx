/**
 * Practitioner tab bar — only these five segments exist here; everything else lives
 * under `app/(practitioner)/` as stack routes.
 */

import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Calendar,
  LayoutDashboard,
  List,
  MessageCircle,
  User,
} from "lucide-react-native";

import { TabRootProvider } from "@/contexts/TabRootContext";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { useTabLayoutScreenOptions } from "@/hooks/useTabLayoutScreenOptions";

export default function PractitionerTabsLayout() {
  const tabScreenOptions = useTabLayoutScreenOptions();

  return (
    <TabRootProvider value="/(practitioner)/(ptabs)">
      <Tabs
        screenOptions={{
          ...tabScreenOptions,
          tabBarItemStyle: {
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 0,
            height: "100%",
            justifyContent: "center",
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
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: "/(practitioner)/(ptabs)",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                icon={LayoutDashboard}
                label="Home"
                focused={focused}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="schedule"
          options={{
            href: "/schedule",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={Calendar} label="Diary" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="bookings"
          options={{
            href: "/bookings",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={List} label="Sessions" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            href: "/messages",
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
            href: "/profile",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon icon={User} label="Profile" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="clients"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </TabRootProvider>
  );
}
