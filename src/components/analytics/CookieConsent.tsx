import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { enableGoogleAnalytics } from '@/lib/analytics/gtagLoader';
import {
  TM_COOKIE_CONSENT_KEY,
  dispatchCookieConsentChanged,
  type TmCookieConsentPrefs,
} from '@/lib/analytics/cookieConsentStorage';

type ConsentPrefs = TmCookieConsentPrefs;

const setGtmConsent = (prefs: ConsentPrefs) => {
  if (typeof window === 'undefined') return;
  (window as unknown as { dataLayer: unknown[] }).dataLayer =
    (window as unknown as { dataLayer?: unknown[] }).dataLayer || [];
  (window as unknown as { dataLayer: unknown[] }).dataLayer.push({
    event: 'consent_update',
    consent: {
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
      functionality_storage: prefs.functional ? 'granted' : 'denied',
    },
  });
};

const isTestEnvironment = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('test') ||
    window.location.search.includes('test=true') ||
    window.navigator.userAgent.includes('Playwright') ||
    window.navigator.userAgent.includes('HeadlessChrome') ||
    window.navigator.userAgent.includes('Chrome-Lighthouse') ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development'
  );
};

function persistConsent(next: ConsentPrefs, setVisible: (v: boolean) => void) {
  try {
    localStorage.setItem(TM_COOKIE_CONSENT_KEY, JSON.stringify(next));
    setGtmConsent(next);
    dispatchCookieConsentChanged(next);
    if (next.analytics) {
      void enableGoogleAnalytics();
    }
    setVisible(false);
  } catch (error) {
    console.error('🍪 Error saving consent:', error);
  }
}

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  const [prefs, setPrefs] = React.useState<ConsentPrefs>({
    analytics: false,
    marketing: false,
    functional: false,
  });
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        if (isTestEnvironment()) {
          setVisible(false);
          setIsInitialized(true);
          return;
        }

        const raw = localStorage.getItem(TM_COOKIE_CONSENT_KEY);

        if (!raw) {
          setVisible(true);
        } else {
          const saved = JSON.parse(raw) as ConsentPrefs;
          setGtmConsent(saved);
          setVisible(false);
          if (saved.analytics) {
            void enableGoogleAnalytics();
          }
        }
      } catch (error) {
        console.error('🍪 Error checking consent:', error);
        setVisible(true);
      } finally {
        setIsInitialized(true);
      }
    };

    checkConsent();
  }, []);

  if (isTestEnvironment()) {
    return null;
  }

  if (!isInitialized || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4">
      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardContent className="p-4 sm:p-5">
          <div className="sm:flex sm:items-start sm:justify-between gap-4">
            <div className="sm:max-w-xl">
              <h3 className="font-semibold mb-1">Cookies & Privacy</h3>
              <p className="text-sm text-muted-foreground">
                We use essential cookies to make our site work. With your consent, we'll also use analytics and marketing cookies to understand usage and improve services. <strong>Analytics cookies also collect IP addresses</strong> for service improvement. You can change your choices at any time.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Analytics</span>
                  <Switch
                    checked={prefs.analytics}
                    onCheckedChange={(v) =>
                      setPrefs({ ...prefs, analytics: !!v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Marketing</span>
                  <Switch
                    checked={prefs.marketing}
                    onCheckedChange={(v) =>
                      setPrefs({ ...prefs, marketing: !!v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between border rounded-md p-2">
                  <span className="text-sm">Functional</span>
                  <Switch
                    checked={prefs.functional}
                    onCheckedChange={(v) =>
                      setPrefs({ ...prefs, functional: !!v })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 sm:mt-0 sm:flex sm:flex-col sm:items-end gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    persistConsent(
                      {
                        analytics: false,
                        marketing: false,
                        functional: false,
                      },
                      setVisible,
                    )
                  }
                >
                  Reject non-essential
                </Button>
                <Button
                  onClick={() =>
                    persistConsent(
                      {
                        analytics: true,
                        marketing: true,
                        functional: true,
                      },
                      setVisible,
                    )
                  }
                >
                  Accept all
                </Button>
              </div>
              <Button
                variant="ghost"
                className="mt-2 text-sm"
                onClick={() => persistConsent(prefs, setVisible)}
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
