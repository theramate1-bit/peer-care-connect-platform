import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, User, Star, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIntegration } from "@/components/calendar/CalendarIntegration";
import { CalendarEvent } from "@/lib/calendar-integration";
import { toast } from "sonner";

interface Booking {
  id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  status: string;
  price?: number;
  notes?: string;
  client_name?: string;
  therapist_name?: string;
  provider_id?: string;
  requester_id?: string;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      // Fetch client sessions where user is either client or therapist
      const { data: clientSessionsAsClient } = await supabase
        .from('client_sessions')
        .select(`
          *,
          users!client_sessions_therapist_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('client_id', user?.id);

      const { data: clientSessionsAsTherapist } = await supabase
        .from('client_sessions')
        .select(`
          *,
          users!client_sessions_client_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('therapist_id', user?.id);

      const allSessions = [
        ...(clientSessionsAsClient || []).map(session => ({
          ...session,
          type: 'client',
          therapist_name: `${session.users?.first_name || ''} ${session.users?.last_name || ''}`.trim()
        })),
        ...(clientSessionsAsTherapist || []).map(session => ({
          ...session,
          type: 'therapist',
          client_name: `${session.users?.first_name || ''} ${session.users?.last_name || ''}`.trim()
        }))
      ];

      const now = new Date();
      const upcoming = allSessions.filter(session => 
        new Date(session.session_date) >= now && 
        ['scheduled', 'confirmed', 'pending'].includes(session.status)
      );
      const past = allSessions.filter(session => 
        new Date(session.session_date) < now ||
        ['completed', 'cancelled'].includes(session.status)
      );

      setUpcomingBookings(upcoming);
      setPastBookings(past);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="My Bookings"
          description="Manage your upcoming and past massage therapy appointments"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Exchange", href: "/find-therapists" },
            { label: "My Bookings" }
          ]}
          backTo="/dashboard"
        />
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center h-40">
            Loading bookings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="My Bookings"
        description="Manage your upcoming and past massage therapy appointments"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Exchange", href: "/find-therapists" },
          { label: "My Bookings" }
        ]}
        backTo="/dashboard"
      />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Sessions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            {booking.session_type || 'Therapy Session'}
                          </CardTitle>
                          <CardDescription>
                            {booking.client_name || booking.therapist_name || 'Professional Exchange'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={booking.status === "confirmed" || booking.status === "scheduled" ? "default" : "secondary"}>
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(booking.session_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.start_time} ({booking.duration_minutes}min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Location TBD</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {booking.price && <span>Cost: <span className="font-medium text-primary">£{booking.price}</span></span>}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/messages?user=${booking.type === 'client' ? booking.therapist_id : booking.client_id}`)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Message
                        </Button>
                        <CalendarIntegration
                          event={{
                            id: booking.id,
                            title: `${booking.session_type || 'Therapy Session'} with ${booking.therapist_name || 'Practitioner'}`,
                            start: new Date(`${booking.session_date}T${booking.start_time}`),
                            end: new Date(`${booking.session_date}T${booking.start_time}`),
                            description: booking.notes || `Session duration: ${booking.duration_minutes} minutes`,
                            location: 'Location TBD',
                            status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
                            source: 'internal'
                          }}
                          showExportOptions={false}
                          showAddToCalendar={true}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // TODO: Implement reschedule functionality
                            toast.info('Reschedule functionality coming soon!');
                          }}
                        >
                          Reschedule
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('client_sessions')
                                .update({ status: 'cancelled' })
                                .eq('id', booking.id);
                              
                              if (error) throw error;
                              toast.success('Booking cancelled successfully');
                              // Refresh the bookings list
                              window.location.reload();
                            } catch (error) {
                              console.error('Error cancelling booking:', error);
                              toast.error('Failed to cancel booking');
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No upcoming bookings</p>
                <Button className="mt-4" onClick={() => navigate('/find-therapists')}>
                  Find Therapists
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            {booking.session_type || 'Therapy Session'}
                          </CardTitle>
                          <CardDescription>
                            {booking.client_name || booking.therapist_name || 'Professional Exchange'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {booking.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(booking.session_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.start_time} ({booking.duration_minutes}min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Location TBD</span>
                      </div>
                    </div>
                    
                    {booking.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm">Session completed</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {booking.price && <span>Cost: <span className="font-medium">£{booking.price}</span></span>}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/marketplace?practitioner=${booking.type === 'client' ? booking.therapist_id : booking.client_id}`)}
                        >
                          Book Again
                        </Button>
                        {booking.notes && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/sessions/${booking.id}/notes`)}
                          >
                            View Notes
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No past bookings</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyBookings;