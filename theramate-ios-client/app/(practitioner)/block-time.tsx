/**
 * Full-screen blocked time manager — parity with web `BlockTimeManager` inside
 * Availability → Blocked Time tab.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { goBackOrReplace } from "@/lib/navigation";
import { BlockTimeManagerContent } from "@/components/practitioner/BlockTimeManagerContent";

export default function PractitionerBlockTimeScreen() {
  const tabRoot = useTabRoot();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.cream[50] }}
      edges={["top"]}
    >
      <View className="flex-row items-center px-4 pt-2 pb-4 border-b border-cream-200">
        <TouchableOpacity
          onPress={() => goBackOrReplace(tabPath(tabRoot, "schedule"))}
          className="p-2 -ml-2"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={28} color={Colors.charcoal[800]} />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-charcoal-900 text-lg font-semibold">
            Blocked time
          </Text>
          <Text className="text-charcoal-500 text-xs mt-0.5">
            Same tools as the web practice calendar
          </Text>
        </View>
      </View>
      <View className="flex-1 px-4 pt-2">
        <BlockTimeManagerContent
          embedded
          onChanged={() => {
            /* diary invalidation happens via realtime; optional: router refresh */
          }}
        />
      </View>
    </SafeAreaView>
  );
}
