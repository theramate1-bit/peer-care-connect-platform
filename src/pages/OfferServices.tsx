import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, MapPin, DollarSign, Users, Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const OfferServices = () => {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [services, setServices] = useState([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchServiceData();
    }
  }, [user]);

  const fetchServiceData = async () => {
    try {
      // Fetch recent client sessions where user is therapist (as a proxy for peer sessions)
      const { data: clientSessions } = await supabase
        .from('client_sessions')
        .select(`
          *,
          users!client_sessions_client_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('therapist_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (clientSessions && clientSessions.length > 0) {
        setRecentBookings(clientSessions.map(session => ({
          id: session.id,
          clientName: `${session.users?.first_name || 'Client'} ${session.users?.last_name || ''}`,
          service: session.session_type || 'Therapy Session',
          date: session.session_date,
          time: session.start_time,
          status: session.status
        })));
      } else {
        // Show empty state
        setRecentBookings([]);
      }

      // Fetch user's services from their profile or create default ones
      const { data: userProfile } = await supabase
        .from('users')
        .select('specializations, hourly_rate, user_role')
        .eq('id', user?.id)
        .single();

      if (userProfile?.specializations && userProfile.specializations.length > 0) {
        // Create services based on user's specializations
        const userServices = userProfile.specializations.map((spec, index) => ({
          id: index + 1,
          name: spec,
          duration: 60,
          credits: Math.round(userProfile.hourly_rate || 50),
          active: true
        }));
        setServices(userServices);
      } else {
        // Set default services based on user role
        const defaultServices = userProfile?.user_role === 'massage_therapist' ? [
          { id: 1, name: "Deep Tissue Massage", duration: 60, credits: 10, active: true },
          { id: 2, name: "Relaxation Massage", duration: 60, credits: 10, active: true }
        ] : userProfile?.user_role === 'sports_therapist' ? [
          { id: 1, name: "Sports Recovery Session", duration: 90, credits: 15, active: true },
          { id: 2, name: "Injury Assessment", duration: 60, credits: 10, active: true }
        ] : [
          { id: 1, name: "Osteopathic Treatment", duration: 60, credits: 10, active: true },
          { id: 2, name: "Postural Assessment", duration: 45, credits: 8, active: true }
        ];
        setServices(defaultServices);
      }
    } catch (error) {
      console.error('Error fetching service data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Offer Your Services"
        description="Share your expertise with fellow therapists and earn credits for your practice"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Offer Services" }
        ]}
        backTo="/dashboard"
      />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">Loading service data...</div>
        ) : (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Availability Status */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Availability Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="availability">Currently Available</Label>
                <Switch
                  id="availability"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quick Status Update</Label>
                <Textarea
                  placeholder="Let other therapists know your current availability..."
                  className="min-h-[80px]"
                />
              </div>
              
              <Button 
                className="w-full"
                onClick={() => {
                  // TODO: Implement update status functionality
                  toast.info('Update status functionality coming soon!');
                }}
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Service Configuration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Services
              </CardTitle>
              <CardDescription>
                Configure the services you offer to other therapists
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {services.map((service) => (
                <div key={service.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} minutes • {service.credits} credits
                      </p>
                    </div>
                    <Switch checked={service.active} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input type="number" value={service.duration} />
                    </div>
                    <div className="space-y-2">
                      <Label>Credit Cost</Label>
                      <Input type="number" value={service.credits} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Sessions/Day</Label>
                      <Input type="number" defaultValue="4" />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                + Add New Service
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Management
            </CardTitle>
            <CardDescription>
              Set your availability for offering services to other therapists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="9:00 AM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8am">8:00 AM</SelectItem>
                    <SelectItem value="9am">9:00 AM</SelectItem>
                    <SelectItem value="10am">10:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="6:00 PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4pm">4:00 PM</SelectItem>
                    <SelectItem value="5pm">5:00 PM</SelectItem>
                    <SelectItem value="6pm">6:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Location</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="My Practice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="practice">My Practice</SelectItem>
                    <SelectItem value="mobile">Mobile Service</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Travel Radius</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="10 miles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline"
                onClick={() => {
                  // TODO: Implement save as template functionality
                  toast.info('Save as template functionality coming soon!');
                }}
              >
                Save as Template
              </Button>
              <Button
                onClick={() => {
                  // TODO: Implement update schedule functionality
                  toast.info('Update schedule functionality coming soon!');
                }}
              >
                Update Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">{booking.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.service} • {booking.date} at {booking.time}
                      </p>
                    </div>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                      {booking.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No recent bookings</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your service bookings will appear here
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </div>
  );
};

export default OfferServices;