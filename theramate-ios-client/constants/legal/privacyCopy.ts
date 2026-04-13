import type { LegalDocument } from "@/constants/legal/types";

/**
 * In-app privacy policy (static). Align with your registered privacy notice and DPA register entry.
 */
export const PRIVACY_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 9 April 2026",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "Theramate provides software and a marketplace to help clients find practitioners, book sessions, and manage care-related communication. This notice explains how we handle personal data when you use the Theramate mobile application.",
        "For data protection purposes, the controller responsible for your personal data is described in your account settings and on our website. If you are unsure who the controller is for your account, contact us using the details at the end of this notice.",
      ],
    },
    {
      heading: "Data we collect",
      paragraphs: [
        "Account and profile: name, email address, phone number where provided, role (for example client or practitioner), and preferences you save in the app.",
        "Booking and clinical workflow: session details you or your practitioner enter (such as date, time, location type, notes where the product allows), messages you send through in-app messaging, and documents you upload where a feature supports attachments.",
        "Payments: we use payment providers (such as Stripe) to process payments. We do not store full card numbers on Theramate servers; our providers process card data according to their terms and PCI requirements.",
        "Device and diagnostics: app version, device type, and limited technical logs needed to operate the service and fix errors. You may use diagnostics screens we expose in settings where available.",
      ],
    },
    {
      heading: "Why we use your data",
      paragraphs: [
        "To provide the service: creating and managing accounts, bookings, messaging, notifications, and practitioner tools you choose to use.",
        "To improve safety and reliability: fraud prevention, abuse detection, security monitoring, and product diagnostics.",
        "To meet legal obligations: accounting, tax, and regulatory requirements where they apply.",
        "Where we rely on consent (for example optional marketing communications), you can withdraw consent at any time using in-app controls or by contacting us.",
      ],
    },
    {
      heading: "Health and special category data",
      paragraphs: [
        "Some information you or your practitioner enters may be sensitive, including health-related notes or session information. We treat such data with additional care and only process it where necessary to deliver the service you have requested, where we have a legal basis to do so, or where you have provided explicit consent where required.",
        "You should only enter information that is necessary for your care and that your practitioner has agreed to handle through Theramate.",
      ],
    },
    {
      heading: "Sharing and processors",
      paragraphs: [
        "We share data with subprocessors who help us run Theramate, including hosting, authentication, email delivery, analytics where enabled, and payment processing. We use contracts that require appropriate safeguards.",
        "We may disclose information if required by law, or to protect the rights, safety, or security of users and the public.",
      ],
    },
    {
      heading: "Retention",
      paragraphs: [
        "We keep data only as long as needed for the purposes above, including legal, accounting, and dispute resolution needs. Retention periods can vary by data type and jurisdiction.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Depending on where you live, you may have rights to access, correct, delete, restrict, or export your personal data, and to object to certain processing. You may also have the right to lodge a complaint with a supervisory authority.",
        "To exercise rights, contact us using the email below. We may need to verify your identity before responding.",
      ],
    },
    {
      heading: "International transfers",
      paragraphs: [
        "If we transfer personal data outside your country, we use appropriate safeguards such as standard contractual clauses where required.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Theramate is not directed at children under the age required to consent in your region. Do not use the service for minors except where a parent, guardian, or authorised representative uses the product in line with local law and your practitioner’s policies.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update this notice from time to time. We will post the updated version in the app and adjust the “last updated” date. Continued use after changes means you acknowledge the updated notice where permitted by law.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about privacy: email support@theramate.com with “Privacy” in the subject line.",
      ],
    },
  ],
  footerNote:
    "This in-app policy is a summary for convenience. Your statutory rights are not limited by this screen.",
};
