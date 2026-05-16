import type { LegalDocument } from "@/constants/legal/types";

import { APP_CONFIG } from "@/constants/config";

/**
 * In-app privacy policy (static). Align with the registered privacy notice on theramate.co.uk/privacy.
 */
export const PRIVACY_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 18 April 2026",
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        "Theramate Limited (company number 17150275, registered in England and Wales) operates the Theramate platform. Registered office: 82, Suite A James Carter Road, Mildenhall, United Kingdom, IP28 7DE.",
        "For most account, marketplace, and platform operations, Theramate acts as a data controller under UK GDPR. Where practitioners use Theramate to store client health records and treatment notes, Theramate typically acts as a data processor on the practitioner’s instructions for that content — see our Data Processing Agreement for practitioners on the website or in-app.",
        `The full Privacy Policy on the website (${APP_CONFIG.PRIVACY_URL}) applies alongside this summary.`,
      ],
    },
    {
      heading: "Data we collect",
      paragraphs: [
        "Account and profile: name, email address, phone number where provided, role (client, practitioner, or other), preferences, and profile fields you choose to add.",
        "Bookings and sessions: date, time, service, practitioner and client identifiers, payment status, appointment type (clinic or mobile), visit or delivery addresses for mobile sessions where entered, pre-assessment or intake data where the product collects it, and related messages.",
        "Health and clinical workflow: treatment or session notes (including SOAP-style sections), goals, progress, attachments, and other documentation features you or your practitioner use. Messages may include health-related information if you choose to send it.",
        "Voice audio: where you use voice capture or voice memos to prepare notes, we process audio recordings and associated metadata. Audio may be transcribed and may be processed using AI features on eligible plans. Recordings may contain identifiable information about clients or sessions if you include it — only record what your professional duties and lawful bases allow.",
        "AI-assisted notes: where enabled, session or transcript text may be sent to AI inference sub-processors to generate or structure draft documentation. Outputs are stored as part of your records in the product. Practitioners remain responsible for accuracy and clinical appropriateness.",
        "Payments: payment processing is handled by providers such as Stripe; we do not store full card numbers on Theramate servers.",
        "Location: approximate or precise location may be collected where you enable location features for search or mobile matching, as described in product prompts and the full policy. Visit addresses are stored as part of session records for mobile visits.",
        "Treatment exchange: where practitioners use credits or the exchange network, we process account identifiers, booking details, credit balances, and session metadata needed to operate exchange features.",
        "Device and diagnostics: app version, device type, limited logs, and optional analytics or crash reporting if you enable them.",
      ],
    },
    {
      heading: "Special category (health) data",
      paragraphs: [
        "Some data we process is special category data under UK GDPR Article 9 (for example information about your health in notes, assessments, or messages). We process this only where we have a lawful basis under Articles 6 and 9 and, where required, an appropriate condition in Schedule 1 to the Data Protection Act 2018 — such as provision of health or social care, explicit consent, or other grounds that apply to the specific processing.",
        "Practitioners are responsible for ensuring they have established appropriate lawful bases with their clients for clinical records they create on Theramate.",
      ],
    },
    {
      heading: "Why we use your data",
      paragraphs: [
        "To provide the service: accounts, marketplace search, booking, payments, messaging, notifications, practitioner tools (including notes, diary, voice-to-text or AI note features where subscribed), treatment exchange features, analytics where included in your plan, and customer support.",
        "Safety and security: fraud prevention, abuse detection, security monitoring, and maintaining service integrity.",
        "Legal obligations: accounting, tax, responding to lawful requests, and regulatory requirements.",
        "Improvement: analytics and product improvement where permitted by law and, where required, your consent.",
        "Where we rely on consent (for example optional marketing or non-essential cookies on the website), you may withdraw it at any time.",
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "We use TLS for data in transit, industry-standard hosting with access controls, authentication, and separation between accounts. Backups are used for resilience. We do not describe every technical measure in this summary; further detail may appear in our full policy or security documentation.",
      ],
    },
    {
      heading: "Sharing and sub-processors",
      paragraphs: [
        "We share data with sub-processors who help run Theramate, including hosting and database (for example Supabase), authentication, email delivery, payment processing (for example Stripe), optional analytics or error monitoring, speech-to-text or audio processing where used for voice features, and AI inference providers where Pro or equivalent tiers send content for drafting or structuring notes. Those providers process data only as needed to provide the feature and under appropriate contractual terms.",
        `We use contracts that require appropriate data protection terms. A sub-processor list is published at ${APP_CONFIG.SUBPROCESSORS_URL}.`,
        "We may disclose information if required by law or to protect rights, safety, and security.",
      ],
    },
    {
      heading: "Messaging retention",
      paragraphs: [
        "In-app messages may be retained to deliver the service, show conversation history, investigate abuse, and meet legal obligations. Retention periods depend on account type, product settings, and our retention schedule. Where the product allows deletion of specific messages or threads, use those controls subject to any overriding legal or professional retention duties that apply to you.",
      ],
    },
    {
      heading: "Retention",
      paragraphs: [
        "We retain data only as long as necessary for the purposes above, including legal, accounting, and dispute resolution needs, and to meet professional record-keeping expectations where practitioners have stored clinical records. Retention periods vary by data type (including notes, voice artefacts where stored, and messages).",
        "Practitioners should export or archive records as required by their regulator before closing an account. Deletion timelines after account closure are described in our full policy and DPA.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "Under UK GDPR you may have rights to access, rectify, erase, restrict processing, data portability, and to object, and to lodge a complaint with the Information Commissioner’s Office (ICO). Rights may be limited where we process as processor on a practitioner’s instructions — in those cases we may need to refer you to the practitioner or act jointly with them.",
        "Contact us using the email below. We may need to verify your identity.",
      ],
    },
    {
      heading: "International transfers",
      paragraphs: [
        "If we transfer personal data outside the UK, we use appropriate safeguards such as the UK International Data Transfer Agreement or Addendum where required.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Theramate is not directed at children under the age required to consent in your region. Use for minors should follow local law and practitioner policies.",
      ],
    },
    {
      heading: "Practitioner DPA",
      paragraphs: [
        `If you are a practitioner, our Data Processing Agreement sets out how we process client data on your behalf. Please read it: ${APP_CONFIG.DPA_URL} or the in-app “Data processing” screen.`,
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
        "Privacy questions: privacy@theramate.co.uk with “Privacy” in the subject line. Support: support@theramate.co.uk.",
      ],
    },
  ],
  footerNote:
    "This in-app policy is a summary. Your statutory rights are not limited by this screen. For the full legal text, see the website.",
};
