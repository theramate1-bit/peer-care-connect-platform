import React from "react";

import { LegalDocumentScreen } from "@/components/legal/LegalDocumentScreen";
import { HELP_DOCUMENT } from "@/constants/legal/helpCopy";

export default function HelpArticlesScreen() {
  return <LegalDocumentScreen title="Help" document={HELP_DOCUMENT} />;
}
