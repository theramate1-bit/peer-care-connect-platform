import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StandardPage from '@/components/layouts/StandardPage';

const COOKIE_CONSENT_KEY = 'tm_cookie_consent_v1';

const Cookies = () => {
  return (
    <StandardPage title="Cookie Policy" badgeText="Cookies" subtitle="How we use cookies and how you can control your preferences.">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-6">
          <Badge variant="secondary">Last updated: February 2026</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This Cookie Policy explains how Theramate Limited ("we", "us", "our") uses cookies and similar technologies on theramate.co.uk (the "Platform"). It should be read alongside our <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
            </p>
            <p>
              We use cookies to make the Platform work, to remember your choices, and to understand how the Platform is used. Where we use non-essential cookies (such as analytics or marketing), we ask for your consent via the cookie banner when you first visit. You can change your preferences at any time using the options on this page or your browser settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. What we use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              The table below describes the main cookies and similar technologies we use. "Duration" indicates how long the cookie remains on your device.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-3 py-2 text-left font-medium">Name / Category</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">Purpose</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">Duration</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border px-3 py-2">{COOKIE_CONSENT_KEY}</td>
                    <td className="border border-border px-3 py-2">Stores your cookie consent choices (essential, analytics, marketing) so we do not ask again on every visit.</td>
                    <td className="border border-border px-3 py-2">12 months</td>
                    <td className="border border-border px-3 py-2">Strictly necessary (consent record)</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2">Session / authentication cookies</td>
                    <td className="border border-border px-3 py-2">Used to keep you logged in and to secure your session. These may include identifiers set by our authentication provider (e.g. Supabase).</td>
                    <td className="border border-border px-3 py-2">Session or as per provider</td>
                    <td className="border border-border px-3 py-2">Essential</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2">Analytics cookies</td>
                    <td className="border border-border px-3 py-2">Help us understand how the Platform is used (e.g. pages visited, flows). Only placed if you accept analytics in the cookie banner. May include cookies set by Google Tag Manager or similar tools.</td>
                    <td className="border border-border px-3 py-2">Varies (e.g. up to 24 months)</td>
                    <td className="border border-border px-3 py-2">Analytics (consent required)</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2">Marketing cookies</td>
                    <td className="border border-border px-3 py-2">Used to measure and improve marketing campaigns and to personalise content. Only placed if you accept marketing cookies in the cookie banner.</td>
                    <td className="border border-border px-3 py-2">Varies</td>
                    <td className="border border-border px-3 py-2">Marketing (consent required)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground text-xs">
              If you have granted consent for analytics or marketing, third-party tools (e.g. Google) may set additional cookies. Their names and durations are determined by those providers; you can inspect them in your browser's developer tools or privacy settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. IP Address Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              In connection with cookies and tracking technologies, we also collect IP addresses:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Analytics Cookies:</strong> When you consent to analytics cookies, your IP address is collected for analytics purposes to understand how the Platform is used</li>
              <li><strong>Security:</strong> IP addresses are automatically collected for security and fraud prevention purposes (legitimate interests under UK GDPR Article 6(1)(f))</li>
              <li><strong>Retention:</strong> IP addresses collected via analytics are retained for 26 months, then anonymized. IP addresses collected for security are retained for 12 months, then anonymized</li>
              <li><strong>Anonymization:</strong> After retention periods, IP addresses are anonymized (last octet set to 0 for IPv4) to retain general location (country/city) while removing precise identification</li>
            </ul>
            <p>
              You can opt-out of analytics IP tracking by declining analytics cookies in the cookie consent banner. Security IP logging is necessary for platform security and cannot be opted out of.
            </p>
            <p className="text-xs">
              For more detailed information about IP address collection, retention, and your rights, please see our <a href="/privacy" className="text-primary underline">Privacy Policy</a> (section 2.8).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. How to control or withdraw consent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Reset preferences on this site:</strong> Click the button below to clear your stored cookie preferences. After you reload the page, the cookie consent banner will appear again and you can make new choices. This only affects preferences we store; it does not delete cookies already set by third parties (you can remove those via your browser).
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    localStorage.removeItem(COOKIE_CONSENT_KEY);
                  } catch {}
                  window.location.reload();
                }}
              >
                Reset cookie preferences
              </Button>
            </div>
            <p>
              <strong>Browser and device controls:</strong> You can block or delete cookies through your browser settings. Most browsers let you refuse all cookies or only third-party cookies. Blocking all cookies may affect how the Platform works (for example, you may not stay logged in). For guidance, see your browser’s help section or the ICO’s guidance on cookies:{' '}
              <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                ico.org.uk/for-the-public/online/cookies
              </a>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Changes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices or in law. The "Last updated" date at the top of this page will be revised when we make material changes. We encourage you to review this policy periodically.
            </p>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
};

export default Cookies;
