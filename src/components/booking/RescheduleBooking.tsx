import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, RefreshCw, AlertCircle, CheckCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { RescheduleService } from '@/lib/reschedule-service';
import { MessagingManager } from '@/lib/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RescheduleBookingProps {
  booking: {
    id: string;
    session_date: string;
    start_time: string;
    duration_minutes: number;
    session_type: string;
    therapist_id: string;
    therapist_name?: string;
    price?: number;
  };
  practitioner: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleBooking: React.FC<RescheduleBookingProps> = ({
  booking,
  practitioner,
  open,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(booking.session_date));
  const [selectedTime, setSelectedTime] = useState(booking.start_time);
  const [reason, setReason] = useState('');
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [eligibilityCheck, setEligibilityCheck] = useState<{ canReschedule: boolean; reason?: string } | null>(null);

  useEffect(() => {
    if (open) {
      RescheduleService.canReschedule(booking.id).then(result => {
        setEligibilityCheck(result);
      });
    }
  }, [open, booking.id]);

  useEffect(() => {
    if (!open || !selectedDate || !eligibilityCheck?.canReschedule) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    setLoadingSlots(true);
    RescheduleService.getAvailableTimesForDate(
      booking.therapist_id,
      dateStr,
      booking.duration_minutes || 60,
      booking.id
    ).then((slots) => {
      setAvailableTimes(slots);
      setSelectedTime((prev) => (slots.length && slots.includes(prev) ? prev : slots[0] || ''));
    }).finally(() => setLoadingSlots(false));
  }, [open, selectedDate, eligibilityCheck?.canReschedule, booking.therapist_id, booking.duration_minutes, booking.id]);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    try {
      setLoading(true);

      const result = await RescheduleService.rescheduleSession({
        sessionId: booking.id,
        newDate: selectedDate.toISOString().split('T')[0],
        newTime: selectedTime,
        reason: reason || undefined
      });

      if (result.success) {
        toast.success('Session rescheduled successfully!');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to reschedule session');
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule session');
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleMessagePractitioner = async () => {
    if (!user || !booking.therapist_id) {
      toast.error('Please sign in to message your practitioner');
      onClose();
      return;
    }
    try {
      const conversationId = await MessagingManager.getOrCreateConversation(user.id, booking.therapist_id);
      navigate(`/messages?conversation=${conversationId}`);
      onClose();
      toast.success('Opening conversation with practitioner');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to open conversation');
    }
  };

  const is24HourBlock = eligibilityCheck?.reason?.includes('24 hours');

  if (!eligibilityCheck?.canReschedule) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Cannot Reschedule
            </DialogTitle>
            <DialogDescription>
              {eligibilityCheck?.reason || 'This session cannot be rescheduled'}
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {eligibilityCheck?.reason || 'Please contact your practitioner directly to discuss rescheduling options.'}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end gap-2">
            {is24HourBlock && user && (
              <Button variant="outline" onClick={handleMessagePractitioner}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Message Practitioner
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reschedule Session
          </DialogTitle>
          <DialogDescription>
            Select a new date and time for your session. Your practitioner will be notified automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Session Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Session</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>{format(new Date(booking.session_date), 'EEEE, MMMM do, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{booking.start_time} ({booking.duration_minutes} min)</span>
              </div>
            </div>
          </div>

          {/* New Date Selection */}
          <div className="space-y-2">
            <Label>Select New Date *</Label>
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
            <Label>Select New Time *</Label>
            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={loadingSlots || availableTimes.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingSlots ? 'Loading times...' : availableTimes.length === 0 ? 'No times available' : 'Select time'
                  }
                />
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
              placeholder="Please let your practitioner know why you need to reschedule..."
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
                  Rescheduling...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Reschedule
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

