import type { LegalDocument } from "@/constants/legal/types";

import { APP_CONFIG } from "@/constants/config";

/**
 * Practitioner Data Processing Agreement summary (in-app). UK GDPR Article 28-style terms.
 * Full signed/PDF version may exist on the website; have legal review before reliance.
 */
export const DPA_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 18 April 2026",
  sections: [
    {
      heading: "Purpose",
      paragraphs: [
        "This Data Processing Agreement (“DPA”) applies where you use Theramate as a practitioner to store client-related information (including session, booking, and clinical documentation features such as treatment notes, optional voice capture for note preparation, optional AI-assisted drafting of notes on eligible plans, messaging, and treatment exchange metadata) on the Theramate platform. It supplements our Terms of Service and Privacy Policy.",
        "If you do not agree to this DPA, you must not use practitioner features that involve client or health-related data on Theramate.",
      ],
    },
    {
      heading: "Roles",
      paragraphs: [
        "You acknowledge that, for client health records and clinical notes you create or upload in the product, you act as a data controller (or your business does) under UK GDPR and you instruct Theramate to process that data on your behalf as a data processor, except where we are independently controller for our own account, marketplace, security, or legal obligations.",
        "Theramate Limited will process such data only on documented instructions from you (including via your use of the product’s features), unless UK law requires otherwise—in which case we will inform you unless the law forbids it.",
      ],
    },
    {
      heading: "Your instructions",
      paragraphs: [
        "You instruct us to process personal data as needed to provide the service: hosting, backup, authentication, search and booking where applicable, messaging, notifications, treatment exchange features, and features you enable (including treatment notes, attachments, voice audio and transcripts where you use voice capture, AI-assisted note generation where you enable it, and exports).",
        "You are responsible for ensuring your instructions are lawful and that you have established appropriate lawful bases and, where required, conditions for processing special category data under UK GDPR and the Data Protection Act 2018.",
      ],
    },
    {
      heading: "Security and confidentiality",
      paragraphs: [
        "We implement appropriate technical and organisational measures having regard to the nature of the processing, including encryption in transit, access controls, and separation between customer accounts as described in our Privacy Policy and security practices.",
        "Personnel authorised to access client data are subject to confidentiality obligations.",
      ],
    },
    {
      heading: "Sub-processors",
      paragraphs: [
        "You authorise us to use sub-processors (such as cloud hosting, authentication, email delivery, payment processing, error monitoring, analytics where enabled, audio or transcription services for voice features, and AI inference providers when you use AI-assisted note features) to provide the service. AI sub-processors may temporarily process content you submit to return draft text; you remain responsible for validating clinical content. We impose data protection terms on sub-processors consistent with Article 28. A current list is provided or linked from our website and may be updated with notice as set out there.",
      ],
    },
    {
      heading: "International transfers",
      paragraphs: [
        "Where personal data is transferred outside the UK, we use appropriate safeguards (such as the UK International Data Transfer Agreement or Addendum, or other mechanisms approved under UK law) where required.",
      ],
    },
    {
      heading: "Assistance and breach",
      paragraphs: [
        "Taking into account the nature of processing, we will assist you with appropriate technical and organisational measures to fulfil your obligations to respond to requests from data subjects and with your security and breach-notification obligations, insofar as this is reasonable.",
        "We will notify you without undue delay if we become aware of a personal data breach affecting data we process on your behalf, in line with Article 33 where applicable.",
      ],
    },
    {
      heading: "Deletion and return",
      paragraphs: [
        "On termination of your practitioner use of the service (or on your request where contractually agreed), we will delete or return personal data we process on your behalf in accordance with our retention policy and product capabilities, except where we must retain data to comply with law.",
        "You remain responsible for professional record-keeping periods applicable to your profession and for exporting records before closure where needed.",
      ],
    },
    {
      heading: "Audit",
      paragraphs: [
        "We will make available information reasonably necessary to demonstrate compliance with this DPA and allow for audits you are required to conduct, subject to reasonable confidentiality and security arrangements.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `Questions about this DPA: privacy@theramate.co.uk with “DPA” in the subject line. A fuller version of this agreement may be published at ${APP_CONFIG.DPA_URL}.`,
      ],
    },
  ],
  footerNote:
    "This in-app text is a summary. If the website publishes a longer DPA or a separately signed agreement, those documents take precedence where they say so. Obtain legal advice for your practice.",
};
