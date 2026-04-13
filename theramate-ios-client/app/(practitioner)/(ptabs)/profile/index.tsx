/**
 * Practitioner profile — practice menu (not client activity).
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  User,
  LogOut,
  ChevronRight,
  Users,
  Wrench,
  MapPin,
  RefreshCw,
  Coins,
  Receipt,
  Landmark,
  BarChart3,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  FolderKanban,
  Store,
  Clock,
  Globe,
  LayoutList,
  CreditCard,
} from "lucide-react-native";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import { ScreenHeader } from "@/components/practitioner/ScreenHeader";

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
}

function MenuItem({ icon, label, sublabel, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 px-4"
      onPress={onPress}
    >
      <View className="w-10 h-10 rounded-full items-center justify-center bg-cream-100">
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-medium text-charcoal-900">{label}</Text>
        {sublabel ? (
          <Text className="text-charcoal-500 text-sm">{sublabel}</Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={Colors.charcoal[300]} />
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
      {title ? (
        <Text className="text-charcoal-500 text-xs uppercase font-semibold mb-2 px-4">
          {title}
        </Text>
      ) : null}
      <Card variant="default" padding="none" className="overflow-hidden">
        {children}
      </Card>
    </View>
  );
}

export default function PractitionerProfileScreen() {
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Practice"
          title="Profile"
          subtitle="Manage your practice settings, services, and account."
        />

        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
          <PressableCard
            variant="elevated"
            padding="lg"
            onPress={() =>
              router.push(tabPath(tabRoot, "profile/edit-profile") as never)
            }
          >
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

        <View style={{ paddingHorizontal: 24 }}>
          <MenuSection title="Practice">
            <MenuItem
              icon={<Users size={20} color={Colors.sage[500]} />}
              label="Clients"
              sublabel="People you treat"
              onPress={() =>
                router.push(tabPath(tabRoot, "clients") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Clock size={20} color={Colors.sage[600]} />}
              label="Weekly hours"
              sublabel="When clients can book"
              onPress={() =>
                router.push(tabPath(tabRoot, "availability") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Wrench size={20} color={Colors.charcoal[600]} />}
              label="Services & products"
              sublabel="Pricing and catalogue"
              onPress={() =>
                router.push(tabPath(tabRoot, "services") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<MapPin size={20} color={Colors.info} />}
              label="Mobile visit requests"
              sublabel="Accept or decline on-location bookings"
              onPress={() =>
                router.push(tabPath(tabRoot, "mobile-requests") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<RefreshCw size={20} color={Colors.terracotta[500]} />}
              label="Treatment exchange"
              sublabel="Credits and swap requests"
              onPress={() =>
                router.push(tabPath(tabRoot, "exchange") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<FolderKanban size={20} color={Colors.charcoal[600]} />}
              label="Projects"
              sublabel="Long-form therapy projects"
              onPress={() =>
                router.push(tabPath(tabRoot, "projects") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<FileText size={20} color={Colors.charcoal[600]} />}
              label="Clinical files"
              sublabel="All session notes in one place"
              onPress={() =>
                router.push(tabPath(tabRoot, "clinical-files") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Store size={20} color={Colors.sage[600]} />}
              label="Marketplace seller"
              sublabel="Listings & discoverability"
              onPress={() =>
                router.push(tabPath(tabRoot, "marketplace") as never)
              }
            />
          </MenuSection>

          <MenuSection title="Business">
            <MenuItem
              icon={<Coins size={20} color={Colors.warning} />}
              label="Credits"
              onPress={() =>
                router.push(tabPath(tabRoot, "credits") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Receipt size={20} color={Colors.charcoal[600]} />}
              label="Billing & payouts"
              onPress={() =>
                router.push(tabPath(tabRoot, "billing") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Landmark size={20} color={Colors.sage[600]} />}
              label="Stripe Connect"
              sublabel="Payout account"
              onPress={() =>
                router.push(tabPath(tabRoot, "stripe-connect") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<BarChart3 size={20} color={Colors.charcoal[600]} />}
              label="Analytics"
              onPress={() =>
                router.push(tabPath(tabRoot, "analytics") as never)
              }
            />
          </MenuSection>

          <MenuSection title="Account">
            <MenuItem
              icon={<User size={20} color={Colors.charcoal[600]} />}
              label="Edit profile"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/edit-profile") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Bell size={20} color={Colors.charcoal[600]} />}
              label="Notifications inbox"
              onPress={() => router.push("/notifications")}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<LayoutList size={20} color={Colors.sage[600]} />}
              label="Settings & tools hub"
              sublabel="Help, privacy routes, booking tools"
              onPress={() => router.push("/settings" as never)}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<CreditCard size={20} color={Colors.charcoal[600]} />}
              label="Payment methods"
              sublabel="Cards and billing snapshot"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/payment-methods") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Receipt size={20} color={Colors.sage[600]} />}
              label="Subscription & plan"
              sublabel="Plan, renewals, secure billing"
              onPress={() =>
                router.push("/settings/subscription" as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Globe size={20} color={Colors.charcoal[600]} />}
              label="Account tools"
              sublabel="Privacy, subscription, payouts in app"
              onPress={() =>
                router.push("/settings" as never)
              }
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
          </MenuSection>

          <MenuSection>
            <MenuItem
              icon={<LogOut size={20} color={Colors.error} />}
              label="Sign out"
              onPress={handleSignOut}
            />
          </MenuSection>

          <Text className="text-center text-charcoal-400 text-sm mb-4">
            Theramate v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
