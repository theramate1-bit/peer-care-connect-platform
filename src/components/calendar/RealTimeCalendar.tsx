import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CalendarService, DayAvailability, TimeSlot } from '@/lib/calendar';
import { useToast } from '@/hooks/use-toast';

interface RealTimeCalendarProps {
  therapistId: string;
  onSlotSelect?: (slot: TimeSlot, date: string) => void;
  className?: string;
}

export const RealTimeCalendar: React.FC<RealTimeCalendarProps> = ({ 
  therapistId, 
  onSlotSelect,
  className 
}) => {
  const { toast } = useToast();
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAvailability();
    setupRealtimeUpdates();
    setupConnectionMonitoring();

    return () => {
      // Cleanup subscriptions
    };
  }, [therapistId, currentWeek]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      
      const startDate = getWeekStart(currentWeek).toISOString().split('T')[0];
      const endDate = getWeekEnd(currentWeek).toISOString().split('T')[0];
      
      const weekAvailability = await CalendarService.getTherapistAvailability(
        therapistId,
        startDate,
        endDate
      );
      
      setAvailability(weekAvailability);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    const cleanup = CalendarService.subscribeToAvailabilityUpdates(
      therapistId,
      (updatedAvailability) => {
        setAvailability(updatedAvailability);
        setLastUpdate(new Date());
        
        toast({
          title: "Calendar Updated",
          description: "Availability has been updated in real-time",
          variant: "default"
        });
      }
    );

    return cleanup;
  };

  const setupConnectionMonitoring = () => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchAvailability();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const getWeekStart = (date: Date): Date => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start;
  };

  const getWeekEnd = (date: Date): Date => {
    const end = new Date(date);
    end.setDate(date.getDate() + (6 - date.getDay()));
    return end;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSlotStatus = (slot: TimeSlot) => {
    if (slot.isBooked) {
      return { status: 'booked', color: 'bg-red-100 text-red-800', icon: XCircle };
    } else if (slot.isAvailable) {
      return { status: 'available', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    } else {
      return { status: 'unavailable', color: 'bg-gray-100 text-gray-800', icon: XCircle };
    }
  };

  const handleSlotClick = (slot: TimeSlot, date: string) => {
    if (!slot.isAvailable) {
      toast({
        title: "Slot Unavailable",
        description: "This time slot is not available for booking",
        variant: "destructive"
      });
      return;
    }

    setSelectedDate(date);
    if (onSlotSelect) {
      onSlotSelect(slot, date);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendar Availability
          </CardTitle>
          <CardDescription>Loading therapist availability...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Calendar Availability
              {!isOnline && (
                <Badge variant="secondary" className="ml-2">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isOnline 
                ? "Real-time availability updates" 
                : "Using cached availability data"
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-[120px] text-center">
              {formatDate(getWeekStart(currentWeek).toISOString().split('T')[0])} - {formatDate(getWeekEnd(currentWeek).toISOString().split('T')[0])}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAvailability}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {availability.map((day) => {
            const slotStatus = getSlotStatus(day.slots[0] || { isAvailable: false, isBooked: false });
            const StatusIcon = slotStatus.icon;
            
            return (
              <div key={day.date} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{formatDate(day.date)}</h3>
                    <Badge className={slotStatus.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {day.availableSlots} available
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    {day.totalSlots} total slots
                  </div>
                </div>
                
                {day.slots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {day.slots.map((slot) => {
                      const slotStatus = getSlotStatus(slot);
                      const StatusIcon = slotStatus.icon;
                      
                      return (
                        <Button
                          key={slot.id}
                          variant="outline"
                          size="sm"
                          className={`h-12 flex flex-col items-center justify-center text-xs ${
                            slot.isAvailable 
                              ? 'hover:bg-green-50 border-green-200' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                          onClick={() => handleSlotClick(slot, day.date)}
                          disabled={!slot.isAvailable}
                        >
                          <StatusIcon className="h-3 w-3 mb-1" />
                          <span>{formatTime(slot.startTime)}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No availability for this day
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {availability.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Availability</h3>
            <p className="text-sm text-muted-foreground">
              No availability found for the selected week.
            </p>
          </div>
        )}
        
        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-600" />
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


