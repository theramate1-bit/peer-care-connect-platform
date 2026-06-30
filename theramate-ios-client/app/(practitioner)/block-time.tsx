/**
 * Full-screen blocked time manager — parity with web `BlockTimeManager` inside
 * Availability → Blocked Time tab.
 */

import React from "react";
import { View } from "react-native";

import { tabPath, useTabRoot } from "@/contexts/TabRootContext";
import { BlockTimeManagerContent } from "@/components/practitioner/BlockTimeManagerContent";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function PractitionerBlockTimeScreen() {
  const tabRoot = useTabRoot();

  return (
    <TabScreen>
      <AppStackHeader
        title="Blocked time"
        subtitle="Same tools as the web practice calendar"
        fallbackHref={tabPath(tabRoot, "schedule")}
      />
      <View className="flex-1 px-4 pt-2">
        <BlockTimeManagerContent
          embedded
          onChanged={() => {
            /* diary invalidation happens via realtime; optional: router refresh */
          }}
        />
      </View>
    </TabScreen>
  );
}
