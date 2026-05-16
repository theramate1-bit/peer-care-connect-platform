import React from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { DPA_DOCUMENT } from "@/constants/legal/dpaCopy";

export default function DpaRouteScreen() {
  return (
    <LegalDocumentScreen title="Data processing" document={DPA_DOCUMENT} />
  );
}
