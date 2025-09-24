import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type ConsentPrefs = {
  analytics: boolean;
  marketing: boolean;
  functional: boolean; // non-essential functional
};

const COOKIE_KEY = 'tm_cookie_consent_v1';

const setGtmConsent = (prefs: ConsentPrefs) => {
  if (typeof window === 'undefined') return;
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({
    event: 'consent_update',
    consent: {
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
      functionality_storage: prefs.functional ? 'granted' : 'denied',
    },
  });
};

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [prefs, setPrefs] = React.useState<ConsentPrefs>({ analytics: false, marketing: false, functional: false });
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        const raw = localStorage.getItem(COOKIE_KEY);
        console.log('🍪 Checking cookie consent:', raw);
        
        if (!raw) {
          console.log('🍪 No consent found, showing banner');
          setVisible(true);
        } else {
          const saved = JSON.parse(raw) as ConsentPrefs;
          console.log('🍪 Consent found:', saved);
          setGtmConsent(saved);
          setVisible(false); // Hide banner if consent exists
        }
      } catch (error) {
        console.error('🍪 Error checking consent:', error);
        setVisible(true); // Show banner on error
      } finally {
        setIsInitialized(true);
      }
    };

    checkConsent();
  }, []);

  // Don't render until initialization is complete
  if (!isInitialized || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardContent className="p-4 sm:p-5">
          <div className="sm:flex sm:items-start sm:justify-between gap-4">
            <div className="sm:max-w-xl">
              <h3 className="font-semibold mb-1">Cookies & Privacy</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to make our site work. With your consent, we’ll also use analytics and marketing cookies to understand usage and improve services. You can change your choices at any time.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Analytics</span>
                  <Switch checked={prefs.analytics} onCheckedChange={(v) => setPrefs({ ...prefs, analytics: !!v })} />
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Marketing</span>
                  <Switch checked={prefs.marketing} onCheckedChange={(v) => setPrefs({ ...prefs, marketing: !!v })} />
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Functional</span>
                  <Switch checked={prefs.functional} onCheckedChange={(v) => setPrefs({ ...prefs, functional: !!v })} />
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-0 sm:flex sm:flex-col sm:items-end gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const deny = { analytics: false, marketing: false, functional: false };
                      localStorage.setItem(COOKIE_KEY, JSON.stringify(deny));
                      setGtmConsent(deny);
                      setVisible(false);
                      console.log('🍪 Consent rejected:', deny);
                    } catch (error) {
                      console.error('🍪 Error saving consent:', error);
                    }
                  }}
                >
                  Reject non-essential
                </Button>
                <Button
                  onClick={() => {
                    try {
                      const allowAll = { analytics: true, marketing: true, functional: true };
                      localStorage.setItem(COOKIE_KEY, JSON.stringify(allowAll));
                      setGtmConsent(allowAll);
                      setVisible(false);
                      console.log('🍪 Consent accepted:', allowAll);
                    } catch (error) {
                      console.error('🍪 Error saving consent:', error);
                    }
                  }}
                >
                  Accept all
                </Button>
              </div>
              <Button
                variant="ghost"
                className="mt-2 text-sm"
                onClick={() => {
                  try {
                    localStorage.setItem(COOKIE_KEY, JSON.stringify(prefs));
                    setGtmConsent(prefs);
                    setVisible(false);
                    console.log('🍪 Custom preferences saved:', prefs);
                  } catch (error) {
                    console.error('🍪 Error saving preferences:', error);
                  }
                }}
              >
                Save preferences
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;


