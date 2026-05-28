import React, { useState } from 'react';
import { Calendar, Download, ExternalLink, Plus, Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarIntegration, CalendarEvent } from '@/lib/calendar-integration';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CalendarIntegrationProps {
  event: CalendarEvent;
  onEventUpdate?: (event: CalendarEvent) => void;
  showExportOptions?: boolean;
  showAddToCalendar?: boolean;
}

export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  event,
  onEventUpdate,
  showExportOptions = true,
  showAddToCalendar = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook' | 'apple' | 'ics'>('google');
  const { generateCalendarLinks, exportToCalendar } = useCalendarIntegration();

  const calendarLinks = generateCalendarLinks(event);

  const handleExportToCalendar = () => {
    try {
      exportToCalendar(event, selectedProvider);
      toast.success(`Event added to ${selectedProvider} calendar`);
      setIsOpen(false);
    } catch (error) {
      console.error('Error exporting to calendar:', error);
      toast.error('Failed to export to calendar');
    }
  };

  const handleDownloadICS = () => {
    try {
      exportToCalendar(event, 'ics');
      toast.success('Calendar file downloaded');
    } catch (error) {
      console.error('Error downloading ICS:', error);
      toast.error('Failed to download calendar file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{event.title}</CardTitle>
            </div>
            <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
              {event.status}
            </Badge>
          </div>
          <CardDescription>
            {format(event.start, 'EEEE, MMMM do, yyyy')} at {format(event.start, 'h:mm a')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {event.location}
            </div>
          )}
          
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
            </div>
          )}
          
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Calendar Integration Actions */}
      <div className="flex flex-wrap gap-2">
        {showAddToCalendar && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add to Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Calendar</DialogTitle>
                <DialogDescription>
                  Choose your calendar provider to add this event
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Calendar Provider</label>
                  <Select value={selectedProvider} onValueChange={(value: any) => setSelectedProvider(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Calendar</SelectItem>
                      <SelectItem value="outlook">Outlook Calendar</SelectItem>
                      <SelectItem value="apple">Apple Calendar</SelectItem>
                      <SelectItem value="ics">Download ICS File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleExportToCalendar} className="flex-1">
                    Add to Calendar
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showExportOptions && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadICS}>
              <Download className="h-4 w-4 mr-2" />
              Download ICS
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(calendarLinks.google, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Google Calendar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(calendarLinks.outlook, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Outlook
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// Calendar Sync Status Component
export const CalendarSyncStatus: React.FC<{
  lastSync?: Date;
  isSyncing: boolean;
  onSync: () => void;
}> = ({ lastSync, isSyncing, onSync }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Calendar Sync</CardTitle>
        <CardDescription>
          Keep your external calendar synchronized with TheraMate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Last Sync</p>
            <p className="text-sm text-muted-foreground">
              {lastSync ? format(lastSync, 'MMM d, yyyy h:mm a') : 'Never'}
            </p>
          </div>
          <Button 
            onClick={onSync} 
            disabled={isSyncing}
            size="sm"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-yellow-500' : 'bg-green-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isSyncing ? 'Syncing...' : 'Connected'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Availability Calendar Component
export const AvailabilityCalendar: React.FC<{
  availability: Array<{ start: Date; end: Date; available: boolean; reason?: string }>;
  onSlotSelect?: (slot: { start: Date; end: Date }) => void;
}> = ({ availability, onSlotSelect }) => {
  const groupedAvailability = availability.reduce((acc, slot) => {
    const date = format(slot.start, 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, typeof availability>);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Available Time Slots</h3>
      <div className="grid gap-4">
        {Object.entries(groupedAvailability).map(([date, slots]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="text-base">
                {format(new Date(date), 'EEEE, MMMM do, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {slots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={slot.available ? 'outline' : 'secondary'}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => slot.available && onSlotSelect?.(slot)}
                    className="text-xs"
                  >
                    {format(slot.start, 'h:mm a')}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
