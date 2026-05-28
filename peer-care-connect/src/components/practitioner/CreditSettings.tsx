import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coins, Settings, Info, Zap, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CreditSettings {
  peer_booking_enabled: boolean;
  credit_cost_per_hour: number;
  minimum_session_duration: number;
  maximum_session_duration: number;
  auto_accept_peer_bookings: boolean;
  credit_discount_percentage: number;
}

const CreditSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const [settings, setSettings] = useState<CreditSettings>({
    peer_booking_enabled: true,
    credit_cost_per_hour: 10,
    minimum_session_duration: 30,
    maximum_session_duration: 120,
    auto_accept_peer_bookings: false,
    credit_discount_percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadCreditSettings();
    }
  }, [userProfile]);

  const loadCreditSettings = async () => {
    try {
      setLoading(true);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('credit_settings')
        .eq('id', userProfile?.id)
        .single();

      if (error) throw error;

      if (userData?.credit_settings) {
        setSettings({
          peer_booking_enabled: userData.credit_settings.peer_booking_enabled ?? true,
          credit_cost_per_hour: userData.credit_settings.credit_cost_per_hour ?? 10,
          minimum_session_duration: userData.credit_settings.minimum_session_duration ?? 30,
          maximum_session_duration: userData.credit_settings.maximum_session_duration ?? 120,
          auto_accept_peer_bookings: userData.credit_settings.auto_accept_peer_bookings ?? false,
          credit_discount_percentage: userData.credit_settings.credit_discount_percentage ?? 0
        });
      }
    } catch (error) {
      console.error('Error loading credit settings:', error);
      toast.error('Failed to load credit settings');
    } finally {
      setLoading(false);
    }
  };

  const saveCreditSettings = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('users')
        .update({ credit_settings: settings })
        .eq('id', userProfile?.id);

      if (error) throw error;

      toast.success('Credit settings saved successfully!');
    } catch (error) {
      console.error('Error saving credit settings:', error);
      toast.error('Failed to save credit settings');
    } finally {
      setSaving(false);
    }
  };

  // Calculate credit cost (1 credit per minute)
  const calculateCreditCost = (duration: number) => {
    // New system: 1 credit per minute (60 credits per hour)
    // Note: credit_cost_per_hour setting is now fixed at 60 for 1 credit/min system
    const baseCost = duration; // 1 credit per minute
    const discountedCost = baseCost * (1 - settings.credit_discount_percentage / 100);
    return Math.max(1, Math.round(discountedCost));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Credit Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading credit settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            Credit Settings
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </div>
          </CardTitle>
          <CardDescription>
            Configure your credit costs for peer treatment bookings. These settings determine how many credits other practitioners need to book sessions with you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Peer Booking Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Peer Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Allow other practitioners to book treatment sessions with you using credits
              </p>
            </div>
            <Switch
              checked={settings.peer_booking_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, peer_booking_enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* Credit Cost Per Hour */}
          <div className="space-y-2">
            <Label htmlFor="credit-cost" className="text-base font-medium">
              Credit Cost Per Hour
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="credit-cost"
                type="number"
                min="1"
                max="100"
                value={settings.credit_cost_per_hour}
                onChange={(e) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    credit_cost_per_hour: parseInt(e.target.value) || 10 
                  }))
                }
                className="w-24"
                disabled={!settings.peer_booking_enabled}
              />
              <span className="text-sm text-muted-foreground">credits per hour</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Base rate for calculating credit costs. Higher rates = more credits required.
            </p>
          </div>

          {/* Session Duration Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-duration" className="text-base font-medium">
                Minimum Session Duration
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="min-duration"
                  type="number"
                  min="15"
                  max="60"
                  value={settings.minimum_session_duration}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      minimum_session_duration: parseInt(e.target.value) || 30 
                    }))
                  }
                  className="w-20"
                  disabled={!settings.peer_booking_enabled}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-duration" className="text-base font-medium">
                Maximum Session Duration
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max-duration"
                  type="number"
                  min="60"
                  max="180"
                  value={settings.maximum_session_duration}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      maximum_session_duration: parseInt(e.target.value) || 120 
                    }))
                  }
                  className="w-20"
                  disabled={!settings.peer_booking_enabled}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          {/* Discount Percentage */}
          <div className="space-y-2">
            <Label htmlFor="discount" className="text-base font-medium">
              Credit Discount
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="discount"
                type="number"
                min="0"
                max="50"
                value={settings.credit_discount_percentage}
                onChange={(e) => 
                  setSettings(prev => ({ 
                    ...prev, 
                    credit_discount_percentage: parseInt(e.target.value) || 0 
                  }))
                }
                className="w-20"
                disabled={!settings.peer_booking_enabled}
              />
              <span className="text-sm text-muted-foreground">% off</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Optional discount to make your sessions more attractive to other practitioners.
            </p>
          </div>

          {/* Auto Accept */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Auto-Accept Bookings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically accept peer booking requests without manual approval
              </p>
            </div>
            <Switch
              checked={settings.auto_accept_peer_bookings}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, auto_accept_peer_bookings: checked }))
              }
              disabled={!settings.peer_booking_enabled}
            />
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Credit Cost Preview</Label>
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold">{calculateCreditCost(30)}</div>
                <div className="text-xs text-muted-foreground">30 min</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{calculateCreditCost(60)}</div>
                <div className="text-xs text-muted-foreground">60 min</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{calculateCreditCost(90)}</div>
                <div className="text-xs text-muted-foreground">90 min</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              These are the credit costs other practitioners will see when booking sessions with you.
            </p>
          </div>

          <Button 
            onClick={saveCreditSettings} 
            disabled={saving || !settings.peer_booking_enabled}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Credit Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            How Credit Pricing Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Dynamic Pricing</p>
              <p className="text-xs text-blue-600">Credits are calculated based on your hourly rate and session duration</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Duration-Based</p>
              <p className="text-xs text-blue-600">Longer sessions cost proportionally more credits</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Real-Time Updates</p>
              <p className="text-xs text-blue-600">Changes take effect immediately for new bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditSettings;
