import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, MapPin, Clock, User, Coins, Calendar, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Practitioner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location: string;
  hourly_rate: number;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  average_rating?: number;
  total_sessions?: number;
  credit_cost?: number;
}

interface PeerSession {
  id: string;
  practitioner_id: string;
  client_id: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string;
  credit_cost: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  practitioner: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
  client: {
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

const PeerTreatmentBooking = () => {
  const { userProfile } = useAuth();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<Practitioner[]>([]);
  const [mySessions, setMySessions] = useState<PeerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');

  // Booking form
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 60,
    session_type: '',
    notes: ''
  });

  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [userProfile]);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedSpecialization]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load practitioners (excluding current user)
      const { data: practitionersData, error: practitionersError } = await supabase
        .from('users')
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          location,
          hourly_rate,
          specializations,
          bio,
          experience_years,
          user_role
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .neq('id', userProfile?.id);

      if (practitionersError) throw practitionersError;

      // Get ratings and calculate credit costs
      const practitionersWithData = await Promise.all(
        (practitionersData || []).map(async (practitioner) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('therapist_id', practitioner.id)
            .eq('review_status', 'published');

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', practitioner.user_id)
            .eq('status', 'completed');

          const averageRating = reviews?.length 
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length 
            : 0;

          // Get dynamic credit cost from practitioner's settings
          const { data: creditCostData } = await supabase
            .rpc('get_practitioner_credit_cost', {
              p_practitioner_id: practitioner.id,
              p_duration_minutes: 60 // Default 60 minutes for display
            });
          
          const creditCost = creditCostData || Math.round(practitioner.hourly_rate / 10); // Fallback: 1 credit per £10

          return {
            ...practitioner,
            average_rating: averageRating,
            total_sessions: sessions?.length || 0,
            credit_cost: creditCost
          };
        })
      );

      setPractitioners(practitionersWithData);

      // Load my peer sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('peer_treatment_sessions')
        .select(`
          id,
          practitioner_id,
          client_id,
          session_date,
          start_time,
          duration_minutes,
          session_type,
          credit_cost,
          status,
          notes,
          created_at,
          practitioner:users!peer_treatment_sessions_practitioner_id_fkey(
            first_name,
            last_name,
            user_role
          ),
          client:users!peer_treatment_sessions_client_id_fkey(
            first_name,
            last_name,
            user_role
          )
        `)
        .or(`practitioner_id.eq.${userProfile?.id},client_id.eq.${userProfile?.id}`)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;
      setMySessions(sessionsData || []);

      // Load credit balance
      const { data: creditData } = await supabase
        .from('credit_transactions')
        .select('amount, transaction_type')
        .eq('user_id', userProfile?.id);

      const balance = (creditData || []).reduce((sum, transaction) => {
        if (transaction.transaction_type === 'earned' || transaction.transaction_type === 'bonus' || transaction.transaction_type === 'refund') {
          return sum + transaction.amount;
        } else {
          return sum - transaction.amount;
        }
      }, 0);

      setCreditBalance(balance);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterPractitioners = () => {
    let filtered = [...practitioners];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specializations.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(p => p.user_role === selectedRole);
    }

    // Location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(p => p.location.toLowerCase().includes(selectedLocation.toLowerCase()));
    }

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(p => p.specializations.includes(selectedSpecialization));
    }

    setFilteredPractitioners(filtered);
  };

  const handleBooking = async () => {
    if (!selectedPractitioner || !bookingData.session_date || !bookingData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (creditBalance < (selectedPractitioner.credit_cost || 0)) {
      toast.error(`Insufficient credits. You need ${selectedPractitioner.credit_cost} credits but have ${creditBalance}.`);
      return;
    }

    try {
      // Get dynamic credit cost for the specific duration
      const { data: dynamicCreditCost } = await supabase
        .rpc('get_practitioner_credit_cost', {
          p_practitioner_id: selectedPractitioner.user_id,
          p_duration_minutes: bookingData.duration_minutes
        });

      const actualCreditCost = dynamicCreditCost || selectedPractitioner.credit_cost || 0;

      // Check if user has sufficient credits for the actual cost
      if (creditBalance < actualCreditCost) {
        toast.error(`Insufficient credits. You need ${actualCreditCost} credits but have ${creditBalance}.`);
        return;
      }

      // Create peer session
      const { data: sessionData, error: sessionError } = await supabase
        .from('peer_treatment_sessions')
        .insert({
          practitioner_id: selectedPractitioner.user_id,
          client_id: userProfile?.id,
          session_date: bookingData.session_date,
          start_time: bookingData.start_time,
          duration_minutes: bookingData.duration_minutes,
          session_type: bookingData.session_type,
          credit_cost: actualCreditCost,
          status: 'scheduled',
          notes: bookingData.notes
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Process credits using the dynamic system
      const { data: creditResult, error: creditError } = await supabase
        .rpc('process_peer_booking_credits', {
          p_client_id: userProfile?.id,
          p_practitioner_id: selectedPractitioner.user_id,
          p_session_id: sessionData.id,
          p_duration_minutes: bookingData.duration_minutes
        });

      if (creditError) throw creditError;

      if (!creditResult.success) {
        throw new Error(creditResult.error || 'Credit processing failed');
      }

      toast.success('Peer treatment session booked successfully!');
      setShowBookingForm(false);
      setSelectedPractitioner(null);
      setBookingData({
        session_date: '',
        start_time: '',
        duration_minutes: 60,
        session_type: '',
        notes: ''
      });
      loadData(); // Reload data
    } catch (error) {
      console.error('Error booking session:', error);
      toast.error('Failed to book session');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'bg-blue-50 text-blue-700';
      case 'massage_therapist': return 'bg-green-50 text-green-700';
      case 'osteopath': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const uniqueLocations = [...new Set(practitioners.map(p => p.location))];
  const uniqueSpecializations = [...new Set(practitioners.flatMap(p => p.specializations))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading peer treatment options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Peer Treatment Exchange</h1>
        <p className="text-muted-foreground">Book treatment sessions with other practitioners using credits</p>
      </div>

      {/* Credit Balance */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">Available Credits:</span>
              <span className="text-2xl font-bold text-yellow-600">{creditBalance}</span>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/credits'}>
              View Credit History
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Practitioners List */}
        <div className="lg:col-span-2">
          {/* Search and Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Find Practitioners
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search practitioners..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Profession</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Professions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Professions</SelectItem>
                      <SelectItem value="sports_therapist">Sports Therapist</SelectItem>
                      <SelectItem value="massage_therapist">Massage Therapist</SelectItem>
                      <SelectItem value="osteopath">Osteopath</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Specialization Filter */}
              <div className="mt-4">
                <Label>Specializations</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={selectedSpecialization === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSpecialization('all')}
                  >
                    All
                  </Button>
                  {uniqueSpecializations.map(specialization => (
                    <Button
                      key={specialization}
                      variant={selectedSpecialization === specialization ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSpecialization(specialization)}
                    >
                      {specialization}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Practitioners Grid */}
          {filteredPractitioners.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No practitioners found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPractitioners.map((practitioner) => (
                <Card key={practitioner.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {practitioner.first_name[0]}{practitioner.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {practitioner.first_name} {practitioner.last_name}
                            </h4>
                            <Badge className={getRoleBadgeColor(practitioner.user_role)}>
                              {getRoleDisplayName(practitioner.user_role)}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {practitioner.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {practitioner.experience_years} years
                            </div>
                            {practitioner.average_rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {practitioner.average_rating.toFixed(1)}
                              </div>
                            )}
                          </div>

                          {/* Specializations */}
                          <div className="mb-2">
                            <div className="flex flex-wrap gap-1">
                              {practitioner.specializations.slice(0, 3).map((spec) => (
                                <Badge key={spec} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                              {practitioner.specializations.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{practitioner.specializations.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>

                          {practitioner.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {practitioner.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-2">
                          <Coins className="h-4 w-4 text-yellow-600" />
                          <span className="text-lg font-semibold">{practitioner.credit_cost}</span>
                          <span className="text-sm text-muted-foreground">credits</span>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedPractitioner(practitioner);
                            setShowBookingForm(true);
                          }}
                          size="sm"
                          disabled={creditBalance < (practitioner.credit_cost || 0)}
                        >
                          Book Session
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Sessions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Peer Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No peer sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-sm">
                            {session.practitioner_id === userProfile?.id 
                              ? `Treating ${session.client.first_name} ${session.client.last_name}`
                              : `Treatment by ${session.practitioner.first_name} ${session.practitioner.last_name}`
                            }
                          </h5>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.session_date), 'MMM dd, yyyy')} at {session.start_time}
                          </p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{session.session_type}</span>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-yellow-600" />
                          <span className="text-xs font-medium">{session.credit_cost}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {mySessions.length > 5 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        // TODO: Implement view all sessions functionality
                        toast.info('View all sessions functionality coming soon!');
                      }}
                    >
                      View All Sessions
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedPractitioner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Book Peer Treatment</CardTitle>
              <CardDescription>
                Book a session with {selectedPractitioner.first_name} {selectedPractitioner.last_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="session_date">Session Date</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={bookingData.session_date}
                  onChange={(e) => setBookingData({ ...bookingData, session_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={bookingData.start_time}
                  onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={bookingData.duration_minutes.toString()}
                  onValueChange={(value) => setBookingData({ ...bookingData, duration_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div>
                <Label htmlFor="session_type">Session Type</Label>
                <Input
                  id="session_type"
                  placeholder="e.g., Sports Massage, Assessment"
                  value={bookingData.session_type}
                  onChange={(e) => setBookingData({ ...bookingData, session_type: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements or notes..."
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Cost:</span>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">{selectedPractitioner.credit_cost} credits</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm">Your Balance:</span>
                  <span className="text-sm">{creditBalance} credits</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBooking}
                  disabled={creditBalance < (selectedPractitioner.credit_cost || 0)}
                  className="flex-1"
                >
                  Book Session
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBookingForm(false);
                    setSelectedPractitioner(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PeerTreatmentBooking;
