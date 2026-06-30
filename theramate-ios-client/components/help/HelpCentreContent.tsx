import React from "react";
import { View, Text, Alert, Linking, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Receipt,
  Search,
  Wallet,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { MARKETPLACE_FEE_DISPLAY } from "@/constants/payments";
import { tabPath, type TabRootHref } from "@/contexts/TabRootContext";
import {
  getSignedInTabRoot,
  isPractitionerTabRoot,
} from "@/lib/signedInRoutes";
import { TabScreenScroll } from "@/components/navigation";

async function openUrlOrAlert(url: string) {
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert("Cannot open link", url);
    return;
  }
  await Linking.openURL(url);
}

type HelpCentreContentProps = {
  tabRoot?: TabRootHref;
  /** When false, hide signed-in shortcuts (e.g. public contact). */
  showAccountShortcuts?: boolean;
};

type TaskRow = {
  key: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onPress: () => void;
};

function HelpTaskRow({
  label,
  sublabel,
  icon,
  onPress,
  showDivider,
}: {
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onPress: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View className="h-px bg-cream-200 mx-4" /> : null}
      <TouchableOpacity
        className="flex-row items-center py-4 px-4"
        onPress={onPress}
        accessibilityRole="button"
      >
        <View className="w-10 h-10 rounded-full items-center justify-center bg-cream-100">
          {icon}
        </View>
        <View className="flex-1 ml-3 mr-2">
          <Text className="text-charcoal-900 font-medium">{label}</Text>
          {sublabel ? (
            <Text className="text-charcoal-500 text-sm mt-0.5">{sublabel}</Text>
          ) : null}
        </View>
        <ChevronRight size={20} color={Colors.charcoal[300]} />
      </TouchableOpacity>
    </>
  );
}

