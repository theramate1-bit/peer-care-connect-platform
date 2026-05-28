import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { HelpCentreContent } from "@/components/help/HelpCentreContent";
import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { useTabRoot } from "@/contexts/TabRootContext";
import { defaultSignedInProfileHref } from "@/lib/navigation";

export default function HelpCentreScreen() {
  const tabRoot = useTabRoot();

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader
        title="Help Centre"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <HelpCentreContent tabRoot={tabRoot} />
    </SafeAreaView>
  );
}
