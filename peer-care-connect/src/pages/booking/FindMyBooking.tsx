import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Mail, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface FoundSession {
  session_id: string;
  session_date: string;
  start_time: string;
  session_type: string;
  practitioner_name: string;
  status: string;
}

export default function FindMyBooking() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [sessions, setSessions] = useState<FoundSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !selectedDate) {
      toast.error('Please enter your email and select a date');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc('get_guest_sessions_by_email_and_date', {
        p_email: trimmedEmail,
        p_date: selectedDate.toISOString().split('T')[0],
      });
      if (error) throw error;
      setSessions((data as FoundSession[]) || []);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        toast('No bookings found', {
          description: 'Try a different date or check your email address.',
        });
      }
    } catch (err: any) {
      console.error('Find booking error:', err);
      toast.error(err?.message || 'Failed to search. Please try again.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (sessionId: string) => {
    navigate(`/booking/view/${sessionId}?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="container max-w-xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Find my booking
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Didn’t receive your confirmation email? Enter the email you used to book and the date of your session.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Searching...' : 'Find my booking'}
            </Button>
          </form>

          {searched && sessions.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-medium">Your bookings</h3>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <Card key={s.session_id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleViewSession(s.session_id)}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.practitioner_name || 'Practitioner'}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.session_type} • {format(new Date(s.session_date), 'EEE, MMM d')} at {s.start_time}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Have an account? <button type="button" onClick={() => navigate('/login')} className="underline hover:no-underline">Sign in</button> to see all your sessions.
      </p>
    </div>
  );
}
