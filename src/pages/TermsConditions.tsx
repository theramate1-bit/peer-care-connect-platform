import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import StandardPage from "@/components/layouts/StandardPage";

const TermsConditions = () => {
  return (
    <StandardPage title="Terms and Conditions" badgeText="Legal">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4">
            <Badge>Last Updated: December 15, 2025</Badge>
            <Badge variant="outline">Version 3.0</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            These Terms and Conditions are governed by the laws of England and Wales
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[800px] pr-4">
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    By accessing and using Theramate ("the Platform", "we", "us", "our"), operated by Theramate Limited, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these Terms, please do not use this service.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms of Service ("Terms") govern your use of our healthcare marketplace platform, including all content, services, and products available at or through the website theramate.co.uk. These Terms constitute a legally binding agreement between you and Theramate Limited, a company registered in England and Wales.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Theramate provides a comprehensive healthcare marketplace platform that connects clients with qualified musculoskeletal health practitioners, including osteopaths, sports therapists, and massage therapists. Our services include:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Online marketplace for discovering and booking qualified healthcare practitioners</li>
                    <li>Secure booking system for therapy sessions and consultations</li>
                    <li>Integrated payment processing via Stripe Connect</li>
                    <li>Treatment notes management (SOAP, DAP, and free text formats)</li>
                    <li>Secure messaging and communication between practitioners and clients</li>
                    <li>Client progress tracking and goal setting</li>
                    <li>Session feedback and review system</li>
                    <li>Practice management tools for practitioners</li>
                    <li>Real-time session management and check-in/check-out functionality</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Theramate acts as an intermediary platform facilitating connections between clients and practitioners. We do not provide healthcare services directly, nor do we employ or contract with practitioners. All healthcare services are provided directly by independent practitioners who are responsible for their own professional conduct, qualifications, and regulatory compliance.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">3. User Roles and Responsibilities</h2>
                  
                  <h3 className="text-lg font-medium mb-3">3.1 Clients</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Clients are individuals seeking healthcare services through the Platform. By using the Platform as a client, you agree to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Provide accurate personal and health information necessary for booking sessions</li>
                    <li>Attend scheduled sessions or provide adequate notice for cancellations</li>
                    <li>Pay for services in accordance with the practitioner's pricing and our payment terms</li>
                    <li>Treat practitioners with respect and professionalism</li>
                    <li>Comply with all applicable UK laws and regulations</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">3.2 Practitioners</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Practitioners are qualified healthcare professionals offering services through the Platform. By using the Platform as a practitioner, you represent and warrant that:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>You hold valid professional registration and qualifications (e.g., GOsC registration for osteopaths, SMA membership for sports therapists, relevant professional body membership for massage therapists)</li>
                    <li>You maintain appropriate professional indemnity and public liability insurance</li>
                    <li>You comply with all applicable UK healthcare regulations and professional standards</li>
                    <li>You will provide accurate information about your qualifications, experience, and services</li>
                    <li>You are responsible for all clinical decisions and treatment provided to clients</li>
                    <li>You will maintain appropriate clinical records in accordance with professional and legal requirements</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">3.3 Guest Users</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Guests may browse the marketplace and make bookings without creating an account, subject to providing necessary booking information. Guest bookings are subject to the same terms as client bookings.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">4. User Registration and Accounts</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    To access certain features of the Platform, you must register for an account. You agree to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain and promptly update your account information, including contact details and professional credentials</li>
                    <li>Maintain the security of your password and account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized access or security breach</li>
                    <li>Not share your account credentials with third parties</li>
                    <li>Not create multiple accounts to circumvent platform restrictions or policies</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Practitioners must complete verification of their professional qualifications before offering services on the Platform. We reserve the right to verify qualifications with relevant professional bodies and to suspend or terminate accounts that fail verification.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">5. Booking and Session Management</h2>
                  
                  <h3 className="text-lg font-medium mb-3">5.1 Booking Process</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Bookings are made through the Platform and are subject to practitioner availability. By making a booking, you enter into a direct contract with the practitioner for the provision of healthcare services. Theramate facilitates the booking but is not a party to the service contract.
                  </p>

                  <h3 className="text-lg font-medium mb-3">5.2 Cancellation and Refund Policy</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Cancellation and refund policies are set by individual practitioners and must comply with UK consumer protection laws, including the Consumer Rights Act 2015:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Cancellations made more than 24 hours before the scheduled session time are eligible for a full refund, unless otherwise stated by the practitioner</li>
                    <li>Cancellations made less than 24 hours before the scheduled session may be subject to cancellation fees as set by the practitioner</li>
                    <li>No-shows may be charged the full session fee</li>
                    <li>Practitioners may cancel sessions with reasonable notice, in which case clients will receive a full refund</li>
                    <li>Refunds will be processed through the original payment method within 5-10 business days</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-3">5.3 Session Conduct</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Both clients and practitioners agree to conduct sessions professionally and in accordance with applicable professional standards and UK law. Any inappropriate conduct may result in immediate termination of the session and potential account suspension or termination.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">6. Payment Terms</h2>
                  
                  <h3 className="text-lg font-medium mb-3">6.1 Payment Processing</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Payments are processed securely through Stripe Connect, a third-party payment processor. By using the Platform, you agree to Stripe's terms of service and privacy policy. Theramate does not store full payment card details on our servers.
                  </p>

                  <h3 className="text-lg font-medium mb-3">6.2 Platform Fees</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Theramate charges a platform fee on transactions, which is disclosed at the time of booking. Platform fees are calculated as a percentage of the session price and are included in the total amount charged to clients. Practitioners receive payment minus the platform fee and any applicable Stripe processing fees.
                  </p>

                  <h3 className="text-lg font-medium mb-3">6.3 Pricing</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Practitioners set their own pricing for services. All prices are displayed in British Pounds (GBP) and include VAT where applicable. Practitioners are responsible for their own tax obligations and VAT registration if required.
                  </p>

                  <h3 className="text-lg font-medium mb-3">6.4 Payment to Practitioners</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Payments to practitioners are processed through Stripe Connect. Practitioners must complete Stripe Connect onboarding before receiving payments. Payment schedules and terms are governed by Stripe Connect agreements. Theramate is not responsible for delays or issues with payment processing by Stripe.
                  </p>

                  <h3 className="text-lg font-medium mb-3 mt-6">6.5 Practitioner Subscription Plans</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Practitioner subscription plans (e.g. Starter, Practitioner, Clinic) are paid in advance and renew automatically at the end of each billing period (e.g. monthly or annually) unless you cancel before the renewal date.
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Renewal notice:</strong> We will notify you by email and/or in-app before your subscription renews, so you can cancel if you do not wish to continue.</li>
                    <li><strong>Cancellation:</strong> You may cancel your subscription at any time via Profile &gt; Subscription or the Stripe customer portal (linked from your subscription settings). Cancellation takes effect at the end of the current billing period; you will retain access until that date and will not be charged again.</li>
                    <li><strong>Price changes:</strong> We will give you at least 30 days' notice of any price increase. Continued use of the subscription after the change takes effect constitutes acceptance. If you do not agree, you may cancel before the new price applies.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">7. Treatment Notes and Clinical Data</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Practitioners may create and store treatment notes (SOAP, DAP, or free text formats) through the Platform. Treatment notes are considered special category personal data under UK GDPR:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Practitioners retain ownership and responsibility for all clinical records</li>
                    <li>Treatment notes are stored securely and encrypted in accordance with UK GDPR requirements</li>
                    <li>Practitioners are responsible for maintaining appropriate clinical records in compliance with professional and legal requirements</li>
                    <li>Clients have rights to access their treatment notes in accordance with UK GDPR and data protection laws</li>
                    <li>Treatment notes may be retained for periods required by UK healthcare regulations (typically 7-10 years for adults)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Theramate provides tools for creating and managing treatment notes but does not provide clinical advice or review treatment notes for clinical accuracy. Practitioners are solely responsible for the clinical content and accuracy of treatment notes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">8. Data Protection and Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We take data security and privacy seriously. Our handling of your personal and professional data is governed by our Privacy Policy and complies with UK GDPR and the Data Protection Act 2018. Key principles include:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Strong data protection measures for all user information</li>
                    <li>Encryption for data in transit and at rest</li>
                    <li>Regular security audits and updates</li>
                    <li>Data subject rights under UK GDPR (access, rectification, erasure, portability, etc.)</li>
                    <li>Transparent data usage policies</li>
                    <li>Appropriate legal basis for processing special category health data</li>
                  </ul>
                  
                  <h3 className="text-lg font-medium mb-3 mt-6">8.1 Location Data and IP Tracking</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    By using the Platform, you acknowledge that we collect location data and IP addresses as described in our Privacy Policy:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li><strong>Location Data:</strong> We collect precise location data (GPS coordinates) to enable marketplace matching functionality. This is classified as network-derived location data under PECR and requires your explicit consent. Location tracking is a value-added service that cannot function without location data. You can withdraw consent at any time via your privacy settings.</li>
                    <li><strong>IP Addresses:</strong> We collect IP addresses for security and fraud prevention (legitimate interests) and for analytics (with your consent via cookie consent). IP addresses are anonymized after retention periods (12-26 months depending on purpose).</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    For full details on how we collect, use, and protect your location and IP data, including lawful basis, retention periods, and your rights, please see our <a href="/privacy" className="text-primary underline">Privacy Policy</a> (sections 2.7 and 2.8).
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">9. Intellectual Property</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    The Platform and its original content, features, and functionality are owned by Theramate Limited and are protected by UK and international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You retain ownership of your clinical data, treatment notes, and user-generated content. However, by using the Platform, you grant Theramate a limited, non-exclusive, royalty-free license to use, store, and process your content solely for the purpose of providing and improving our services.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise use the Platform's content without our prior written consent, except for your own personal, non-commercial use.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">10. Prohibited Uses</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You may not use the Platform:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>For any unlawful purpose or to solicit unlawful activity</li>
                    <li>To violate any UK or international laws, regulations, or professional standards</li>
                    <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate against any person</li>
                    <li>To submit false, misleading, or fraudulent information, including false qualifications or credentials</li>
                    <li>To upload or transmit viruses, malware, or malicious code</li>
                    <li>To collect or track personal information of others without consent</li>
                    <li>To circumvent or attempt to circumvent payment processing or platform fees</li>
                    <li>To engage in any activity that could damage, disable, or impair the Platform</li>
                    <li>To use automated systems to access the Platform without authorization</li>
                    <li>To impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">11. Healthcare Service Disclaimers</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Important:</strong> Theramate is a technology platform that facilitates connections between clients and healthcare practitioners. We do not provide healthcare services, medical advice, or clinical recommendations.
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Theramate does not employ, contract with, or have any employment relationship with practitioners listed on the Platform</li>
                    <li>Practitioners are independent professionals responsible for their own clinical decisions, treatment, and professional conduct</li>
                    <li>Theramate does not verify, endorse, or guarantee the quality, safety, or effectiveness of any healthcare services provided by practitioners</li>
                    <li>Clients are responsible for verifying practitioner qualifications and suitability for their needs</li>
                    <li>Theramate is not liable for any clinical outcomes, adverse events, or professional negligence by practitioners</li>
                    <li>In case of medical emergencies, clients should contact emergency services (999) immediately</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Practitioners are responsible for maintaining appropriate professional indemnity insurance and complying with all applicable UK healthcare regulations and professional standards.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">12. Limitation of Liability</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    To the fullest extent permitted by UK law, Theramate Limited, its directors, employees, partners, agents, suppliers, or affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, arising from your use of the Platform.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Our total liability to you for all claims arising from or related to the use of the Platform shall not exceed the amount you paid to us in the 12 months preceding the claim, or £100, whichever is greater.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Nothing in these Terms excludes or limits our liability for:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Death or personal injury caused by our negligence</li>
                    <li>Fraud or fraudulent misrepresentation</li>
                    <li>Any other liability that cannot be excluded or limited under UK law</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee uninterrupted, secure, or error-free service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">13. Indemnification</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You agree to indemnify, defend, and hold harmless Theramate Limited, its directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable legal fees) arising from:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Your use of the Platform</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any rights of another party</li>
                    <li>Any content you submit, post, or transmit through the Platform</li>
                    <li>Your provision of healthcare services (for practitioners) or your conduct during sessions (for clients)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">14. Termination</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including but not limited to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Breach of these Terms</li>
                    <li>Fraudulent, illegal, or harmful activity</li>
                    <li>Failure to verify professional qualifications (for practitioners)</li>
                    <li>Violation of professional standards or regulations</li>
                    <li>Non-payment of fees or charges</li>
                    <li>Extended period of account inactivity</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Upon termination, your right to use the Platform will cease immediately. You may delete your account at any time through your account settings. Upon account deletion:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Your access to the Platform will be revoked</li>
                    <li>We will retain your data in accordance with our Privacy Policy and legal obligations</li>
                    <li>Outstanding payments or fees remain due</li>
                    <li>Treatment notes and clinical records may be retained as required by law</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">15. Dispute Resolution</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or related to these Terms or the Platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Before initiating formal legal proceedings, we encourage you to contact us to attempt to resolve any disputes amicably. We are committed to resolving disputes fairly and efficiently.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    For disputes between clients and practitioners regarding healthcare services, we recommend first attempting direct resolution. Theramate may facilitate communication but is not obligated to mediate disputes. Practitioners should have appropriate professional indemnity insurance to cover potential claims.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">16. Changes to Terms</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect by:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                    <li>Email notification to your registered email address</li>
                    <li>In-app notifications</li>
                    <li>Posting a notice on our website</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed">
                    Continued use of the Platform after such modifications shall constitute your consent to such changes. If you do not agree to the modified Terms, you must stop using the Platform and may delete your account.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">17. Severability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">18. Entire Agreement</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and Theramate regarding your use of the Platform and supersede all prior agreements and understandings, whether written or oral.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">19. Contact Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about these Terms and Conditions, please contact us:
                  </p>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm mb-2"><strong>Theramate Limited</strong></p>
                    <p className="text-sm">Email: legal@theramate.co.uk</p>
                    <p className="text-sm">Support: support@theramate.co.uk</p>
                    <p className="text-sm">Website: https://theramate.co.uk</p>
                    <p className="text-sm mt-2">
                      <strong>Registered Address:</strong><br />
                      Theramate Limited<br />
                      Registered in England and Wales (company number available on request)<br />
                      England and Wales
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

export default TermsConditions;
