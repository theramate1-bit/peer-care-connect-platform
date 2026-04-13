/**
 * Tab Layout
 * Main app navigation with bottom tabs
 */

import React from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
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
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

/** Lucide icons share the same component type; keep in sync with imports above. */
type TabIconComponent = typeof Home;

interface TabIconProps {
  icon: TabIconComponent;
  label: string;
  focused: boolean;
}

const tabIconStyles = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    width: "100%",
    maxWidth: "100%",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapFocused: {
    backgroundColor: "rgba(122, 158, 126, 0.1)",
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    marginTop: 4,
    textAlign: "center",
    alignSelf: "stretch",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  labelFocused: {
    color: Colors.sage[500],
    fontWeight: "600",
  },
  labelIdle: {
    color: Colors.charcoal[400],
    fontWeight: "400",
  },
});

function TabIcon({ icon: Icon, label, focused }: TabIconProps) {
  return (
    <View style={tabIconStyles.outer}>
      <View
        style={[
          tabIconStyles.iconWrap,
          focused ? tabIconStyles.iconWrapFocused : null,
        ]}
      >
        <Icon
          size={24}
          color={focused ? Colors.sage[500] : Colors.charcoal[400]}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[
          tabIconStyles.label,
          focused ? tabIconStyles.labelFocused : tabIconStyles.labelIdle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated } = useAuth();
  /** Guests (browse without account) only use Explore — hide other tabs from the bar. */
  const guestOnlyExplore = !isAuthenticated;

  return (
    <TabRootProvider value="/(tabs)">
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
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 2,
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
          href: guestOnlyExplore ? null : "/(tabs)",
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
          href: guestOnlyExplore ? null : "/bookings",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Calendar} label="Sessions" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          href: guestOnlyExplore ? null : "/messages",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={MessageCircle} label="Messages" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: guestOnlyExplore ? null : "/profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
    </TabRootProvider>
  );
}
