import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
}

interface DaySchedule {
  day: string;
  dayNumber: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  slots: AvailabilitySlot[];
}

const DAYS = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 0 }
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30'
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const AvailabilityManager: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [defaultDuration, setDefaultDuration] = useState(60);

  useEffect(() => {
    if (user) {
      initializeSchedule();
      loadExistingAvailability();
    }
  }, [user]);

  const initializeSchedule = () => {
    const initialSchedule = DAYS.map(day => ({
      day: day.name,
      dayNumber: day.value,
      isWorking: false,
      startTime: '09:00',
      endTime: '17:00',
      slots: []
    }));
    setSchedule(initialSchedule);
  };

  const loadExistingAvailability = async () => {
    try {
      const { data: existingSlots, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('therapist_id', user?.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      if (existingSlots && existingSlots.length > 0) {
        const updatedSchedule = schedule.map(day => {
          const daySlots = existingSlots.filter(slot => slot.day_of_week === day.dayNumber);
          return {
            ...day,
            isWorking: daySlots.length > 0,
            startTime: daySlots.length > 0 ? daySlots[0].start_time : '09:00',
            endTime: daySlots.length > 0 ? daySlots[daySlots.length - 1].end_time : '17:00',
            slots: daySlots
          };
        });
        setSchedule(updatedSchedule);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: "Failed to load existing availability",
        variant: "destructive"
      });
    }
  };

  const updateDaySchedule = (dayNumber: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map(day => 
      day.dayNumber === dayNumber ? { ...day, ...updates } : day
    ));
  };

  const generateTimeSlots = (startTime: string, endTime: string, duration: number) => {
    const slots: AvailabilitySlot[] = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      if (slotEnd <= end) {
        slots.push({
          start_time: current.toTimeString().slice(0, 5),
          end_time: slotEnd.toTimeString().slice(0, 5),
          duration_minutes: duration,
          is_available: true
        });
      }
      current = slotEnd;
    }
    
    return slots;
  };

  const handleDayToggle = (dayNumber: number, isWorking: boolean) => {
    updateDaySchedule(dayNumber, { isWorking });
    
    if (isWorking) {
      const day = schedule.find(d => d.dayNumber === dayNumber);
      if (day) {
        const slots = generateTimeSlots(day.startTime, day.endTime, defaultDuration);
        updateDaySchedule(dayNumber, { slots });
      }
    } else {
      updateDaySchedule(dayNumber, { slots: [] });
    }
  };

  const handleTimeChange = (dayNumber: number, field: 'startTime' | 'endTime', value: string) => {
    updateDaySchedule(dayNumber, { [field]: value });
    
    const day = schedule.find(d => d.dayNumber === dayNumber);
    if (day && day.isWorking) {
      const slots = generateTimeSlots(
        field === 'startTime' ? value : day.startTime,
        field === 'endTime' ? value : day.endTime,
        defaultDuration
      );
      updateDaySchedule(dayNumber, { slots });
    }
  };

  const handleDurationChange = (newDuration: number) => {
    setDefaultDuration(newDuration);
    
    // Regenerate slots for all working days
    const updatedSchedule = schedule.map(day => {
      if (day.isWorking) {
        const slots = generateTimeSlots(day.startTime, day.endTime, newDuration);
        return { ...day, slots };
      }
      return day;
    });
    setSchedule(updatedSchedule);
  };

  const toggleSlotAvailability = (dayNumber: number, slotIndex: number) => {
    setSchedule(prev => prev.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedSlots = [...day.slots];
        updatedSlots[slotIndex] = {
          ...updatedSlots[slotIndex],
          is_available: !updatedSlots[slotIndex].is_available
        };
        return { ...day, slots: updatedSlots };
      }
      return day;
    }));
  };

  const saveAvailability = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete existing availability
      await supabase
        .from('availability_slots')
        .delete()
        .eq('therapist_id', user.id);

      // Insert new availability
      const allSlots: Omit<AvailabilitySlot, 'id'>[] = [];
      schedule.forEach(day => {
        if (day.isWorking && day.slots.length > 0) {
          day.slots.forEach(slot => {
            allSlots.push({
              therapist_id: user.id,
              day_of_week: day.dayNumber,
              start_time: slot.start_time,
              end_time: slot.end_time,
              duration_minutes: slot.duration_minutes,
              is_available: slot.is_available
            });
          });
        }
      });

      if (allSlots.length > 0) {
        const { error } = await supabase
          .from('availability_slots')
          .insert(allSlots);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Availability schedule saved successfully",
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: "Failed to save availability schedule",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getWorkingDaysCount = () => schedule.filter(day => day.isWorking).length;
  const getTotalSlots = () => schedule.reduce((total, day) => total + day.slots.length, 0);
  const getAvailableSlots = () => schedule.reduce((total, day) => 
    total + day.slots.filter(slot => slot.is_available).length, 0
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading availability...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Your Availability</h2>
          <p className="text-muted-foreground">
            Set your working hours and available time slots for clients to book
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Default Session Duration</p>
            <Select value={defaultDuration.toString()} onValueChange={(value) => handleDurationChange(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(duration => (
                  <SelectItem key={duration} value={duration.toString()}>
                    {duration} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveAvailability} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{getWorkingDaysCount()}</p>
                <p className="text-sm text-muted-foreground">Working Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{getTotalSlots()}</p>
                <p className="text-sm text-muted-foreground">Total Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{getAvailableSlots()}</p>
                <p className="text-sm text-muted-foreground">Available Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{defaultDuration}</p>
                <p className="text-sm text-muted-foreground">Min Session</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Schedule */}
      <div className="space-y-4">
        {schedule.map((day) => (
          <Card key={day.dayNumber}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.isWorking}
                    onCheckedChange={(checked) => handleDayToggle(day.dayNumber, checked)}
                  />
                  <CardTitle className="text-lg">{day.day}</CardTitle>
                  {day.isWorking && (
                    <Badge variant="secondary" className="ml-2">
                      {day.slots.length} slots
                    </Badge>
                  )}
                </div>
                {day.isWorking && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Start:</Label>
                      <Select value={day.startTime} onValueChange={(value) => handleTimeChange(day.dayNumber, 'startTime', value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">End:</Label>
                      <Select value={day.endTime} onValueChange={(value) => handleTimeChange(day.dayNumber, 'endTime', value)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            {day.isWorking && day.slots.length > 0 && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {day.slots.map((slot, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        slot.is_available
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                      onClick={() => toggleSlotAvailability(day.dayNumber, index)}
                    >
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {slot.start_time} - {slot.end_time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.duration_minutes} min
                        </p>
                        <Badge
                          variant={slot.is_available ? "default" : "secondary"}
                          className="mt-1 text-xs"
                        >
                          {slot.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">How to use:</h4>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Toggle each day on/off to set working days</li>
                <li>• Adjust start and end times for each working day</li>
                <li>• Click on time slots to mark them as available/unavailable</li>
                <li>• Set your preferred session duration (affects slot generation)</li>
                <li>• Save your schedule when you're done</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
