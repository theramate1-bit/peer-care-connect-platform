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
  ActivityIndicator,
} from "react-native";
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
  LayoutList,
  CreditCard,
  Link2,
  History,
} from "lucide-react-native";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, PressableCard } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";
import {
  MainTabHeader,
  TabScreen,
  TabScreenScroll,
} from "@/components/navigation";
import { supabase } from "@/lib/supabase";
import {
  calculateProfileActivationStatus,
  hasValidAvailability,
  type PractitionerProfileForActivation,
  type ProfileActivationCheck,
} from "@/lib/profileActivation";

function profilePhotoUrlFromProfile(profile: unknown): string | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const url = (profile as { profile_photo_url?: string | null })
    .profile_photo_url;
  return typeof url === "string" && url.length > 0 ? url : undefined;
}

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
  const [completionLoading, setCompletionLoading] = React.useState(true);
  const [hasAvailability, setHasAvailability] = React.useState<boolean | null>(
    null,
  );
  const [qualificationsCount, setQualificationsCount] = React.useState(0);
  const [qualificationDocumentsCount, setQualificationDocumentsCount] =
    React.useState(0);
  const [productsCount, setProductsCount] = React.useState(0);

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

  React.useEffect(() => {
    let canceled = false;
    const loadCompletion = async () => {
      if (!userProfile?.id) {
        setHasAvailability(null);
        setQualificationsCount(0);
        setQualificationDocumentsCount(0);
        setProductsCount(0);
        setCompletionLoading(false);
        return;
      }
      setCompletionLoading(true);
      try {
        const [availabilityRes, qualificationsRes, docsRes, productsRes] =
          await Promise.all([
            supabase
              .from("practitioner_availability")
              .select("working_hours")
              .eq("user_id", userProfile.id)
              .maybeSingle(),
            supabase
              .from("qualifications")
              .select("*", { count: "exact", head: true })
              .eq("practitioner_id", userProfile.id),
            supabase
              .from("practitioner_qualification_documents")
              .select("*", { count: "exact", head: true })
              .eq("practitioner_id", userProfile.id),
            supabase
              .from("practitioner_products")
              .select("*", { count: "exact", head: true })
              .eq("practitioner_id", userProfile.id)
              .eq("is_active", true),
          ]);

        if (canceled) return;

        const workingHours = availabilityRes.data?.working_hours;
        setHasAvailability(
          workingHours ? hasValidAvailability(workingHours) : false,
        );
        setQualificationsCount(qualificationsRes.count ?? 0);
        setQualificationDocumentsCount(docsRes.count ?? 0);
        setProductsCount(productsRes.count ?? 0);
      } finally {
        if (!canceled) {
          setCompletionLoading(false);
        }
      }
    };
    void loadCompletion();
    return () => {
      canceled = true;
    };
  }, [userProfile]);

  const activation = React.useMemo(
    () =>
      calculateProfileActivationStatus(
        userProfile as PractitionerProfileForActivation,
        hasAvailability,
        qualificationsCount,
        productsCount,
        qualificationDocumentsCount,
      ),
    [
      userProfile,
      hasAvailability,
      qualificationsCount,
      productsCount,
      qualificationDocumentsCount,
    ],
  );

  const openActivationCheck = (check: ProfileActivationCheck) => {
    switch (check.id) {
      case "bio":
      case "experience":
      case "location":
        router.push(tabPath(tabRoot, "profile/edit-profile") as never);
        return;
      case "qualifications":
        if (qualificationsCount === 0) {
          router.push(tabPath(tabRoot, "profile/qualifications") as never);
        } else {
          router.push(
            tabPath(tabRoot, "profile/qualification-documents") as never,
          );
        }
        return;
      case "availability":
        router.push(tabPath(tabRoot, "availability") as never);
        return;
      case "services":
        router.push(tabPath(tabRoot, "services") as never);
        return;
      default:
        router.push(tabPath(tabRoot, "profile/edit-profile") as never);
    }
  };

  return (
    <TabScreen>
      <TabScreenScroll style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <MainTabHeader
          eyebrow="Practice"
          title="Profile"
          subtitle="Manage your practice settings, services, and account."
        />

        <View
          style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}
        >
          <PressableCard
            variant="elevated"
            padding="lg"
            onPress={() =>
              router.push(tabPath(tabRoot, "profile/edit-profile") as never)
            }
          >
            <View className="flex-row items-center">
              <Avatar
                source={profilePhotoUrlFromProfile(userProfile)}
                name={fullName}
                size="xl"
              />
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

        <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
          <Card variant="default" padding="md">
            <Text className="text-charcoal-900 font-semibold">
              Profile completion
            </Text>
            {completionLoading ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : (
              <>
                <Text className="text-charcoal-500 text-sm mt-1 mb-3">
                  {activation.percentage}% complete ({activation.completed}/
                  {activation.total})
                </Text>
                {activation.checks.map((check, index) => (
                  <View key={check.id}>
                    <TouchableOpacity
                      className="flex-row items-center justify-between py-2"
                      onPress={() => openActivationCheck(check)}
                    >
                      <Text
                        className={
                          check.isComplete
                            ? "text-sage-700"
                            : "text-charcoal-800"
                        }
                      >
                        {check.isComplete ? "✓" : "○"} {check.label}
                      </Text>
                      <Text className="text-charcoal-400 text-xs">Open</Text>
                    </TouchableOpacity>
                    {index < activation.checks.length - 1 ? (
                      <View className="h-px bg-cream-200" />
                    ) : null}
                  </View>
                ))}
              </>
            )}
          </Card>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <MenuSection title="Practice">
            <MenuItem
              icon={<Users size={20} color={Colors.sage[500]} />}
              label="Clients"
              sublabel="People you treat"
              onPress={() => router.push(tabPath(tabRoot, "clients") as never)}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<History size={20} color={Colors.charcoal[600]} />}
              label="History requests"
              sublabel="Outgoing record requests"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "patient-history-requests") as never,
                )
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
              onPress={() => router.push(tabPath(tabRoot, "services") as never)}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Link2 size={20} color={Colors.sage[600]} />}
              label="Direct booking link"
              sublabel="Copy and share your book/{slug} URL"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/direct-booking-link") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<MapPin size={20} color={Colors.info} />}
              label="Practice locations"
              sublabel="Clinic/base address and service radius"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/practice-locations") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<FileText size={20} color={Colors.sage[600]} />}
              label="Qualifications"
              sublabel="Manage clinical credentials"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/qualifications") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<FileText size={20} color={Colors.info} />}
              label="Qualification documents"
              sublabel="Upload certificates and licenses"
              onPress={() =>
                router.push(
                  tabPath(tabRoot, "profile/qualification-documents") as never,
                )
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
              onPress={() => router.push(tabPath(tabRoot, "exchange") as never)}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<FolderKanban size={20} color={Colors.charcoal[600]} />}
              label="Projects"
              sublabel="Long-form therapy projects"
              onPress={() => router.push(tabPath(tabRoot, "projects") as never)}
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
              onPress={() => router.push(tabPath(tabRoot, "credits") as never)}
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Receipt size={20} color={Colors.charcoal[600]} />}
              label="Billing & payouts"
              onPress={() => router.push(tabPath(tabRoot, "billing") as never)}
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
              sublabel="Bio, registration, and public profile"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/edit-profile") as never)
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Bell size={20} color={Colors.charcoal[600]} />}
              label="Notification settings"
              sublabel="Email, SMS and reminder preferences"
              onPress={() =>
                router.push(tabPath(tabRoot, "profile/notifications") as never)
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
                router.push(
                  tabPath(tabRoot, "profile/payment-methods") as never,
                )
              }
            />
            <View className="h-px bg-cream-200 mx-4" />
            <MenuItem
              icon={<Receipt size={20} color={Colors.sage[600]} />}
              label="Subscription & plan"
              sublabel="Plan, renewals, secure billing"
              onPress={() => router.push("/settings/subscription" as never)}
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
      </TabScreenScroll>
    </TabScreen>
  );
}
