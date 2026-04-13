/**
 * Profile/Settings Screen
 * User profile and app settings
 */

import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  User,
  Target,
  CreditCard,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  MapPin,
  Dumbbell,
  Receipt,
  LayoutList,
  Coins,
  ClipboardList,
  Heart,
} from "lucide-react-native";

import { MainTabHeader } from "@/components/navigation/AppStackHeader";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
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
  const tabRoot = useTabRoot();
  const { userProfile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const fullName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : "User";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <MainTabHeader title="Profile" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
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
        </View>

        {/* Menu Sections */}
        <View style={{ paddingHorizontal: 24 }}>
          <MenuSection title="Your Activity">
            <MenuItem
              icon={<Target size={20} color={Colors.sage[500]} />}
              label="Progress & Goals"
              sublabel="Track your journey"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/progress-goals") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Star size={20} color={Colors.warning} />}
              label="My Reviews"
              sublabel="Reviews you've left"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/my-reviews") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<MapPin size={20} color={Colors.info} />}
              label="Mobile Requests"
              sublabel="Track your on-location booking requests"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/mobile-requests") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<ClipboardList size={20} color={Colors.sage[600]} />}
              label="Treatment plans"
              sublabel="Care plans shared by your practitioners"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/treatment-plans") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Heart size={20} color={Colors.error} />}
              label="Saved therapists"
              sublabel="Practitioners you saved from Explore"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/favorites") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Dumbbell size={20} color={Colors.terracotta[500]} />}
              label="My Exercises"
              sublabel="Home exercise programs and completion"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/exercises") as never)
              }
            />
          </MenuSection>

          <MenuSection title="Account">
            <MenuItem
              icon={<User size={20} color={Colors.charcoal[600]} />}
              label="Edit Profile"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/edit-profile") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<CreditCard size={20} color={Colors.charcoal[600]} />}
              label="Payment Methods"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/payment-methods") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Coins size={20} color={Colors.warning} />}
              label="Credits"
              sublabel="Balance and peer treatment activity"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/credits") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Receipt size={20} color={Colors.sage[600]} />}
              label="Subscription & billing"
              sublabel="Plan, renewals, secure billing"
              onPress={() => router.push("/settings/subscription" as never)}
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
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/help-centre") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Shield size={20} color={Colors.charcoal[600]} />}
              label="Privacy & Security"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/privacy-security") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<LayoutList size={20} color={Colors.sage[600]} />}
              label="Settings & tools hub"
              sublabel="Help, privacy routes, booking tools"
              onPress={() => router.push("/settings" as never)}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
