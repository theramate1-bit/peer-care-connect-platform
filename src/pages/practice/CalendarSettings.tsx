import React, { useState, useEffect } from 'react';
import { Calendar, Settings, RefreshCw, ExternalLink, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIntegrationService, CalendarSyncConfig } from '@/lib/calendar-integration';
import { CalendarSyncStatus } from '@/components/calendar/CalendarIntegration';
import { toast } from 'sonner';

const CalendarSettings = () => {
  const { user } = useAuth();
  const [syncConfig, setSyncConfig] = useState<CalendarSyncConfig>({
    provider: 'google',
    enabled: false,
    syncInterval: 30,
    lastSync: undefined
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [workingHours, setWorkingHours] = useState({
    monday: { start: '09:00', end: '17:00', enabled: true },
    tuesday: { start: '09:00', end: '17:00', enabled: true },
    wednesday: { start: '09:00', end: '17:00', enabled: true },
    thursday: { start: '09:00', end: '17:00', enabled: true },
    friday: { start: '09:00', end: '17:00', enabled: true },
    saturday: { start: '10:00', end: '15:00', enabled: false },
    sunday: { start: '10:00', end: '15:00', enabled: false }
  });

  useEffect(() => {
    loadCalendarSettings();
  }, [user]);

  const loadCalendarSettings = async () => {
    if (!user?.id) return;

    try {
      // Load calendar sync configuration
      const { data: configData, error: configError } = await supabase
        .from('calendar_sync_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (configData && !configError) {
        setSyncConfig({
          provider: configData.provider,
          enabled: configData.enabled,
          syncInterval: configData.sync_interval,
          lastSync: configData.last_sync ? new Date(configData.last_sync) : undefined,
          calendarId: configData.calendar_id,
          accessToken: configData.access_token,
          refreshToken: configData.refresh_token
        });
      }

      // Load working hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('practitioner_availability')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (hoursData && !hoursError) {
        setWorkingHours(hoursData.working_hours || workingHours);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast.error('Failed to load calendar settings');
    }
  };

  const saveCalendarSettings = async () => {
    if (!user?.id) return;

    try {
      // Save sync configuration
      const { error: configError } = await supabase
        .from('calendar_sync_configs')
        .upsert({
          user_id: user.id,
          provider: syncConfig.provider,
          enabled: syncConfig.enabled,
          sync_interval: syncConfig.syncInterval,
          last_sync: syncConfig.lastSync?.toISOString(),
          calendar_id: syncConfig.calendarId,
          access_token: syncConfig.accessToken,
          refresh_token: syncConfig.refreshToken
        });

      if (configError) throw configError;

      // Save working hours
      const { error: hoursError } = await supabase
        .from('practitioner_availability')
        .upsert({
          user_id: user.id,
          working_hours: workingHours
        });

      if (hoursError) throw hoursError;

      toast.success('Calendar settings saved successfully');
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast.error('Failed to save calendar settings');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const service = new CalendarIntegrationService(syncConfig);
      await service.syncWithExternalCalendar();
      
      setSyncConfig(prev => ({ ...prev, lastSync: new Date() }));
      toast.success('Calendar synchronized successfully');
    } catch (error) {
      console.error('Error syncing calendar:', error);
      toast.error('Failed to sync calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportCalendar = async () => {
    try {
      // Get practitioner's sessions
      const { data: sessions, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .gte('session_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;

      const events = sessions?.map(session => ({
        id: session.id,
        title: `${session.session_type || 'Session'} with ${session.client_name}`,
        start: new Date(`${session.session_date}T${session.start_time}`),
        end: new Date(`${session.session_date}T${session.start_time}`),
        description: session.notes || '',
        location: 'Location TBD',
        status: session.status === 'cancelled' ? 'cancelled' : 'confirmed' as const,
        source: 'internal' as const
      })) || [];

      const service = new CalendarIntegrationService(syncConfig);
      const icsContent = service.exportEvents(events, 'ics');
      
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'peer-care-connect-calendar.ics';
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Calendar exported successfully');
    } catch (error) {
      console.error('Error exporting calendar:', error);
      toast.error('Failed to export calendar');
    }
  };

  const updateWorkingHours = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar Settings</h1>
          <p className="text-muted-foreground">Manage your calendar integration and availability</p>
        </div>
        <Button onClick={saveCalendarSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="sync" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sync">Calendar Sync</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="export">Export/Import</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                External Calendar Sync
              </CardTitle>
              <CardDescription>
                Connect your external calendar to automatically sync appointments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sync-enabled"
                  checked={syncConfig.enabled}
                  onCheckedChange={(checked) => setSyncConfig(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="sync-enabled">Enable calendar sync</Label>
              </div>

              {syncConfig.enabled && (
                <>
                  <div>
                    <Label htmlFor="provider">Calendar Provider</Label>
                    <Select
                      value={syncConfig.provider}
                      onValueChange={(value: any) => setSyncConfig(prev => ({ ...prev, provider: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google Calendar</SelectItem>
                        <SelectItem value="outlook">Outlook Calendar</SelectItem>
                        <SelectItem value="apple">Apple Calendar</SelectItem>
                        <SelectItem value="ical">iCal/ICS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
                    <Select
                      value={syncConfig.syncInterval.toString()}
                      onValueChange={(value) => setSyncConfig(prev => ({ ...prev, syncInterval: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <CalendarSyncStatus
                    lastSync={syncConfig.lastSync}
                    isSyncing={isSyncing}
                    onSync={handleSync}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Working Hours
              </CardTitle>
              <CardDescription>
                Set your availability for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(workingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-24">
                    <Label className="capitalize">{day}</Label>
                  </div>
                  <Switch
                    checked={hours.enabled}
                    onCheckedChange={(checked) => updateWorkingHours(day, 'enabled', checked)}
                  />
                  {hours.enabled && (
                    <>
                      <Input
                        type="time"
                        value={hours.start}
                        onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={hours.end}
                        onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                        className="w-32"
                      />
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Calendar
              </CardTitle>
              <CardDescription>
                Export your appointments to external calendar applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={exportCalendar} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export as ICS
                </Button>
                <Button variant="outline" disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Calendar
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ICS files can be imported into Google Calendar, Outlook, Apple Calendar, and most other calendar applications.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarSettings;
