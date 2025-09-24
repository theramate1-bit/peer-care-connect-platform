import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Lock, Eye, Database, Users, FileText } from "lucide-react";
import StandardPage from "@/components/layouts/StandardPage";

const PrivacyPolicy = () => {
  const privacyHighlights = [
    {
      icon: Shield,
      title: "Privacy Focused",
      description: "Committed to protecting your personal information"
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
    <StandardPage title="Privacy Policy" badgeText="Privacy" subtitle="Your privacy is fundamental to our mission. This policy explains how we collect, use, and protect your information.">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Badge>Last Updated: September 11, 2025</Badge>
            <Badge variant="outline">Privacy Focused</Badge>
          </div>
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
            <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We collect information you provide directly to us and information we gather through your use of our services.
                    </p>
                    
                    <h3 className="text-lg font-medium mb-3">Personal Information</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>Name, email address, and contact information</li>
                      <li>Professional license information and credentials</li>
                      <li>Practice details and specializations</li>
                      <li>Payment and billing information</li>
                      <li>Profile photos and professional information</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Clinical and Professional Data</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>SOAP notes and clinical documentation</li>
                      <li>Session recordings and transcriptions (with consent)</li>
                      <li>Client management information (de-identified)</li>
                      <li>Professional development information</li>
                      <li>Practice analytics and usage patterns</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Technical Information</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Device information and browser type</li>
                      <li>IP addresses and location data (general)</li>
                      <li>Usage patterns and feature interactions</li>
                      <li>Error logs and performance metrics</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We use the information we collect to provide, maintain, and improve our services:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Provide and personalize our healthcare platform services</li>
                      <li>Process payments and manage your subscription</li>
                      <li>Generate AI-powered SOAP notes and clinical insights</li>
                      <li>Facilitate secure communication between healthcare providers</li>
                      <li>Provide professional development information</li>
                      <li>Provide customer support and technical assistance</li>
                      <li>Improve our services through analytics and research</li>
                      <li>Comply with legal and regulatory requirements</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">3. HIPAA Compliance</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      As a healthcare technology platform, we are committed to full HIPAA compliance:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Business Associate Agreements (BAAs) with all healthcare providers</li>
                      <li>Strict access controls and audit logging</li>
                      <li>Regular risk assessments and security updates</li>
                      <li>Staff training on HIPAA privacy and security rules</li>
                      <li>Incident response procedures for any potential breaches</li>
                      <li>Patient rights protection including access and amendment rights</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We implement industry-leading security measures to protect your information:
                    </p>
                    
                    <h3 className="text-lg font-medium mb-3">Encryption</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>AES-256 encryption for data at rest</li>
                      <li>TLS 1.3 encryption for data in transit</li>
                      <li>End-to-end encryption for sensitive communications</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Access Controls</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>Multi-factor authentication requirements</li>
                      <li>Role-based access permissions</li>
                      <li>Regular access reviews and updates</li>
                      <li>Automatic session timeouts</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Infrastructure Security</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>SOC 2 Type II certified data centers</li>
                      <li>Regular penetration testing and vulnerability assessments</li>
                      <li>24/7 security monitoring and incident response</li>
                      <li>Backup and disaster recovery procedures</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">5. Information Sharing</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We do not sell, trade, or rent your personal information. We may share information in these limited circumstances:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>With your explicit consent for specific purposes</li>
                      <li>With service providers under strict confidentiality agreements</li>
                      <li>To comply with legal obligations or protect rights and safety</li>
                      <li>In connection with business transfers (with notice to users)</li>
                      <li>For research purposes using de-identified data only</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">6. Your Rights and Controls</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      You have several rights regarding your personal information:
                    </p>
                    
                    <h3 className="text-lg font-medium mb-3">Access and Portability</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>Request copies of your personal data</li>
                      <li>Export your clinical data in standard formats</li>
                      <li>Access account settings and privacy controls</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Correction and Deletion</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-4">
                      <li>Update or correct your personal information</li>
                      <li>Request deletion of your account and data</li>
                      <li>Opt-out of non-essential communications</li>
                    </ul>

                    <h3 className="text-lg font-medium mb-3">Privacy Settings</h3>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Control who can see your professional profile</li>
                      <li>Manage communication preferences</li>
                      <li>Set data retention preferences</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We retain your information for different periods based on the type of data and legal requirements:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Account information: Until account deletion or 7 years after inactivity</li>
                      <li>Clinical data: As required by healthcare regulations (typically 7-10 years)</li>
                      <li>Usage analytics: Aggregated data may be retained indefinitely</li>
                      <li>Support communications: 3 years for quality assurance</li>
                      <li>Financial records: 7 years for compliance purposes</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">8. International Data Transfers</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Standard Contractual Clauses for EU data transfers</li>
                      <li>Adequacy decisions where available</li>
                      <li>Binding Corporate Rules for internal transfers</li>
                      <li>Local data residency options for sensitive data</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">9. Children's Privacy</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware of such collection, we will delete the information immediately.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">10. Changes to This Policy</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      We may update this Privacy Policy periodically. We will notify you of any material changes by:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                      <li>Email notification to your registered address</li>
                      <li>In-app notifications</li>
                      <li>Updates on our website with revision dates</li>
                      <li>30-day advance notice for significant changes</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">11. Contact Us</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      If you have questions about this Privacy Policy or our privacy practices, please contact:
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm mb-2"><strong>Privacy Officer</strong></p>
                      <p className="text-sm">Email: privacy@therapistexchange.com</p>
                      <p className="text-sm">Phone: 1-800-THERAPY (ext. 2)</p>
                      <p className="text-sm">Address: 123 Healthcare Drive, San Francisco, CA 94102</p>
                      <p className="text-sm mt-2"><strong>Data Protection Officer (EU):</strong> dpo@therapistexchange.com</p>
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