import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface BookingEvent {
  id: string;
  date: Date;
  title: string;
  time: string;
  duration: number;
  status: string;
  type: 'client' | 'peer';
  clientName?: string;
  therapistName?: string;
  sessionType?: string;
  location?: string;
  price?: number;
}

interface BookingCalendarProps {
  userType: 'therapist' | 'client';
}

export const BookingCalendar = ({ userType }: BookingCalendarProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, userType]);

  const fetchBookings = async () => {
    try {
      let allBookings: BookingEvent[] = [];

      if (userType === 'therapist') {
        // Fetch client sessions for therapists
        const { data: clientSessions } = await supabase
          .from('client_sessions')
          .select('*')
          .eq('therapist_id', user?.id);

        // Fetch peer sessions where therapist is provider
        const { data: peerSessions } = await supabase
          .from('peer_sessions')
          .select('*')
          .eq('provider_id', user?.id);

        // Process client sessions
        if (clientSessions) {
          const clientBookings: BookingEvent[] = clientSessions.map(session => ({
            id: session.id,
            date: new Date(session.session_date),
            title: session.session_type || 'Client Session',
            time: session.start_time,
            duration: session.duration_minutes,
            status: session.status,
            type: 'client',
            clientName: session.client_name,
            sessionType: session.session_type,
            price: session.price
          }));
          allBookings = [...allBookings, ...clientBookings];
        }

        // Process peer sessions
        if (peerSessions) {
          const peerBookings: BookingEvent[] = peerSessions.map(session => ({
            id: session.id,
            date: new Date(session.session_date),
            title: session.session_type || 'Peer Session',
            time: session.start_time,
            duration: session.duration_minutes,
            status: session.status,
            type: 'peer',
            sessionType: session.session_type
          }));
          allBookings = [...allBookings, ...peerBookings];
        }
      } else {
        // Fetch peer sessions for clients (as requester)
        const { data: peerSessions } = await supabase
          .from('peer_sessions')
          .select('*')
          .eq('requester_id', user?.id);

        if (peerSessions) {
          const clientBookings: BookingEvent[] = peerSessions.map(session => ({
            id: session.id,
            date: new Date(session.session_date),
            title: session.session_type || 'Therapy Session',
            time: session.start_time,
            duration: session.duration_minutes,
            status: session.status,
            type: 'peer',
            sessionType: session.session_type
          }));
          allBookings = clientBookings;
        }
      }

      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      booking.date.toDateString() === date.toDateString()
    );
  };

  const hasBookingsOnDate = (date: Date) => {
    return getBookingsForDate(date).length > 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Booking Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            Loading calendar...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Booking Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{
            hasBookings: (date) => hasBookingsOnDate(date)
          }}
          modifiersClassNames={{
            hasBookings: "bg-primary/20 text-primary font-semibold"
          }}
        />

        {selectedDate && (
          <div className="space-y-3">
            <h4 className="font-medium">
              {selectedDate.toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            
            {selectedDateBookings.length > 0 ? (
              <div className="space-y-2">
                {selectedDateBookings.map((booking) => (
                  <Popover key={booking.id}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full p-3 h-auto justify-start hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <div className="text-left">
                              <p className="font-medium">{booking.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.time} ({booking.duration} mins)
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(booking.status))}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold">{booking.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {booking.sessionType}
                          </p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{booking.time} - {booking.duration} minutes</span>
                          </div>
                          
                          {booking.clientName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Client: {booking.clientName}</span>
                            </div>
                          )}
                          
                          {booking.therapistName && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Therapist: {booking.therapistName}</span>
                            </div>
                          )}
                          
                          {booking.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{booking.location}</span>
                            </div>
                          )}
                          
                          {booking.price && (
                            <div className="text-primary font-medium">
                              £{booking.price}
                            </div>
                          )}
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className={cn("w-fit", getStatusColor(booking.status))}
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bookings scheduled for this date
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};