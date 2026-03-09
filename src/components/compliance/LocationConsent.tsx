import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocationConsentProps {
  onConsentChange?: (consented: boolean) => void;
  showOnlyIfNeeded?: boolean; // Only show if consent not already given
  purpose?: string; // Why location is needed
}

export const LocationConsent: React.FC<LocationConsentProps> = ({
  onConsentChange,
  showOnlyIfNeeded = false,
  purpose = 'finding nearby practitioners in our marketplace'
}) => {
  const { user } = useAuth();
  const [consented, setConsented] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConsentStatus();
  }, [user]);

  const checkConsentStatus = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('has_location_consent', { p_user_id: user.id });

      if (error) throw error;

      setConsented(data === true);
      
      // If consent already given and showOnlyIfNeeded, don't show component
      if (showOnlyIfNeeded && data === true) {
        onConsentChange?.(true);
      }
    } catch (error: any) {
      console.error('Error checking location consent:', error);
      // If function doesn't exist yet, assume no consent
      setConsented(false);
    } finally {
      setChecking(false);
    }
  };

  const handleConsent = async (granted: boolean) => {
    if (!user) {
      toast.error('Please sign in to grant location consent');
      return;
    }

    setLoading(true);

    try {
      // Get IP address and user agent for audit
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      const { data, error } = await supabase
        .rpc('record_location_consent', {
          p_user_id: user.id,
          p_consented: granted,
          p_consent_method: 'browser_geolocation',
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        });

      if (error) throw error;

      setConsented(granted);
      onConsentChange?.(granted);

      if (granted) {
        toast.success('Location consent granted. You can now use location-based features.');
      } else {
        toast.info('Location consent withdrawn. Location tracking has been disabled.');
      }
    } catch (error: any) {
      console.error('Error recording location consent:', error);
      toast.error('Failed to save consent preference. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getClientIP = async (): Promise<string | null> => {
    try {
      // Try to get IP from a service (for audit purposes)
      // In production, this should come from server-side
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch {
      return null; // Fail silently - IP is optional for consent record
    }
  };

  if (checking) {
    return null; // Don't show anything while checking
  }

  // If consent already given and showOnlyIfNeeded, don't show component
  if (showOnlyIfNeeded && consented === true) {
    return null;
  }

  // If user not logged in, show informational message
  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please sign in to grant location consent for {purpose}.
        </AlertDescription>
      </Alert>
    );
  }

  // If consent already given, show status
  if (consented === true) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Location consent granted
              </p>
              <p className="text-xs text-green-700 mt-1">
                You can withdraw consent at any time in your privacy settings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConsent(false)}
              disabled={loading}
              className="border-green-300"
            >
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show consent request
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Location Access Required</CardTitle>
            <CardDescription className="mt-1">
              We need your location to enable {purpose}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>PECR & UK GDPR Compliance:</strong> Location tracking requires your explicit consent. 
            This is a value-added service that cannot function without location data. 
            You can withdraw consent at any time.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Why we need your location:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To match you with nearby practitioners</li>
            <li>To calculate distances for search results</li>
            <li>To enable location-based marketplace features</li>
          </ul>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>How we use your location:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Stored securely with encryption</li>
            <li>Used only for marketplace matching</li>
            <li>Not shared with third parties (except geocoding services)</li>
            <li>Retained until account deletion or 7 years after inactivity</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => handleConsent(true)}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Saving...' : 'Grant Location Consent'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleConsent(false)}
            disabled={loading}
          >
            Decline
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can change this preference anytime in your{' '}
          <a href="/settings/privacy" className="text-primary underline">
            privacy settings
          </a>
        </p>
      </CardContent>
    </Card>
  );
};

export default LocationConsent;
