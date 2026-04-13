import type { LegalDocument } from "@/constants/legal/types";

/**
 * In-app terms of use (static). Have legal review before relying on them in disputes.
 */
export const TERMS_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 9 April 2026",
  sections: [
    {
      heading: "Agreement",
      paragraphs: [
        "By creating an account or using the Theramate mobile application, you agree to these terms. If you do not agree, do not use the service.",
        "We may update these terms. We will indicate the update date in the app. Continued use after changes means you accept the updated terms where the law allows.",
      ],
    },
    {
      heading: "The service",
      paragraphs: [
        "Theramate provides software and connectivity between clients and independent practitioners. Practitioners are responsible for their own professional practice, regulatory compliance, insurance, and clinical decisions.",
        "We do not provide medical advice. The service is a booking and communication tool. In emergencies, contact local emergency services.",
      ],
    },
    {
      heading: "Accounts",
      paragraphs: [
        "You must provide accurate information and keep your login credentials secure. You are responsible for activity on your account unless you notify us of unauthorised access.",
        "We may suspend or terminate accounts that violate these terms, pose a risk to others, or misuse the platform.",
      ],
    },
    {
      heading: "Bookings and payments",
      paragraphs: [
        "Fees, cancellation rules, and refund policies apply as shown at booking time and in your practitioner’s terms. Payments may be processed by third-party providers; their terms also apply.",
        "Where credits, vouchers, or promotional balances apply, additional rules may be shown in the product.",
      ],
    },
    {
      heading: "Content and messaging",
      paragraphs: [
        "You must not use Theramate to send unlawful, harassing, abusive, or misleading content. You grant us a limited licence to host and transmit content as needed to operate the service.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "Theramate’s name, logos, and software are protected. You may not copy, reverse engineer, or distribute the app except as allowed by law.",
      ],
    },
    {
      heading: "Disclaimer",
      paragraphs: [
        "The service is provided “as is” to the maximum extent permitted by law. We do not guarantee uninterrupted or error-free operation. Nothing in these terms excludes liability that cannot be excluded by law.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the extent permitted by law, Theramate’s total liability arising from your use of the app is limited as set out in our main terms on the website or as required by applicable consumer law. Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of England and Wales unless mandatory consumer protections in your country require otherwise. Courts in your jurisdiction may have exclusive jurisdiction where required by law.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about these terms: support@theramate.com",
      ],
    },
  ],
  footerNote:
    "These terms are displayed in the app for reference. For any conflict between summaries and your contract or statutory rights, the law and your practitioner agreement prevail where applicable.",
};
