import type { LegalDocument } from "./types";
/**
 * In-app terms of use (static). The website at theramate.co.uk/terms is the primary legal text; have counsel review before disputes.
 */
export const TERMS_DOCUMENT: LegalDocument = {
  lastUpdated: "Last updated: 18 April 2026",
  sections: [
    {
      heading: "Legal entity and precedence",
      paragraphs: [
        "The Theramate service is operated by Theramate Limited, a company registered in England and Wales (company number 17150275). Registered office: 82, Suite A James Carter Road, Mildenhall, United Kingdom, IP28 7DE.",
        `The full Terms and Conditions on the website (${"https://theramate.co.uk/terms"}) take precedence if there is any inconsistency with this in-app summary. Nothing in these terms limits statutory rights that cannot be limited under UK law (including the Consumer Rights Act 2015 for consumers where applicable).`,
      ],
    },
    {
      heading: "Agreement",
      paragraphs: [
        "By creating an account or using the Theramate mobile application or related services, you agree to these terms. If you do not agree, do not use the service.",
        "We may update these terms. We will indicate the update date in the app. Continued use after changes means you accept the updated terms where the law allows.",
      ],
    },
    {
      heading: "Platform role — intermediary only",
      paragraphs: [
        "Theramate provides an online marketplace and practice-management software that enables users to discover, book, and manage appointments with independent practitioners; tools for practitioners to run their practice (including, where available, calendar, client management, messaging, treatment or session notes, optional voice capture for note preparation, optional AI-assisted drafting of notes on eligible subscription tiers, analytics, and scheduling); and, where available, a treatment exchange network for practitioners to arrange sessions with each other using credits or rules shown in the product.",
        "Theramate does not provide medical, therapeutic, or healthcare services, diagnosis, or treatment. We do not employ practitioners listed on the platform for the purpose of delivering those services and we do not supervise clinical care.",
        "The quality, safety, legality, and suitability of services booked through the platform are matters between the client and the practitioner. In an emergency, contact local emergency services.",
      ],
    },
    {
      heading: "Independent practitioners",
      paragraphs: [
        "Practitioners listed on Theramate operate as independent businesses or professionals. Nothing in these terms creates a partnership, joint venture, agency, or employment relationship between Theramate and any practitioner.",
        "Practitioners are solely responsible for the services they provide, including compliance with professional rules, regulatory registration where required (for example protected titles), insurance, tax, and advertising standards.",
      ],
    },
    {
      heading: "No medical advice; no endorsement",
      paragraphs: [
        "Information on the platform (including profiles, listings, reviews, and messages) is for general information and booking purposes. It does not constitute medical or professional advice.",
        "Theramate does not recommend or endorse any particular practitioner. Rankings, search results, or “verified” or similar badges (if shown) reflect operational rules described in the product and do not constitute a recommendation of fitness for any clinical purpose. Users must exercise their own judgment when choosing a practitioner.",
      ],
    },
    {
      heading: "Booking and payments",
      paragraphs: [
        "When you book a paid service, the contract for the therapeutic or health-related service is between you and the practitioner (subject to any specific wording shown at checkout and on the website). Theramate provides technology and payment facilitation where our product and payment partners do so.",
        "Fees, platform charges, cancellation rules, and refund policies are as shown at booking time, in the practitioner’s terms where applicable, and in our fuller website terms. Payments may be processed by third-party providers (such as Stripe); their terms and privacy notices also apply.",
        "Where credits, vouchers, or promotional balances apply (including treatment exchange credits), additional rules are shown in the product. Exchange credits or similar balances are a platform mechanism for booking eligible peer sessions — they are not legal tender, have no guaranteed cash value unless we expressly say otherwise, and may be varied or withdrawn in line with product terms. Theramate does not guarantee any particular availability of exchange partners or sessions.",
      ],
    },
    {
      heading: "Treatment exchange (practitioners)",
      paragraphs: [
        "Where the product allows practitioners to book or offer sessions with other practitioners (treatment exchange), Theramate facilitates those arrangements as part of the software and marketplace. The therapeutic or professional service in each case is provided by the relevant practitioners to each other under their own professional responsibilities.",
        "Theramate does not provide those treatments, does not select or guarantee a counterparty beyond the product rules, and is not responsible for the quality or outcome of exchange sessions except as required by law.",
      ],
    },
    {
      heading: "Practitioner obligations",
      paragraphs: [
        "Practitioners must maintain accurate profiles, hold appropriate professional indemnity and public liability insurance where required for their practice, use only titles and qualifications they are entitled to use under UK law, and comply with ASA/CAP and other advertising rules.",
        "Practitioners must comply with UK GDPR and the Data Protection Act 2018 when processing client data. Where Theramate processes health data on your behalf, our Data Processing Agreement applies — see the website or in-app DPA summary.",
      ],
    },
    {
      heading: "Health records and treatment notes",
      paragraphs: [
        "Where the product allows treatment or session notes (including SOAP-style notes), those records are created by practitioners for their professional purposes. Theramate provides tools to store and transmit such information; we do not review, validate, or assume responsibility for clinical accuracy, completeness, or appropriateness of practitioner records.",
        "Practitioners remain solely responsible for clinical documentation, retention periods required by their profession, and any regulatory obligations. You should maintain appropriate backups or exports as your profession requires.",
        "Theramate does not guarantee uninterrupted access or that data will never be lost or corrupted. To the fullest extent permitted by law, we are not liable for loss of practitioner records except where liability cannot be excluded under applicable law. We maintain service and backup practices as described in our Privacy Policy.",
      ],
    },
    {
      heading: "Voice capture and AI-assisted notes",
      paragraphs: [
        "Some subscription tiers may allow voice capture or similar features to help practitioners prepare documentation. Audio may be processed to produce text (including via AI). Voice and derived text may contain special category data if you speak about clients or care — use these features only where you have a lawful basis and your clients are informed as required.",
        "Any AI-assisted drafting is an assistance tool only. It does not replace professional judgment, clinical validation, or regulatory record-keeping. Practitioners must review, correct, and approve notes before relying on them. Theramate does not provide clinical decision-making or diagnosis through AI.",
      ],
    },
    {
      heading: "Location and visit addresses",
      paragraphs: [
        "Where you book or manage mobile visits, addresses or location data may be processed to operate the service (for example visit addresses on confirmed sessions). Such data is sensitive and must not be misused. Features are designed so addresses are not shown publicly for marketing browsing in ways that create avoidable safety risk; see the Privacy Policy for details.",
      ],
    },
    {
      heading: "Accounts",
      paragraphs: [
        "You must provide accurate information and keep your login credentials secure. You are responsible for activity on your account unless you notify us of unauthorised access.",
        "We may suspend or terminate accounts that violate these terms, pose a risk to others, misuse the platform, or breach applicable law.",
      ],
    },
    {
      heading: "Reviews and user content",
      paragraphs: [
        "Reviews and ratings must be honest and comply with law. Theramate may moderate, remove, or restrict content that breaches these terms or creates legal or safety risk. We do not guarantee the accuracy of user-generated content.",
        "You grant Theramate a licence to host, display, and process content you submit as needed to run the service.",
      ],
    },
    {
      heading: "Content and messaging",
      paragraphs: [
        "You must not use Theramate to send unlawful, harassing, abusive, misleading, or harmful content. Messaging may include health-related information; use it responsibly and in line with your practitioner’s or your own professional duties.",
        "Messaging is designed for service-related communication. Retention and deletion follow our Privacy Policy and product capabilities. You must not use messaging to evade professional or legal duties applicable to you.",
      ],
    },
    {
      heading: "Acceptable use and safety",
      paragraphs: [
        "You agree not to misuse the platform, interfere with security, scrape or overload systems without permission, impersonate others, or use Theramate for unlawful discrimination or harassment.",
        "If you experience or witness behaviour that puts safety at risk (including in connection with home visits), contact emergency services when appropriate and report concerns to us at support@theramate.co.uk so we can take proportionate action where our policies allow. We may investigate reports and suspend or remove accounts that breach these terms.",
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
        "The service is provided “as is” to the maximum extent permitted by law. We do not guarantee uninterrupted or error-free operation.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by law, Theramate and its directors, employees, and suppliers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill, arising from your use of the platform or services provided by practitioners.",
        "Subject to the next section, Theramate’s total aggregate liability to you in connection with the app and platform in any twelve-month period is limited to the greater of: (a) one hundred pounds (£100); or (b) the total fees you have paid to Theramate for platform services (excluding amounts passed through to practitioners) in that period, if any.",
        "Some jurisdictions do not allow certain limitations; in those cases our liability is limited to the fullest extent permitted.",
      ],
    },
    {
      heading: "Liability we do not exclude",
      paragraphs: [
        "Nothing in these terms excludes or limits liability that cannot be excluded or limited under English law, including for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded under the Unfair Contract Terms Act 1977 or Consumer Rights Act 2015 where applicable.",
      ],
    },
    {
      heading: "Indemnity (practitioners)",
      paragraphs: [
        "If you are a practitioner, you agree to indemnify and hold harmless Theramate Limited against claims, damages, losses, liabilities, and reasonable costs (including legal fees) arising out of or related to: services you provide; your breach of these terms; your breach of data protection or professional obligations; or your violation of applicable law or third-party rights, except to the extent caused by Theramate’s unlawful act or gross negligence.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of England and Wales. Courts in England and Wales have non-exclusive jurisdiction, subject to mandatory consumer protections that may require courts in your home country.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about these terms: legal@theramate.co.uk or support@theramate.co.uk (UK).",
      ],
    },
  ],
  footerNote:
    "This summary cannot cover every scenario. For the full agreement, see the website. Consumer rights and practitioner regulatory duties may apply in addition to these terms.",
};
