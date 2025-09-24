import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
            <Badge>Last Updated: September 11, 2025</Badge>
            <Badge variant="outline">Version 2.1</Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Terms of Service Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      By accessing and using TherapistExchange ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      These Terms of Service ("Terms") govern your use of our healthcare practice management platform, including all content, services, and products available at or through the website.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      TherapistExchange provides a comprehensive healthcare practice management platform that includes:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>AI-powered SOAP note generation and management</li>
                      <li>Session recording and voice-to-text transcription</li>
                      <li>Client management and appointment scheduling</li>
                      <li>Professional development information</li>
                      <li>Practice analytics and reporting tools</li>
                      <li>Secure messaging and communication features</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">3. User Registration and Accounts</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      To access certain features of the Platform, you must register for an account. You agree to:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Provide accurate, current, and complete information during registration</li>
                      <li>Maintain and promptly update your account information</li>
                      <li>Maintain the security of your password and account</li>
                      <li>Accept responsibility for all activities under your account</li>
                      <li>Notify us immediately of any unauthorized access or security breach</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">4. Professional Use and Licensing</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      This Platform is designed for use by licensed healthcare professionals. By using the service, you represent and warrant that:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>You are a licensed healthcare professional in good standing</li>
                      <li>You will comply with all applicable laws and professional standards</li>
                      <li>You will not use the Platform for any unlawful or unauthorized purpose</li>
                      <li>You will maintain appropriate professional liability insurance</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">5. Data and Privacy</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We take data security and privacy seriously. Our handling of your personal and professional data is governed by our Privacy Policy. Key principles include:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Strong data protection measures for all user information</li>
                      <li>End-to-end encryption for sensitive data</li>
                      <li>Regular security audits and updates</li>
                      <li>Data portability and deletion rights</li>
                      <li>Transparent data usage policies</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">6. Subscription and Payment Terms</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Access to certain features requires a paid subscription. Payment terms include:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Subscriptions automatically renew unless cancelled</li>
                      <li>Refunds available within 30 days of initial subscription</li>
                      <li>Price changes will be communicated 30 days in advance</li>
                      <li>Free trial periods as advertised on our pricing page</li>
                      <li>Pro-rated charges for plan upgrades</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">7. Intellectual Property</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      The Platform and its original content, features, and functionality are owned by TherapistExchange and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      You retain ownership of your clinical data and notes. We do not claim ownership of user-generated content but require certain rights to provide our services effectively.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">8. Prohibited Uses</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      You may not use the Platform:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>For any unlawful purpose or to solicit unlawful activity</li>
                      <li>To violate any international, federal, provincial, or state regulations or laws</li>
                      <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                      <li>To submit false or misleading information</li>
                      <li>To upload or transmit viruses or malicious code</li>
                      <li>To collect or track personal information of others without consent</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      In no event shall TherapistExchange, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, punitive, consequential, or special damages arising from your use of the Platform.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Upon termination, your right to use the Platform will cease immediately. You may delete your account at any time through your account settings.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">11. Changes to Terms</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Continued use of the Platform after such modifications shall constitute your consent to such changes.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">12. Contact Information</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      If you have any questions about these Terms and Conditions, please contact us:
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">Email: legal@therapistexchange.com</p>
                      <p className="text-sm">Phone: 1-800-THERAPY</p>
                      <p className="text-sm">Address: 123 Healthcare Drive, San Francisco, CA 94102</p>
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