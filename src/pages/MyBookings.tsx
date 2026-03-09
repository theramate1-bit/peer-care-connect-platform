import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, User as UserIcon, Star, MessageSquare, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { CalendarIntegration } from "@/components/calendar/CalendarIntegration";
import { CalendarEvent } from "@/lib/calendar-integration";
import { BookingFlow } from "@/components/marketplace/BookingFlow";
import { RebookingService } from "@/lib/rebooking-service";
import { toast } from "sonner";
import { MessagingManager } from "@/lib/messaging";
import { CancellationPolicyService } from "@/lib/cancellation-policy";
import { RefundService } from "@/lib/refund-service";
import { getDisplaySessionStatus, getDisplaySessionStatusLabel } from "@/lib/session-display-status";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RescheduleBooking } from "@/components/booking/RescheduleBooking";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Search, Settings, User } from "lucide-react";

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
  therapist_id?: string;
  client_id?: string;
  provider_id?: string;
  requester_id?: string;
  type?: 'client' | 'therapist';
  has_review?: boolean;
  payment_status?: string | null;
}

const MyBookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [rebookingLoading, setRebookingLoading] = useState<string | null>(null);
  const [showRebookingModal, setShowRebookingModal] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<any>(null);
  const [rebookingPayload, setRebookingPayload] = useState<any>(null);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [refundCalculation, setRefundCalculation] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
  const [practitionerForReschedule, setPractitionerForReschedule] = useState<any>(null);
  const [historyFilter, setHistoryFilter] = useState({
    search: '',
    status: 'all',
    dateRange: 'all'
  });
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, boolean>>({});
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('message_status_tracking')
        .select('conversation_id')
        .eq('recipient_id', user.id)
        .eq('message_status', 'delivered');

      if (error) throw error;

      // Count unread messages per conversation
      const counts: Record<string, number> = {};
      data?.forEach(item => {
        counts[item.conversation_id] = (counts[item.conversation_id] || 0) + 1;
      });

      setUnreadCounts(counts);
    } catch (error) {
      // Silently handle unread counts fetch errors
    }
  };

  const handleMessageClick = async (booking: Booking) => {
    if (!user) return;

    try {
      const otherUserId = booking.type === 'client' ? booking.therapist_id : booking.client_id;
      
      // Create/get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        user.id,
        otherUserId
      );

      // Navigate to messages with conversation pre-selected
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const getUnreadCountForBooking = (booking: Booking): number => {
    if (!user) return 0;
    
    // This is a simplified approach - in a real implementation, you'd need to
    // map booking to conversation ID more precisely
    const otherUserId = booking.type === 'client' ? booking.therapist_id : booking.client_id;
    const conversationKey = `${user.id}-${otherUserId}`;
    
    return unreadCounts[conversationKey] || 0;
  };

  const handleBookAgain = async (booking: Booking) => {
    if (!user) {
      toast.error('Please sign in to rebook');
      return;
    }

    try {
      setRebookingLoading(booking.id);

      // Fetch practitioner details
      const practitionerId = booking.type === 'client' ? booking.therapist_id : booking.client_id;
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('users')
        .select('*')
        .eq('id', practitionerId)
        .single();

      if (practitionerError || !practitionerData) {
        throw new Error('Practitioner not found');
      }

      // Get rebooking data
      const payload = await RebookingService.prepareRebookingPayload(booking.id);

      if (!payload.rebookingData) {
        toast.error('Unable to load booking details. Please try again.');
        return;
      }

      // Check if no slots available
      if (!payload.nextSlot) {
        toast.warning('No available slots found within the next 30 days. Please contact the practitioner directly or try booking manually.');
        return;
      }

      // Fetch products for booking-flow routing (clinic vs mobile)
      const { data: productsData } = await supabase
        .from('practitioner_products')
        .select('id, name, description, price_amount, currency, duration_minutes, service_type, is_active, stripe_price_id')
        .eq('practitioner_id', practitionerId)
        .eq('is_active', true);

      const practitioner = {
        ...practitionerData,
        user_id: practitionerData.id,
        average_rating: 0,
        total_sessions: 0,
        products: productsData ?? []
      };

      setSelectedPractitioner(practitioner);
      setRebookingPayload(payload);
      setShowRebookingModal(true);
    } catch (error) {
      console.error('Error preparing rebooking:', error);
      toast.error('Failed to prepare rebooking. Please try again.');
    } finally {
      setRebookingLoading(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchUnreadCounts();
    }
  }, [user]);

  // Real-time subscription for practitioner bookings
  useRealtimeSubscription(
    'client_sessions',
    `therapist_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time booking update for practitioner:', payload);
      
      if (payload.eventType === 'INSERT') {
        // New booking created - refresh bookings
        fetchBookings();
      } else if (payload.eventType === 'UPDATE') {
        // Booking updated - refresh to show changes
        fetchBookings();
      } else if (payload.eventType === 'DELETE') {
        // Booking deleted - refresh to remove it
        fetchBookings();
      }
    }
  );

  // Also subscribe to bookings where user is the client (for peer bookings)
  useRealtimeSubscription(
    'client_sessions',
    `client_id=eq.${user?.id}`,
    (payload) => {
      console.log('Real-time booking update for client view:', payload);
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        // Refresh bookings when any change occurs
        fetchBookings();
      }
    }
  );

  const fetchPractitioner = async (practitionerId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', practitionerId)
        .single();

      if (error) throw error;

      return {
        ...data,
        user_id: data.id,
        average_rating: 0,
        total_sessions: 0
      };
    } catch (error) {
      console.error('Error fetching practitioner:', error);
      return null;
    }
  };

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
          type: 'client' as const,
          therapist_id: session.therapist_id,
          client_id: session.client_id,
          therapist_name: `${session.users?.first_name || ''} ${session.users?.last_name || ''}`.trim()
        })),
        ...(clientSessionsAsTherapist || []).map(session => ({
          ...session,
          type: 'therapist' as const,
          therapist_id: session.therapist_id,
          client_id: session.client_id,
          client_name: `${session.users?.first_name || ''} ${session.users?.last_name || ''}`.trim()
        }))
      ];

      const now = new Date();
      const upcoming = allSessions.filter(session => {
        const displayStatus = getDisplaySessionStatus(session);
        return new Date(session.session_date) >= now &&
          ['scheduled', 'confirmed', 'pending_payment', 'pending_approval', 'in_progress'].includes(displayStatus);
      });
      const past = allSessions.filter(session => {
        const displayStatus = getDisplaySessionStatus(session);
        return new Date(session.session_date) < now ||
          ['completed', 'cancelled', 'no_show', 'declined', 'expired'].includes(displayStatus);
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);
      
      // Fetch review statuses for completed sessions where user is the client
      if (user && past.length > 0) {
        await fetchReviewStatuses(
          past.filter((b) => getDisplaySessionStatus(b) === 'completed' && b.type === 'client')
        );
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewStatuses = async (completedBookings: Booking[]) => {
    if (!user || completedBookings.length === 0) return;

    try {
      const sessionIds = completedBookings.map(b => b.id);
      
      // Check which sessions have reviews
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('client_id', user.id);

      if (error) throw error;

      // Create a map of session_id -> has_review
      const reviewMap: Record<string, boolean> = {};
      const reviewedSessionIds = new Set(reviews?.map(r => r.session_id) || []);
      
      sessionIds.forEach(sessionId => {
        reviewMap[sessionId] = reviewedSessionIds.has(sessionId);
      });

      setReviewStatuses(reviewMap);
      
      // Count pending reviews (completed sessions without reviews)
      const pendingCount = completedBookings.filter(b => !reviewMap[b.id]).length;
      setPendingReviewCount(pendingCount);
    } catch (error) {
      console.error('Error fetching review statuses:', error);
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
      
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Upcoming</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              {pendingReviewCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs">
                  {pendingReviewCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                (() => {
                  const displayStatus = getDisplaySessionStatus(booking);
                  return (
                <Card key={booking.id} className="transition-[border-color,background-color] duration-200 ease-out">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            {booking.session_type || 'Therapy Session'}
                          </CardTitle>
                          <CardDescription>
                            {booking.client_name || booking.therapist_name || 'Professional Exchange'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={displayStatus === "scheduled" ? "default" : "secondary"}>
                        {getDisplaySessionStatusLabel(booking)}
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
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-4">
                      <div className="text-sm text-muted-foreground">
                        {booking.price && <span>Cost: <span className="font-medium text-primary">£{booking.price}</span></span>}
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMessageClick(booking)}
                          className="relative flex-1 sm:flex-none"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Message</span>
                          {getUnreadCountForBooking(booking) > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0">
                              {getUnreadCountForBooking(booking)}
                            </Badge>
                          )}
                        </Button>
                        <CalendarIntegration
                          event={{
                            id: booking.id,
                            title: `${booking.session_type || 'Therapy Session'} with ${booking.therapist_name || 'Practitioner'}`,
                            start: new Date(`${booking.session_date}T${booking.start_time}`),
                            end: new Date(`${booking.session_date}T${booking.start_time}`),
                            description: booking.notes || `Session duration: ${booking.duration_minutes} minutes`,
                            location: 'Location TBD',
                            status: displayStatus === 'cancelled' ? 'cancelled' : 'scheduled',
                            source: 'internal'
                          }}
                          showExportOptions={false}
                          showAddToCalendar={true}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            // Fetch practitioner data for reschedule
                            const practitionerId = booking.type === 'client' ? booking.therapist_id : booking.client_id;
                            if (!practitionerId) {
                              toast.error('Practitioner information not available');
                              return;
                            }
                            
                            const practitioner = await fetchPractitioner(practitionerId);
                            if (practitioner) {
                              setPractitionerForReschedule(practitioner);
                              setBookingToReschedule(booking);
                              setRescheduleDialogOpen(true);
                            } else {
                              toast.error('Unable to load practitioner information');
                            }
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          Reschedule
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={async () => {
                            // Calculate refund before showing dialog
                            const calculation = await CancellationPolicyService.calculateRefund(booking.id);
                            setRefundCalculation(calculation);
                            setBookingToCancel(booking);
                            setCancellationDialogOpen(true);
                          }}
                          className="flex-1 sm:flex-none"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })()
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
            {/* History Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by practitioner or type..."
                        value={historyFilter.search}
                        onChange={(e) => setHistoryFilter(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={historyFilter.status}
                      onValueChange={(value) => setHistoryFilter(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select
                      value={historyFilter.dateRange}
                      onValueChange={(value) => setHistoryFilter(prev => ({ ...prev, dateRange: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                        <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                        <SelectItem value="last_year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filtered Results */}
            {(() => {
              let filteredBookings = pastBookings;

              // Apply search filter
              if (historyFilter.search) {
                const searchLower = historyFilter.search.toLowerCase();
                filteredBookings = filteredBookings.filter(booking =>
                  booking.therapist_name?.toLowerCase().includes(searchLower) ||
                  booking.client_name?.toLowerCase().includes(searchLower) ||
                  booking.session_type?.toLowerCase().includes(searchLower)
                );
              }

              // Apply status filter
              if (historyFilter.status !== 'all') {
                filteredBookings = filteredBookings.filter(booking =>
                  getDisplaySessionStatus(booking) === historyFilter.status
                );
              }

              // Apply date range filter
              if (historyFilter.dateRange !== 'all') {
                const now = new Date();
                const cutoffDate = new Date();
                
                switch (historyFilter.dateRange) {
                  case 'last_7_days':
                    cutoffDate.setDate(now.getDate() - 7);
                    break;
                  case 'last_30_days':
                    cutoffDate.setDate(now.getDate() - 30);
                    break;
                  case 'last_90_days':
                    cutoffDate.setDate(now.getDate() - 90);
                    break;
                  case 'last_year':
                    cutoffDate.setFullYear(now.getFullYear() - 1);
                    break;
                }
                
                filteredBookings = filteredBookings.filter(booking =>
                  new Date(booking.session_date) >= cutoffDate
                );
              }

              return filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                (() => {
                  const displayStatus = getDisplaySessionStatus(booking);
                  return (
                <Card key={booking.id} className="transition-[border-color,background-color] duration-200 ease-out">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-8 w-8 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            {booking.session_type || 'Therapy Session'}
                          </CardTitle>
                          <CardDescription>
                            {booking.client_name || booking.therapist_name || 'Professional Exchange'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {getDisplaySessionStatusLabel(booking)}
                        </Badge>
                        {displayStatus === 'completed' && booking.type === 'client' && reviewStatuses[booking.id] && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reviewed
                          </Badge>
                        )}
                        {displayStatus === 'completed' && booking.type === 'client' && !reviewStatuses[booking.id] && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                            <Star className="h-3 w-3 mr-1" />
                            Review Pending
                          </Badge>
                        )}
                      </div>
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
                    
                    {displayStatus === 'completed' && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm">Session completed</span>
                      </div>
                    )}
                    
                    {/* Review Status and Button */}
                    {displayStatus === 'completed' && booking.type === 'client' && (
                      <div className="pt-2 border-t">
                        {reviewStatuses[booking.id] ? (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Review submitted</span>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/reviews/submit/${booking.id}`)}
                            className="w-full sm:w-auto"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Leave a Review
                          </Button>
                        )}
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
                          onClick={() => handleBookAgain(booking)}
                          disabled={rebookingLoading === booking.id}
                        >
                          {rebookingLoading === booking.id ? 'Loading...' : 'Book Again'}
                        </Button>
                        {booking.notes && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/practice/clients?session=${booking.id}&tab=treatment-notes`)}
                          >
                            View Notes
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  );
                })()
                ))
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {pastBookings.length > 0 
                      ? 'No bookings match your filters'
                      : 'No past bookings'}
                  </p>
                  {pastBookings.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setHistoryFilter({ search: '', status: 'all', dateRange: 'all' })}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Profile Management
                </CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/profile')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/find-therapists')}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Therapists
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/messages')}
                      className="justify-start"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Messages
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/reviews')}
                      className="justify-start"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      My Reviews
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                      className="justify-start"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Rebooking Modal */}
      {showRebookingModal && selectedPractitioner && (
        <BookingFlow
          open={showRebookingModal}
          onOpenChange={(open) => {
            setShowRebookingModal(open);
            if (!open) {
              setSelectedPractitioner(null);
              setRebookingPayload(null);
            }
          }}
          practitioner={selectedPractitioner}
          initialRebookingData={rebookingPayload}
          onRedirectToMobile={() => {
            setShowRebookingModal(false);
            setSelectedPractitioner(null);
            setRebookingPayload(null);
            navigate(`/client/booking?practitioner=${selectedPractitioner.user_id}&mode=mobile`);
          }}
        />
      )}

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
            <AlertDialogDescription>
              {refundCalculation?.success ? (
                <div className="space-y-3 mt-4">
                  <p>Are you sure you want to cancel this booking?</p>
                  {refundCalculation.refund_type === 'full' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-900">
                        ✓ Full Refund: £{refundCalculation.refund_amount?.toFixed(2)} will be refunded
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        You cancelled {refundCalculation.hours_before_session?.toFixed(1)} hours before the session
                      </p>
                    </div>
                  )}
                  {refundCalculation.refund_type === 'partial' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-yellow-900">
                        ⚠ Partial Refund: £{refundCalculation.refund_amount?.toFixed(2)} ({refundCalculation.refund_percent}%) will be refunded
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You cancelled {refundCalculation.hours_before_session?.toFixed(1)} hours before the session
                      </p>
                    </div>
                  )}
                  {refundCalculation.refund_type === 'none' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-900">
                        ✗ No Refund: Cancellation is too close to the session time
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        You cancelled {refundCalculation.hours_before_session?.toFixed(1)} hours before the session
                      </p>
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        This cancellation will not be refunded per the cancellation policy.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p>Unable to calculate refund. Please contact support if you need assistance.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!bookingToCancel) return;
                
                try {
                  setCancelling(true);
                  
                  // Calculate refund again to ensure accuracy
                  const calculation = await CancellationPolicyService.calculateRefund(bookingToCancel.id);
                  
                  // Determine refund type
                  const refundType = await RefundService.getRefundType(bookingToCancel.id);
                  
                  // Process refund if applicable
                  if (calculation.success && calculation.refund_amount > 0 && refundType) {
                    const refundResult = await RefundService.processRefund(
                      bookingToCancel.id,
                      calculation.refund_amount,
                      refundType,
                      'Cancelled by client'
                    );

                    if (!refundResult.success) {
                      console.warn('Refund processing failed:', refundResult.error);
                      // Continue with cancellation even if refund fails
                      toast.warning(`Cancellation processed, but refund failed: ${refundResult.error}. Please contact support.`);
                    }
                  }
                  
                  // Update session with cancellation details
                  const updateData: any = {
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: user?.id,
                    cancellation_reason: 'Cancelled by client'
                  };

                  // Add refund information if calculation succeeded
                  if (calculation.success) {
                    updateData.refund_amount = calculation.refund_amount;
                    updateData.refund_percentage = calculation.refund_percent;
                    
                    // Update payment status if refund was processed
                    if (calculation.refund_amount > 0 && refundType) {
                      updateData.payment_status = 'refunded';
                    }
                  }

                  const { error } = await supabase
                    .from('client_sessions')
                    .update(updateData)
                    .eq('id', bookingToCancel.id);

                  if (error) throw error;

                  // Send cancellation notification
                  try {
                    await supabase.functions.invoke('send-email', {
                      body: {
                        emailType: 'cancellation',
                        recipientEmail: userProfile?.email,
                        recipientName: `${userProfile?.first_name} ${userProfile?.last_name}`,
                        data: {
                          sessionId: bookingToCancel.id,
                          sessionType: bookingToCancel.session_type,
                          sessionDate: bookingToCancel.session_date,
                          sessionTime: bookingToCancel.start_time,
                          refundAmount: calculation.refund_amount || 0,
                          refundPercent: calculation.refund_percent || 0
                        }
                      }
                    });
                  } catch (notifError) {
                    console.warn('Notification failed (non-critical):', notifError);
                  }

                  // Show success message with refund info if applicable
                  if (calculation.success && calculation.refund_amount > 0) {
                    toast.success(`Booking cancelled successfully. Refund of £${calculation.refund_amount.toFixed(2)} has been processed.`);
                  } else {
                  toast.success('Booking cancelled successfully');
                  }
                  setCancellationDialogOpen(false);
                  setBookingToCancel(null);
                  setRefundCalculation(null);
                  
                  // Refresh bookings
                  fetchBookings();
                } catch (error) {
                  console.error('Error cancelling booking:', error);
                  toast.error('Failed to cancel booking. Please try again or contact support.');
                } finally {
                  setCancelling(false);
                }
              }}
              disabled={cancelling || !refundCalculation?.success}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : refundCalculation?.refund_type === 'none' ? 'Cancel Anyway' : 'Confirm Cancellation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      {bookingToReschedule && practitionerForReschedule && (
        <RescheduleBooking
          booking={{
            id: bookingToReschedule.id,
            session_date: bookingToReschedule.session_date,
            start_time: bookingToReschedule.start_time,
            duration_minutes: bookingToReschedule.duration_minutes,
            session_type: bookingToReschedule.session_type,
            therapist_id: bookingToReschedule.therapist_id || '',
            therapist_name: bookingToReschedule.therapist_name,
            price: bookingToReschedule.price
          }}
          practitioner={practitionerForReschedule}
          open={rescheduleDialogOpen}
          onClose={() => {
            setRescheduleDialogOpen(false);
            setBookingToReschedule(null);
            setPractitionerForReschedule(null);
          }}
          onSuccess={() => {
            fetchBookings();
            setRescheduleDialogOpen(false);
            setBookingToReschedule(null);
            setPractitionerForReschedule(null);
          }}
        />
      )}
    </div>
  );
};

export default MyBookings;


