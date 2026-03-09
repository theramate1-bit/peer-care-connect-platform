import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Coins, TrendingUp, TrendingDown, Clock, User as UserIcon, Calendar, RefreshCw, Zap, Search, MapPin, Star, Filter, Plus, Users, AlertCircle, X, CheckCircle2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { generateMapsUrl } from '@/emails/utils/maps';
import { TreatmentExchangeBookingFlow } from '@/components/treatment-exchange/TreatmentExchangeBookingFlow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast, isBefore, parseISO, addMinutes } from 'date-fns';
import { formatTimeWithoutSeconds } from '@/lib/date';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { NotificationSystem } from '@/lib/notification-system';
import { TreatmentExchangeService } from '@/lib/treatment-exchange';
import { PublicProfileModal } from '@/components/profiles/PublicProfileModal';
import { MessagingManager } from '@/lib/messaging';
import { MessageSquare } from 'lucide-react';
import { ExchangeAcceptanceModal } from '@/components/treatment-exchange/ExchangeAcceptanceModal';
import { GeocodingService } from '@/lib/geocoding';
import { LocationManager } from '@/lib/location';
import { EmptyPractitioners } from '@/components/ui/empty-state';
import { PractitionerGridSkeleton } from '@/components/ui/skeleton-loaders';
import { getBestLocationImageUrl } from '@/lib/location-images';
import { getSessionLocation } from '@/utils/sessionLocation';

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
  email?: string;
  location: string;
  specializations: string[];
  bio: string;
  experience_years: number;
  user_role: string;
  average_rating?: number;
  total_sessions?: number;
  credit_cost_range?: { min: number; max: number };
  distance?: number;
  profile_photo_url?: string;
  latitude?: number;
  longitude?: number;
  products?: Array<{
    id: string;
    name: string;
    description: string;
    price_amount: number;
    currency: string;
    duration_minutes: number;
    stripe_price_id: string;
    is_active: boolean;
    category?: string;
  }>;
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
  appointment_type?: string | null;
  visit_address?: string | null;
  practitioner: {
    first_name: string;
    last_name: string;
    user_role: string;
    location?: string;
    clinic_address?: string | null;
  };
  client: {
    first_name: string;
    last_name: string;
    user_role: string;
    location?: string;
  };
  // Internal validation fields (not stored in DB)
  _originalStatus?: string;
  _sessionEndTime?: string;
  _isPast?: boolean;
  payment_status?: string; // For validation checks
}

// Helper function to get tier label
const getStarTierLabel = (rating: number | null | undefined): string => {
  if (!rating || rating === 0) return '0-1 Stars';
  if (rating >= 4) return '4-5 Stars';
  if (rating >= 2) return '2-3 Stars';
  return '0-1 Stars';
};

// Helper function to calculate credit cost
// Credit cost = duration_minutes (1 credit per minute)
const calculateCreditCost = (durationMinutes: number): number => {
  if (!durationMinutes || durationMinutes <= 0) {
    return 1; // Minimum 1 credit
  }

  // 1 credit per minute
  return durationMinutes;
};

// Helper function to get credit cost for a practitioner (calls backend RPC)
const getPractitionerCreditCost = async (
  practitionerId: string,
  durationMinutes: number,
  productId?: string | null
): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_practitioner_credit_cost', {
      p_practitioner_id: practitionerId,
      p_duration_minutes: durationMinutes,
      p_product_id: productId || null
    });

    if (error) {
      console.warn('Error getting practitioner credit cost:', error);
      // Fallback to calculation (1 credit per minute)
      return calculateCreditCost(durationMinutes);
    }

    return data || calculateCreditCost(durationMinutes);
  } catch (error) {
    console.warn('Error calling get_practitioner_credit_cost:', error);
    return calculateCreditCost(durationMinutes);
  }
};

