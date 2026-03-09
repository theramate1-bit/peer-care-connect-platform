import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, Eye, Database, Users, FileText } from "lucide-react";
import StandardPage from "@/components/layouts/StandardPage";

const PrivacyPolicy = () => {
  const privacyHighlights = [
    {
      icon: Shield,
      title: "UK GDPR Compliant",
      description: "Fully compliant with UK GDPR and Data Protection Act 2018"
    },
    {
      icon: Lock,
      title: "Data Encryption",
      description: "Your data is encrypted in transit and at rest"
    },
    {
      icon: Eye,
      title: "No Data Selling",
      description: "We never sell or share your personal information"
    },
    {
      icon: Database,
      title: "Secure Storage",
      description: "Data stored in certified, secure cloud infrastructure"
    }
  ];

  return (
    <StandardPage title="Privacy Policy" badgeText="Privacy" subtitle="Your privacy is fundamental to our mission. This policy explains how we collect, use, and protect your information in compliance with UK GDPR and the Data Protection Act 2018.">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Badge>Last Updated: December 15, 2025</Badge>
            <Badge variant="outline">UK GDPR Compliant</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            This Privacy Policy is governed by UK GDPR and the Data Protection Act 2018
          </p>
        </div>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {privacyHighlights.map((highlight, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <highlight.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">{highlight.title}</h3>
                <p className="text-sm text-muted-foreground">{highlight.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Privacy Policy Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[800px] pr-4">
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-4">1. Introduction and Data Controller</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Theramate Limited ("we", "us", "our") is the data controller for the personal data we collect and process through the Theramate platform (theramate.co.uk). We are committed to protecting your privacy and handling your personal data in accordance with UK GDPR and the Data Protection Act 2018.
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg mb-4">
                    <p className="text-sm mb-2"><strong>Data Controller:</strong></p>
                    <p className="text-sm">Theramate Limited</p>
                    <p className="text-sm">[Company Registration Number: To be provided]</p>
                    <p className="text-sm">Registered in England and Wales</p>
                    <p className="text-sm mt-2"><strong>ICO Registration:</strong> [Registration number to be provided]</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our healthcare marketplace platform. Please read this policy carefully to understand our practices regarding your personal data.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We collect information you provide directly to us and information we gather through your use of our services. The types of information we collect depend on how you use the Platform.
                  </p>
                  
                  <h3 className="text-lg font-medium mb-3">2.1 Personal Information (Clients)</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Name, email address, and contact information</li>
                    <li>Date of birth (for age verification and healthcare records)</li>
                    <li>Postal address and location data (for finding nearby practitioners)</li>
                    <li>Payment and billing information (processed securely through Stripe)</li>
                    <li>Health information relevant to booking sessions (e.g., reason for seeking treatment)</li>
                    <li>Profile photos (optional)</li>
                    <li>Communication preferences</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">2.2 Professional Information (Practitioners)</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Name, email address, and contact information</li>
                    <li>Professional qualifications and registration numbers (e.g., GOsC registration for osteopaths, SMA membership for sports therapists)</li>
                    <li>Professional body memberships and certifications</li>
                    <li>Practice details, specializations, and service descriptions</li>
                    <li>Professional indemnity and public liability insurance information</li>
                    <li>Profile photos and professional headshots</li>
                    <li>Practice location(s) and service areas</li>
                    <li>Pricing information and service offerings</li>
                    <li>Stripe Connect account information (for payment processing)</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">2.3 Clinical and Treatment Data (Special Category Data)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Treatment notes and clinical documentation created through the Platform are considered special category personal data under UK GDPR Article 9:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Treatment notes (SOAP, DAP, or free text formats)</li>
                    <li>Session records and appointment history</li>
                    <li>Client progress tracking data</li>
                    <li>Treatment goals and outcomes</li>
                    <li>Session feedback and reviews</li>
                    <li>Clinical assessments and observations</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Legal Basis:</strong> We process special category health data under UK GDPR Article 9(2)(h) - provision of health or social care, and Article 9(2)(f) - establishment, exercise, or defence of legal claims, as necessary for the provision of healthcare services through our platform.
                  </p>

                  <h3 className="text-lg font-medium mb-3">2.4 Booking and Transaction Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Booking history and session details</li>
                    <li>Payment transaction records (processed through Stripe)</li>
                    <li>Cancellation and refund information</li>
                    <li>Session check-in and check-out times</li>
                    <li>Credit balance and transaction history</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">2.5 Communication Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Messages sent through the Platform's messaging system</li>
                    <li>Email communications with our support team</li>
                    <li>Feedback and review submissions</li>
                    <li>Support ticket history</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">2.6 Technical and Usage Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Device information (type, operating system, browser)</li>
                    <li>IP addresses and general location data</li>
                    <li>Usage patterns and feature interactions</li>
                    <li>Error logs and performance metrics</li>
                    <li>Cookies and similar tracking technologies (see our Cookie Policy)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Behavioral Tracking:</strong> We use Google Tag Manager to track user behavior on the Platform, including page views, navigation patterns, user interactions (clicks, form submissions), feature usage, and user journey analysis. This behavioral tracking is performed via analytics cookies and requires your consent. You can opt-out via cookie consent preferences. Behavioral data is anonymized and aggregated for service improvement purposes.
                  </p>

                  <h3 className="text-lg font-medium mb-3 mt-6">2.7 Location Data (PECR-Regulated)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We collect precise location data (GPS coordinates) to enable our marketplace matching service. This is classified as <strong>network-derived location data</strong> under PECR and requires your explicit consent:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Precise GPS coordinates</strong> (latitude, longitude) - collected via browser geolocation API with your consent</li>
                    <li><strong>Street addresses</strong> - provided by you or geocoded from addresses</li>
                    <li><strong>Service radius preferences</strong> - how far you're willing to travel or provide service</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Why we need location data:</strong> Our marketplace matching service requires location data to match clients with nearby practitioners. This is a <strong>value-added service that cannot function without location data</strong> (PECR requirement). You can withdraw your consent at any time via your privacy settings.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Lawful Basis:</strong> UK GDPR Article 6(1)(a) - Consent. PECR requires explicit consent for network-derived location data.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Retention:</strong> Location data is retained until account deletion or 7 years after last activity (for legal compliance). You can delete your location data at any time.
                  </p>

                  <h3 className="text-lg font-medium mb-3 mt-6">2.8 IP Address Collection</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We collect IP addresses for the following purposes:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Security and fraud prevention</strong> (legitimate interests - UK GDPR Article 6(1)(f))</li>
                    <li><strong>Analytics and service improvement</strong> (with your consent via cookie consent - UK GDPR Article 6(1)(a))</li>
                    <li><strong>Error logging and debugging</strong> (legitimate interests)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Retention:</strong> IP addresses are retained for 12 months (security logs) or 26 months (analytics), then anonymized. You can opt-out of analytics IP tracking via cookie consent preferences.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    <strong>Anonymization:</strong> After retention periods, IP addresses are anonymized (last octet set to 0 for IPv4) to retain general location (country/city) while removing precise identification.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">3. Legal Basis for Processing (UK GDPR Article 6)</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Under UK GDPR, we must have a lawful basis for processing your personal data. We process your data under the following legal bases:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Contract (Article 6(1)(b)):</strong> Processing necessary for the performance of a contract with you, including facilitating bookings, processing payments, and providing platform services</li>
                    <li><strong>Legal Obligation (Article 6(1)(c)):</strong> Processing necessary to comply with legal obligations, such as tax reporting, healthcare record retention requirements, and regulatory compliance</li>
                    <li><strong>Legitimate Interests (Article 6(1)(f)):</strong> Processing necessary for our legitimate interests, including platform security, fraud prevention, service improvement, and business operations</li>
                    <li><strong>Consent (Article 6(1)(a)):</strong> Where you have given clear consent for specific processing activities, such as marketing communications or optional data sharing</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    For special category health data, we rely on UK GDPR Article 9(2)(h) (provision of health or social care) and Article 9(2)(f) (legal claims), as processing is necessary for the provision of healthcare services through our platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">4. How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use the information we collect to provide, maintain, and improve our services:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Facilitate connections between clients and practitioners through our marketplace</li>
                    <li>Process and manage bookings, sessions, and appointments</li>
                    <li>Process payments securely through Stripe Connect</li>
                    <li>Enable creation and storage of treatment notes and clinical records</li>
                    <li>Facilitate secure messaging and communication between users</li>
                    <li>Verify practitioner qualifications and professional credentials</li>
                    <li>Provide customer support and technical assistance</li>
                    <li>Send important service-related communications (bookings, payments, account updates)</li>
                    <li>Improve our services through analytics and research (using aggregated, anonymized data)</li>
                    <li>Ensure platform security, prevent fraud, and detect abuse</li>
                    <li>Comply with legal and regulatory requirements (UK GDPR, healthcare regulations, tax obligations)</li>
                    <li>Enforce our Terms and Conditions and platform policies</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    We do not use your personal data for automated decision-making or profiling that produces legal effects or significantly affects you, except where necessary for fraud prevention or with your explicit consent.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">5. UK GDPR and Data Protection Act 2018 Compliance</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    As a healthcare technology platform processing special category health data, we are committed to full compliance with UK GDPR and the Data Protection Act 2018:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Registration with the Information Commissioner's Office (ICO) as a data controller</li>
                    <li>Data Protection Impact Assessments (DPIAs) for high-risk processing activities</li>
                    <li>Strict access controls, authentication, and audit logging</li>
                    <li>Regular security risk assessments and updates</li>
                    <li>Staff training on UK GDPR privacy and security requirements</li>
                    <li>Incident response procedures for personal data breaches (72-hour notification to ICO where required)</li>
                    <li>Data subject rights protection, including access, rectification, erasure, and portability</li>
                    <li>Data minimisation and purpose limitation principles</li>
                    <li>Appropriate technical and organisational measures to ensure data security</li>
                    <li>Records of processing activities as required by UK GDPR Article 30</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    We act as a data controller for personal data we collect directly from users. Practitioners act as independent data controllers for clinical data and treatment notes they create, and are responsible for their own UK GDPR compliance.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">6. Data Security</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We implement industry-leading security measures to protect your information in accordance with UK GDPR requirements for technical and organisational measures:
                  </p>
                  
                  <h3 className="text-lg font-medium mb-3">6.1 Encryption</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>AES-256 encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>Encrypted database connections and backups</li>
                    <li>End-to-end encryption for sensitive communications where technically feasible</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">6.2 Access Controls</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Strong password requirements and account lockout protection</li>
                    <li>Role-based access permissions (principle of least privilege)</li>
                    <li>Regular access reviews and credential rotation</li>
                    <li>Automatic session timeouts and secure session management</li>
                    <li>Audit logging of all data access and modifications</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">6.3 Infrastructure Security</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>ISO 27001 certified or equivalent secure cloud infrastructure (Supabase, Vercel)</li>
                    <li>Regular penetration testing and vulnerability assessments</li>
                    <li>24/7 security monitoring and incident response capabilities</li>
                    <li>Automated backup and disaster recovery procedures</li>
                    <li>Secure software development lifecycle (SDLC) practices</li>
                    <li>Regular security updates and patch management</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">6.4 Staff and Organisational Security</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Background checks for staff with access to personal data</li>
                    <li>Regular UK GDPR and data protection training</li>
                    <li>Confidentiality agreements and data protection policies</li>
                    <li>Limited access to personal data on a need-to-know basis</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">7. Payment Data and Stripe</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Payment processing is handled securely through Stripe Connect, a PCI DSS Level 1 certified payment processor. We do not store full payment card details on our servers:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Payment card details are processed directly by Stripe and never stored by Theramate</li>
                    <li>We store only payment transaction records (amount, date, status) necessary for accounting and dispute resolution</li>
                    <li>Stripe Connect account information for practitioners (for receiving payments)</li>
                    <li>Stripe's processing of payment data is governed by Stripe's privacy policy and terms of service</li>
                    <li>Stripe is independently responsible for compliance with payment card industry (PCI) standards</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    For more information about how Stripe handles payment data, please review Stripe's Privacy Policy at https://stripe.com/gb/privacy
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">8. Information Sharing and Disclosure</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We do not sell, trade, or rent your personal information. We may share information in these limited circumstances:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>With Practitioners:</strong> We share necessary client information (name, contact details, booking information) with practitioners to facilitate bookings and service provision</li>
                    <li><strong>With Clients:</strong> We share practitioner profile information, qualifications, and availability with clients to enable booking decisions</li>
                    <li><strong>Service Providers:</strong> We share data with trusted service providers under strict data processing agreements, including:
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li>Stripe (payment processing) - data processing agreement in place</li>
                        <li>Supabase (database and hosting) - data processing agreement in place</li>
                        <li>Vercel (hosting and CDN) - data processing agreement in place</li>
                        <li>Email service providers (for transactional emails)</li>
                      </ul>
                    </li>
                    <li><strong>Legal Compliance:</strong> We may disclose information to comply with legal obligations, court orders, or regulatory requirements (e.g., HMRC, ICO, healthcare regulators)</li>
                    <li><strong>Protection of Rights:</strong> We may disclose information to protect our rights, property, or safety, or that of our users or others</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice to users and appropriate safeguards</li>
                    <li><strong>With Your Consent:</strong> We may share information with your explicit consent for specific purposes</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    All third-party service providers are required to maintain appropriate security measures and are prohibited from using your personal data for any purpose other than providing services to us.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    A <strong>Data Processing Agreement (DPA)</strong> compliant with UK GDPR is available on request for business or professional users (and for any user on request). To request a copy, please contact us at <strong>privacy@theramate.co.uk</strong>.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">9. Your Data Subject Rights (UK GDPR)</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Under UK GDPR and the Data Protection Act 2018, you have the following rights regarding your personal data:
                  </p>
                  
                  <h3 className="text-lg font-medium mb-3">9.1 Right of Access (Article 15)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to request copies of your personal data and information about how we process it. We will provide this information within one month of your request, free of charge (unless requests are excessive or unfounded).
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.2 Right to Rectification (Article 16)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to request correction of inaccurate or incomplete personal data. You can update much of your information directly through your account settings.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.3 Right to Erasure ("Right to be Forgotten") (Article 17)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to request deletion of your personal data in certain circumstances, subject to legal obligations (e.g., healthcare record retention requirements). Treatment notes and clinical records may need to be retained as required by UK healthcare regulations.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.4 Right to Restrict Processing (Article 18)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to request restriction of processing in certain circumstances, such as when you contest the accuracy of data or object to processing.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.5 Right to Data Portability (Article 20)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to receive your personal data in a structured, commonly used, and machine-readable format and to transmit that data to another controller, where technically feasible.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.6 Right to Object (Article 21)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to object to processing based on legitimate interests or for direct marketing purposes. We will stop processing unless we can demonstrate compelling legitimate grounds.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.7 Rights Related to Automated Decision-Making (Article 22)</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right not to be subject to automated decision-making, including profiling, that produces legal effects or significantly affects you, except where necessary for contract performance or with your explicit consent.
                  </p>

                  <h3 className="text-lg font-medium mb-3">9.8 Exercising Your Rights</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    To exercise any of these rights, please contact us at privacy@theramate.co.uk or use the contact information provided below. We will respond to your request within one month, though this may be extended by two months for complex requests. We may request verification of your identity before processing requests.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">10. Data Retention</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We retain your information for different periods based on the type of data, legal requirements, and legitimate business needs:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Account Information:</strong> Until account deletion or 7 years after last activity (for tax and legal compliance)</li>
                    <li><strong>Treatment Notes and Clinical Data:</strong> As required by UK healthcare regulations (typically 7-10 years for adults, longer for children) or until account deletion if no legal requirement</li>
                    <li><strong>Payment and Transaction Records:</strong> 7 years (for HMRC and accounting compliance)</li>
                    <li><strong>Booking and Session Records:</strong> 7 years (for legal and regulatory compliance)</li>
                    <li><strong>Communication Records:</strong> 3 years (for quality assurance and dispute resolution)</li>
                    <li><strong>Usage Analytics:</strong> Aggregated, anonymized data may be retained indefinitely for service improvement</li>
                    <li><strong>Marketing Data:</strong> Until consent is withdrawn or account deletion</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    After the retention period expires, we will securely delete or anonymize your personal data, except where we are required to retain it for legal, regulatory, or legitimate business purposes. Practitioners are responsible for maintaining their own clinical records in accordance with professional requirements.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">11. International Data Transfers</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Your information may be transferred to and processed in countries outside the UK. We ensure adequate protection through:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>UK Adequacy Regulations:</strong> We rely on UK adequacy regulations for transfers to countries with adequate data protection laws</li>
                    <li><strong>Standard Contractual Clauses (SCCs):</strong> We use UK-approved standard contractual clauses for transfers to countries without adequacy decisions</li>
                    <li><strong>Binding Corporate Rules:</strong> Where applicable, we use binding corporate rules for intra-group transfers</li>
                    <li><strong>Data Processing Agreements:</strong> All third-party processors are bound by data processing agreements with appropriate safeguards</li>
                    <li><strong>EU-US Data Privacy Framework:</strong> For transfers to US service providers, we rely on the EU-US Data Privacy Framework where applicable</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Our primary data storage is within the UK/EU where possible. Some service providers (e.g., Stripe, Supabase) may process data in the US or other jurisdictions, but all transfers are subject to appropriate safeguards as required by UK GDPR.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">12. Personal Data Breaches</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    In the event of a personal data breach that is likely to result in a high risk to your rights and freedoms, we will:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Notify the Information Commissioner's Office (ICO) within 72 hours of becoming aware of the breach, where required</li>
                    <li>Notify affected individuals without undue delay if the breach is likely to result in a high risk to their rights and freedoms</li>
                    <li>Provide clear information about the nature of the breach, likely consequences, and measures taken or proposed to address it</li>
                    <li>Maintain records of all personal data breaches as required by UK GDPR Article 33(5)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    We have incident response procedures in place to detect, investigate, and respond to security incidents promptly and effectively.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">13. Children's Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18 without appropriate parental consent. If we become aware that we have collected personal data from a child under 18 without appropriate consent, we will delete that information immediately.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Parents or guardians who believe we may have collected information from a child should contact us immediately at privacy@theramate.co.uk.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">14. Cookies and Tracking Technologies</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use cookies and similar tracking technologies to enhance your experience, analyze usage, and provide personalized content. For detailed information about our use of cookies, please see our Cookie Policy.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of the Platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">15. Changes to This Privacy Policy</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Email notification to your registered email address</li>
                    <li>In-app notifications</li>
                    <li>Posting a prominent notice on our website</li>
                    <li>Updating the "Last Updated" date at the top of this policy</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Material changes will be communicated at least 30 days before they take effect. Continued use of the Platform after such modifications constitutes your acceptance of the updated Privacy Policy. If you do not agree to the changes, you may stop using the Platform and request deletion of your account.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">16. Complaints and Regulatory Oversight</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have concerns about how we handle your personal data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO), the UK's data protection supervisory authority:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg mb-4">
                    <p className="text-sm mb-2"><strong>Information Commissioner's Office</strong></p>
                    <p className="text-sm">Website: https://ico.org.uk</p>
                    <p className="text-sm">Phone: 0303 123 1113</p>
                    <p className="text-sm">Address: Information Commissioner's Office, Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF</p>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    We encourage you to contact us first at privacy@theramate.co.uk to resolve any concerns before lodging a complaint with the ICO.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">17. Contact Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have questions about this Privacy Policy, wish to exercise your data subject rights, or have concerns about our data practices, please contact us:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm mb-2"><strong>Data Protection Officer</strong></p>
                    <p className="text-sm">Theramate Limited</p>
                    <p className="text-sm">Email: privacy@theramate.co.uk</p>
                    <p className="text-sm">Support: support@theramate.co.uk</p>
                    <p className="text-sm">Website: https://theramate.co.uk</p>
                    <p className="text-sm mt-2">
                      <strong>Registered Address:</strong><br />
                      Theramate Limited<br />
                      [Company Registration Number: To be provided]<br />
                      England and Wales
                    </p>
                    <p className="text-sm mt-2">
                      <strong>ICO Registration Number:</strong> [To be provided]
                    </p>
                  </div>
                </section>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
};

export default PrivacyPolicy;
