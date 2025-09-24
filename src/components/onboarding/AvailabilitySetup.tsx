import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TimezoneUtils } from '@/lib/timezone-utils';

interface AvailabilitySetupProps {
  availability: {
    [key: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  timezone?: string;
  onAvailabilityChange: (availability: any) => void;
  onTimezoneChange?: (timezone: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const AvailabilitySetup: React.FC<AvailabilitySetupProps> = ({
  availability,
  timezone = 'Europe/London',
  onAvailabilityChange,
  onTimezoneChange,
  onNext,
  onBack
}) => {
  const [localAvailability, setLocalAvailability] = useState(availability || {
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '15:00', enabled: false },
    sunday: { start: '10:00', end: '15:00', enabled: false }
  });

  const updateAvailability = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    const updated = {
      ...localAvailability,
      [day]: {
        ...localAvailability[day],
        [field]: value
      }
    };
    setLocalAvailability(updated);
    onAvailabilityChange(updated);
  };

  const handleNext = () => {
    // Validate that at least one day is enabled
    const hasEnabledDay = Object.values(localAvailability).some(day => day.enabled);
    if (!hasEnabledDay) {
      alert('Please enable at least one day for your availability');
      return;
    }
    onNext();
  };

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
            Set Your Availability
          </CardTitle>
          <CardDescription>
            Configure your working hours so clients can book appointments with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This is crucial for your practice! Clients will only be able to book during your available hours.
              You can change these settings later in your calendar settings.
            </AlertDescription>
          </Alert>

          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={(value) => onTimezoneChange?.(value)}>
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

          <div className="space-y-4">
            {days.map((day) => (
              <div key={day.key} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-24">
                  <Label className="font-medium">{day.label}</Label>
                </div>
                
                <Switch
                  checked={localAvailability[day.key]?.enabled || false}
                  onCheckedChange={(checked) => updateAvailability(day.key, 'enabled', checked)}
                />
                
                {localAvailability[day.key]?.enabled && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={localAvailability[day.key]?.start || '09:00'}
                        onChange={(e) => updateAvailability(day.key, 'start', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={localAvailability[day.key]?.end || '17:00'}
                        onChange={(e) => updateAvailability(day.key, 'end', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Quick Setup Options</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const weekdays = {
                    monday: { start: '09:00', end: '17:00', enabled: true },
                    tuesday: { start: '09:00', end: '17:00', enabled: true },
                    wednesday: { start: '09:00', end: '17:00', enabled: true },
                    thursday: { start: '09:00', end: '17:00', enabled: true },
                    friday: { start: '09:00', end: '17:00', enabled: true },
                    saturday: { start: '10:00', end: '15:00', enabled: false },
                    sunday: { start: '10:00', end: '15:00', enabled: false }
                  };
                  setLocalAvailability(weekdays);
                  onAvailabilityChange(weekdays);
                }}
              >
                Weekdays Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allDays = {
                    monday: { start: '09:00', end: '17:00', enabled: true },
                    tuesday: { start: '09:00', end: '17:00', enabled: true },
                    wednesday: { start: '09:00', end: '17:00', enabled: true },
                    thursday: { start: '09:00', end: '17:00', enabled: true },
                    friday: { start: '09:00', end: '17:00', enabled: true },
                    saturday: { start: '10:00', end: '15:00', enabled: true },
                    sunday: { start: '10:00', end: '15:00', enabled: true }
                  };
                  setLocalAvailability(allDays);
                  onAvailabilityChange(allDays);
                }}
              >
                All Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const none = {
                    monday: { start: '09:00', end: '17:00', enabled: false },
                    tuesday: { start: '09:00', end: '17:00', enabled: false },
                    wednesday: { start: '09:00', end: '17:00', enabled: false },
                    thursday: { start: '09:00', end: '17:00', enabled: false },
                    friday: { start: '09:00', end: '17:00', enabled: false },
                    saturday: { start: '10:00', end: '15:00', enabled: false },
                    sunday: { start: '10:00', end: '15:00', enabled: false }
                  };
                  setLocalAvailability(none);
                  onAvailabilityChange(none);
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default AvailabilitySetup;
