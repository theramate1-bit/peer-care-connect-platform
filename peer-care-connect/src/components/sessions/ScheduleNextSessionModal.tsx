import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Calendar as CalendarIcon2, CheckCircle } from 'lucide-react';
import { format, addDays, addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ScheduleNextSessionModalProps {
  therapistId: string;
  therapistName: string;
  currentSessionType: string;
  isOpen: boolean;
  onClose: () => void;
  onScheduleSuccess?: () => void;
}

const SESSION_TYPES = [
  'Sports Therapy',
  'Massage Therapy',
  'Osteopathy',
  'Deep Tissue Massage',
  'Swedish Massage',
  'Sports Massage',
  'Injury Rehabilitation',
  'Postural Assessment',
  'Stress Relief',
  'Wellness Check'
];

const SUGGESTED_DATES = [
  { label: 'Next Week', days: 7 },
  { label: 'In 2 Weeks', days: 14 },
  { label: 'In 3 Weeks', days: 21 },
  { label: 'In 1 Month', days: 30 }
];

export const ScheduleNextSessionModal: React.FC<ScheduleNextSessionModalProps> = ({
  therapistId,
  therapistName,
  currentSessionType,
  isOpen,
  onClose,
  onScheduleSuccess
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sessionType: currentSessionType,
    date: addDays(new Date(), 7), // Default to next week
    time: '10:00',
    duration: '60',
    focusArea: '',
    notes: ''
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Generate available time slots (9 AM to 6 PM, 30-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  useEffect(() => {
    if (isOpen) {
      setAvailableTimes(generateTimeSlots());
    }
  }, [isOpen]);

  const handleSchedule = async () => {
    if (!formData.sessionType || !formData.date || !formData.time) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Create new session booking
      const { error } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: therapistId,
          session_type: formData.sessionType,
          session_date: formData.date.toISOString().split('T')[0],
          session_time: formData.time,
          duration_minutes: parseInt(formData.duration),
          focus_area: formData.focusArea,
          preparation_notes: formData.notes,
          status: 'scheduled',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Session Scheduled",
        description: `Your next session with ${therapistName} has been scheduled for ${format(formData.date, 'EEEE, MMMM do')} at ${formData.time}`
      });

      onScheduleSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error scheduling next session:', error);
      toast({
        title: "Error",
        description: "Failed to schedule session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSchedule = (days: number) => {
    setFormData(prev => ({
      ...prev,
      date: addDays(new Date(), days)
    }));
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon2 className="h-5 w-5" />
            Schedule Next Session
          </DialogTitle>
          <DialogDescription>
            Book your next session with {therapistName}. We'll send you a confirmation once scheduled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Date Selection */}
          <div className="space-y-3">
            <Label>Quick Schedule</Label>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_DATES.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSchedule(suggestion.days)}
                  className="text-xs"
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label htmlFor="sessionType">Session Type *</Label>
            <Select value={formData.sessionType} onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select session type" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Select value={formData.time} onValueChange={(value) => setFormData(prev => ({ ...prev, time: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Select value={formData.duration} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Focus Area */}
          <div className="space-y-2">
            <Label htmlFor="focusArea">Focus Area</Label>
            <Input
              id="focusArea"
              placeholder="e.g., Lower back pain, Stress relief, Sports injury"
              value={formData.focusArea}
              onChange={(e) => setFormData(prev => ({ ...prev, focusArea: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any specific requests or information for your therapist..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Session Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Session Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>{formData.date ? format(formData.date, 'EEEE, MMMM do, yyyy') : 'Select date'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formData.time} ({formData.duration} minutes)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{formData.sessionType}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={loading || !formData.sessionType || !formData.date || !formData.time}>
              {loading ? (
                <>
                  <CalendarIcon2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarIcon2 className="mr-2 h-4 w-4" />
                  Schedule Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
