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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RescheduleModalProps {
  sessionId: string;
  currentDate: string;
  currentTime: string;
  isOpen: boolean;
  onClose: () => void;
  onRescheduleSuccess?: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  sessionId,
  currentDate,
  currentTime,
  isOpen,
  onClose,
  onRescheduleSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(currentDate));
  const [selectedTime, setSelectedTime] = useState(currentTime);
  const [reason, setReason] = useState('');
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

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for rescheduling",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Create reschedule request
      const { error } = await supabase
        .from('reschedule_requests')
        .insert({
          session_id: sessionId,
          requested_date: selectedDate.toISOString().split('T')[0],
          requested_time: selectedTime,
          reason: reason || 'Client requested reschedule',
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update session status to indicate reschedule request
      const { error: sessionError } = await supabase
        .from('client_sessions')
        .update({ 
          status: 'reschedule_requested',
          reschedule_requested_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      toast({
        title: "Reschedule Request Sent",
        description: "Your therapist will be notified and will respond within 24 hours"
      });

      onRescheduleSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating reschedule request:', error);
      toast({
        title: "Error",
        description: "Failed to send reschedule request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reschedule Session
          </DialogTitle>
          <DialogDescription>
            Request a new date and time for your session. Your therapist will be notified and will respond within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Session Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Session</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(new Date(currentDate), 'EEEE, MMMM do, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{currentTime}</span>
              </div>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <Label>Select New Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* New Time Selection */}
          <div className="space-y-2">
            <Label>Select New Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
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

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Reschedule (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Please let your therapist know why you need to reschedule..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={loading || !selectedDate || !selectedTime}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                'Send Reschedule Request'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
