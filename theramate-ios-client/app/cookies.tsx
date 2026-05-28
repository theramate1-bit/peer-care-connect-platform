import React from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { COOKIES_DOCUMENT } from "@/constants/legal/cookiesCopy";

export default function CookiesRouteScreen() {
  return (
    <LegalDocumentScreen title="Cookie policy" document={COOKIES_DOCUMENT} />
  );
}
