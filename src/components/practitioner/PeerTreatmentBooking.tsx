import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Coins, 
  Users, 
  Search, 
  Filter,
  Activity,
  Heart,
  Bone,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditManager } from '@/lib/credits';
import { toast } from 'sonner';

interface Practitioner {
  id: string;
  first_name: string;
  last_name: string;
  user_role: string;
  bio?: string;
  location?: string;
  hourly_rate?: number;
  experience_years?: number;
  specializations?: string[];
  is_active: boolean;
  is_verified?: boolean;
}

interface PeerBooking {
  id: string;
  practitioner_id: string;
  client_practitioner_id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  credit_cost: number;
  notes?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
}

export const PeerTreatmentBooking: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  // Booking form state
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [sessionType, setSessionType] = useState('');
  const [notes, setNotes] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchPractitioners();
      fetchCreditBalance();
    }
  }, [user]);

  const fetchPractitioners = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          user_role,
          bio,
          location,
          hourly_rate,
          experience_years,
          specializations,
          is_active,
          is_verified
        `)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true)
        .neq('id', user?.id); // Exclude current user

      if (error) throw error;
      setPractitioners(data || []);
    } catch (error) {
      console.error('Error fetching practitioners:', error);
      toast.error('Failed to load practitioners');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditBalance = async () => {
    if (!user?.id) return;
    
    try {
      const balance = await CreditManager.getBalance(user.id);
      setCreditBalance(balance);
    } catch (error) {
      console.error('Error fetching credit balance:', error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'massage_therapist':
        return <Heart className="h-4 w-4 text-pink-600" />;
      case 'osteopath':
        return <Bone className="h-4 w-4 text-green-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist':
        return 'Sports Therapist';
      case 'massage_therapist':
        return 'Massage Therapist';
      case 'osteopath':
        return 'Osteopath';
      default:
        return 'Practitioner';
    }
  };

  const getDefaultHourlyRate = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 80;
      case 'massage_therapist': return 65;
      case 'osteopath': return 75;
      default: return 70;
    }
  };

  const getDefaultSpecializations = (role: string) => {
    switch (role) {
      case 'sports_therapist': return ['Sports Injury Rehabilitation', 'Performance Training'];
      case 'massage_therapist': return ['Deep Tissue Massage', 'Sports Massage'];
      case 'osteopath': return ['Osteopathy', 'Manual Therapy'];
      default: return ['General Practice'];
    }
  };

  const calculateCreditCost = (duration: number, practitionerRole: string) => {
    const hourlyRate = getDefaultHourlyRate(practitionerRole);
    const costPerMinute = hourlyRate / 60;
    const totalCost = costPerMinute * duration;
    // Convert to credits (1 credit = £1)
    return Math.round(totalCost);
  };

  const filteredPractitioners = practitioners.filter(practitioner => {
    const matchesSearch = practitioner.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         practitioner.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         practitioner.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || practitioner.user_role === roleFilter;
    const matchesLocation = locationFilter === 'all' || practitioner.location === locationFilter;
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  const handleBooking = async () => {
    if (!selectedPractitioner || !selectedDate || !selectedTime || !sessionType) {
      toast.error('Please fill in all required fields');
      return;
    }

    const creditCost = calculateCreditCost(selectedDuration, selectedPractitioner.user_role);
    
    if (creditBalance < creditCost) {
      toast.error(`Insufficient credits. You need ${creditCost} credits but have ${creditBalance}.`);
      return;
    }

    setBooking(true);
    try {
      // Create peer session booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('client_sessions')
        .insert({
          therapist_id: selectedPractitioner.id,
          client_name: `${userProfile?.first_name} ${userProfile?.last_name}`,
          client_email: user?.email,
          client_phone: '', // Practitioners don't need phone for peer bookings
          session_date: selectedDate,
          start_time: selectedTime,
          duration_minutes: selectedDuration,
          session_type: sessionType,
          price: creditCost, // Price in credits
          notes: notes,
          status: 'scheduled',
          payment_status: 'paid', // Paid with credits
          credit_cost: creditCost,
          is_peer_booking: true // Flag to identify peer bookings
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Deduct credits from current practitioner
      await CreditManager.updateBalance(
        user.id,
        creditCost,
        'spend',
        `Peer treatment session with ${selectedPractitioner.first_name} ${selectedPractitioner.last_name}`,
        bookingData.id,
        'peer_session'
      );

      // Award credits to the treating practitioner
      await CreditManager.updateBalance(
        selectedPractitioner.id,
        creditCost,
        'earn',
        `Provided peer treatment to ${userProfile?.first_name} ${userProfile?.last_name}`,
        bookingData.id,
        'peer_session'
      );

      toast.success('Peer treatment session booked successfully!');
      
      // Reset form
      setSelectedPractitioner(null);
      setSelectedDate('');
      setSelectedTime('');
      setSelectedDuration(60);
      setSessionType('');
      setNotes('');
      
      // Refresh credit balance
      await fetchCreditBalance();
      
    } catch (error) {
      console.error('Error booking peer session:', error);
      toast.error('Failed to book peer treatment session');
    } finally {
      setBooking(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading practitioners...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Peer Treatment Booking</h1>
          <p className="text-muted-foreground">
            Book treatment sessions with other practitioners using your credits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">{creditBalance} Credits</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Practitioners List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Find Practitioners</CardTitle>
              <CardDescription>Browse and select a practitioner for your treatment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or specialty..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="sports_therapist">Sports Therapist</SelectItem>
                      <SelectItem value="massage_therapist">Massage Therapist</SelectItem>
                      <SelectItem value="osteopath">Osteopath</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {[...new Set(practitioners.map(p => p.location))].map(location => (
                        <SelectItem key={location} value={location || ''}>
                          {location || 'Not specified'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practitioners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPractitioners.map((practitioner) => {
              const hourlyRate = getDefaultHourlyRate(practitioner.user_role);
              const specializations = getDefaultSpecializations(practitioner.user_role);
              const creditCost = calculateCreditCost(60, practitioner.user_role);
              
              return (
                <Card 
                  key={practitioner.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPractitioner?.id === practitioner.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedPractitioner(practitioner)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {practitioner.first_name[0]}{practitioner.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">
                            {practitioner.first_name} {practitioner.last_name}
                          </h3>
                          {getRoleIcon(practitioner.user_role)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {getRoleDisplayName(practitioner.user_role)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {practitioner.location || 'Not specified'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {practitioner.experience_years || 5} years
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-xs">
                            £{hourlyRate}/hr • {creditCost} credits
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPractitioners.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No practitioners found matching your criteria</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Booking Form */}
        <div className="space-y-4">
          {selectedPractitioner ? (
            <Card>
              <CardHeader>
                <CardTitle>Book Treatment</CardTitle>
                <CardDescription>
                  Session with {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="date">Session Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <Label htmlFor="time">Start Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeSlots().map(time => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={selectedDuration.toString()} onValueChange={(value) => setSelectedDuration(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select value={sessionType} onValueChange={setSessionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="treatment">Treatment Session</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific requirements or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Credit Cost:</span>
                    <span className="font-semibold">
                      {calculateCreditCost(selectedDuration, selectedPractitioner.user_role)} credits
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your Balance:</span>
                    <span className="text-sm">{creditBalance} credits</span>
                  </div>
                </div>

                <Button 
                  onClick={handleBooking} 
                  disabled={booking || !selectedDate || !selectedTime || !sessionType}
                  className="w-full"
                >
                  {booking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Book Session'
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a practitioner to book a session</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
