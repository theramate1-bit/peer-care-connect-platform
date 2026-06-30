import React from "react";

import { HelpCentreContent } from "@/components/help/HelpCentreContent";
import { useTabRoot } from "@/contexts/TabRootContext";
import { defaultSignedInProfileHref } from "@/lib/navigation";
import { AppStackHeader, TabScreen } from "@/components/navigation";

export default function HelpCentreScreen() {
  const tabRoot = useTabRoot();

  return (
    <TabScreen>
      <AppStackHeader
        title="Help Centre"
        fallbackHref={defaultSignedInProfileHref()}
      />
      <HelpCentreContent tabRoot={tabRoot} />
    </TabScreen>
  );
}
