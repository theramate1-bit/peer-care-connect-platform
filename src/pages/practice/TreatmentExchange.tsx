import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Filter,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Coins
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TreatmentExchangeService, EligiblePractitioner } from '@/lib/treatment-exchange';
import { MutualAvailabilityService, MutualAvailabilitySlot } from '@/lib/mutual-availability';
import MutualAvailabilityCalendar from '@/components/treatment-exchange/MutualAvailabilityCalendar';
import { toast } from 'sonner';
import { format } from 'date-fns';

const TreatmentExchange: React.FC = () => {
  const { userProfile } = useAuth();
  const [practitioners, setPractitioners] = useState<EligiblePractitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<EligiblePractitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPractitioner, setSelectedPractitioner] = useState<EligiblePractitioner | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MutualAvailabilitySlot | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  // Request form
  const [requestData, setRequestData] = useState({
    session_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    session_type: '',
    notes: ''
  });

  useEffect(() => {
    if (userProfile) {
      loadPractitioners();
      loadCreditBalance();
    }
  }, [userProfile]);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedSpecialization, ratingFilter]);

  const loadPractitioners = async () => {
    try {
      setLoading(true);
      const data = await TreatmentExchangeService.getEligiblePractitioners(userProfile?.id!);
      setPractitioners(data);
    } catch (error) {
      console.error('Error loading practitioners:', error);
      toast.error('Failed to load practitioners');
    } finally {
      setLoading(false);
    }
  };

  const loadCreditBalance = async () => {
    try {
      const creditCheck = await TreatmentExchangeService.checkCreditBalance(userProfile?.id!);
      setCreditBalance(creditCheck.currentBalance);
    } catch (error) {
      console.error('Error loading credit balance:', error);
      setCreditBalance(0);
    }
  };

  const filterPractitioners = () => {
    let filtered = practitioners;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.specializations.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (selectedRole !== 'all') {
      filtered = filtered.filter(p => p.user_role === selectedRole);
    }

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(p => p.specializations.includes(selectedSpecialization));
    }

    // Rating similarity filter (±0.5 around my rating bucket if selected)
    if (ratingFilter !== 'all') {
      const myRating = (userProfile?.average_rating as number) || 0;
      const bucket = Math.floor((myRating || 0));
      const min = Math.max(0, bucket - 0.5);
      const max = bucket + 0.9;
      filtered = filtered.filter(p => {
        const r = p.average_rating || 0;
        return r >= min && r <= max;
      });
    }

    setFilteredPractitioners(filtered);
  };

  const handleSendRequest = async () => {
    if (!selectedPractitioner || !requestData.session_date || !requestData.start_time || !requestData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setRequestLoading(true);
      
      await TreatmentExchangeService.sendExchangeRequest(
        userProfile?.id!,
        selectedPractitioner.id,
        requestData
      );

      toast.success('Exchange request sent successfully!');
      setShowRequestForm(false);
      setSelectedPractitioner(null);
      setRequestData({
        session_date: '',
        start_time: '',
        end_time: '',
        duration_minutes: 60,
        session_type: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error sending exchange request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send exchange request');
    } finally {
      setRequestLoading(false);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sports_therapist': return 'bg-blue-100 text-blue-800';
      case 'massage_therapist': return 'bg-green-100 text-green-800';
      case 'osteopath': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading practitioners...</p>
        </div>
      </div>
    );
  }

  // Not opted-in prompt
  if (!userProfile?.treatment_exchange_enabled) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Treatment Exchange Not Enabled
            </CardTitle>
            <CardDescription>
              You haven’t opted in for the Treatment Exchange feature. Go to profile settings to enable it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = '/profile')}>
              Go to Profile Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Treatment Exchange</h1>
        <p className="text-muted-foreground mb-4">
          Exchange treatments with other practitioners using credits
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Coins className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-medium">Your Credits: {creditBalance}</span>
          {creditBalance === 0 && (
            <Badge variant="destructive" className="ml-2">
              No Credits Available
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Find Exchange Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                <SelectTrigger>
                  <SelectValue placeholder="All specializations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specializations</SelectItem>
                  <SelectItem value="Sports Injury">Sports Injury</SelectItem>
                  <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                  <SelectItem value="Deep Tissue">Deep Tissue</SelectItem>
                  <SelectItem value="Pain Management">Pain Management</SelectItem>
                  <SelectItem value="Stress Relief">Stress Relief</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Minimum Rating</Label>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Practitioners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPractitioners.map((practitioner) => (
          <Card key={practitioner.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={practitioner.profile_photo_url} />
                  <AvatarFallback>
                    {practitioner.first_name[0]}{practitioner.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">
                    {practitioner.first_name} {practitioner.last_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getRoleColor(practitioner.user_role)}>
                      {getRoleDisplayName(practitioner.user_role)}
                    </Badge>
                    {practitioner.average_rating && practitioner.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {practitioner.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {practitioner.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {practitioner.location}
                </div>
              )}

              {practitioner.specializations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Specializations</Label>
                  <div className="flex flex-wrap gap-1">
                    {practitioner.specializations.slice(0, 3).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {practitioner.specializations.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{practitioner.specializations.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={() => {
                    setSelectedPractitioner(practitioner);
                    setShowCalendar(true);
                  }}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Availability
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPractitioner(practitioner);
                    setShowRequestForm(true);
                  }}
                  className="w-full"
                  size="sm"
                  disabled={creditBalance === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {creditBalance === 0 ? 'No Credits Available' : 'Send Exchange Request'}
                </Button>
                {creditBalance === 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Earn credits through bookings to send exchange requests
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPractitioners.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No practitioners found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later for new practitioners.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request Form Modal */}
      {showRequestForm && selectedPractitioner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Send Exchange Request</CardTitle>
                <CardDescription>
                  Request a treatment exchange with {selectedPractitioner.first_name} {selectedPractitioner.last_name}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRequestForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-date">Session Date *</Label>
                <Input
                  id="session-date"
                  type="date"
                  value={requestData.session_date}
                  onChange={(e) => setRequestData(prev => ({
                    ...prev,
                    session_date: e.target.value
                  }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={requestData.start_time}
                    onChange={(e) => setRequestData(prev => ({
                      ...prev,
                      start_time: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={requestData.end_time}
                    onChange={(e) => setRequestData(prev => ({
                      ...prev,
                      end_time: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="30"
                  max="180"
                  step="30"
                  value={requestData.duration_minutes}
                  onChange={(e) => setRequestData(prev => ({
                    ...prev,
                    duration_minutes: parseInt(e.target.value) || 60
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-type">Session Type</Label>
                <Select
                  value={requestData.session_type}
                  onValueChange={(value) => setRequestData(prev => ({
                    ...prev,
                    session_type: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sports Massage">Sports Massage</SelectItem>
                    <SelectItem value="Deep Tissue Massage">Deep Tissue Massage</SelectItem>
                    <SelectItem value="Swedish Massage">Swedish Massage</SelectItem>
                    <SelectItem value="Osteopathy">Osteopathy</SelectItem>
                    <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                    <SelectItem value="Sports Therapy">Sports Therapy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any specific requirements or notes..."
                  value={requestData.notes}
                  onChange={(e) => setRequestData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendRequest}
                  disabled={requestLoading}
                  className="flex-1"
                >
                  {requestLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mutual Availability Calendar Modal */}
      {showCalendar && selectedPractitioner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mutual Availability Calendar</CardTitle>
                  <CardDescription>
                    View when you and {selectedPractitioner.first_name} {selectedPractitioner.last_name} are both available
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCalendar(false);
                    setSelectedPractitioner(null);
                    setSelectedSlot(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <MutualAvailabilityCalendar
                  practitionerA={userProfile!}
                  practitionerB={selectedPractitioner}
                  onSlotSelect={(slot) => {
                    setSelectedSlot(slot);
                    // Auto-fill the request form with selected slot
                    setRequestData(prev => ({
                      ...prev,
                      session_date: slot.date,
                      start_time: slot.start_time,
                      end_time: slot.end_time,
                      duration_minutes: slot.duration_minutes
                    }));
                  }}
                  selectedSlot={selectedSlot}
                />
                
                {selectedSlot && (
                  <div className="mt-6 flex gap-3">
                    <Button
                      onClick={() => {
                        setShowCalendar(false);
                        setShowRequestForm(true);
                      }}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Exchange Request for Selected Slot
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCalendar(false);
                        setSelectedPractitioner(null);
                        setSelectedSlot(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentExchange;
