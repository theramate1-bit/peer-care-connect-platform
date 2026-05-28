import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const SettingsPrivacyTools: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'access' | 'erasure' | 'location_withdraw' | null>(null);
  const [notes, setNotes] = useState('');
  const [locationConsented, setLocationConsented] = useState<boolean | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);

  useEffect(() => {
    if (user) {
      checkLocationConsent();
    } else {
      setCheckingLocation(false);
    }
  }, [user]);

  const checkLocationConsent = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('has_location_consent', { p_user_id: user.id });

      if (error) throw error;
      setLocationConsented(data === true);
    } catch (error: any) {
      console.error('Error checking location consent:', error);
      setLocationConsented(false);
    } finally {
      setCheckingLocation(false);
    }
  };

  const submitRequest = async (type: 'access' | 'erasure') => {
    try {
      setLoading(type);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        toast.error('Please sign in');
        return;
      }
      const { error } = await supabase.from('dsar_requests').insert({
        user_id: user.user.id,
        request_type: type,
        notes: notes ? { message: notes } : {},
      });
      if (error) throw error;
      toast.success('Request submitted');
      setNotes('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    } finally {
      setLoading(null);
    }
  };

  const withdrawLocationConsent = async () => {
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setLoading('location_withdraw');

    try {
      // Get IP address for audit
      let ipAddress: string | null = null;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip || null;
      } catch {
        // Fail silently - IP is optional
      }

      const { error } = await supabase
        .rpc('record_location_consent', {
          p_user_id: user.id,
          p_consented: false,
          p_consent_method: 'withdrawal',
          p_ip_address: ipAddress,
          p_user_agent: navigator.userAgent
        });

      if (error) throw error;

      setLocationConsented(false);
      toast.success('Location consent withdrawn. Location tracking has been disabled.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to withdraw consent');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Submit a request to access a copy of your data or to request deletion (subject to legal exemptions).
          </p>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context to help us locate your data (e.g., date ranges)" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submitRequest('access')} disabled={loading !== null}>
              {loading === 'access' ? 'Submitting…' : 'Request data export'}
            </Button>
            <Button variant="outline" onClick={() => submitRequest('erasure')} disabled={loading !== null}>
              {loading === 'erasure' ? 'Submitting…' : 'Request deletion'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We may pause the response time to verify your identity or ask for more details (per the Data (Use and Access) Act 2025). You'll receive updates by email.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Tracking Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage your location tracking consent. Location data is required for marketplace matching and is PECR-regulated.
          </p>

          {checkingLocation ? (
            <p className="text-sm text-muted-foreground">Checking consent status...</p>
          ) : (
            <>
              {locationConsented === true ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    <strong>Location consent granted.</strong> Your location data is being used for marketplace matching. 
                    You can withdraw consent at any time.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-amber-200 bg-amber-50">
                  <XCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Location consent not granted.</strong> Location-based features are disabled. 
                    Grant consent to enable marketplace matching.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 text-sm">
                <p><strong>What happens when you withdraw consent:</strong></p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                  <li>Location tracking stops immediately</li>
                  <li>Existing location data can be deleted on request</li>
                  <li>You can still use the platform with manual address entry</li>
                  <li>Location-based matching features will be disabled</li>
                </ul>
              </div>

              <div className="flex gap-2">
                {locationConsented === true ? (
                  <Button
                    variant="destructive"
                    onClick={withdrawLocationConsent}
                    disabled={loading === 'location_withdraw'}
                  >
                    {loading === 'location_withdraw' ? 'Withdrawing...' : 'Withdraw Location Consent'}
                  </Button>
                ) : (
                  <Alert className="w-full">
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      To grant location consent, please use the location consent prompt when accessing location-based features.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Location data is retained until account deletion or 7 years after last activity (for legal compliance). 
                See our <a href="/privacy" className="text-primary underline">Privacy Policy</a> for more information.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPrivacyTools;


