import React, { useState, useEffect, useCallback, memo } from 'react';
import { Clock, CheckCircle2, Loader2, Copy, MoreVertical, ChevronDown, ChevronUp, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hasValidAvailability } from '@/lib/profile-completion';
import { cn } from '@/lib/utils';
import { BlockTimeManager } from './BlockTimeManager';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface AvailabilitySettingsProps {
  embedded?: boolean;
  className?: string;
}

const DAYS = [
  { key: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' }
] as const;

type DayKey = typeof DAYS[number]['key'];

interface DaySettings {
  start: string;
  end: string;
  enabled: boolean;
}

interface AvailabilityState {
  monday: DaySettings;
  tuesday: DaySettings;
  wednesday: DaySettings;
  thursday: DaySettings;
  friday: DaySettings;
  saturday: DaySettings;
  sunday: DaySettings;
}

const DEFAULT_AVAILABILITY: AvailabilityState = {
  monday: { start: '09:00', end: '17:00', enabled: true },
  tuesday: { start: '09:00', end: '17:00', enabled: true },
  wednesday: { start: '09:00', end: '17:00', enabled: true },
  thursday: { start: '09:00', end: '17:00', enabled: true },
  friday: { start: '09:00', end: '17:00', enabled: true },
  saturday: { start: '10:00', end: '15:00', enabled: false },
  sunday: { start: '10:00', end: '15:00', enabled: false }
};

const QUICK_PRESETS = [
  { label: '9 AM - 5 PM', start: '09:00', end: '17:00' },
  { label: '8 AM - 6 PM', start: '08:00', end: '18:00' },
  { label: '10 AM - 6 PM', start: '10:00', end: '18:00' },
  { label: '9 AM - 1 PM', start: '09:00', end: '13:00' },
  { label: '2 PM - 6 PM', start: '14:00', end: '18:00' },
];

/** Memoized time range per day so changing one day doesn't re-render all others (smooth 60fps). */
const DayTimeRange = memo(function DayTimeRange({
  dayKey,
  startTime,
  endTime,
  disabled,
  onTimeChange,
}: {
  dayKey: DayKey;
  startTime: string;
  endTime: string;
  disabled: boolean;
  onTimeChange: (dayKey: DayKey, start: string, end: string) => void;
}) {
  const onChange = useCallback(
    (start: string, end: string) => onTimeChange(dayKey, start, end),
    [dayKey, onTimeChange]
  );
  return (
    <TimeRangePicker
      startTime={startTime}
      endTime={endTime}
      onChange={onChange}
      disabled={disabled}
      intervalMinutes={15}
    />
  );
});

export const AvailabilitySettings: React.FC<AvailabilitySettingsProps> = ({
  embedded = false,
  className
}) => {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<AvailabilityState>(DEFAULT_AVAILABILITY);
  const [originalAvailability, setOriginalAvailability] = useState<AvailabilityState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<DayKey>>(new Set());
  
  // Practitioner preferences state
  const [preferences, setPreferences] = useState({
    default_session_time: '10:00',
    default_duration_minutes: 60,
    default_session_type: 'Treatment Session'
  });

  const hasChanges = originalAvailability !== null && originalAvailability !== undefined
    ? JSON.stringify(availability) !== JSON.stringify(originalAvailability)
    : true;

  // Real-time subscription for availability and preferences
  useRealtimeSubscription(
    'practitioner_availability',
    `user_id=eq.${user?.id}`,
    async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await fetchAvailability();
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user]);

  const fetchAvailability = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('practitioner_availability')
        .select('working_hours, default_session_time, default_duration_minutes, default_session_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching availability:', error);
        return;
      }

      if (data?.working_hours) {
        const merged = { ...DEFAULT_AVAILABILITY, ...data.working_hours };
        setAvailability(merged);
        setOriginalAvailability(merged);
      } else {
        setOriginalAvailability(null);
      }

      // Load preferences
      if (data) {
        setPreferences({
          default_session_time: data.default_session_time || '10:00',
          default_duration_minutes: data.default_duration_minutes || 60,
          default_session_type: data.default_session_type || 'Treatment Session'
        });
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (day: DayKey, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[0], days?: DayKey[]) => {
    const targetDays = days || (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as DayKey[]);
    setAvailability(prev => {
      const updated = { ...prev };
      targetDays.forEach(day => {
        updated[day] = {
          ...prev[day],
          start: preset.start,
          end: preset.end,
          enabled: true
        };
      });
      return updated;
    });
  };

  const copyToWeekdays = (sourceDay: DayKey) => {
    const source = availability[sourceDay];
    if (!source.enabled) return;
    
    const weekdays: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    setAvailability(prev => {
      const updated = { ...prev };
      weekdays.forEach(day => {
        updated[day] = {
          ...prev[day],
          start: source.start,
          end: source.end,
          enabled: true
        };
      });
      return updated;
    });
    toast.success('Hours copied to all weekdays');
  };

  const handleDayTimeChange = useCallback((dayKey: DayKey, start: string, end: string) => {
    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        start,
        end
      }
    }));
  }, []);

  const toggleDayExpanded = (day: DayKey) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save availability');
      return;
    }

    const shouldSave = originalAvailability === null || hasChanges;
    if (!shouldSave) {
      toast.info('No changes to save');
      return;
    }

    try {
      setSaving(true);

      // Validate availability before saving
      if (!hasValidAvailability(availability)) {
        toast.error('Please enable at least one day with valid working hours');
        setSaving(false);
        return;
      }

      const { data: existing, error: fetchError } = await supabase
        .from('practitioner_availability')
        .select('timezone, default_session_time, default_duration_minutes, default_session_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing availability:', fetchError);
        throw new Error(`Failed to fetch existing data: ${fetchError.message || 'Unknown error'}`);
      }

      const { error: upsertError } = await supabase
        .from('practitioner_availability')
        .upsert({
          user_id: user.id,
          working_hours: availability,
          timezone: existing?.timezone || 'Europe/London',
          default_session_time: preferences.default_session_time,
          default_duration_minutes: preferences.default_duration_minutes,
          default_session_type: preferences.default_session_type,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error upserting availability:', {
          error: upsertError,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
        throw new Error(upsertError.message || upsertError.details || 'Failed to save availability');
      }

      setOriginalAvailability(availability);
      setSaved(true);
      toast.success('Availability saved successfully');

      window.dispatchEvent(new CustomEvent('availabilityUpdated', {
        detail: { working_hours: availability }
      }));

      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error('Error saving availability:', {
        error,
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      const errorMessage = error?.message || error?.details || 'Failed to save availability. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading availability...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekdays = DAYS.filter(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d.key));
  const weekends = DAYS.filter(d => ['saturday', 'sunday'].includes(d.key));

  return (
    <div className={cn("space-y-4", className)}>
      {!embedded && (
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Availability</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Working Hours</strong> (first tab): your recurring weekly availability for bookings. <strong>Blocked Time</strong> (second tab): one-off blocks (e.g. lunch, appointments) that are removed from bookable slots.
          </p>
        </div>
      )}

      <Tabs defaultValue="working-hours" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 bg-muted/50">
          <TabsTrigger value="working-hours" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Working Hours</span>
            <span className="sm:hidden">Hours</span>
          </TabsTrigger>
          <TabsTrigger value="blocked-time" className="gap-2">
            <Ban className="h-4 w-4" />
            <span className="hidden sm:inline">Blocked Time</span>
            <span className="sm:hidden">Blocks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="working-hours" className="space-y-4 mt-4">
          <Card className="border-2">
            <CardHeader className="pb-3 pt-4 bg-muted/30 rounded-t-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 dark:bg-primary/20 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                <div>
                    <CardTitle className="text-lg font-semibold">Working Hours</CardTitle>
                    <CardDescription className="mt-1.5 text-sm">
                      Recurring weekly schedule. Clients can only book within these hours; blocked time is excluded automatically.
                  </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="gap-2 shadow-sm">
                      <Copy className="h-3.5 w-3.5" />
                      Quick Presets
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Apply to Weekdays
                    </div>
                    {QUICK_PRESETS.map((preset) => (
                      <DropdownMenuItem
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className="cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        {preset.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 py-3">
              {/* Weekdays Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                    Weekdays
                  </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                <div className="space-y-2">
                  {weekdays.map((day) => {
                    const daySettings = availability[day.key];
                    const isEnabled = daySettings.enabled;
                    const isExpanded = expandedDays.has(day.key);

                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "group relative rounded-lg border transition-[border-color,background-color] duration-200 ease-out",
                          isEnabled 
                            ? "bg-background border-primary/20 hover:border-primary/40" 
                            : "bg-muted/30 border-border/50"
                        )}
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Day Label & Toggle */}
                          <div className="flex items-center gap-3 min-w-[100px]">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => updateDay(day.key, 'enabled', checked)}
                              className="flex-shrink-0"
                            />
                            <label 
                              className="text-sm font-medium cursor-pointer flex-1"
                              onClick={() => updateDay(day.key, 'enabled', !isEnabled)}
                            >
                              {day.fullLabel}
                            </label>
                          </div>

                          {/* Time Display/Input */}
                          {isEnabled ? (
                            <div className="flex items-center gap-3 flex-1">
                              <DayTimeRange
                                dayKey={day.key}
                                startTime={daySettings.start}
                                endTime={daySettings.end}
                                disabled={saving}
                                onTimeChange={handleDayTimeChange}
                              />
                            </div>
                          ) : (
                            <div className="flex-1 text-sm text-muted-foreground">
                              Not available
                            </div>
                          )}

                          {/* Actions */}
                          {isEnabled && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => copyToWeekdays(day.key)}
                                    className="cursor-pointer"
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy to all weekdays
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {QUICK_PRESETS.map((preset) => (
                                    <DropdownMenuItem
                                      key={preset.label}
                                      onClick={() => applyPreset(preset, [day.key])}
                                      className="cursor-pointer"
                                    >
                                      {preset.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekends Section */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Weekends
                </h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                <div className="space-y-2">
                  {weekends.map((day) => {
                    const daySettings = availability[day.key];
                    const isEnabled = daySettings.enabled;

                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "group relative rounded-lg border transition-[border-color,background-color] duration-200 ease-out",
                          isEnabled 
                            ? "bg-background border-primary/20 hover:border-primary/40" 
                            : "bg-muted/30 border-border/50"
                        )}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <div className="flex items-center gap-3 min-w-[100px]">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => updateDay(day.key, 'enabled', checked)}
                              className="flex-shrink-0"
                            />
                            <label 
                              className="text-sm font-medium cursor-pointer flex-1"
                              onClick={() => updateDay(day.key, 'enabled', !isEnabled)}
                            >
                              {day.fullLabel}
                            </label>
                          </div>

                          {isEnabled ? (
                            <div className="flex items-center gap-3 flex-1">
                              <DayTimeRange
                                dayKey={day.key}
                                startTime={daySettings.start}
                                endTime={daySettings.end}
                                disabled={saving}
                                onTimeChange={handleDayTimeChange}
                              />
                            </div>
                          ) : (
                            <div className="flex-1 text-sm text-muted-foreground">
                              Not available
                            </div>
                          )}

                          {isEnabled && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {QUICK_PRESETS.map((preset) => (
                                    <DropdownMenuItem
                                      key={preset.label}
                                      onClick={() => applyPreset(preset, [day.key])}
                                      className="cursor-pointer"
                                    >
                                      {preset.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Save Button */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {hasChanges && (
                    <>
                      <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>You have unsaved changes</span>
                    </>
                  )}
                  {!hasChanges && originalAvailability && (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span>All changes saved</span>
                    </>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked-time">
          <BlockTimeManager embedded={embedded} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
