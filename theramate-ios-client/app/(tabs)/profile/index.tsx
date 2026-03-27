/**
 * Profile/Settings Screen
 * User profile and app settings
 */

import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  User,
  Target,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Settings,
  Star,
  MapPin,
  Dumbbell,
  ClipboardList,
} from "lucide-react-native";

import { useAuth } from "@/hooks/useAuth";
import { Card, PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  showChevron = true,
  danger = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 px-4"
      onPress={onPress}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? "bg-error/10" : "bg-cream-100"
        }`}
      >
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text
          className={`font-medium ${
            danger ? "text-error" : "text-charcoal-900"
          }`}
        >
          {label}
        </Text>
        {sublabel && (
          <Text className="text-charcoal-500 text-sm">{sublabel}</Text>
        )}
      </View>
      {showChevron && <ChevronRight size={20} color={Colors.charcoal[300]} />}
    </TouchableOpacity>
  );
}

function MenuSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6">
      {title && (
        <Text className="text-charcoal-500 text-xs uppercase font-semibold mb-2 px-4">
          {title}
        </Text>
      )}
      <Card variant="default" padding="none" className="overflow-hidden">
        {children}
      </Card>
    </View>
  );
}

export default function ProfileScreen() {
  const { userProfile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const fullName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : "User";

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="px-6 pt-4 pb-6"
        >
          <Text className="text-charcoal-900 text-2xl font-bold mb-6">
            Profile
          </Text>

          {/* Profile Card */}
          <PressableCard variant="elevated" padding="lg">
            <View className="flex-row items-center">
              <Avatar name={fullName} size="xl" />
              <View className="flex-1 ml-4">
                <Text className="text-charcoal-900 text-lg font-semibold">
                  {fullName}
                </Text>
                <Text className="text-charcoal-500 text-sm">
                  {userProfile?.email}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.charcoal[300]} />
            </View>
          </PressableCard>
        </Animated.View>

        {/* Menu Sections */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="px-6"
        >
          <MenuSection title="Your Activity">
            <MenuItem
              icon={<Target size={20} color={Colors.sage[500]} />}
              label="Progress & Goals"
              sublabel="Track your journey"
              onPress={() => router.push("/(tabs)/profile/progress-goals")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Star size={20} color={Colors.warning} />}
              label="My Reviews"
              sublabel="Reviews you've left"
              onPress={() => router.push("/(tabs)/profile/my-reviews")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<MapPin size={20} color={Colors.info} />}
              label="Mobile Requests"
              sublabel="Track your on-location booking requests"
              onPress={() => router.push("/(tabs)/profile/mobile-requests")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Dumbbell size={20} color={Colors.terracotta[500]} />}
              label="My Exercises"
              sublabel="Home exercise programs and completion"
              onPress={() => router.push("/(tabs)/profile/exercises")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<ClipboardList size={20} color={Colors.charcoal[600]} />}
              label="Treatment Plans"
              sublabel="View your active care plans"
              onPress={() => router.push("/(tabs)/profile/treatment-plans")}
            />
          </MenuSection>

          <MenuSection title="Account">
            <MenuItem
              icon={<User size={20} color={Colors.charcoal[600]} />}
              label="Edit Profile"
              onPress={() => router.push("/(tabs)/profile/edit-profile")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<CreditCard size={20} color={Colors.charcoal[600]} />}
              label="Payment Methods"
              onPress={() => router.push("/(tabs)/profile/payment-methods")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Bell size={20} color={Colors.charcoal[600]} />}
              label="Notifications"
              onPress={() => router.push("/notifications")}
            />
          </MenuSection>

          <MenuSection title="Support">
            <MenuItem
              icon={<HelpCircle size={20} color={Colors.charcoal[600]} />}
              label="Help Centre"
              onPress={() => router.push("/(tabs)/profile/help-centre")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Shield size={20} color={Colors.charcoal[600]} />}
              label="Privacy & Security"
              onPress={() => router.push("/(tabs)/profile/privacy-security")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Settings size={20} color={Colors.charcoal[600]} />}
              label="Settings"
              onPress={() => router.push("/(tabs)/profile/settings")}
            />
          </MenuSection>

          <MenuSection>
            <MenuItem
              icon={<LogOut size={20} color={Colors.error} />}
              label="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              danger
            />
          </MenuSection>

          {/* App Version */}
          <Text className="text-center text-charcoal-400 text-sm mb-4">
            Theramate v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
