import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StandardPage from '@/components/layouts/StandardPage';

const Cookies = () => {
  return (
    <StandardPage title="Cookie Policy" badgeText="Cookies" subtitle="Manage your cookie preferences and learn how we use cookies.">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cookie Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              We use essential cookies to make our site work. With your consent, we also use analytics and marketing cookies to help us improve services. You can change your preferences at any time.
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Essential: required for core functionality and security</li>
              <li>Analytics: help us understand usage and improve features</li>
              <li>Marketing: personalize content and measure campaigns</li>
            </ul>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                The cookie consent banner will appear at the bottom of the page if you haven't made a choice yet.
              </p>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => {
                try { localStorage.removeItem('tm_cookie_consent_v1'); } catch {}
                window.location.reload();
              }}>Reset preferences</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
};

export default Cookies;


