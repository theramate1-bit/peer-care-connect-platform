import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { TimezoneUtils } from '@/lib/timezone-utils';

interface AvailabilityManagerProps {
  onAvailabilityUpdate?: (availability: any) => void;
}

const AvailabilityManager: React.FC<AvailabilityManagerProps> = ({ onAvailabilityUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '15:00', enabled: false },
    sunday: { start: '10:00', end: '15:00', enabled: false }
  });
  const [timezone, setTimezone] = useState('Europe/London');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [user]);

  const fetchAvailability = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('working_hours, timezone')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setAvailability(data.working_hours || availability);
        setTimezone(data.timezone || 'Europe/London');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    const updated = {
      ...availability,
      [day]: {
        ...availability[day],
        [field]: value
      }
    };
    setAvailability(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Validate availability
      const hasEnabledDay = Object.values(availability).some(day => day.enabled);
      if (!hasEnabledDay) {
        toast.error('Please enable at least one day for your availability');
        return;
      }

      const { error } = await supabase
        .from('practitioner_availability')
        .upsert({
          user_id: user.id,
          working_hours: availability,
          timezone: timezone
        });

      if (error) throw error;

      toast.success('Availability updated successfully');
      setHasChanges(false);
      onAvailabilityUpdate?.(availability);

      // Update therapist profile availability field as well
      await supabase
        .from('users')
        .update({ availability: availability })
        .eq('id', user.id);

    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast.error(error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchAvailability();
    setHasChanges(false);
  };

  const applyQuickTemplate = (template: string) => {
    let newAvailability = { ...availability };

    switch (template) {
      case 'weekdays':
        newAvailability = {
          monday: { start: '09:00', end: '17:00', enabled: true },
          tuesday: { start: '09:00', end: '17:00', enabled: true },
          wednesday: { start: '09:00', end: '17:00', enabled: true },
          thursday: { start: '09:00', end: '17:00', enabled: true },
          friday: { start: '09:00', end: '17:00', enabled: true },
          saturday: { start: '10:00', end: '15:00', enabled: false },
          sunday: { start: '10:00', end: '15:00', enabled: false }
        };
        break;
      case 'extended':
        newAvailability = {
          monday: { start: '08:00', end: '18:00', enabled: true },
          tuesday: { start: '08:00', end: '18:00', enabled: true },
          wednesday: { start: '08:00', end: '18:00', enabled: true },
          thursday: { start: '08:00', end: '18:00', enabled: true },
          friday: { start: '08:00', end: '18:00', enabled: true },
          saturday: { start: '09:00', end: '16:00', enabled: true },
          sunday: { start: '10:00', end: '15:00', enabled: false }
        };
        break;
      case 'weekends':
        newAvailability = {
          monday: { start: '09:00', end: '17:00', enabled: false },
          tuesday: { start: '09:00', end: '17:00', enabled: false },
          wednesday: { start: '09:00', end: '17:00', enabled: false },
          thursday: { start: '09:00', end: '17:00', enabled: false },
          friday: { start: '09:00', end: '17:00', enabled: false },
          saturday: { start: '09:00', end: '17:00', enabled: true },
          sunday: { start: '09:00', end: '17:00', enabled: true }
        };
        break;
      case 'clear':
        newAvailability = {
          monday: { start: '09:00', end: '17:00', enabled: false },
          tuesday: { start: '09:00', end: '17:00', enabled: false },
          wednesday: { start: '09:00', end: '17:00', enabled: false },
          thursday: { start: '09:00', end: '17:00', enabled: false },
          friday: { start: '09:00', end: '17:00', enabled: false },
          saturday: { start: '10:00', end: '15:00', enabled: false },
          sunday: { start: '10:00', end: '15:00', enabled: false }
        };
        break;
    }

    setAvailability(newAvailability);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manage Your Availability
          </CardTitle>
          <CardDescription>
            Set your working hours so clients can book appointments with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={(value) => {
              setTimezone(value);
              setHasChanges(true);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TimezoneUtils.getCommonTimezones().map((tz) => (
                  <SelectItem key={tz.timezone} value={tz.timezone}>
                    {tz.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current time in {timezone}: {TimezoneUtils.getCurrentTimeInTimezone(timezone)}
            </p>
          </div>

          {/* Quick Templates */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Quick Templates</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickTemplate('weekdays')}
              >
                Weekdays Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickTemplate('extended')}
              >
                Extended Hours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickTemplate('weekends')}
              >
                Weekends Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickTemplate('clear')}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Day-by-Day Configuration */}
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-24">
                  <Label className="font-medium">{day.label}</Label>
                </div>
                
                <Switch
                  checked={availability[day.key]?.enabled || false}
                  onCheckedChange={(checked) => updateAvailability(day.key, 'enabled', checked)}
                />
                
                {availability[day.key]?.enabled && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={availability[day.key]?.start || '09:00'}
                        onChange={(e) => updateAvailability(day.key, 'start', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={availability[day.key]?.end || '17:00'}
                        onChange={(e) => updateAvailability(day.key, 'end', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || saving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <span className="text-sm text-muted-foreground">Unsaved changes</span>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Availability Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Availability Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {days.map((day) => (
              <div key={day.key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{day.label}</span>
                <span className="text-sm">
                  {availability[day.key]?.enabled 
                    ? `${availability[day.key].start} - ${availability[day.key].end}`
                    : 'Not available'
                  }
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailabilityManager;
