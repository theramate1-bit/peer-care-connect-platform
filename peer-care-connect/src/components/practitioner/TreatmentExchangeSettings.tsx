import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Star, 
  MapPin, 
  Clock, 
  Shield,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TreatmentExchangeService, TreatmentExchangePreferences } from '@/lib/treatment-exchange';
import { toast } from 'sonner';

const TreatmentExchangeSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<TreatmentExchangePreferences>({
    preferred_specializations: [],
    rating_threshold: 4,
    auto_accept: false,
    max_distance_km: 50,
    preferred_session_types: [],
    availability_preferences: {
      weekdays: true,
      weekends: false,
      morning: true,
      afternoon: true,
      evening: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const specializations = [
    'Sports Injury',
    'Rehabilitation',
    'Deep Tissue',
    'Therapeutic Massage',
    'Pain Management',
    'Postural Correction',
    'Joint Mobilization',
    'Stress Relief',
    'Prenatal Massage',
    'Postnatal Care',
    'Women\'s Health',
    'Chronic Pain',
    'Complex Conditions',
    'Football Injuries',
    'Rugby Injuries',
    'Concussion Management'
  ];

  const sessionTypes = [
    'Sports Massage',
    'Deep Tissue Massage',
    'Swedish Massage',
    'Osteopathy',
    'Physiotherapy',
    'Sports Therapy',
    'Therapeutic Massage',
    'Prenatal Massage',
    'Postnatal Massage'
  ];

  useEffect(() => {
    if (userProfile) {
      loadSettings();
    }
  }, [userProfile]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('treatment_exchange_enabled, treatment_exchange_preferences')
        .eq('id', userProfile?.id)
        .single();

      if (error) throw error;

      setEnabled(userData?.treatment_exchange_enabled || false);
      
      if (userData?.treatment_exchange_preferences) {
        setPreferences(userData.treatment_exchange_preferences);
      }
    } catch (error) {
      console.error('Error loading treatment exchange settings:', error);
      toast.error('Failed to load treatment exchange settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      await TreatmentExchangeService.setTreatmentExchangeEnabled(
        userProfile?.id!,
        enabled,
        preferences
      );

      toast.success('Treatment Exchange settings saved successfully!');
    } catch (error) {
      console.error('Error saving treatment exchange settings:', error);
      toast.error('Failed to save treatment exchange settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSpecializationToggle = (specialization: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_specializations: prev.preferred_specializations.includes(specialization)
        ? prev.preferred_specializations.filter(s => s !== specialization)
        : [...prev.preferred_specializations, specialization]
    }));
  };

  const handleSessionTypeToggle = (sessionType: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_session_types: prev.preferred_session_types.includes(sessionType)
        ? prev.preferred_session_types.filter(s => s !== sessionType)
        : [...prev.preferred_session_types, sessionType]
    }));
  };

  const handleAvailabilityToggle = (key: keyof typeof preferences.availability_preferences) => {
    setPreferences(prev => ({
      ...prev,
      availability_preferences: {
        ...prev.availability_preferences,
        [key]: !prev.availability_preferences[key]
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Treatment Exchange Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Treatment Exchange Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your preferences for exchanging treatments with other practitioners
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="treatment-exchange-enabled" className="text-base font-medium">
                Enable Treatment Exchange
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow other practitioners to request treatment exchanges with you
              </p>
            </div>
            <Switch
              id="treatment-exchange-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Rating Threshold */}
              <div className="space-y-2">
                <Label htmlFor="rating-threshold">Minimum Rating Threshold</Label>
                <Select
                  value={preferences.rating_threshold.toString()}
                  onValueChange={(value) => setPreferences(prev => ({
                    ...prev,
                    rating_threshold: parseInt(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select minimum rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No minimum (All ratings)</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="5">5 stars only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only practitioners with this rating or higher can request exchanges
                </p>
              </div>

              {/* Distance Filter */}
              <div className="space-y-2">
                <Label htmlFor="max-distance">Maximum Distance (km)</Label>
                <Input
                  id="max-distance"
                  type="number"
                  min="1"
                  max="200"
                  value={preferences.max_distance_km}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    max_distance_km: parseInt(e.target.value) || 50
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum distance for treatment exchange partners
                </p>
              </div>

              {/* Preferred Specializations */}
              <div className="space-y-3">
                <Label>Preferred Specializations</Label>
                <div className="grid grid-cols-2 gap-2">
                  {specializations.map(specialization => (
                    <div key={specialization} className="flex items-center space-x-2">
                      <Checkbox
                        id={`spec-${specialization}`}
                        checked={preferences.preferred_specializations.includes(specialization)}
                        onCheckedChange={() => handleSpecializationToggle(specialization)}
                      />
                      <Label htmlFor={`spec-${specialization}`} className="text-sm">
                        {specialization}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select specializations you're interested in exchanging treatments for
                </p>
              </div>

              {/* Preferred Session Types */}
              <div className="space-y-3">
                <Label>Preferred Session Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {sessionTypes.map(sessionType => (
                    <div key={sessionType} className="flex items-center space-x-2">
                      <Checkbox
                        id={`session-${sessionType}`}
                        checked={preferences.preferred_session_types.includes(sessionType)}
                        onCheckedChange={() => handleSessionTypeToggle(sessionType)}
                      />
                      <Label htmlFor={`session-${sessionType}`} className="text-sm">
                        {sessionType}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select session types you're willing to exchange
                </p>
              </div>

              {/* Availability Preferences */}
              <div className="space-y-3">
                <Label>Availability Preferences</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Days</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="weekdays"
                          checked={preferences.availability_preferences.weekdays}
                          onCheckedChange={() => handleAvailabilityToggle('weekdays')}
                        />
                        <Label htmlFor="weekdays" className="text-sm">Weekdays</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="weekends"
                          checked={preferences.availability_preferences.weekends}
                          onCheckedChange={() => handleAvailabilityToggle('weekends')}
                        />
                        <Label htmlFor="weekends" className="text-sm">Weekends</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Times</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="morning"
                          checked={preferences.availability_preferences.morning}
                          onCheckedChange={() => handleAvailabilityToggle('morning')}
                        />
                        <Label htmlFor="morning" className="text-sm">Morning</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="afternoon"
                          checked={preferences.availability_preferences.afternoon}
                          onCheckedChange={() => handleAvailabilityToggle('afternoon')}
                        />
                        <Label htmlFor="afternoon" className="text-sm">Afternoon</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="evening"
                          checked={preferences.availability_preferences.evening}
                          onCheckedChange={() => handleAvailabilityToggle('evening')}
                        />
                        <Label htmlFor="evening" className="text-sm">Evening</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Accept */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-accept" className="text-base font-medium">
                    Auto Accept Requests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically accept exchange requests that match your preferences
                  </p>
                </div>
                <Switch
                  id="auto-accept"
                  checked={preferences.auto_accept}
                  onCheckedChange={(checked) => setPreferences(prev => ({
                    ...prev,
                    auto_accept: checked
                  }))}
                />
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">How Treatment Exchange Works</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Other practitioners can send you exchange requests</li>
                      <li>• You can accept or decline requests based on your preferences</li>
                      <li>• Both practitioners exchange treatments (no money involved)</li>
                      <li>• You earn credits for providing treatments and spend credits for receiving them</li>
                      <li>• All exchanges are tracked and can be rated after completion</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="px-8"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreatmentExchangeSettings;
