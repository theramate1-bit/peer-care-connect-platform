import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Coins, TrendingUp, TrendingDown, Clock, User, Calendar, RefreshCw, Zap, Search, MapPin, Star, Filter, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'session_earning' | 'session_payment' | 'bonus' | 'refund';
  description: string;
  session_id: string | null;
  created_at: string;
  metadata?: any;
}

interface NearbyPractitioner {
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
  distance?: number;
  profile_photo_url?: string;
}

const Credits = () => {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Practitioner discovery state
  const [nearbyPractitioners, setNearbyPractitioners] = useState<NearbyPractitioner[]>([]);
  const [practitionersLoading, setPractitionersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState<string>('all');
  const [showPractitioners, setShowPractitioners] = useState(false);

  // Real-time subscription for credit transactions
  useRealtimeSubscription(
    'credit_transactions',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('🔄 Real-time credit transaction update:', payload);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Refresh credit data when new transactions are added
        loadCreditsData();
        toast.success('Credit balance updated!');
      }
    }
  );

  // Real-time subscription for credits table
  useRealtimeSubscription(
    'credits',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('🔄 Real-time credit balance update:', payload);
      if (payload.eventType === 'UPDATE') {
        // Update balance immediately
        setCurrentBalance(payload.new.current_balance || 0);
        toast.success('Credit balance updated!');
      }
    }
  );

  useEffect(() => {
    if (userProfile) {
      loadCreditsData();
    }
  }, [userProfile]);

  const loadCreditsData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Load credit transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          user_id,
          amount,
          transaction_type,
          description,
          session_id,
          created_at,
          metadata
        `)
        .eq('user_id', userProfile?.id)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      setTransactions(transactionsData || []);

      // Calculate current balance
      const balance = (transactionsData || []).reduce((sum, transaction) => {
        if (transaction.transaction_type === 'session_earning' || transaction.transaction_type === 'bonus' || transaction.transaction_type === 'refund') {
          return sum + transaction.amount;
        } else {
          return sum - transaction.amount;
        }
      }, 0);

      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading credits data:', error);
      toast.error('Failed to load credits data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCreditsData(true);
  };

  const fetchNearbyPractitioners = async () => {
    try {
      setPractitionersLoading(true);
      
      // Fetch practitioners (excluding current user)
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
          user_role,
          profile_photo_url,
          credit_settings
        `)
        .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
        .eq('is_active', true)
        .neq('id', userProfile?.id);

      if (practitionersError) throw practitionersError;

      // Get ratings and calculate credit costs
      const practitionersWithData = await Promise.all(
        (practitionersData || []).map(async (practitioner) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .eq('reviewee_id', practitioner.user_id);

          const { data: sessions } = await supabase
            .from('client_sessions')
            .select('id')
            .eq('therapist_id', practitioner.user_id)
            .eq('status', 'completed');

          const averageRating = reviews?.length 
            ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length 
            : 0;

          // Get dynamic credit cost
          const { data: creditCostData } = await supabase
            .rpc('get_practitioner_credit_cost', {
              p_practitioner_id: practitioner.user_id,
              p_duration_minutes: 60
            });

          const creditCost = creditCostData || Math.round(practitioner.hourly_rate / 10);

          return {
            ...practitioner,
            average_rating: averageRating,
            total_sessions: sessions?.length || 0,
            credit_cost: creditCost,
            distance: Math.floor(Math.random() * 50) + 1 // Simulated distance
          };
        })
      );

      setNearbyPractitioners(practitionersWithData);
    } catch (error) {
      console.error('Error fetching nearby practitioners:', error);
      toast.error('Failed to load practitioners');
    } finally {
      setPractitionersLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'session_earning':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'session_payment':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'bonus':
        return <Coins className="h-4 w-4 text-yellow-600" />;
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Coins className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadgeColor = (type: string) => {
    switch (type) {
      case 'session_earning':
        return 'bg-green-50 text-green-700';
      case 'session_payment':
        return 'bg-red-50 text-red-700';
      case 'bonus':
        return 'bg-yellow-50 text-yellow-700';
      case 'refund':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'session_earning':
        return 'Earned';
      case 'session_payment':
        return 'Spent';
      case 'bonus':
        return 'Bonus';
      case 'refund':
        return 'Refund';
      default:
        return type;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'earned') return transaction.transaction_type === 'session_earning';
    if (filter === 'spent') return transaction.transaction_type === 'session_payment';
    return transaction.transaction_type === filter;
  });

  const filteredPractitioners = nearbyPractitioners.filter(practitioner => {
    const matchesSearch = searchQuery === '' || 
      practitioner.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      practitioner.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      practitioner.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      practitioner.specializations.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSpecialization = specializationFilter === 'all' || 
      practitioner.specializations.includes(specializationFilter);
    
    return matchesSearch && matchesSpecialization;
  });

  const totalEarned = transactions
    .filter(t => t.transaction_type === 'session_earning' || t.transaction_type === 'bonus' || t.transaction_type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = transactions
    .filter(t => t.transaction_type === 'session_payment')
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading credits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Coins className="h-8 w-8 text-primary" />
              Credits
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </div>
            </h1>
            <p className="text-muted-foreground">Manage your credit balance and transactions. Updates in real-time.</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="flex items-center gap-2"
            >
              <Link to="/practice/peer-treatment">
                <Users className="h-4 w-4" />
                Peer Treatment
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Credit Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Current Balance
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{currentBalance}</div>
            <p className="text-muted-foreground">Available credits</p>
            <div className="mt-2 text-xs text-primary/70">
              💡 Earn credits by completing client sessions
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">+{totalEarned}</div>
            <p className="text-muted-foreground">Credits earned</p>
            <div className="mt-2 text-xs text-primary/70">
              🎯 From completed client sessions
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">-{totalSpent}</div>
            <p className="text-muted-foreground">Credits spent</p>
            <div className="mt-2 text-xs text-primary/70">
              💆‍♀️ On peer treatment sessions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How Credits Work */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            How Credits Work
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Live System
            </div>
          </CardTitle>
          <CardDescription>Understanding the credit system - automatically integrated with your practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Earning Credits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Complete client sessions (automatic)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Provide quality treatments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Earn bonus credits for achievements</span>
                </li>
              </ul>
              <div className="mt-3 p-2 bg-primary/10 rounded text-xs text-primary/80">
                💡 Credits are automatically awarded when you complete paid client sessions
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Spending Credits
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Book peer treatment sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Access premium features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Purchase additional services</span>
                </li>
              </ul>
              <div className="mt-3 p-2 bg-primary/10 rounded text-xs text-primary/80">
                💆‍♀️ Use credits to book treatment sessions with other practitioners
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peer Treatment Discovery */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Find Peer Practitioners
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              Live Discovery
            </div>
          </CardTitle>
          <CardDescription>
            Discover nearby practitioners and book peer treatment sessions using your credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPractitioners ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-primary/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Discover Peer Practitioners</h3>
              <p className="text-muted-foreground mb-6">
                Find other practitioners near you and book treatment sessions using your credits
              </p>
              <Button 
                onClick={() => {
                  setShowPractitioners(true);
                  fetchNearbyPractitioners();
                }}
                className="bg-primary hover:bg-primary/90"
              >
                <Search className="h-4 w-4 mr-2" />
                Find Practitioners
              </Button>
            </div>
          ) : (
            <>
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, location, or specialization..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specializations</SelectItem>
                    <SelectItem value="sports_therapy">Sports Therapy</SelectItem>
                    <SelectItem value="massage_therapy">Massage Therapy</SelectItem>
                    <SelectItem value="osteopathy">Osteopathy</SelectItem>
                    <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                    <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Practitioners List */}
              {practitionersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Finding practitioners...</p>
                </div>
              ) : filteredPractitioners.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No practitioners found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or check back later
                  </p>
                  <Button variant="outline" onClick={() => setShowPractitioners(false)}>
                    Back to Credits
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPractitioners.map((practitioner) => (
                    <Card key={practitioner.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={practitioner.profile_photo_url} />
                            <AvatarFallback>
                              {practitioner.first_name[0]}{practitioner.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold truncate">
                              {practitioner.first_name} {practitioner.last_name}
                            </h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              {practitioner.user_role.replace('_', ' ')}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {practitioner.distance}km away
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex flex-wrap gap-1">
                            {practitioner.specializations.slice(0, 2).map((spec) => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec.replace('_', ' ')}
                              </Badge>
                            ))}
                            {practitioner.specializations.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{practitioner.specializations.length - 2} more
                              </Badge>
                            )}
                          </div>
                          
                          {practitioner.average_rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">
                                {practitioner.average_rating.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({practitioner.total_sessions} sessions)
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium">
                              {practitioner.credit_cost} credits/hour
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            asChild
                            disabled={currentBalance < practitioner.credit_cost}
                          >
                            <Link to={`/practice/peer-treatment?practitioner=${practitioner.user_id}`}>
                              Book Session
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setShowPractitioners(false)}>
                  Back to Credits Overview
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Transaction History
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  Live Updates
                </div>
              </CardTitle>
              <CardDescription>Real-time transaction tracking</CardDescription>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'earned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('earned')}
              >
                Earned
              </Button>
              <Button
                variant={filter === 'spent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('spent')}
              >
                Spent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? "You haven't made any credit transactions yet. Start by completing client sessions to earn credits."
                  : `No ${filter} transactions found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{transaction.description}</h4>
                            <Badge className={getTransactionBadgeColor(transaction.transaction_type)}>
                              {getTransactionTypeLabel(transaction.transaction_type)}
                            </Badge>
                          </div>
                          
                          {/* Transaction Details */}
                          {transaction.metadata && (
                            <div className="text-sm text-muted-foreground mb-1">
                              {transaction.metadata.session_type && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {transaction.metadata.session_type}
                                </div>
                              )}
                              {transaction.metadata.practitioner_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {transaction.metadata.practitioner_name}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      
                      <div className={`text-lg font-semibold ${
                        transaction.transaction_type === 'session_earning' || transaction.transaction_type === 'bonus' || transaction.transaction_type === 'refund'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'session_earning' || transaction.transaction_type === 'bonus' || transaction.transaction_type === 'refund' ? '+' : '-'}
                        {transaction.amount}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Credits;