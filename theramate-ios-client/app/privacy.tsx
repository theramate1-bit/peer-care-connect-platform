import React from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { PRIVACY_DOCUMENT } from "@/constants/legal/privacyCopy";

export default function PrivacyRouteScreen() {
  return (
    <LegalDocumentScreen title="Privacy policy" document={PRIVACY_DOCUMENT} />
  );
}
