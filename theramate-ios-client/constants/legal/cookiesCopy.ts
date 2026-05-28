import type { LegalDocument } from "@/constants/legal/types";

/** In-app cookie policy (parity with `src/constants/legal/cookiesDocument.ts`). */
export const COOKIES_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 18 April 2026",
  sections: [
    {
      heading: "Cookies on theramate.co.uk",
      paragraphs: [
        "Theramate Limited (company number 17150275, England and Wales) uses cookies and similar technologies on our website and web app to keep you signed in, remember preferences, and understand how the service is used.",
        "Essential cookies are required for authentication and security. Analytics cookies, where used, help us improve performance — you can manage non-essential cookies via your browser or any consent banner shown on the live site.",
      ],
    },
    {
      heading: "Practitioner data",
      paragraphs: [
        "Practitioners who store client health data on Theramate should also read our Data Processing Agreement (open Data processing in Privacy settings).",
      ],
    },
  ],
  footerNote:
    "This summary is shipped in the app. The live website may show additional detail at theramate.co.uk/cookies.",
};
