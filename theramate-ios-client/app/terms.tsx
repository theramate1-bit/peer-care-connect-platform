import React from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { TERMS_DOCUMENT } from "@/constants/legal/termsCopy";

export default function TermsRouteScreen() {
  return <LegalDocumentScreen title="Terms of service" document={TERMS_DOCUMENT} />;
}
