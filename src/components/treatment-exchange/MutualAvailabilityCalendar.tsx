import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { MutualAvailabilityService, MutualAvailabilitySlot } from '@/lib/mutual-availability';
import { EligiblePractitioner } from '@/lib/treatment-exchange';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface MutualAvailabilityCalendarProps {
  practitionerA: EligiblePractitioner;
  practitionerB: EligiblePractitioner;
  onSlotSelect?: (slot: MutualAvailabilitySlot) => void;
  selectedSlot?: MutualAvailabilitySlot | null;
}

const MutualAvailabilityCalendar: React.FC<MutualAvailabilityCalendarProps> = ({
  practitionerA,
  practitionerB,
  onSlotSelect,
  selectedSlot
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [mutualSlots, setMutualSlots] = useState<MutualAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadMutualAvailability();
  }, [currentWeek, slotDuration, practitionerA.id, practitionerB.id]);

  const loadMutualAvailability = async () => {
    try {
      setLoading(true);
      
      const startDate = viewMode === 'week' 
        ? startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday start
        : new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1);
        
      const endDate = viewMode === 'week'
        ? endOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday end
        : new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0);

      const slots = await MutualAvailabilityService.getMutualAvailability(
        practitionerA.id,
        practitionerB.id,
        startDate,
        endDate,
        slotDuration
      );

      setMutualSlots(slots);
    } catch (error) {
      console.error('Error loading mutual availability:', error);
      toast.error('Failed to load availability calendar');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    if (direction === 'prev') {
      newWeek.setDate(newWeek.getDate() - 7);
    } else {
      newWeek.setDate(newWeek.getDate() + 7);
    }
    setCurrentWeek(newWeek);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentWeek);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentWeek(newMonth);
  };

  const getSlotsForDate = (date: Date): MutualAvailabilitySlot[] => {
    const dateString = date.toISOString().split('T')[0];
    return mutualSlots.filter(slot => slot.date === dateString);
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getMonthDays = () => {
    const year = currentWeek.getFullYear();
    const month = currentWeek.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
    const endDate = endOfWeek(lastDay, { weekStartsOn: 1 });
    
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const getAvailabilityColor = (slots: MutualAvailabilitySlot[]) => {
    if (slots.length === 0) return 'bg-muted';
    const availableCount = slots.filter(slot => slot.mutual_availability).length;
    if (availableCount === 0) return 'bg-destructive/10';
    if (availableCount < slots.length / 2) return 'bg-secondary';
    return 'bg-primary/10';
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const daySlots = getSlotsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div key={index} className="min-h-[120px]">
              <div className={`text-center p-2 rounded-t-lg ${isToday ? 'bg-accent/20 font-semibold' : 'bg-muted'}`}>
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
              <div className={`p-2 rounded-b-lg min-h-[80px] ${getAvailabilityColor(daySlots)}`}>
                {daySlots.length > 0 ? (
                  <div className="space-y-1">
                    {daySlots.slice(0, 3).map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className={`text-xs p-1 rounded cursor-pointer transition-colors ${
                          slot.mutual_availability
                            ? 'bg-primary/20 hover:bg-primary/30 text-primary-foreground'
                            : 'bg-destructive/20 hover:bg-destructive/30 text-destructive-foreground'
                        } ${
                          selectedSlot && 
                          selectedSlot.date === slot.date && 
                          selectedSlot.start_time === slot.start_time
                            ? 'ring-2 ring-accent'
                            : ''
                        }`}
                        onClick={() => slot.mutual_availability && onSlotSelect?.(slot)}
                      >
                        <div className="flex items-center gap-1">
                          {slot.mutual_availability ? (
                            <CheckCircle className="h-3 w-3 text-primary" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )}
                          <span>{slot.start_time}</span>
                        </div>
                      </div>
                    ))}
                    {daySlots.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{daySlots.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    No slots
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getMonthDays();
    const monthStart = new Date(currentWeek.getFullYear(), currentWeek.getMonth(), 1);
    const monthEnd = new Date(currentWeek.getFullYear(), currentWeek.getMonth() + 1, 0);
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-sm font-medium p-2 bg-muted">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {monthDays.map((day, index) => {
          const daySlots = getSlotsForDate(day);
          const isCurrentMonth = day.getMonth() === currentWeek.getMonth();
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={index}
              className={`min-h-[60px] p-1 border ${
                isCurrentMonth ? 'bg-card' : 'bg-muted'
              } ${isToday ? 'ring-2 ring-accent' : ''}`}
            >
              <div className={`text-sm ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </div>
              {daySlots.length > 0 && (
                <div className="mt-1">
                  <div className={`w-2 h-2 rounded-full mx-auto ${
                    daySlots.some(slot => slot.mutual_availability) ? 'bg-primary' : 'bg-destructive'
                  }`} />
                  <div className="text-xs text-center mt-1">
                    {daySlots.filter(slot => slot.mutual_availability).length}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mutual Availability
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={slotDuration.toString()} onValueChange={(value) => setSlotDuration(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30min</SelectItem>
                <SelectItem value="60">1hr</SelectItem>
                <SelectItem value="90">1.5hr</SelectItem>
                <SelectItem value="120">2hr</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {viewMode === 'week' 
                ? format(currentWeek, 'MMM d, yyyy')
                : format(currentWeek, 'MMMM yyyy')
              }
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-primary" />
              Available
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              Unavailable
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading availability...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Practitioner Info */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="font-medium">{practitionerA.first_name} {practitionerA.last_name}</span>
                </div>
                <div className="text-muted-foreground">↔</div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">{practitionerB.first_name} {practitionerB.last_name}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {mutualSlots.filter(slot => slot.mutual_availability).length} mutual slots available
              </div>
            </div>

            {/* Calendar View */}
            {viewMode === 'week' ? renderWeekView() : renderMonthView()}

            {/* Selected Slot Info */}
            {selectedSlot && (
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <span className="font-medium text-accent">Selected Slot</span>
                </div>
                <div className="text-sm text-foreground">
                  <div><strong>Date:</strong> {format(new Date(selectedSlot.date), 'EEEE, MMMM d, yyyy')}</div>
                  <div><strong>Time:</strong> {selectedSlot.start_time} - {selectedSlot.end_time}</div>
                  <div><strong>Duration:</strong> {selectedSlot.duration_minutes} minutes</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MutualAvailabilityCalendar;