const Credits = () => {
  const { userProfile, updateProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [treatmentExchangeSpent, setTreatmentExchangeSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Subscription and allocation state
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [monthlyAllocation, setMonthlyAllocation] = useState<number>(0);
  const [nextAllocation, setNextAllocation] = useState<string | null>(null);
  const [lastAllocation, setLastAllocation] = useState<string | null>(null);

  // Peer Treatment state
  const [practitioners, setPractitioners] = useState<NearbyPractitioner[]>([]);
  const [filteredPractitioners, setFilteredPractitioners] = useState<NearbyPractitioner[]>([]);
  const [mySessions, setMySessions] = useState<PeerSession[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [practitionersLoading, setPractitionersLoading] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<NearbyPractitioner | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Peer Treatment filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  // Location radius filter
  const [locationSearch, setLocationSearch] = useState('');
  const [searchLocationLat, setSearchLocationLat] = useState<number | null>(null);
  const [searchLocationLon, setSearchLocationLon] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [sortByDistance, setSortByDistance] = useState(false);
  // Auto-show search when treatment exchange is enabled
  const [showSearch, setShowSearch] = useState(userProfile?.treatment_exchange_opt_in ?? false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<PeerSession | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [respondingToRequest, setRespondingToRequest] = useState<string | null>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  const [selectedExchangeRequest, setSelectedExchangeRequest] = useState<any | null>(null);
  const [sessionsSidebarOpen, setSessionsSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state for sessions
  const [sessionsPage, setSessionsPage] = useState(1);
  const sessionsPerPage = 5;

  // Booking form (deprecated - using TreatmentExchangeBookingFlow component)
  // Keeping for backward compatibility but not used
  const [bookingData, setBookingData] = useState({
    session_date: '',
    start_time: '',
    duration_minutes: 0, // Will be set dynamically from selected service
    session_type: '',
    notes: ''
  });

  // Handle practitioner query param
  useEffect(() => {
    const practitionerParam = searchParams.get('practitioner');
    if (practitionerParam && practitioners.length > 0) {
      const found = practitioners.find(p => p.user_id === practitionerParam);
      if (found) {
        setSelectedPractitioner(found);
        setShowBookingForm(true);
      }
    }
  }, [searchParams, practitioners]);

  // Real-time subscription for credit transactions
  useRealtimeSubscription(
    'credit_transactions',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('🔄 Real-time credit transaction update:', payload);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Refresh credit data when new transactions are added
        loadCreditsData();

        // Reload peer treatment data to ensure UI sync
        loadPeerTreatmentData();

        toast.success('Credit balance updated!');
      }
    }
  );

  // Real-time subscription for ratings updates (reviews and practitioner_ratings)
  // This ensures ratings are updated in real-time when new reviews are added
  useEffect(() => {
    if (!userProfile?.id) return;

    const channel = supabase
      .channel(`ratings_updates_${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews',
          filter: `therapist_id=neq.${userProfile.id}` // Listen to all reviews (for practitioners in the list)
        },
        (payload) => {
          console.log('🔄 Real-time review update:', payload);
          // Reload practitioners to get updated ratings
          loadPeerTreatmentData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practitioner_ratings',
          filter: `practitioner_id=neq.${userProfile.id}` // Listen to all ratings (for practitioners in the list)
        },
        (payload) => {
          console.log('🔄 Real-time practitioner rating update:', payload);
          // Reload practitioners to get updated ratings
          loadPeerTreatmentData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=neq.${userProfile.id}` // Listen to average_rating updates for practitioners
        },
        (payload) => {
          // Only reload if average_rating changed
          if (payload.new?.average_rating !== payload.old?.average_rating) {
            console.log('🔄 Real-time average_rating update:', payload);
            // Reload practitioners to get updated ratings
            loadPeerTreatmentData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  // Real-time subscription for credits table
  // Use useEffect to set up subscription manually for better control
  useEffect(() => {
    if (!userProfile?.id) return;

    console.log('🔌 Setting up real-time subscription for credits:', userProfile.id);

    const channel = supabase
      .channel(`credits_${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('🔄 Real-time credit balance update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const oldBalance = payload.old?.current_balance || payload.old?.balance || 0;
            const newBalance = payload.new?.current_balance || payload.new?.balance || 0;

            console.log('📊 Credit balance changed:', { oldBalance, newBalance, totalEarned: payload.new?.total_earned, totalSpent: payload.new?.total_spent });

            // Update balance immediately from payload
            setCurrentBalance(newBalance);
            setTotalEarned(payload.new?.total_earned || 0);
            setTotalSpent(payload.new?.total_spent || 0);

            // Also reload full data to ensure consistency
            loadCreditsData();

            // Reload peer treatment data to ensure UI sync
            loadPeerTreatmentData();

            // Only show toast if balance actually changed
            if (newBalance !== oldBalance) {
              const difference = newBalance - oldBalance;
              if (difference > 0) {
                toast.success(`${difference} credits added to your balance!`, {
                  description: 'Your credit balance has been updated'
                });
              } else if (difference < 0) {
                toast.info(`${Math.abs(difference)} credits deducted from your balance.`, {
                  description: 'Your credit balance has been updated'
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Credits subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to credits updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Credits subscription error');
        }
      });

    return () => {
      console.log('🔌 Cleaning up credits subscription');
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id]);

  // Note: credit_allocations table doesn't exist - allocation notifications 
  // handled by credit_transactions real-time subscription instead

  // Real-time subscription for subscriptions table
  useRealtimeSubscription(
    'subscriptions',
    `user_id=eq.${userProfile?.id}`,
    (payload) => {
      console.log('🔄 Real-time subscription update:', payload);
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        loadCreditsData();
      }
    }
  );

  // Real-time subscription for users table to update treatment_exchange_opt_in
  useEffect(() => {
    if (!userProfile?.id) return;

    console.log('🔌 Setting up real-time subscription for user profile updates:', userProfile.id);

    const channel = supabase
      .channel(`user_profile_${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userProfile.id}`
        },
        (payload) => {
          console.log('🔄 Real-time user profile update:', payload);
          if (payload.eventType === 'UPDATE' && payload.new?.treatment_exchange_opt_in !== undefined) {
            // Update userProfile in AuthContext via updateProfile (which handles optimistic updates)
            // This ensures the UI updates immediately when the toggle changes
            updateProfile({ treatment_exchange_opt_in: payload.new.treatment_exchange_opt_in });
            
            // If opt-in status changed, reload peer treatment data
            if (payload.old?.treatment_exchange_opt_in !== payload.new?.treatment_exchange_opt_in) {
              if (payload.new.treatment_exchange_opt_in) {
                // Just enabled - load peer treatment data
                loadPeerTreatmentData();
                setShowSearch(true); // Auto-show search when enabled
              } else {
                // Just disabled - clear search state
                setShowSearch(false);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 User profile subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to user profile updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ User profile subscription error');
        }
      });

    return () => {
      console.log('🔌 Cleaning up user profile subscription');
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, updateProfile]);

  useEffect(() => {
    if (userProfile) {
      loadCreditsData();
      loadPeerTreatmentData();
    }
  }, [userProfile]);

  // Auto-show search when treatment exchange is enabled
  useEffect(() => {
    if (userProfile?.treatment_exchange_opt_in) {
      setShowSearch(true);
    } else {
      setShowSearch(false);
    }
  }, [userProfile?.treatment_exchange_opt_in]);

  useEffect(() => {
    filterPractitioners();
  }, [practitioners, searchTerm, selectedRole, selectedLocation, selectedSpecialization, ratingFilter, searchLocationLat, searchLocationLon, radiusKm, sortByDistance]);

  // Generate time slots for peer treatment booking (9:00 AM - 8:00 PM in 30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadCreditsData = async () => {
    try {
      setLoading(true);

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

      // Fetch actual balance from database (single source of truth)
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits')
        .select('balance, current_balance, total_earned, total_spent')
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (creditsError && creditsError.code !== 'PGRST116') {
        console.error('Error fetching credits:', creditsError);
      }

      // If no credits record exists, create one with 0 balance
      if (!creditsData && creditsError?.code === 'PGRST116') {
        console.log('Creating initial credits record for user');
        const { data: newCredits, error: createError } = await supabase
          .from('credits')
          .insert({
            user_id: userProfile?.id,
            balance: 0,
            current_balance: 0,
            total_earned: 0,
            total_spent: 0
          })
          .select('balance, current_balance, total_earned, total_spent')
          .single();

        if (createError) {
          console.error('Error creating credits record:', createError);
          // Even if creation fails, set to 0 so UI doesn't break
          setCurrentBalance(0);
          setTotalEarned(0);
          setTotalSpent(0);
        } else if (newCredits) {
          setCurrentBalance(newCredits.current_balance || newCredits.balance || 0);
          setTotalEarned(newCredits.total_earned || 0);
          setTotalSpent(newCredits.total_spent || 0);
        }
      } else {
        // Set balance and totals from database (single source of truth)
        setCurrentBalance(creditsData?.current_balance || creditsData?.balance || 0);
        setTotalEarned(creditsData?.total_earned || 0);
        setTotalSpent(creditsData?.total_spent || 0);
      }

      // Calculate gross treatment exchange spending (sum of all session_payment transactions)
      const { data: treatmentExchangeData, error: treatmentExchangeError } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('user_id', userProfile?.id)
        .eq('transaction_type', 'session_payment');

      if (treatmentExchangeError) {
        console.error('Error fetching treatment exchange spending:', treatmentExchangeError);
      } else {
        const grossSpent = (treatmentExchangeData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
        setTreatmentExchangeSpent(grossSpent);
      }

      // **Fetch subscription information for monthly allocation display**
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('id, plan, monthly_credits, credits_allocated_at, current_period_end, status')
        .eq('user_id', userProfile?.id)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionError);
      } else if (subscriptionData) {
        setSubscriptionPlan(subscriptionData.plan);
        setMonthlyAllocation(subscriptionData.monthly_credits || 0);

        // Get last allocation from credit_allocations table if subscription exists
        if (subscriptionData.id) {
          const { data: lastAlloc } = await supabase
            .from('credit_allocations')
            .select('allocated_at')
            .eq('subscription_id', subscriptionData.id)
            .order('allocated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastAlloc?.allocated_at) {
            setLastAllocation(lastAlloc.allocated_at);
          } else if (subscriptionData.credits_allocated_at) {
            setLastAllocation(subscriptionData.credits_allocated_at);
          }
        }

        setNextAllocation(subscriptionData.current_period_end);
      }
    } catch (error) {
      console.error('Error loading credits data:', error);
      toast.error('Failed to load credits data');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageUser = async (otherUserId: string) => {
    if (!userProfile?.id) {
      toast.error('You must be logged in to message users');
      return;
    }

    try {
      // Check if there's a conversation_id from mutual_exchange_sessions for peer bookings
      const { data: mutualExchangeSession } = await supabase
        .from('mutual_exchange_sessions')
        .select('conversation_id')
        .or(`requester_id.eq.${userProfile.id},recipient_id.eq.${userProfile.id}`)
        .or(`requester_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
        .not('conversation_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (mutualExchangeSession?.conversation_id) {
        navigate(`/messages?conversation=${mutualExchangeSession.conversation_id}`);
        return;
      }

      // Create or get conversation
      const conversationId = await MessagingManager.getOrCreateConversation(
        userProfile.id,
        otherUserId
      );

      // Navigate to messages
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const loadPeerTreatmentData = async () => {
    try {
      setPractitionersLoading(true);

      // Get current user's rating tier for filtering
      const { data: currentUserData } = await supabase
        .from('users')
        .select('average_rating')
        .eq('id', userProfile?.id)
        .single();

      const currentUserRating = currentUserData?.average_rating 
        ? parseFloat(String(currentUserData.average_rating)) || 0 
        : 0;
      
      // Import getStarRatingTier to calculate user's tier
      const { getStarRatingTier } = await import('@/lib/treatment-exchange/matching');
      const currentUserTier = getStarRatingTier(currentUserRating);

      // Load practitioners (excluding current user, only opted-in)
      // Include average_rating from users table (kept up-to-date by database triggers)
      const { data: practitionersData, error: practitionersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          location,
          bio,
          experience_years,
          user_role,
          profile_photo_url,
          treatment_exchange_opt_in,
          average_rating,
          products:practitioner_products(*)
        `)
        .in('user_role', ['sports_therapist', 'osteopath', 'massage_therapist'])
        .eq('is_active', true)
        .eq('treatment_exchange_opt_in', true)
        .neq('id', userProfile?.id);

      if (practitionersError) {
        console.error('Error loading practitioners:', practitionersError);
        throw practitionersError;
      }

      // Get ratings and calculate credit costs, also fetch location coordinates
      // Filter by rating tier and process practitioners
      const practitionersWithData = (await Promise.all(
        (practitionersData || []).map(async (practitioner) => {
          try {
            // Get specializations from practitioner_specializations junction table
            const { data: specializationsData, error: specError } = await supabase
              .from('practitioner_specializations')
              .select('specialization_id, specializations(name)')
              .eq('practitioner_id', practitioner.id);

            if (specError) {
              console.warn(`Error fetching specializations for practitioner ${practitioner.id}:`, specError);
            }

            const specializations = specializationsData?.map(s => s.specializations?.name || '').filter(Boolean) || [];

            // Get location coordinates from user_locations table
            let latitude: number | undefined;
            let longitude: number | undefined;
            const { data: userLocation } = await supabase
              .from('user_locations')
              .select('latitude, longitude')
              .eq('user_id', practitioner.id)
              .eq('is_primary', true)
              .single();

            if (userLocation) {
              latitude = parseFloat(userLocation.latitude);
              longitude = parseFloat(userLocation.longitude);
            } else if (practitioner.location) {
              // Fallback: geocode location string
              try {
                const coords = await GeocodingService.geocodeAddress(practitioner.location);
                if (coords) {
                  latitude = coords.latitude;
                  longitude = coords.longitude;
                }
              } catch (geocodeError) {
                console.warn(`Error geocoding location for practitioner ${practitioner.id}:`, geocodeError);
              }
            }

            const { data: sessions } = await supabase
              .from('client_sessions')
              .select('id')
              .eq('therapist_id', practitioner.id)
              .eq('status', 'completed');

            // Use average_rating from users table (kept up-to-date by database triggers)
            // This is more efficient and real-time than calculating manually
            const averageRating = practitioner.average_rating 
              ? parseFloat(String(practitioner.average_rating)) || 0 
              : 0;
            
            // Filter by rating tier - only include practitioners in same tier as current user
            const practitionerTier = getStarRatingTier(averageRating);
            if (practitionerTier !== currentUserTier) {
              // Skip this practitioner - not in same rating tier
              return null;
            }

            // Filter products to only active ones
            const activeProducts = (practitioner.products || []).filter(p => p.is_active);

            // Calculate credit cost range from active products (1 credit per minute)
            let creditCostRange: { min: number; max: number } | undefined;
            if (activeProducts.length > 0) {
              const durations = activeProducts
                .map(p => p.duration_minutes)
                .filter((d): d is number => d !== null && d !== undefined && d > 0);

              if (durations.length > 0) {
                creditCostRange = {
                  min: Math.min(...durations),
                  max: Math.max(...durations)
                };
              }
            }

            return {
              ...practitioner,
              user_id: practitioner.id, // Add user_id for compatibility
              specializations: specializations,
              average_rating: averageRating,
              total_sessions: sessions?.length || 0,
              credit_cost_range: creditCostRange,
              email: practitioner.email, // Include email for notifications
              products: activeProducts, // Only include active products
              latitude,
              longitude
            };
          } catch (error: any) {
            console.error(`Error processing practitioner ${practitioner.id}:`, error);
            return null; // Return null on error, will be filtered out
          }
        })
      )).filter((p): p is NonNullable<typeof p> => p !== null); // Filter out null values

      setPractitioners(practitionersWithData);

      // Load my peer sessions from client_sessions table
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('client_sessions')
        .select(`
          id,
          therapist_id,
          client_id,
          session_date,
          start_time,
          duration_minutes,
          session_type,
          credit_cost,
          status,
          notes,
          created_at,
          appointment_type,
          visit_address,
          practitioner:users!client_sessions_therapist_id_fkey(
            first_name,
            last_name,
            user_role,
            location,
            clinic_address
          ),
          client:users!client_sessions_client_id_fkey(
            first_name,
            last_name,
            user_role,
            location
          )
        `)
        .eq('is_peer_booking', true)
        .or(`therapist_id.eq.${userProfile?.id},client_id.eq.${userProfile?.id}`)
        .order('session_date', { ascending: false });

      if (sessionsError) {
        console.error('Error loading peer sessions:', sessionsError);
        throw sessionsError;
      }

      // Transform to match PeerSession interface and add date-based validation
      const transformedSessions = (sessionsData || []).map(session => {
        // Calculate session end time
        const sessionDateTime = parseISO(`${session.session_date}T${session.start_time}`);
        const sessionEndTime = addMinutes(sessionDateTime, session.duration_minutes || 60);
        const now = new Date();
        
        // Determine actual status based on date/time and database status
        let actualStatus: 'scheduled' | 'completed' | 'cancelled' = session.status as 'scheduled' | 'completed' | 'cancelled';
        
        // If status is 'scheduled' but session is in the past, mark as 'completed' (no-show protection)
        if (actualStatus === 'scheduled' && isPast(sessionEndTime)) {
          // Only auto-update if session ended more than 1 hour ago (prevents race conditions)
          const hoursSinceEnd = (now.getTime() - sessionEndTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceEnd > 1) {
            actualStatus = 'completed'; // Past scheduled sessions are treated as completed/no-show
          }
        }
        
        return {
          id: session.id,
          practitioner_id: session.therapist_id,
          client_id: session.client_id,
          session_date: session.session_date,
          start_time: session.start_time,
          duration_minutes: session.duration_minutes,
          session_type: session.session_type,
          credit_cost: session.credit_cost || 0,
          status: actualStatus,
          notes: session.notes || '',
          created_at: session.created_at,
          appointment_type: session.appointment_type,
          visit_address: session.visit_address,
          practitioner: session.practitioner || { first_name: '', last_name: '', user_role: '', location: '', clinic_address: null },
          client: session.client || { first_name: '', last_name: '', user_role: '', location: '' },
          // Store original status and calculated end time for validation
          _originalStatus: session.status,
          _sessionEndTime: sessionEndTime.toISOString(),
          _isPast: isPast(sessionEndTime)
        };
      });

      // Deduplicate sessions - remove duplicates based on date, time, practitioner, and client
      const deduplicatedSessions = transformedSessions.filter((session, index, self) => {
        // Find sessions with same date, time, practitioner, and client
        const duplicateIndex = self.findIndex(s => 
          s.session_date === session.session_date &&
          s.start_time === session.start_time &&
          s.practitioner_id === session.practitioner_id &&
          s.client_id === session.client_id &&
          s.id !== session.id
        );
        
        // If duplicate found, keep the one with the most recent created_at or the one that's not cancelled
        if (duplicateIndex !== -1) {
          const duplicate = self[duplicateIndex];
          // Prefer non-cancelled sessions
          if (session.status === 'cancelled' && duplicate.status !== 'cancelled') {
            return false; // Remove this cancelled duplicate
          }
          if (session.status !== 'cancelled' && duplicate.status === 'cancelled') {
            return true; // Keep this non-cancelled one
          }
          // If both same status, keep the one with later created_at
          return new Date(session.created_at) >= new Date(duplicate.created_at);
        }
        
        return true; // No duplicate, keep it
      });

      setMySessions(deduplicatedSessions);

      // Load pending exchange requests
      const { data: sentRequests } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          recipient_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          session_type,
          status,
          requester_notes,
          recipient:users!treatment_exchange_requests_recipient_id_fkey(
            first_name,
            last_name,
            user_role
          )
        `)
        .eq('requester_id', userProfile?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const { data: receivedRequests } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          session_type,
          status,
          requester_notes,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            first_name,
            last_name,
            user_role
          )
        `)
        .eq('recipient_id', userProfile?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingRequests([
        ...(sentRequests || []).map((r: any) => ({ ...r, type: 'sent' as const })),
        ...(receivedRequests || []).map((r: any) => ({ ...r, type: 'received' as const }))
      ]);
    } catch (error) {
      console.error('Error loading peer treatment data:', error);
      toast.error('Failed to load peer treatment data');
    } finally {
      setPractitionersLoading(false);
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
      filtered = filtered.filter(p =>
        p.location && p.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Specialization filter
    if (selectedSpecialization !== 'all') {
      filtered = filtered.filter(p =>
        p.specializations && Array.isArray(p.specializations) && p.specializations.includes(selectedSpecialization)
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter);
      filtered = filtered.filter(p => {
        const rating = p.average_rating || 0;
        return rating >= minRating;
      });
    }

    // Distance filter and calculation
    if (searchLocationLat !== null && searchLocationLon !== null) {
      filtered = filtered.map(p => {
        if (p.latitude && p.longitude) {
          const distance = LocationManager.calculateDistance(
            searchLocationLat,
            searchLocationLon,
            p.latitude,
            p.longitude
          );
          return { ...p, distance };
        }
        return p;
      }).filter(p => {
        // Filter by radius if distance is calculated
        if (p.distance !== undefined) {
          return p.distance <= radiusKm;
        }
        // If no coordinates, include them (they won't be sorted by distance)
        return true;
      });

      // Sort by distance if enabled
      if (sortByDistance) {
        filtered.sort((a, b) => {
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      }
    }

    setFilteredPractitioners(filtered);
  };

  // Handle location search
  const handleLocationSearch = async (location: string) => {
    setLocationSearch(location);
    if (!location.trim()) {
      setSearchLocationLat(null);
      setSearchLocationLon(null);
      return;
    }

    try {
      const coords = await GeocodingService.geocodeAddress(location);
      if (coords) {
        setSearchLocationLat(coords.latitude);
        setSearchLocationLon(coords.longitude);
        toast.success(`Location set to ${location}`);
      } else {
        toast.error('Could not find location. Please try a different address.');
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
      toast.error('Error finding location. Please try again.');
    }
  };

  // Get user's current location
  const handleUseCurrentLocation = async () => {
    if (!userProfile?.id) {
      toast.error('Please sign in to use location features');
      return;
    }

    try {
      // Check consent (UK GDPR/PECR compliance)
      const hasConsent = await LocationManager.hasLocationConsent(userProfile.id);
      if (!hasConsent) {
        toast.error('Location consent required. Please grant location consent in your privacy settings.');
        return;
      }

      const location = await LocationManager.getCurrentLocation(userProfile.id);
      if (location) {
        setSearchLocationLat(location.latitude);
        setSearchLocationLon(location.longitude);
        const address = await GeocodingService.reverseGeocode(location.latitude, location.longitude);
        if (address) {
          setLocationSearch(address);
          toast.success('Using your current location');
        } else {
          setLocationSearch(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
          toast.success('Using your current location');
        }
      } else {
        toast.error('Could not get your current location. Please enable location permissions.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      toast.error('Error getting your location. Please try again.');
    }
  };

  const handleBooking = async () => {
    if (!selectedPractitioner || !bookingData.session_date || !bookingData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validation: Check user is a practitioner
    if (!userProfile?.user_role || !['osteopath', 'sports_therapist', 'massage_therapist'].includes(userProfile.user_role)) {
      toast.error('Only practitioners can book peer treatments');
      return;
    }

    // Validation: Check if current user is opted in to treatment exchange
    if (!userProfile?.treatment_exchange_opt_in) {
      toast.error('You must opt-in to treatment exchange to book sessions. Enable this in your settings.');
      return;
    }

    // Validation: Prevent self-booking
    if (selectedPractitioner.user_id === userProfile?.id) {
      toast.error('Cannot book a session with yourself');
      return;
    }

    // Validation: Check practitioner is active and get actual credit cost
    // Note: This check may need to be added to the practitioner data loading
    // Get actual credit cost from backend for accurate validation
    let requiredCredits: number;
    try {
      requiredCredits = await getPractitionerCreditCost(
        selectedPractitioner.user_id,
        bookingData.duration_minutes
      );
    } catch (error) {
      console.warn('Error getting credit cost, using fallback:', error);
      // Fallback to calculation (1 credit per minute)
      requiredCredits = calculateCreditCost(bookingData.duration_minutes);
    }

    if (selectedPractitioner.id && currentBalance < requiredCredits) {
      toast.error(`Insufficient credits. You need ${requiredCredits} credits but only have ${currentBalance}.`);
      return;
    }

    try {
      setBooking(true);

      // Calculate end_time from start_time and duration_minutes
      const calculateEndTime = (startTime: string, durationMinutes: number): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        const endHours = endDate.getHours().toString().padStart(2, '0');
        const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
        return `${endHours}:${endMinutes}`;
      };

      const endTime = calculateEndTime(bookingData.start_time, bookingData.duration_minutes);

      // Send exchange request instead of directly creating booking
      await TreatmentExchangeService.sendExchangeRequest(
        userProfile?.id!,
        selectedPractitioner.user_id,
        {
          session_date: bookingData.session_date,
          start_time: bookingData.start_time,
          end_time: endTime,
          duration_minutes: bookingData.duration_minutes,
          session_type: bookingData.session_type,
          notes: bookingData.notes
        }
      );

      toast.success(`Treatment exchange request sent! ${selectedPractitioner.first_name} ${selectedPractitioner.last_name} will review your request. Credits will only be deducted if the request is accepted.`);
      setShowBookingForm(false);
      setSelectedPractitioner(null);
      setBookingData({
        session_date: '',
        start_time: '',
        duration_minutes: 0, // Will be set dynamically from selected service
        session_type: '',
        notes: ''
      });
      loadCreditsData(); // Reload credits to refresh balance
      loadPeerTreatmentData(); // Reload peer treatment data
    } catch (error: any) {
      console.error('Error booking session:', error);
      const errorMessage = error?.message || 'Failed to book session';
      toast.error(errorMessage);
      loadCreditsData();
    } finally {
      setBooking(false);
    }
  };

  const handleAcceptExchangeRequest = (request: any) => {
    if (!userProfile?.id) {
      toast.error('You must be logged in to accept requests');
      return;
    }

    console.log('🔍 Accept clicked, request data:', {
      id: request.id,
      requester_id: request.requester_id,
      requester: request.requester,
      type: request.type
    });

    // Ensure requester_id is set (it should be from the query)
    if (!request.requester_id && request.type === 'received') {
      console.warn('⚠️ Missing requester_id, trying to extract from requester object');
      // Try to get it from the requester object if available
      // This shouldn't happen if the query is correct, but adding as fallback
    }

    // Show the acceptance modal with service selection
    setSelectedExchangeRequest(request);
    setShowAcceptanceModal(true);
    console.log('✅ Modal should open now');
  };

  const handleExchangeAccepted = async () => {
    setSelectedExchangeRequest(null);
    setShowAcceptanceModal(false);

    // Reload data to reflect changes - add small delay to ensure credit processing completes
    setTimeout(() => {
      console.log('🔄 Delayed reload of credits data');
      loadCreditsData();
      loadPeerTreatmentData();
    }, 1000);

    // Also reload immediately in case the delay isn't needed
    loadPeerTreatmentData();
    loadCreditsData();
  };

  const handleDeclineExchangeRequest = async (request: any) => {
    if (!userProfile?.id) {
      toast.error('You must be logged in to decline requests');
      return;
    }

    if (!window.confirm(`Decline treatment exchange request from ${request.requester?.first_name} ${request.requester?.last_name}?`)) {
      return;
    }

    try {
      setRespondingToRequest(request.id);

      await TreatmentExchangeService.declineExchangeRequest(
        request.id,
        userProfile.id
      );

      toast.success('Treatment exchange request declined');

      // Reload data to reflect changes
      loadPeerTreatmentData();
      loadCreditsData();
    } catch (error: any) {
      console.error('Error declining exchange request:', error);
      toast.error(error?.message || 'Failed to decline request');
    } finally {
      setRespondingToRequest(null);
    }
  };

  const handleCancelPeerBooking = async (session: PeerSession, reason?: string) => {
    // Stricter validation to prevent scams and wrongful refunds
    if (session.status === 'cancelled') {
      toast.error('This booking is already cancelled');
      return;
    }

    if (session.status === 'completed') {
      toast.error('Cannot cancel a completed session');
      return;
    }

    // Validate session is not in the past
    try {
      const sessionDateTime = parseISO(`${session.session_date}T${session.start_time}`);
      const sessionEndTime = addMinutes(sessionDateTime, session.duration_minutes || 60);
      
      if (isPast(sessionEndTime)) {
        toast.error('Cannot cancel a session that has already ended');
        return;
      }

      // Check if session has already started
      const now = new Date();
      if (isBefore(sessionDateTime, now)) {
        toast.error('This session has already started and cannot be cancelled');
        return;
      }
    } catch (error) {
      console.error('Error validating session date:', error);
      toast.error('Error validating session. Please try again.');
      return;
    }

    // Additional validation: Check if credits were actually deducted
    // This prevents refunding credits that were never deducted
    if (!session.credit_cost || session.credit_cost === 0) {
      toast.warning('This session has no credit cost. Cancellation will not result in a refund.');
    }

    try {
      setCancelling(true);

      // Call refund RPC function
      console.log('🔄 Processing refund for session:', session.id, {
        credit_cost: session.credit_cost,
        payment_status: session.payment_status,
        status: session.status
      });

      const { data: refundResult, error: refundError } = await supabase
        .rpc('process_peer_booking_refund', {
          p_session_id: session.id,
          p_cancellation_reason: reason || 'Cancelled by user'
        });

      console.log('💰 Refund result:', { refundResult, refundError });

      if (refundError) {
        console.error('❌ Refund RPC error:', refundError);
        throw new Error(refundError.message || 'Refund processing failed');
      }

      if (!refundResult) {
        console.error('❌ No refund result returned');
        throw new Error('Refund processing failed: No result returned');
      }

      if (!refundResult.success) {
        console.error('❌ Refund failed:', refundResult.error);
        // If credits were never deducted, still allow cancellation but inform user
        if (refundResult.error?.includes('No credits to refund') || refundResult.error?.includes('credit_cost')) {
          toast.warning('Booking cancelled, but no credits were refunded because credits were never deducted from your account.');
        } else {
          throw new Error(refundResult.error || 'Refund processing failed');
        }
      }

      // Validate refund amount
      if (!refundResult.refunded_credits || refundResult.refunded_credits === 0) {
        console.warn('⚠️ Refund returned 0 credits:', {
          refundResult,
          session_credit_cost: session.credit_cost
        });
        toast.warning('Booking cancelled, but no credits were refunded. This may indicate credits were never deducted when the booking was accepted.');
      }

      // Send cancellation notification
      try {
        // Get practitioner email for notification
        const { data: practitionerData } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', session.practitioner_id)
          .single();

        const clientName = `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim() || userProfile?.email || 'Practitioner';
        const clientEmail = userProfile?.email || '';
        const practitionerName = practitionerData
          ? `${practitionerData.first_name} ${practitionerData.last_name}`.trim() || 'Practitioner'
          : session.practitioner.first_name && session.practitioner.last_name
            ? `${session.practitioner.first_name} ${session.practitioner.last_name}`
            : 'Practitioner';
        const practitionerEmail = practitionerData?.email || '';

        const cancelledBy = session.client_id === userProfile?.id ? 'client' : 'practitioner';

        await NotificationSystem.sendPeerCancellationNotification(
          session.id,
          cancelledBy,
          session.client_id,
          session.practitioner_id,
          {
            sessionType: session.session_type,
            sessionDate: session.session_date,
            sessionTime: session.start_time,
            creditCost: session.credit_cost
          },
          clientName,
          clientEmail,
          practitionerName,
          practitionerEmail,
          'Cancelled by user'
        );
      } catch (notificationError) {
        console.error('Error sending cancellation notification (non-critical):', notificationError);
        // Don't fail the cancellation if notifications fail
      }

      // Only show success message if credits were actually refunded
      if (refundResult.refunded_credits && refundResult.refunded_credits > 0) {
        toast.success(`Booking cancelled. ${refundResult.refunded_credits} credits refunded to your account.`);
      } else {
        toast.success('Booking cancelled successfully.');
      }

      // Close dialog
      setCancelDialogOpen(false);
      setSessionToCancel(null);

      // Reload data with delay to ensure database updates have propagated
      // The refund function updates total_spent, so we need to wait for the update to complete
      setTimeout(() => {
        loadCreditsData();
        loadPeerTreatmentData();
      }, 500);
    } catch (error: any) {
      console.error('Error cancelling peer booking:', error);
      toast.error(error?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const openCancelDialog = (session: PeerSession) => {
    // Stricter validation to prevent scams
    if (session.status === 'cancelled') {
      toast.error('This booking is already cancelled');
      return;
    }

    if (session.status === 'completed') {
      toast.error('Cannot cancel a completed session');
      return;
    }

    // Check if session is in the past - prevent cancelling past sessions
    try {
      const sessionDateTime = parseISO(`${session.session_date}T${session.start_time}`);
      const sessionEndTime = addMinutes(sessionDateTime, session.duration_minutes || 60);
      
      if (isPast(sessionEndTime)) {
        toast.error('Cannot cancel a session that has already ended');
        return;
      }

      // Check if session has already started (within 15 minutes of start time)
      const now = new Date();
      const minutesUntilStart = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60);
      
      if (minutesUntilStart < 0) {
        toast.error('This session has already started and cannot be cancelled');
        return;
      }

      // Warn if cancelling within 24 hours (but allow it)
      if (minutesUntilStart < 1440) {
        // Less than 24 hours - show warning but allow
        console.warn('Cancelling session within 24 hours:', minutesUntilStart, 'minutes');
      }
    } catch (error) {
      console.error('Error validating session date:', error);
      toast.error('Error validating session. Please try again.');
      return;
    }

    setSessionToCancel(session);
    setCancelDialogOpen(true);
  };

  const handleTreatmentExchangeOptInToggle = async (checked: boolean) => {
    try {
      // Use AuthContext's updateProfile to ensure userProfile is updated immediately
      const { error } = await updateProfile({ treatment_exchange_opt_in: checked });

      if (error) throw error;

      toast.success(
        checked
          ? 'You are now opted in to treatment exchange'
          : 'You have opted out of treatment exchange'
      );

      // Auto-show search when enabling, hide when disabling
      setShowSearch(checked);

      // Reload data to update UI
      if (checked) {
        loadPeerTreatmentData();
      }
    } catch (error) {
      console.error('Error updating treatment exchange opt-in:', error);
      toast.error('Failed to update treatment exchange settings');
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

  const clearAllExchangeFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setRatingFilter('all');
    setLocationSearch('');
    setSearchLocationLat(null);
    setSearchLocationLon(null);
    setRadiusKm(50);
    setSortByDistance(false);
  };

  const renderStars = (rating: number) => {
    const r = Math.min(5, Math.max(0, rating));
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 shrink-0 transition-colors ${
          i < Math.floor(r) ? 'fill-amber-500 text-amber-500' : 'fill-gray-200 text-gray-200'
        }`}
        aria-hidden
      />
    ));
  };

  const getStatusBadge = (status: string, sessionDate?: string, startTime?: string, durationMinutes?: number) => {
    // Check if session is in the past
    let isPastSession = false;
    if (sessionDate && startTime && durationMinutes) {
      try {
        const sessionDateTime = parseISO(`${sessionDate}T${startTime}`);
        const sessionEndTime = addMinutes(sessionDateTime, durationMinutes);
        isPastSession = isPast(sessionEndTime);
      } catch (e) {
        // If date parsing fails, use status as-is
      }
    }

    switch (status) {
      case 'scheduled':
        // If scheduled but in the past, show as "Past" or "No Show"
        if (isPastSession) {
          return <Badge variant="outline" className="bg-gray-50 text-gray-700">Past</Badge>;
        }
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Scheduled</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const uniqueLocations = [...new Set(
    practitioners
      .map(p => p.location)
      .filter((loc): loc is string => Boolean(loc && loc.trim()))
  )];
  const uniqueSpecializations = [...new Set(
    practitioners
      .flatMap(p => (Array.isArray(p.specializations) ? p.specializations : []))
      .filter((spec): spec is string => Boolean(spec))
  )];

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



  // totalEarned and totalSpent now come from database state, not calculated from transactions

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading treatment exchange...</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Treatment Exchange</h1>
            <p className="text-sm text-muted-foreground mb-2">Exchange treatments with other practitioners using credits</p>
            <div className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">How to use your credits: </span>
              Use your credits for our peer treatment exchange, or save your credits for our upcoming CPD sessions.
            </div>
          </div>
        </div>

        {/* Credit Balance Overview - Table (Compact) */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold text-sm">Credit Summary</th>
                  <th className="text-right p-2 font-semibold text-sm">Amount</th>
                  <th className="text-left p-2 font-semibold text-sm">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-2 font-medium text-sm">Available Credits</td>
                  <td className="p-2 text-right">
                    <span className="text-xl font-bold">{currentBalance}</span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">Current balance</td>
                </tr>
                <tr className="border-b hover:bg-muted/50 transition-colors">
                  <td className="p-2 font-medium text-sm">Total Earned</td>
                  <td className="p-2 text-right">
                    <span className="text-xl font-bold text-green-600">+{totalEarned}</span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">From subscriptions and client sessions</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="p-2 font-medium text-sm">Total Spent</td>
                  <td className="p-2 text-right">
                    <span className="text-xl font-bold text-red-600">-{totalSpent}</span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">On treatment exchange bookings</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        {/* Peer Treatment Section */}
        <div className="space-y-6">
          {/* Section Hero - Marketplace style */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Find Exchange Partners</h1>
            <p className="text-muted-foreground">Search and book treatment sessions with other practitioners using credits</p>
          </div>

          {/* Treatment Exchange Participation - Single Card for Practitioners */}
          {userProfile?.user_role && ['sports_therapist', 'osteopath', 'massage_therapist'].includes(userProfile.user_role) && (
            <Card className={userProfile.treatment_exchange_opt_in ? 'border-primary/20' : 'border-muted'}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${userProfile.treatment_exchange_opt_in ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Users className={`h-5 w-5 ${userProfile.treatment_exchange_opt_in ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">
                          {userProfile.treatment_exchange_opt_in ? 'Participating in Treatment Exchange' : 'Enable Treatment Exchange'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {userProfile.treatment_exchange_opt_in 
                            ? 'Other practitioners can book sessions with you using credits'
                            : 'Allow other practitioners to book sessions with you using credits. You can also book sessions with them.'}
                    </p>
                      </div>
                    </div>
                    {!userProfile.treatment_exchange_opt_in && (
                      <div className="mt-3 p-3 rounded-md bg-muted/50 border border-muted">
                        <p className="text-xs text-muted-foreground">
                          Enable this feature to view and book sessions with other practitioners.
                        </p>
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={userProfile.treatment_exchange_opt_in ?? false}
                    onCheckedChange={handleTreatmentExchangeOptInToggle}
                    className="flex-shrink-0"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Only show search, practitioners, and sessions if treatment exchange is enabled */}
          {userProfile?.treatment_exchange_opt_in && (
            <>
          {/* Marketplace-style search and filters - visible when showSearch */}
          {showSearch && (
            <div className="mb-6 space-y-4">
              {/* Prominent search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search practitioners, locations, specializations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base"
                  aria-label="Search exchange partners"
                />
              </div>

              {/* Active filter chips */}
              {(
                selectedRole !== 'all' ||
                (ratingFilter && ratingFilter !== 'all') ||
                (searchLocationLat !== null && searchLocationLon !== null) ||
                radiusKm !== 50 ||
                sortByDistance
              ) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filters:</span>
                  {selectedRole !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {getRoleDisplayName(selectedRole)}
                      <button type="button" onClick={() => setSelectedRole('all')} className="ml-1 hover:text-destructive" aria-label={`Clear role filter`}>×</button>
                    </Badge>
                  )}
                  {ratingFilter && ratingFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      {ratingFilter}+ Stars
                      <button type="button" onClick={() => setRatingFilter('all')} className="ml-1 hover:text-destructive" aria-label="Clear rating filter">×</button>
                    </Badge>
                  )}
                  {searchLocationLat !== null && searchLocationLon !== null && (
                    <Badge variant="secondary" className="gap-1">
                      Near location
                      <button type="button" onClick={() => { setLocationSearch(''); setSearchLocationLat(null); setSearchLocationLon(null); }} className="ml-1 hover:text-destructive" aria-label="Clear location">×</button>
                    </Badge>
                  )}
                  {radiusKm !== 50 && (
                    <Badge variant="secondary" className="gap-1">
                      ≤ {radiusKm} km
                      <button type="button" onClick={() => setRadiusKm(50)} className="ml-1 hover:text-destructive" aria-label="Clear radius">×</button>
                    </Badge>
                  )}
                  {sortByDistance && (
                    <Badge variant="secondary" className="gap-1">
                      Distance
                      <button type="button" onClick={() => setSortByDistance(false)} className="ml-1 hover:text-destructive" aria-label="Clear sort">×</button>
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearAllExchangeFilters} className="text-muted-foreground hover:text-foreground">
                    Clear all
                  </Button>
                </div>
              )}

              {/* Show / Hide filters toggle and results count */}
              <div className="flex items-center justify-between">
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2 h-12 px-6 text-base font-medium"
                  aria-expanded={showFilters}
                >
                  <Filter className="h-5 w-5" />
                  {showFilters ? 'Hide filters' : 'Show filters'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {filteredPractitioners.length} practitioner{filteredPractitioners.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Collapsible filter Card */}
              {showFilters && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">Profession</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
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
                        <Label className="text-sm">Minimum Rating</Label>
                        <Select value={ratingFilter || 'all'} onValueChange={setRatingFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="3">3+ Stars</SelectItem>
                            <SelectItem value="4">4+ Stars</SelectItem>
                            <SelectItem value="5">5 Stars</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Sort by</Label>
                        <Select value={sortByDistance ? 'distance' : 'default'} onValueChange={(v) => setSortByDistance(v === 'distance')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="distance">Distance (Closest First)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Radius: {radiusKm} km</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            id="radius"
                            min="5"
                            max="200"
                            step="5"
                            value={radiusKm}
                            onChange={(e) => setRadiusKm(Number(e.target.value))}
                            className="flex-1"
                            aria-label="Search radius in km"
                          />
                          <span className="text-sm text-muted-foreground w-12">{radiusKm} km</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Search by location</Label>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          placeholder="Enter address or city"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleLocationSearch(locationSearch); }}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" onClick={handleUseCurrentLocation} title="Use current location">
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                      {searchLocationLat !== null && searchLocationLon !== null && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setLocationSearch(''); setSearchLocationLat(null); setSearchLocationLon(null); }} className="mt-2 text-xs">
                          Clear location
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Practitioners grid - Marketplace-style cards */}
          {showSearch && (
            <>
              {practitionersLoading ? (
                <PractitionerGridSkeleton count={6} />
              ) : filteredPractitioners.length === 0 ? (
                <EmptyPractitioners onClearFilters={clearAllExchangeFilters} onSearch={clearAllExchangeFilters} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPractitioners.map((practitioner) => {
                    const locationImageUrl = getBestLocationImageUrl(
                      practitioner.latitude,
                      practitioner.longitude,
                      practitioner.location,
                      600,
                      240
                    );
                    const insufficientCredits = practitioner.credit_cost_range ? currentBalance < practitioner.credit_cost_range.min : false;
                    return (
                      <Card
                        key={practitioner.id}
                        className="group relative overflow-hidden bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border shadow-sm hover:border-gray-300 dark:hover:border-border transition-[border-color,background-color] duration-200 ease-out focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
                        tabIndex={0}
                      >
                        {locationImageUrl && (
                          <div className="relative w-full h-40 overflow-hidden bg-gray-100 dark:bg-muted rounded-t-xl">
                            <img
                              src={locationImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <CardHeader className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 border border-gray-200 dark:border-border flex-shrink-0">
                              <AvatarImage src={practitioner.profile_photo_url || undefined} />
                              <AvatarFallback className="bg-gray-100 dark:bg-muted text-gray-700 dark:text-foreground font-medium text-sm">
                                {practitioner.first_name?.[0] || ''}{practitioner.last_name?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <CardTitle className="text-base font-semibold text-gray-900 dark:text-foreground leading-tight mb-1">
                                {practitioner.first_name || ''} {practitioner.last_name || ''}
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(practitioner.user_role)}`}>
                                  {getRoleDisplayName(practitioner.user_role)}
                                </span>
                                <span className="flex items-center gap-0.5" aria-hidden>
                                  {renderStars(practitioner.average_rating ?? 0)}
                                </span>
                                {practitioner.average_rating != null && practitioner.average_rating > 0 ? (
                                  <>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-foreground">
                                      {practitioner.average_rating.toFixed(1)}
                                    </span>
                                    {getStarTierLabel(practitioner.average_rating) && (
                                      <Badge variant="outline" className="text-xs bg-muted/50 text-foreground/70 border-border">
                                        {getStarTierLabel(practitioner.average_rating)}
                                      </Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs font-medium text-gray-500 dark:text-muted-foreground">New practitioner</span>
                                )}
                              </div>
                              <CardDescription className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                                <span className="line-clamp-2">{practitioner.location || 'Location not specified'}</span>
                                {practitioner.distance !== undefined && (
                                  <span className="text-xs font-medium text-primary shrink-0">• {practitioner.distance.toFixed(1)} km away</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 space-y-3">
                          {practitioner.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {practitioner.specializations.slice(0, 3).map((spec) => (
                                <span key={spec} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 dark:bg-muted text-gray-700 dark:text-foreground border border-gray-200 dark:border-border">
                                  {spec}
                                </span>
                              ))}
                              {practitioner.specializations.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-gray-500 border border-gray-200 dark:border-border bg-transparent">
                                  +{practitioner.specializations.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {practitioner.bio && (
                            <p className="text-xs text-gray-600 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                              {practitioner.bio}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-border">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-muted-foreground">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium text-foreground">{practitioner.experience_years} years</span>
                              <span className="text-muted-foreground">experience</span>
                            </div>
                            {practitioner.credit_cost_range && (
                              <div className="flex items-center gap-1">
                                <Coins className="h-3.5 w-3.5 text-foreground/60" />
                                <span className="text-sm font-semibold text-foreground">
                                  {practitioner.credit_cost_range.min === practitioner.credit_cost_range.max
                                    ? `${practitioner.credit_cost_range.min} credits`
                                    : `${practitioner.credit_cost_range.min}–${practitioner.credit_cost_range.max} credits`}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedProfileId(practitioner.id); setProfileModalOpen(true); }}
                              className="min-h-[44px] shrink-0 text-xs font-medium"
                              aria-label={`View profile of ${practitioner.first_name} ${practitioner.last_name}`}
                            >
                              <UserIcon className="h-4 w-4 mr-2" />
                              View profile
                            </Button>
                            <Button
                              onClick={() => { setSelectedPractitioner(practitioner); setShowBookingForm(true); }}
                              disabled={insufficientCredits}
                              className="min-h-[44px] flex-1 sm:flex-initial px-4 py-3 text-sm font-medium"
                              aria-label={`Book with credits: ${practitioner.first_name} ${practitioner.last_name}`}
                            >
                              <Coins className="h-4 w-4 mr-2 shrink-0" />
                              Book with credits
                            </Button>
                          </div>
                          {insufficientCredits && (
                            <p className="text-xs text-destructive text-center">Insufficient credits</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* My Sessions Sidebar - Show when search is active */}
          {showSearch && (
            <div className="mt-6">
              <Card className="sticky top-6">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSessionsSidebarOpen(!sessionsSidebarOpen)}
                >
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      My Peer Sessions
                    </div>
                    {sessionsSidebarOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>
                </CardHeader>
                {sessionsSidebarOpen && (
                  <CardContent>
                    {/* Show pending requests first */}
                    {pendingRequests.length > 0 && (
                      <div className="mb-5 pb-5 border-b">
                        <h6 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                          Pending Requests
                        </h6>
                        <div className="space-y-2.5">
                          {pendingRequests.slice(0, 3).map((request: any) => (
                            <div key={request.id} className="border rounded-lg p-3 bg-muted/50 hover:bg-muted/70 transition-colors">
                              <div className="flex items-start justify-between mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <h6 className="font-medium text-xs mb-1">
                                    {request.type === 'sent'
                                      ? `Request to ${request.recipient?.first_name} ${request.recipient?.last_name}`
                                      : `Request from ${request.requester?.first_name} ${request.requester?.last_name}`
                                    }
                                  </h6>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(request.requested_session_date), 'MMM dd')} at {formatTimeWithoutSeconds(request.requested_start_time)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">Pending</Badge>
                              </div>
                              {request.session_type && (
                                <p className="text-xs text-muted-foreground mt-1.5 mb-2">{request.session_type}</p>
                              )}
                              {/* Show Accept/Decline buttons only for received requests */}
                              {request.type === 'received' && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="flex-1 h-7 text-xs"
                                    disabled={respondingToRequest === request.id}
                                    onClick={() => handleAcceptExchangeRequest(request)}
                                  >
                                    {respondingToRequest === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                        Accepting...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Accept
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-xs"
                                    disabled={respondingToRequest === request.id}
                                    onClick={() => handleDeclineExchangeRequest(request)}
                                  >
                                    {respondingToRequest === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                        Declining...
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-3 w-3 mr-1" />
                                        Decline
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                              {/* Message button for all requests */}
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full h-7 text-xs"
                                  onClick={() => {
                                    const otherUserId = request.type === 'sent'
                                      ? request.recipient_id
                                      : request.requester_id;
                                    handleMessageUser(otherUserId);
                                  }}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Message
                                </Button>
                              </div>
                            </div>
                          ))}
                          {pendingRequests.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs h-8"
                              onClick={() => window.location.href = '/practice/exchange-requests'}
                            >
                              View All Requests ({pendingRequests.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show confirmed sessions */}
                    {mySessions.length === 0 && pendingRequests.length === 0 ? (
                      <div className="text-center py-10">
                        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No peer sessions yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Book a session to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.length > 0 && (
                          <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Confirmed Sessions
                          </h6>
                        )}
                        {(() => {
                          const startIndex = (sessionsPage - 1) * sessionsPerPage;
                          const endIndex = startIndex + sessionsPerPage;
                          const paginatedSessions = mySessions.slice(startIndex, endIndex);
                          return paginatedSessions.map((session) => {
                            const isReceiving = session.practitioner_id !== userProfile?.id;
                            const isProviding = session.practitioner_id === userProfile?.id;
                            
                            return (
                            <div 
                              key={session.id} 
                              className={`border rounded-lg p-3 transition-[border-color,background-color] duration-200 ease-out ${
                                isReceiving 
                                  ? 'border-l-4 border-l-blue-200 bg-blue-50/30' 
                                  : isProviding 
                                  ? 'border-l-4 border-l-emerald-200 bg-emerald-50/30'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-xs mb-1 leading-tight break-words">
                                    {isProviding
                                      ? session.status === 'completed'
                                        ? `Provided treatment for ${session.client.first_name} ${session.client.last_name}`
                                        : `Providing treatment for ${session.client.first_name} ${session.client.last_name}`
                                      : session.status === 'completed'
                                        ? `Received treatment from ${session.practitioner.first_name} ${session.practitioner.last_name}`
                                        : `Receiving treatment from ${session.practitioner.first_name} ${session.practitioner.last_name}`
                                    }
                                  </h5>
                                  <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(session.session_date), 'MMM dd, yyyy')} at {formatTimeWithoutSeconds(session.start_time)}
                                    </p>
                                    {(() => {
                                      const { sessionLocation } = getSessionLocation(session, session.practitioner);
                                      return sessionLocation ? (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <MapPin className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{sessionLocation}</span>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                                <div className="ml-1 flex-shrink-0">
                                  {getStatusBadge(session.status, session.session_date, session.start_time, session.duration_minutes)}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-2 border-t">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground truncate">{session.session_type}</span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Coins className="h-3.5 w-3.5 text-yellow-600" />
                                    <span className="text-xs font-semibold">{session.credit_cost} credits</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => {
                                      const otherUserId = session.practitioner_id === userProfile?.id
                                        ? session.client_id
                                        : session.practitioner_id;
                                      handleMessageUser(otherUserId);
                                    }}
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Message
                                  </Button>
                                  {(() => {
                                    // Only show cancel button for future scheduled sessions
                                    try {
                                      const sessionDateTime = parseISO(`${session.session_date}T${session.start_time}`);
                                      const sessionEndTime = addMinutes(sessionDateTime, session.duration_minutes || 60);
                                      const isFutureSession = !isPast(sessionEndTime);
                                      
                                      return session.status === 'scheduled' && isFutureSession ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs px-2"
                                          onClick={() => openCancelDialog(session)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      ) : null;
                                    } catch (e) {
                                      // If date parsing fails, only show for scheduled status
                                      return session.status === 'scheduled' ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs px-2"
                                          onClick={() => openCancelDialog(session)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      ) : null;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                            );
                          });
                        })()}
                        {mySessions.length > sessionsPerPage && (
                          <div className="flex items-center justify-between gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={sessionsPage === 1}
                              onClick={() => setSessionsPage(prev => Math.max(1, prev - 1))}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {sessionsPage} of {Math.ceil(mySessions.length / sessionsPerPage)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={sessionsPage >= Math.ceil(mySessions.length / sessionsPerPage)}
                              onClick={() => setSessionsPage(prev => Math.min(Math.ceil(mySessions.length / sessionsPerPage), prev + 1))}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          )}

          {/* Show sidebar when search is not active */}
          {!showSearch && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-3">
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Find Peer Practitioners</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Connect with other practitioners and exchange treatments. Optional service for peer practitioners to support each other—uses credits from your subscription, no additional payment required.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => {
                        setShowSearch(true);
                        loadPeerTreatmentData();
                      }}
                    >
                      <Users className="h-5 w-5 mr-2" />
                      Find Peer Practitioners
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="xl:col-span-3">
                <Card className="sticky top-6">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSessionsSidebarOpen(!sessionsSidebarOpen)}
                  >
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        My Peer Sessions
                      </div>
                      {sessionsSidebarOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {sessionsSidebarOpen && (
                    <CardContent>
                    {/* Show pending requests first */}
                    {pendingRequests.length > 0 && (
                      <div className="mb-5 pb-5 border-b">
                        <h6 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                          Pending Requests
                        </h6>
                        <div className="space-y-2.5">
                          {pendingRequests.slice(0, 3).map((request: any) => (
                            <div key={request.id} className="border rounded-lg p-3 bg-muted/50 hover:bg-muted/70 transition-colors">
                              <div className="flex items-start justify-between mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <h6 className="font-medium text-xs mb-1">
                                    {request.type === 'sent'
                                      ? `Request to ${request.recipient?.first_name} ${request.recipient?.last_name}`
                                      : `Request from ${request.requester?.first_name} ${request.requester?.last_name}`
                                    }
                                  </h6>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(request.requested_session_date), 'MMM dd')} at {formatTimeWithoutSeconds(request.requested_start_time)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">Pending</Badge>
                              </div>
                              {request.session_type && (
                                <p className="text-xs text-muted-foreground mt-1.5 mb-2">{request.session_type}</p>
                              )}
                              {/* Show Accept/Decline buttons only for received requests */}
                              {request.type === 'received' && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="flex-1 h-7 text-xs"
                                    disabled={respondingToRequest === request.id}
                                    onClick={() => handleAcceptExchangeRequest(request)}
                                  >
                                    {respondingToRequest === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                        Accepting...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Accept
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7 text-xs"
                                    disabled={respondingToRequest === request.id}
                                    onClick={() => handleDeclineExchangeRequest(request)}
                                  >
                                    {respondingToRequest === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                        Declining...
                                      </>
                                    ) : (
                                      <>
                                        <X className="h-3 w-3 mr-1" />
                                        Decline
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                              {/* Message button for all requests */}
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full h-7 text-xs"
                                  onClick={() => {
                                    const otherUserId = request.type === 'sent'
                                      ? request.recipient_id
                                      : request.requester_id;
                                    handleMessageUser(otherUserId);
                                  }}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Message
                                </Button>
                              </div>
                            </div>
                          ))}
                          {pendingRequests.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs h-8"
                              onClick={() => window.location.href = '/practice/exchange-requests'}
                            >
                              View All Requests ({pendingRequests.length})
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show confirmed sessions */}
                    {mySessions.length === 0 && pendingRequests.length === 0 ? (
                      <div className="text-center py-10">
                        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No peer sessions yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Book a session to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.length > 0 && (
                          <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Confirmed Sessions
                          </h6>
                        )}
                        {(() => {
                          const startIndex = (sessionsPage - 1) * sessionsPerPage;
                          const endIndex = startIndex + sessionsPerPage;
                          const paginatedSessions = mySessions.slice(startIndex, endIndex);
                          return paginatedSessions.map((session) => {
                            const isReceiving = session.practitioner_id !== userProfile?.id;
                            const isProviding = session.practitioner_id === userProfile?.id;
                            
                            return (
                            <div 
                              key={session.id} 
                              className={`border rounded-lg p-3 transition-[border-color,background-color] duration-200 ease-out ${
                                isReceiving 
                                  ? 'border-l-4 border-l-blue-200 bg-blue-50/30' 
                                  : isProviding 
                                  ? 'border-l-4 border-l-emerald-200 bg-emerald-50/30'
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-xs mb-1 leading-tight break-words">
                                    {isProviding
                                      ? session.status === 'completed'
                                        ? `Provided treatment for ${session.client.first_name} ${session.client.last_name}`
                                        : `Providing treatment for ${session.client.first_name} ${session.client.last_name}`
                                      : session.status === 'completed'
                                        ? `Received treatment from ${session.practitioner.first_name} ${session.practitioner.last_name}`
                                        : `Receiving treatment from ${session.practitioner.first_name} ${session.practitioner.last_name}`
                                    }
                                  </h5>
                                  <div className="space-y-0.5">
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(session.session_date), 'MMM dd, yyyy')} at {formatTimeWithoutSeconds(session.start_time)}
                                    </p>
                                    {(() => {
                                      const { sessionLocation } = getSessionLocation(session, session.practitioner);
                                      return sessionLocation ? (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <MapPin className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{sessionLocation}</span>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                                <div className="ml-1 flex-shrink-0">
                                  {getStatusBadge(session.status, session.session_date, session.start_time, session.duration_minutes)}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 pt-2 border-t">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground truncate">{session.session_type}</span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <Coins className="h-3.5 w-3.5 text-yellow-600" />
                                    <span className="text-xs font-semibold">{session.credit_cost} credits</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => {
                                      const otherUserId = session.practitioner_id === userProfile?.id
                                        ? session.client_id
                                        : session.practitioner_id;
                                      handleMessageUser(otherUserId);
                                    }}
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Message
                                  </Button>
                                  {(() => {
                                    // Only show cancel button for future scheduled sessions
                                    try {
                                      const sessionDateTime = parseISO(`${session.session_date}T${session.start_time}`);
                                      const sessionEndTime = addMinutes(sessionDateTime, session.duration_minutes || 60);
                                      const isFutureSession = !isPast(sessionEndTime);
                                      
                                      return session.status === 'scheduled' && isFutureSession ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs px-2"
                                          onClick={() => openCancelDialog(session)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      ) : null;
                                    } catch (e) {
                                      // If date parsing fails, only show for scheduled status
                                      return session.status === 'scheduled' ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs px-2"
                                          onClick={() => openCancelDialog(session)}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      ) : null;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                            );
                          });
                        })()}
                        {mySessions.length > sessionsPerPage && (
                          <div className="flex items-center justify-between gap-2 pt-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={sessionsPage === 1}
                              onClick={() => setSessionsPage(prev => Math.max(1, prev - 1))}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Page {sessionsPage} of {Math.ceil(mySessions.length / sessionsPerPage)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={sessionsPage >= Math.ceil(mySessions.length / sessionsPerPage)}
                              onClick={() => setSessionsPage(prev => Math.min(Math.ceil(mySessions.length / sessionsPerPage), prev + 1))}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  )}
                </Card>
              </div>
            </div>
            )}
            </>
          )}
        </div>

        {/* Booking Form Modal - Using simplified flow component */}
        {showBookingForm && selectedPractitioner && (
          <TreatmentExchangeBookingFlow
            open={showBookingForm}
            onOpenChange={(open) => {
              setShowBookingForm(open);
              if (!open) setSelectedPractitioner(null);
            }}
            practitioner={{
              id: selectedPractitioner.id,
              user_id: selectedPractitioner.user_id || selectedPractitioner.id,
              first_name: selectedPractitioner.first_name,
              last_name: selectedPractitioner.last_name,
              average_rating: selectedPractitioner.average_rating,
              treatment_exchange_enabled: true
            }}
            onSuccess={() => {
              loadPeerTreatmentData(); // Refresh the list
              loadCreditsData(); // Refresh credits
            }}
          />
        )}
      </div>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Peer Treatment Booking</AlertDialogTitle>
            {sessionToCancel && (
              <div className="space-y-2 mt-2 text-sm text-muted-foreground">
                <p>
                  Are you sure you want to cancel your booking with{' '}
                  <strong>
                    {sessionToCancel.practitioner_id === userProfile?.id
                      ? `${sessionToCancel.client.first_name} ${sessionToCancel.client.last_name}`
                      : `${sessionToCancel.practitioner.first_name} ${sessionToCancel.practitioner.last_name}`
                    }
                  </strong>
                  ?
                </p>
                <p className="text-sm">
                  Session: {sessionToCancel.session_type} on{' '}
                  {format(new Date(sessionToCancel.session_date), 'MMM dd, yyyy')} at {formatTimeWithoutSeconds(sessionToCancel.start_time)}
                </p>
                <div className="bg-muted p-3 rounded-lg mt-3">
                  <p className="text-sm font-medium mb-1">Refund Information:</p>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <strong>{sessionToCancel.credit_cost} credits</strong> will be refunded to your account
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The practitioner will be notified of the cancellation.
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToCancel && handleCancelPeerBooking(sessionToCancel)}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Public Profile Modal */}
      <PublicProfileModal
        therapistId={selectedProfileId}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        hideBookButton={true} // Hide Book button - peer treatment exchange uses "Send Request" instead
        showCredits={true} // Show credits instead of money prices for peer treatment exchange
      />

      {/* Exchange Acceptance Modal with Service Selection */}
      {selectedExchangeRequest && selectedExchangeRequest.requester_id && userProfile?.id && (
        <ExchangeAcceptanceModal
          open={showAcceptanceModal}
          onOpenChange={(open) => {
            console.log('🔍 Modal onOpenChange called:', open);
            setShowAcceptanceModal(open);
            if (!open) {
              setSelectedExchangeRequest(null);
            }
          }}
          requestId={selectedExchangeRequest.id}
          requesterId={selectedExchangeRequest.requester_id}
          requesterName={selectedExchangeRequest.requester ? `${selectedExchangeRequest.requester.first_name || ''} ${selectedExchangeRequest.requester.last_name || ''}`.trim() : 'Practitioner'}
          requestedSessionDate={selectedExchangeRequest.requested_session_date}
          requestedStartTime={selectedExchangeRequest.requested_start_time}
          requestedDuration={selectedExchangeRequest.duration_minutes || 60}
          recipientId={userProfile.id}
          onAccepted={handleExchangeAccepted}
        />
      )}
    </div>
  );
};

export default Credits;