function FaqBlock({
  question,
  answer,
  action,
}: {
  question: string;
  answer: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="py-1">
      <Text className="text-charcoal-900 font-medium">{question}</Text>
      <Text className="text-charcoal-500 mt-1 text-sm leading-5">{answer}</Text>
      {action ? (
        <Button variant="outline" className="mt-3" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

/**
 * Native help centre — tasks and FAQ tailored to client vs practitioner shell.
 */
export function HelpCentreContent({
  tabRoot,
  showAccountShortcuts = true,
}: HelpCentreContentProps) {
  const resolvedTabRoot = tabRoot ?? getSignedInTabRoot();
  const isPractitioner =
    showAccountShortcuts && isPractitionerTabRoot(resolvedTabRoot);

  const exploreHref = tabPath(resolvedTabRoot, "explore");
  const bookingsHref = tabPath(resolvedTabRoot, "bookings");
  const messagesHref = tabPath(resolvedTabRoot, "messages");
  const scheduleHref = tabPath(resolvedTabRoot, "schedule");

  const clientTasks: TaskRow[] = [
    {
      key: "explore",
      label: "Book a therapist",
      sublabel: "Browse Explore and book a session",
      icon: <Search size={20} color={Colors.sage[600]} />,
      onPress: () => router.push(exploreHref as never),
    },
    {
      key: "sessions",
      label: "My sessions",
      sublabel: "Upcoming and past appointments",
      icon: <Calendar size={20} color={Colors.terracotta[500]} />,
      onPress: () => router.push(bookingsHref as never),
    },
    {
      key: "messages",
      label: "Messages",
      sublabel: "Chat with your practitioners",
      icon: <MessageCircle size={20} color={Colors.sage[600]} />,
      onPress: () => router.push(messagesHref as never),
    },
    {
      key: "find-booking",
      label: "Find my booking",
      sublabel: "Guest checkout — use your email",
      icon: <Receipt size={20} color={Colors.charcoal[600]} />,
      onPress: () => router.push("/booking/find" as never),
    },
    {
      key: "mobile-track",
      label: "Track a mobile request",
      sublabel: "Home-visit request status",
      icon: <MapPin size={20} color={Colors.info} />,
      onPress: () => router.push("/guest/mobile-requests" as never),
    },
  ];

  const practitionerTasks: TaskRow[] = [
    {
      key: "diary",
      label: "Open diary",
      sublabel: "Calendar, blocks, and day view",
      icon: <Calendar size={20} color={Colors.sage[600]} />,
      onPress: () => router.push(scheduleHref as never),
    },
    {
      key: "sessions",
      label: "Sessions",
      sublabel: "Bookings and session details",
      icon: <Receipt size={20} color={Colors.charcoal[600]} />,
      onPress: () => router.push(bookingsHref as never),
    },
    {
      key: "mobile-requests",
      label: "Mobile visit requests",
      sublabel: "Accept or decline on-location bookings",
      icon: <MapPin size={20} color={Colors.info} />,
      onPress: () =>
        router.push(tabPath(resolvedTabRoot, "mobile-requests") as never),
    },
    {
      key: "billing",
      label: "Billing & payouts",
      sublabel: "Payments received and payouts",
      icon: <Wallet size={20} color={Colors.sage[600]} />,
      onPress: () => router.push(tabPath(resolvedTabRoot, "billing") as never),
    },
    {
      key: "subscription",
      label: "Subscription & plan",
      sublabel: "Platform plan and renewals",
      icon: <CreditCard size={20} color={Colors.charcoal[600]} />,
      onPress: () => router.push("/settings/subscription" as never),
    },
    {
      key: "payment-methods",
      label: "Payment methods",
      sublabel: "Cards on file for your account",
      icon: <CreditCard size={20} color={Colors.charcoal[600]} />,
      onPress: () =>
        router.push(
          tabPath(resolvedTabRoot, "profile/payment-methods") as never,
        ),
    },
  ];

  const guestTasks: TaskRow[] = [
    {
      key: "explore",
      label: "Book a therapist",
      sublabel: "Browse practitioners on Explore",
      icon: <Search size={20} color={Colors.sage[600]} />,
      onPress: () => router.push("/explore" as never),
    },
    {
      key: "find-booking",
      label: "Find my booking",
      sublabel: "Look up with your email",
      icon: <Receipt size={20} color={Colors.charcoal[600]} />,
      onPress: () => router.push("/booking/find" as never),
    },
    {
      key: "mobile-track",
      label: "Track a mobile request",
      sublabel: "Home-visit request status",
      icon: <MapPin size={20} color={Colors.info} />,
      onPress: () => router.push("/guest/mobile-requests" as never),
    },
  ];

  const tasks = !showAccountShortcuts
    ? guestTasks
    : isPractitioner
      ? practitionerTasks
      : clientTasks;

  return (
    <TabScreenScroll
      className="flex-1 px-6 pt-4"
      extraBottomPadding={40}
      keyboardShouldPersistTaps="handled"
    >
      <Card variant="default" padding="md" className="mb-5">
        <View className="flex-row items-center">
          <CircleHelp size={18} color={Colors.sage[600]} />
          <Text className="text-charcoal-900 font-semibold ml-2">
            Need support?
          </Text>
        </View>
        <Text className="text-charcoal-600 mt-2 leading-6">
          {!showAccountShortcuts
            ? "Quick links for booking and guest tools — sign in for your full account."
            : isPractitioner
              ? "Shortcuts for your practice workspace: diary, sessions, payouts, and plan."
              : "Shortcuts for booking, sessions, and messages — everything in one place."}
        </Text>
      </Card>

      <Text className="text-charcoal-500 text-xs uppercase font-semibold mb-2 px-1">
        {isPractitioner ? "Practice" : "Common tasks"}
      </Text>
      <Card variant="default" padding="none" className="mb-5 overflow-hidden">
        {tasks.map((task, index) => (
          <HelpTaskRow
            key={task.key}
            label={task.label}
            sublabel={task.sublabel}
            icon={task.icon}
            onPress={task.onPress}
            showDivider={index > 0}
          />
        ))}
      </Card>

      <Text className="text-charcoal-500 text-xs uppercase font-semibold mb-2 px-1">
        FAQ
      </Text>
      <Card variant="default" padding="md" className="mb-5 gap-5">
        {isPractitioner ? (
          <>
            <FaqBlock
              question="How do clients pay?"
              answer={`Card bookings use Stripe Checkout in-app. Platform fee on card sessions: ${MARKETPLACE_FEE_DISPLAY}. Pay-at-clinic sessions can be marked paid in person from the session screen.`}
            />
            <FaqBlock
              question="Mobile visit requests"
              answer="Open Mobile visit requests from Profile or Help to accept, decline, or propose another time. Clients complete payment when you accept, if required."
              action={{
                label: "Mobile requests",
                onPress: () =>
                  router.push(
                    tabPath(resolvedTabRoot, "mobile-requests") as never,
                  ),
              }}
            />
            <FaqBlock
              question="Payouts and Stripe Connect"
              answer="Connect your payout account under Profile → Stripe Connect, then review Billing & payouts for activity. Subscription & plan covers your Theramate platform fee."
              action={{
                label: "Stripe Connect",
                onPress: () =>
                  router.push(
                    tabPath(resolvedTabRoot, "stripe-connect") as never,
                  ),
              }}
            />
          </>
        ) : !showAccountShortcuts ? (
          <>
            <FaqBlock
              question="I booked as a guest — where is my session?"
              answer="Use Find my booking with the email you used at checkout, or track a home visit under Track a mobile request."
              action={{
                label: "Find my booking",
                onPress: () => router.push("/booking/find" as never),
              }}
            />
            <FaqBlock
              question="How do I pay?"
              answer={`Card bookings use secure Stripe Checkout. Platform fee on card sessions: ${MARKETPLACE_FEE_DISPLAY}.`}
            />
          </>
        ) : (
          <>
            <FaqBlock
              question="How do I pay?"
              answer={`Online card bookings use secure Stripe Checkout in-app. Platform fee on card sessions: ${MARKETPLACE_FEE_DISPLAY}. Pay-at-clinic bookings have no platform fee when your practitioner enables that option.`}
            />
            <FaqBlock
              question="I booked as a guest — where is my session?"
              answer="Use Find my booking with the email you used at checkout, or track a home visit under Track a mobile request."
              action={{
                label: "Find my booking",
                onPress: () => router.push("/booking/find" as never),
              }}
            />
            <FaqBlock
              question="Messages and reminders"
              answer="Open Messages to chat with your practitioner. Turn on email and SMS reminders under Profile → Notification settings."
              action={{
                label: "Notification settings",
                onPress: () =>
                  router.push(
                    tabPath(resolvedTabRoot, "profile/notifications") as never,
                  ),
              }}
            />
          </>
        )}
      </Card>

      <Button
        variant="primary"
        onPress={() => router.push("/how-it-works" as never)}
      >
        How it works
      </Button>

      <Button
        variant="outline"
        className="mt-3"
        leftIcon={<BookOpen size={16} color={Colors.charcoal[700]} />}
        onPress={() => router.push("/help" as never)}
      >
        Help articles (full guide)
      </Button>

      <Button
        variant="outline"
        className="mt-3"
        leftIcon={<Mail size={16} color={Colors.charcoal[700]} />}
        onPress={() =>
          void openUrlOrAlert(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`)
        }
      >
        Email {APP_CONFIG.SUPPORT_EMAIL}
      </Button>

      {isPractitioner ? (
        <Button
          variant="outline"
          className="mt-3"
          leftIcon={<Globe size={16} color={Colors.charcoal[700]} />}
          onPress={() => router.push("/pricing" as never)}
        >
          Plans & platform fees
        </Button>
      ) : null}

      <Button
        variant="outline"
        className="mt-3"
        onPress={() => router.push("/contact" as never)}
      >
        Contact
      </Button>
    </TabScreenScroll>
  );
}
