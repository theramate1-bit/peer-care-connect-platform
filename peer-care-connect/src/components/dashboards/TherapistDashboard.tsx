import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Handshake, CreditCard, Heart, Coins, Play, CheckCircle, AlertCircle, XCircle, CheckCircle2, X, Settings, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { CreditManager } from "@/lib/credits";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { toast } from "sonner";
import { validateTransition } from "@/lib/session-state-machine";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getFriendlyDateLabel, formatTimeWithoutSeconds } from "@/lib/date";
import { TreatmentExchangeService, ExchangeRequest } from "@/lib/treatment-exchange";
import { ExchangeAcceptanceModal } from "@/components/treatment-exchange/ExchangeAcceptanceModal";
import { format, isToday, isTomorrow } from "date-fns";
import { TrendingUp, MessageSquare, Edit, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cleanNotificationMessage, dismissNotification, formatBookingNotificationPreview, handleNotificationNavigation, markNotificationRead, parseNotificationRows, type Notification, type NormalizedNotification } from "@/lib/notification-utils";
import { EarningsWidget } from "@/components/dashboards/EarningsWidget";
import { SameDayBookingApproval } from "@/components/practitioner/SameDayBookingApproval";
import { CompleteProfileCta } from "@/components/dashboard/CompleteProfileCta";
import { calculateProfileActivationStatus, hasValidAvailability } from "@/lib/profile-completion";
import { getDisplaySessionStatus, isPractitionerSessionVisible } from "@/lib/session-display-status";
import { getSessionLocation } from "@/utils/sessionLocation";
import { NotificationSystem } from "@/lib/notification-system";
import { StatsSkeleton, SessionCardSkeleton, MessageSkeleton } from "@/components/ui/skeleton-loaders";

interface DashboardStats {
  totalSessions: number;
  monthlyRevenue: number;
  completedSessions: number;
  cancelledSessions: number;
  totalRefunds: number;
}

interface SessionData {
  id: string;
  session_type: string;
  client_name: string;
  client_email: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  price: number;
  status: string;
  payment_status?: string; // Payment status: 'pending', 'paid', 'completed', etc.
  is_peer_booking?: boolean;
  is_exchange_request?: boolean; // True if this is a pending treatment exchange request
  exchange_request_id?: string; // ID of the treatment exchange request
  requester_name?: string; // Name of the requester for exchange requests
  requester_id?: string; // ID of the requester for exchange requests
  credit_cost?: number; // Credit cost for treatment exchange sessions
  is_reciprocal_booking?: boolean; // True if this is a reciprocal booking (user is receiving treatment)
  /** True when the booking was made by a guest (no registered client account). */
  is_guest?: boolean;
  /** True when this is a pending mobile booking request (not yet a session). */
  is_mobile_request?: boolean;
  /** For hybrid/mobile: show "Clinic" vs "Mobile" and location. */
  appointment_type?: 'clinic' | 'mobile' | null;
  visit_address?: string | null;
}

type MetricCard = {
  key: string;
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  accentClass?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(!Number.isNaN(value) ? value : 0);

const formatCount = (value: number) =>
  Number.isFinite(value) ? value.toLocaleString("en-GB") : "0";

const sessionStatusStyles: Record<string, string> = {
  scheduled: "border-primary/20 bg-primary/10 text-primary",
  confirmed: "border-primary/20 bg-primary/10 text-primary",
  in_progress: "border-accent/30 bg-accent/10 text-accent",
  completed: "border-success/25 bg-success/10 text-success",
  cancelled: "border-warning/25 bg-warning/10 text-warning",
  pending_exchange: "border-border/60 bg-card text-muted-foreground",
  accepted_exchange: "border-primary/20 bg-primary/10 text-primary",
  pending_payment: "border-warning/25 bg-warning/10 text-warning"
};

const TERMINAL_NOTIFICATION_TYPES = new Set<string>([
  "session_reminder",
  "session_cancelled",
  "booking_declined",
  "booking_declined_practitioner",
  "booking_expired",
  "booking_expired_practitioner",
  "exchange_request_declined",
  "exchange_request_expired",
  "exchange_slot_released",
]);

const ACTION_REQUIRED_NOTIFICATION_TYPES = new Set<string>([
  "booking_request",
  "exchange_request",
  "exchange_request_received",
  "treatment_exchange_request",
  "exchange_slot_held",
]);

const EXCHANGE_SOURCE_TYPES = new Set<string>([
  "treatment_exchange_request",
  "slot_hold",
  "mutual_exchange_session",
]);

const EXCHANGE_BOOKING_TITLE_PATTERN = /treatment exchange|slot reserved for exchange|exchange session confirmed/i;

const isNewBookingNotification = (notification: NormalizedNotification): boolean => {
  const text = `${notification.title} ${notification.message}`.toLowerCase();

  if (notification.family === "message" || (notification.source_type ?? "").toLowerCase() === "message") {
    return false;
  }
  if (TERMINAL_NOTIFICATION_TYPES.has(notification.type)) return false;
  if (/new message|declined|expired|cancelled|canceled|released|reminder/.test(text)) return false;

  if (notification.source_type === "mobile_booking_request") return true;
  if (notification.source_type && EXCHANGE_SOURCE_TYPES.has(notification.source_type)) return true;
  if (notification.type === "booking_confirmed" || notification.type === "booking_request") return true;
  if (notification.family === "mobile_request") return true;
  if (notification.family === "exchange") return true;
  return EXCHANGE_BOOKING_TITLE_PATTERN.test(notification.title);
};

const requiresReviewAction = (notification: NormalizedNotification): boolean => {
  if (ACTION_REQUIRED_NOTIFICATION_TYPES.has(notification.type)) return true;
  return (
    notification.source_type === "treatment_exchange_request" ||
    notification.source_type === "slot_hold" ||
    notification.source_type === "mobile_booking_request" ||
    notification.family === "mobile_request"
  );
};

/** True only for exchange requests (practitioner-to-practitioner). Excludes client bookings (clinic, mobile). */
const isExchangeRequest = (notification: NormalizedNotification): boolean =>
  notification.source_type === "treatment_exchange_request" ||
  notification.source_type === "slot_hold" ||
  notification.family === "exchange" ||
  EXCHANGE_SOURCE_TYPES.has(notification.source_type ?? "");

function getMobileRequestId(n: NormalizedNotification): string | null {
  const data = n.data && typeof n.data === "object" ? n.data : {};
  const rid = (data as { request_id?: string; requestId?: string }).request_id ?? (data as { request_id?: string; requestId?: string }).requestId;
  if (typeof rid === "string" && rid.trim()) return rid;
  if (n.source_type === "mobile_booking_request" && n.source_id) return n.source_id;
  return null;
}

export const TherapistDashboard = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    monthlyRevenue: 0,
    completedSessions: 0,
    cancelledSessions: 0,
    totalRefunds: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState<SessionData[]>([]);
  const [optimisticSessions, setOptimisticSessions] = useState<SessionData[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingSession, setUpdatingSession] = useState<string | null>(null);
  const [showNotesPrompt, setShowNotesPrompt] = useState(false);
  const [completedSession, setCompletedSession] = useState<{id: string; clientName: string} | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteSessionId, setNoteSessionId] = useState<string | null>(null);
  
  // Session timer state
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Treatment exchange request handling
  const [respondingToRequest, setRespondingToRequest] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedExchangeRequest, setSelectedExchangeRequest] = useState<SessionData | null>(null);
  const [showAcceptanceModal, setShowAcceptanceModal] = useState(false);
  
  // Stripe Connect status (checked from database, not stale userProfile)
  const [hasStripeConnect, setHasStripeConnect] = useState<boolean | null>(null);

  // Profile activation (same 6-check calculation as ProfileCompletionWidget so percentages match)
  const [profileActivationData, setProfileActivationData] = useState<{
    hasAvailability: boolean | null;
    qualificationsCount: number;
    productsCount: number;
    qualificationDocumentsCount: number;
  } | null>(null);

  // Dismissed notification cards (session-only, per user)
  const [completeProfileCtaDismissed, setCompleteProfileCtaDismissed] = useState(false);
  const [stripeConnectCardDismissed, setStripeConnectCardDismissed] = useState(false);
  const [treatmentExchangeCtaDismissed, setTreatmentExchangeCtaDismissed] = useState(false);
  
  // Notifications and client progress state
  const [notifications, setNotifications] = useState<NormalizedNotification[]>([]);
  const [clientProgressUpdates, setClientProgressUpdates] = useState<any[]>([]);
  const [mobileRequestProcessingId, setMobileRequestProcessingId] = useState<string | null>(null);
  // Store statuses of exchange requests found in notifications
  const [exchangeRequestStatuses, setExchangeRequestStatuses] = useState<Record<string, string>>({});
  // Store statuses of mobile booking requests (pending vs expired/accepted/declined)
  const [mobileRequestStatuses, setMobileRequestStatuses] = useState<Record<string, string>>({});
  // Store payment_status so we can hide Decline when already captured (per Stripe: some methods auto-capture)
  const [mobileRequestPaymentStatuses, setMobileRequestPaymentStatuses] = useState<Record<string, string>>({});

  // Track which exchange requests have reciprocal bookings
  const [reciprocalBookings, setReciprocalBookings] = useState<Record<string, boolean>>({});

  // Pending same-day bookings (surfaced above the fold for approval)
  const [pendingSameDayBookings, setPendingSameDayBookings] = useState<any[]>([]);

  // Confirmed mobile sessions for New Bookings augment (fetch separately for reliability)
  const [confirmedMobileSessionsList, setConfirmedMobileSessionsList] = useState<SessionData[]>([]);
  // Pending exchange requests for New Bookings (source of truth: treatment_exchange_requests, not notifications)
  const [pendingExchangeRequestsForSidebar, setPendingExchangeRequestsForSidebar] = useState<Array<{
    id: string;
    requester_id?: string;
    requester_name: string;
    requested_session_date: string;
    requested_start_time: string;
    duration_minutes: number;
    created_at: string | null;
  }>>([]);
  // Accepted exchange requests needing reciprocal booking (recipient must book return session)
  const [acceptedExchangeNeedingReciprocalForSidebar, setAcceptedExchangeNeedingReciprocalForSidebar] = useState<Array<{
    id: string;
    requester_id?: string;
    requester_name: string;
    requested_session_date: string;
    requested_start_time: string;
    duration_minutes: number;
    created_at: string | null;
    extension_requested_at?: string | null;
    extension_approved_at?: string | null;
    reciprocal_booking_deadline?: string | null;
  }>>([]);
  // Accepted exchange requests where user is requester (recipient accepted; requester sees "Your request was accepted")
  const [acceptedExchangeForRequesterSidebar, setAcceptedExchangeForRequesterSidebar] = useState<Array<{
    id: string;
    recipient_id?: string;
    recipient_name: string;
    requested_session_date: string;
    requested_start_time: string;
    duration_minutes: number;
    created_at: string | null;
    extension_requested_at?: string | null;
    extension_approved_at?: string | null;
    extension_days?: number | null;
  }>>([]);

  // Always use schedule view (Overview layout was removed)
  const dashboardView = "schedule" as const;

  // Fetch statuses for exchange requests in notifications
  useEffect(() => {
    const fetchExchangeStatuses = async () => {
      if (!notifications.length || !user?.id) return;

      const exchangeRequestIds = notifications
        .filter(n => 
          n.type === 'treatment_exchange_request' || 
          n.type === 'exchange_request' || 
          n.type === 'exchange_request_received' ||
          n.title?.includes('Treatment Exchange Request') ||
          n.title === 'New Treatment Exchange Request' ||
          (n.source_type === 'treatment_exchange_request' && n.source_id)
        )
        .map(n => {
          const requestId = n.data?.requestId;
          const requestIdLegacy = n.data?.request_id;
          return (typeof requestId === 'string' ? requestId : null)
            || (typeof requestIdLegacy === 'string' ? requestIdLegacy : null)
            || n.source_id;
        })
        .filter((id): id is string => Boolean(id)); // Remove null/undefined

      if (exchangeRequestIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('treatment_exchange_requests')
          .select('id, status')
          .in('id', exchangeRequestIds);

        if (error) {
          console.error('Error fetching exchange statuses:', error);
          return;
        }

        if (data) {
          const statusMap: Record<string, string> = {};
          data.forEach(req => {
            statusMap[req.id] = req.status;
          });
          setExchangeRequestStatuses(prev => ({ ...prev, ...statusMap }));

          // Check reciprocal bookings for accepted requests
          const acceptedRequestIds = data.filter(req => req.status === 'accepted').map(req => req.id);
          if (acceptedRequestIds.length > 0) {
            checkReciprocalBookings(acceptedRequestIds);
          }
        }
      } catch (err) {
        console.error('Error in fetchExchangeStatuses:', err);
      }
    };

    fetchExchangeStatuses();
  }, [notifications, user?.id]);

  // Fetch statuses and payment_status of mobile booking requests (to hide Accept/Decline when expired; hide Decline when captured)
  useEffect(() => {
    const fetchMobileRequestStatuses = async () => {
      if (!notifications.length || !user?.id) return;
      const ids = notifications
        .filter(n => n.family === 'mobile_request' || n.source_type === 'mobile_booking_request')
        .map(n => getMobileRequestId(n))
        .filter((id): id is string => Boolean(id));
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('mobile_booking_requests')
          .select('id, status, payment_status')
          .in('id', uniqueIds)
          .eq('practitioner_id', user.id);
        if (error) return;
        const statusMap: Record<string, string> = {};
        const paymentMap: Record<string, string> = {};
        (data || []).forEach((r: { id: string; status: string; payment_status?: string }) => {
          statusMap[r.id] = r.status;
          paymentMap[r.id] = r.payment_status ?? 'pending';
        });
        setMobileRequestStatuses(statusMap);
        setMobileRequestPaymentStatuses(paymentMap);
      } catch { /* non-blocking */ }
    };
    fetchMobileRequestStatuses();
  }, [notifications, user?.id]);

  // Check if reciprocal bookings exist for accepted exchange requests
  const checkReciprocalBookings = async (requestIds: string[]) => {
    if (!requestIds.length || !user?.id) return;

    try {
      // Fetch mutual exchange sessions for these requests
      const { data: mutualSessions, error } = await supabase
        .from('mutual_exchange_sessions')
        .select('id, exchange_request_id, practitioner_b_booked, practitioner_b_id, practitioner_a_id, created_at')
        .in('exchange_request_id', requestIds);

      if (error) {
        console.error('Error checking reciprocal bookings:', error);
        return;
      }

      if (!mutualSessions || mutualSessions.length === 0) {
        // No mutual sessions means no reciprocal bookings
        const noBookingMap: Record<string, boolean> = {};
        requestIds.forEach(id => {
          noBookingMap[id] = false;
        });
        setReciprocalBookings(prev => ({ ...prev, ...noBookingMap }));
        return;
      }

      // For each mutual session, check if there's an active reciprocal booking
      const reciprocalBookingMap: Record<string, boolean> = {};
      
      for (const mutualSession of mutualSessions) {
        const requestId = mutualSession.exchange_request_id;
        
        // If the current user is practitioner_b (recipient), check for their reciprocal booking
        if (mutualSession.practitioner_b_id === user.id) {
          // Check for active reciprocal booking: practitioner_a (requester) as therapist, practitioner_b (recipient) as client
          const { data: reciprocalSessions, error: sessionError } = await supabase
            .from('client_sessions')
            .select('id, status, created_at')
            .eq('is_peer_booking', true)
            .eq('therapist_id', mutualSession.practitioner_a_id)
            .eq('client_id', mutualSession.practitioner_b_id)
            .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
            .gte('created_at', mutualSession.created_at || '1970-01-01')
            .order('created_at', { ascending: false })
            .limit(1);

          if (sessionError) {
            console.error('Error checking reciprocal sessions:', sessionError);
            // Fallback to flag check
            reciprocalBookingMap[requestId] = mutualSession.practitioner_b_booked === true;
          } else {
            reciprocalBookingMap[requestId] = (reciprocalSessions && reciprocalSessions.length > 0) || false;
          }
        } else {
          // If they're not practitioner_b, they can't book the reciprocal
          reciprocalBookingMap[requestId] = true;
        }
      }

      // Set reciprocal booking status for all checked requests
      requestIds.forEach(id => {
        if (!(id in reciprocalBookingMap)) {
          reciprocalBookingMap[id] = false;
        }
      });

      setReciprocalBookings(prev => ({ ...prev, ...reciprocalBookingMap }));
    } catch (error) {
      console.error('Error in checkReciprocalBookings:', error);
    }
  };

  // Check Stripe Connect status from database (not stale userProfile)
  useEffect(() => {
    const checkStripeConnect = async () => {
      if (!user?.id) return;
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('stripe_connect_account_id')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error checking Stripe Connect:', error);
          setHasStripeConnect(false);
          return;
        }
        
        // Type-safe check
        const hasAccount = userData && 'stripe_connect_account_id' in userData && !!userData.stripe_connect_account_id;
        setHasStripeConnect(hasAccount);
      } catch (error) {
        console.error('Error checking Stripe Connect status:', error);
        setHasStripeConnect(false);
      }
    };
    
    checkStripeConnect();
  }, [user?.id]);

  // Fetch profile activation data (same 6-check logic as ProfileCompletionWidget for consistent %)
  useEffect(() => {
    const loadProfileActivationData = async () => {
      if (!user?.id || !userProfile) {
        setProfileActivationData(null);
        return;
      }
      try {
        const [availabilityRes, qualificationsRes, productsRes, qualificationDocumentsRes] = await Promise.all([
          supabase.from('practitioner_availability').select('working_hours').eq('user_id', user.id).maybeSingle(),
          supabase.from('qualifications').select('*', { count: 'exact', head: true }).eq('practitioner_id', user.id),
          supabase.from('practitioner_products').select('*', { count: 'exact', head: true }).eq('practitioner_id', user.id).eq('is_active', true),
          supabase.from('practitioner_qualification_documents').select('*', { count: 'exact', head: true }).eq('practitioner_id', user.id),
        ]);
        const hasAvailability = availabilityRes.data?.working_hours
          ? hasValidAvailability(availabilityRes.data.working_hours)
          : false;
        const qualificationsCount = qualificationsRes.error && qualificationsRes.error.code !== 'PGRST116' ? 0 : (qualificationsRes.count ?? 0);
        const productsCount = productsRes.error && productsRes.error.code !== 'PGRST116' ? 0 : (productsRes.count ?? 0);
        const qualificationDocumentsCount =
          qualificationDocumentsRes.error && qualificationDocumentsRes.error.code !== 'PGRST116'
            ? 0
            : (qualificationDocumentsRes.count ?? 0);
        setProfileActivationData({ hasAvailability, qualificationsCount, productsCount, qualificationDocumentsCount });
      } catch (e) {
        setProfileActivationData(null);
      }
    };
    loadProfileActivationData();
  }, [user?.id, userProfile]);

  // Restore dismissed notification state from sessionStorage (session-only)
  useEffect(() => {
    if (!user?.id) return;
    try {
      const prefix = user.id;
      setCompleteProfileCtaDismissed(sessionStorage.getItem(`practitioner-notification-complete-profile-cta-dismissed-${prefix}`) === 'true');
      setStripeConnectCardDismissed(sessionStorage.getItem(`practitioner-notification-stripe-connect-dismissed-${prefix}`) === 'true');
      setTreatmentExchangeCtaDismissed(sessionStorage.getItem(`practitioner-notification-treatment-exchange-dismissed-${prefix}`) === 'true');
    } catch {
      setCompleteProfileCtaDismissed(false);
      setStripeConnectCardDismissed(false);
      setTreatmentExchangeCtaDismissed(false);
    }
  }, [user?.id]);

  // Reset scroll to top when dashboard loads (e.g. after redirect from completing an action)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Memoize fetchDashboardDataFallback with useCallback
  const fetchDashboardDataFallback = useCallback(async () => {
    try {
      // Lazy expiry: mark pending_payment bookings past expires_at as expired so they do not appear
      await supabase.rpc('expire_pending_payment_bookings').then(() => {}).catch(() => {});

      // Fetch credit balance
      const balance = await CreditManager.getBalance(user!.id);
      setCreditBalance(balance);

      // Fetch upcoming sessions (next 7 days)
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // Fetch sessions where user is therapist OR client (for treatment exchange)
      // Only confirmed sessions - exclude pending_payment so unconfirmed bookings do not appear in diary
      // We'll filter in JavaScript after fetching to handle complex OR logic across columns
      const { data: fetchedSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .or(`therapist_id.eq.${user?.id},client_id.eq.${user?.id}`)
        .gte('session_date', today)
        .lte('session_date', nextWeekStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20); // Fetch more to filter after
      
      // Filter to only show sessions ready to start (payment completed/paid OR free sessions)
      const sessions = (fetchedSessions || []).filter((s: any) => {
        const paymentStatus = s.payment_status || 'pending';
        const isFree = s.is_peer_booking === true || Number(s.price) === 0;
        const isPaymentComplete = paymentStatus === 'completed' || paymentStatus === 'paid';
        return isFree || isPaymentComplete;
      }).slice(0, 10); // Limit to 10 after filtering

      // Fetch received exchange requests (where user is recipient)
      // Include both pending and accepted (in case session creation failed)
      const { data: receivedExchangeRequests } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          session_type,
          requester_notes,
          status,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('recipient_id', user?.id)
        .in('status', ['pending', 'accepted'])
        .gte('requested_session_date', today)
        .lte('requested_session_date', nextWeekStr)
        .order('requested_session_date', { ascending: true })
        .order('requested_start_time', { ascending: true })
        .limit(5);

      // Fetch sent exchange requests (where user is requester)
      const { data: sentExchangeRequests } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          recipient_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          session_type,
          requester_notes,
          recipient:users!treatment_exchange_requests_recipient_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('requester_id', user?.id)
        .eq('status', 'pending')
        .gte('requested_session_date', today)
        .lte('requested_session_date', nextWeekStr)
        .gt('expires_at', new Date().toISOString())
        .order('requested_session_date', { ascending: true })
        .order('requested_start_time', { ascending: true })
        .limit(5);

      // Fetch active slot holds for sent requests (where user is requester)
      const { data: slotHolds } = await supabase
        .from('slot_holds')
        .select(`
          id,
          request_id,
          session_date,
          start_time,
          end_time,
          duration_minutes,
          expires_at,
          status,
          practitioner:users!slot_holds_practitioner_id_fkey(
            first_name,
            last_name
          ),
          request:treatment_exchange_requests!slot_holds_request_id_fkey(
            requester_id,
            recipient_id
          )
        `)
        .eq('status', 'active')
        .gte('session_date', today)
        .lte('session_date', nextWeekStr)
        .gt('expires_at', new Date().toISOString())
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10); // Get more to filter by requester

      // Check which accepted exchange requests have corresponding client_sessions
      // Only show accepted requests if NO corresponding session exists
      const acceptedRequestIds = (receivedExchangeRequests || [])
        .filter((req: any) => req.status === 'accepted')
        .map((req: any) => req.id);
      
      let existingSessionsForAccepted: string[] = [];
      if (acceptedRequestIds.length > 0) {
        // Check if any client_sessions exist for these accepted requests
        // Match by: therapist_id = recipient_id, client_id = requester_id, date, time, is_peer_booking
        const { data: existingSessions } = await supabase
          .from('client_sessions')
          .select('id, therapist_id, client_id, session_date, start_time, is_peer_booking')
          .eq('therapist_id', user?.id)
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
          .eq('is_peer_booking', true);
        
        if (existingSessions && existingSessions.length > 0) {
          // Match accepted requests to existing sessions
          existingSessionsForAccepted = (receivedExchangeRequests || [])
            .filter((req: any) => {
              if (req.status !== 'accepted') return false;
              // Check if a session exists for this request
              return existingSessions.some((session: any) => {
                const reqTime = req.requested_start_time.includes(':') && req.requested_start_time.split(':').length === 3
                  ? req.requested_start_time.substring(0, 5)
                  : req.requested_start_time;
                const sessionTime = session.start_time.includes(':') && session.start_time.split(':').length === 3
                  ? session.start_time.substring(0, 5)
                  : session.start_time;
                return (
                  session.therapist_id === user?.id &&
                  session.client_id === req.requester_id &&
                  session.session_date === req.requested_session_date &&
                  (sessionTime === reqTime || session.start_time === req.requested_start_time) &&
                  session.is_peer_booking === true
                );
              });
            })
            .map((req: any) => req.id);
        }
      }

      // Pending received exchange requests for New Bookings sidebar (dedicated query, no date limit)
      const { data: pendingSidebarRaw } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          created_at,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('recipient_id', user!.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      const pendingForSidebar = (pendingSidebarRaw || []).map((req: any) => ({
        id: req.id,
        requester_id: req.requester_id,
        requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
        requested_session_date: req.requested_session_date,
        requested_start_time: req.requested_start_time,
        duration_minutes: req.duration_minutes,
        created_at: req.created_at ?? null,
      }));
      setPendingExchangeRequestsForSidebar(pendingForSidebar);

      // Accepted exchange requests needing reciprocal booking (recipient must book return session)
      const { data: acceptedSidebarRaw } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          requester_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          created_at,
          extension_requested_at,
          extension_approved_at,
          reciprocal_booking_deadline,
          requester:users!treatment_exchange_requests_requester_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('recipient_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(20);

      if (acceptedSidebarRaw && acceptedSidebarRaw.length > 0) {
        const { data: mutualSessions } = await supabase
          .from('mutual_exchange_sessions')
          .select('exchange_request_id, practitioner_b_id, practitioner_b_booked')
          .in('exchange_request_id', acceptedSidebarRaw.map((r: any) => r.id));

        const needsReciprocal = new Set<string>();
        (mutualSessions || []).forEach((ms: any) => {
          if (ms.practitioner_b_id === user!.id && ms.practitioner_b_booked !== true) {
            needsReciprocal.add(ms.exchange_request_id);
          }
        });

        const acceptedForSidebar = (acceptedSidebarRaw || [])
          .filter((req: any) => needsReciprocal.has(req.id))
          .map((req: any) => ({
            id: req.id,
            requester_id: req.requester_id,
            requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
            requested_session_date: req.requested_session_date,
            requested_start_time: req.requested_start_time,
            duration_minutes: req.duration_minutes,
            created_at: req.created_at ?? null,
            extension_requested_at: req.extension_requested_at ?? null,
            extension_approved_at: req.extension_approved_at ?? null,
            reciprocal_booking_deadline: req.reciprocal_booking_deadline ?? null,
          }));
        setAcceptedExchangeNeedingReciprocalForSidebar(acceptedForSidebar);
      } else {
        setAcceptedExchangeNeedingReciprocalForSidebar([]);
      }

      // Accepted requests where user is requester (recipient accepted; requester sees "Your request was accepted")
      const { data: acceptedAsRequesterRaw } = await supabase
        .from('treatment_exchange_requests')
        .select(`
          id,
          recipient_id,
          requested_session_date,
          requested_start_time,
          duration_minutes,
          created_at,
          extension_requested_at,
          extension_approved_at,
          extension_days,
          recipient:users!treatment_exchange_requests_recipient_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('requester_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(10);

      setAcceptedExchangeForRequesterSidebar((acceptedAsRequesterRaw || []).map((req: any) => ({
        id: req.id,
        recipient_id: req.recipient_id,
        recipient_name: req.recipient ? `${req.recipient.first_name || ''} ${req.recipient.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
        requested_session_date: req.requested_session_date,
        requested_start_time: req.requested_start_time,
        duration_minutes: req.duration_minutes,
        created_at: req.created_at ?? null,
        extension_requested_at: req.extension_requested_at ?? null,
        extension_approved_at: req.extension_approved_at ?? null,
        extension_days: req.extension_days ?? null,
      })));

      // Convert received exchange requests to SessionData format
      const receivedExchangeRequestSessions: SessionData[] = (receivedExchangeRequests || [])
        .filter((req: any) => {
          if (req.status === 'pending') {
            return !req.expires_at || new Date(req.expires_at) > new Date();
          }
          // For accepted requests, only show them if NO corresponding client_sessions exists
          if (req.status === 'accepted') {
            return !existingSessionsForAccepted.includes(req.id);
          }
          return false;
        })
        .map((req: any) => ({
          id: req.id,
          session_type: req.session_type || 'Treatment Exchange',
          client_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() : 'Practitioner',
          client_email: '',
          session_date: req.requested_session_date,
          start_time: req.requested_start_time,
          duration_minutes: req.duration_minutes,
          price: 0,
          status: req.status === 'accepted' ? 'accepted_exchange' : 'pending_exchange',
          is_exchange_request: true,
          exchange_request_id: req.id,
          requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() : 'Practitioner',
          requester_id: req.requester_id
        }));

      // Convert sent exchange requests to SessionData format
      const sentExchangeRequestSessions: SessionData[] = (sentExchangeRequests || []).map((req: any) => ({
        id: req.id,
        session_type: req.session_type || 'Treatment Exchange',
        client_name: req.recipient ? `${req.recipient.first_name || ''} ${req.recipient.last_name || ''}`.trim() : 'Practitioner',
        client_email: '',
        session_date: req.requested_session_date,
        start_time: req.requested_start_time,
        duration_minutes: req.duration_minutes,
        price: 0,
        status: 'slot_reserved',
        is_exchange_request: true,
        exchange_request_id: req.id,
        requester_name: userProfile?.first_name && userProfile?.last_name 
          ? `${userProfile.first_name} ${userProfile.last_name}`.trim() 
          : 'You'
      }));

      // Convert slot holds to SessionData format (for sent requests)
      // Only include slot holds where user is the requester
      const slotHoldSessions: SessionData[] = (slotHolds || [])
        .filter((hold: any) => {
          // Only include holds linked to requests where user is requester
          return hold.request_id && hold.request?.requester_id === user?.id;
        })
        .map((hold: any) => ({
          id: `slot_hold_${hold.id}`,
          session_type: 'Treatment Exchange',
          client_name: hold.practitioner ? `${hold.practitioner.first_name || ''} ${hold.practitioner.last_name || ''}`.trim() : 'Practitioner',
          client_email: '',
          session_date: hold.session_date,
          start_time: hold.start_time,
          duration_minutes: hold.duration_minutes,
          price: 0,
          status: 'slot_reserved',
          is_exchange_request: true,
          exchange_request_id: hold.request_id,
          slot_hold_id: hold.id,
          requester_name: userProfile?.first_name && userProfile?.last_name 
            ? `${userProfile.first_name} ${userProfile.last_name}`.trim() 
            : 'You'
        }));

      // Combine all exchange-related sessions
      const exchangeRequestSessions: SessionData[] = [
        ...receivedExchangeRequestSessions,
        ...sentExchangeRequestSessions,
        ...slotHoldSessions
      ];

      // Fetch actual treatment exchange bookings (peer bookings) where user is therapist
      const { data: peerBookingsAsTherapist } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('therapist_id', user.id)
        .eq('is_peer_booking', true)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
        .gte('session_date', today)
        .lte('session_date', nextWeekStr)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Fetch reciprocal bookings where user is client (receiving treatment)
      const { data: reciprocalBookingsAsClient } = await supabase
        .from('client_sessions')
        .select(`
          *,
          therapist:users!client_sessions_therapist_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('client_id', user.id)
        .eq('is_peer_booking', true)
        .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
        .gte('session_date', today)
        .lte('session_date', nextWeekStr)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Convert peer bookings to SessionData format
      const peerBookingSessions: SessionData[] = [
        ...(peerBookingsAsTherapist || []).map((s: any) => ({
          id: s.id,
          session_type: s.session_type || 'Treatment Exchange',
          client_name: s.client 
            ? `${s.client.first_name || ''} ${s.client.last_name || ''}`.trim() 
            : s.client_name || 'Practitioner',
          client_email: s.client_email || '',
          session_date: s.session_date,
          start_time: s.start_time,
          duration_minutes: s.duration_minutes,
          price: s.price || 0,
          status: getDisplaySessionStatus(s),
          payment_status: s.payment_status ?? null,
          is_peer_booking: true
        })),
        ...(reciprocalBookingsAsClient || []).map((s: any) => ({
          id: s.id,
          session_type: s.session_type || 'Treatment Exchange (Reciprocal)',
          client_name: s.therapist 
            ? `${s.therapist.first_name || ''} ${s.therapist.last_name || ''}`.trim() 
            : 'Practitioner',
          client_email: '',
          session_date: s.session_date,
          start_time: s.start_time,
          duration_minutes: s.duration_minutes,
          price: s.price || 0,
          status: getDisplaySessionStatus(s),
          payment_status: s.payment_status ?? null,
          is_peer_booking: true,
          is_reciprocal_booking: true // Flag to identify reciprocal bookings
        }))
      ];

      // Map raw sessions to SessionData (include is_guest, appointment_type, visit_address for hybrid visibility)
      const regularSessionsFallback: SessionData[] = (sessions || []).map((s: any) => ({
        id: s.id,
        session_type: s.session_type || 'Client session',
        client_name: s.client_name?.trim() || (s.is_guest_booking ? 'Guest' : ''),
        client_email: s.client_email || '',
        session_date: s.session_date,
        start_time: s.start_time,
        duration_minutes: s.duration_minutes,
        price: s.price || 0,
        status: getDisplaySessionStatus(s),
        payment_status: s.payment_status ?? null,
        is_peer_booking: false,
        is_guest: s.is_guest_booking === true,
        appointment_type: s.appointment_type ?? null,
        visit_address: s.visit_address ?? null
      }));
      // Pending mobile booking requests (mobile + hybrid practitioners)
      let mobileRequestSessionsFallback: SessionData[] = [];
      try {
        const { data: mobileRequests } = await supabase.rpc('get_practitioner_mobile_requests', {
          p_practitioner_id: user!.id,
          p_status: 'pending'
        });
        mobileRequestSessionsFallback = (mobileRequests || []).map((r: { id: string; requested_date: string; requested_start_time: string; client_name: string; product_name: string; duration_minutes: number }) => ({
          id: r.id,
          session_type: r.product_name || 'Mobile request',
          client_name: r.client_name || 'Client',
          client_email: '',
          session_date: r.requested_date,
          start_time: typeof r.requested_start_time === 'string' ? r.requested_start_time.slice(0, 5) : String(r.requested_start_time).slice(0, 5),
          duration_minutes: r.duration_minutes || 60,
          price: 0,
          status: 'pending',
          payment_status: null,
          is_peer_booking: false,
          is_mobile_request: true
        }));
      } catch {
        mobileRequestSessionsFallback = [];
      }
      // Combine regular sessions, exchange requests, peer bookings, and pending mobile requests
      const allSessions = [...regularSessionsFallback, ...exchangeRequestSessions, ...peerBookingSessions, ...mobileRequestSessionsFallback].sort((a, b) => {
        const dateCompare = a.session_date.localeCompare(b.session_date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      }).slice(0, 20);

      // Fetch total sessions (exclude cancelled/no_show and peer bookings - only actual client sessions)
      const { data: totalSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'no_show')
        .eq('is_peer_booking', false);  // Exclude treatment exchanges - these are peer-to-peer, not clients

      // Fetch completed sessions (exclude peer bookings - only actual client sessions)
      const { data: completedSessions } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('therapist_id', user?.id)
        .eq('status', 'completed')
        .eq('is_peer_booking', false);  // Exclude treatment exchanges - these are peer-to-peer, not clients

      // Calculate monthly revenue from payments
      const currentMonth = new Date().toISOString().slice(0, 7);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().slice(0, 7);
      
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('therapist_id', user?.id)
        .eq('payment_status', 'completed')
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${nextMonthStr}-01`);

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats({
        totalSessions: totalSessions?.length || 0,
        completedSessions: completedSessions?.length || 0,
        cancelledSessions: 0,
        totalRefunds: 0,
        monthlyRevenue: monthlyRevenue / 100
      });

      setUpcomingSessions(allSessions);
      setOptimisticSessions(allSessions);

      // Fetch pending same-day bookings (surface above the fold for approval)
      try {
        const { data: pending } = await supabase.rpc('get_pending_same_day_bookings', { p_practitioner_id: user!.id });
        setPendingSameDayBookings(pending || []);
      } catch {
        setPendingSameDayBookings([]);
      }

      // Dedicated fetch for confirmed mobile sessions (New Bookings augment)
      try {
        const next60 = new Date();
        next60.setDate(next60.getDate() + 60);
        const next60Str = next60.toISOString().split('T')[0];
        const { data: mobileSessions } = await supabase
          .from('client_sessions')
          .select('id, client_name, session_date, start_time, status')
          .eq('therapist_id', user!.id)
          .eq('appointment_type', 'mobile')
          .eq('is_peer_booking', false)
          .in('status', ['confirmed', 'scheduled'])
          .gte('session_date', today)
          .lte('session_date', next60Str)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(50);
        const mapped: SessionData[] = (mobileSessions || []).map((s: any) => ({
          id: s.id,
          session_type: 'Client session',
          client_name: s.client_name?.trim() || 'Client',
          client_email: '',
          session_date: s.session_date,
          start_time: s.start_time,
          duration_minutes: 60,
          price: 0,
          status: s.status || 'confirmed',
          payment_status: null,
          is_peer_booking: false,
          is_reciprocal_booking: false,
          appointment_type: 'mobile'
        }));
        setConfirmedMobileSessionsList(mapped);
      } catch {
        setConfirmedMobileSessionsList([]);
      }
    } catch (error) {
      console.error('Error in fallback fetch:', error);
    }
  }, [user?.id]);

  // Sync optimistic sessions with real data
  useEffect(() => {
    setOptimisticSessions(upcomingSessions);
  }, [upcomingSessions]);

  // Memoize fetchDashboardData with useCallback
  const fetchDashboardData = useCallback(async () => {
    try {
      if (!user?.id) return;

      // Lazy expiry: mark pending_payment bookings past expires_at as expired so they do not appear
      await supabase.rpc('expire_pending_payment_bookings').then(() => {}).catch(() => {});

      // Single optimized RPC call for all dashboard data
      const { data, error } = await supabase
        .rpc('get_practitioner_dashboard_data', {
          p_therapist_id: user.id
        });

      if (error) {
        console.error('RPC call failed, falling back to individual queries:', error);
        // Fallback to individual queries if RPC doesn't exist yet
        await fetchDashboardDataFallback();
        return;
      }

      if (data) {
        setStats({
          totalSessions: data.total_sessions || 0,
          completedSessions: data.completed_sessions || 0,
          cancelledSessions: data.cancelled_sessions || 0,
          totalRefunds: data.total_refunds || 0,
          monthlyRevenue: (data.monthly_revenue || 0) / 100 // Convert pence to pounds
        });

        // Fetch pending treatment exchange requests and combine with regular sessions
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // Fetch received exchange requests (where user is recipient)
        // Include both pending and accepted (in case session creation failed)
        const { data: receivedExchangeRequests } = await supabase
          .from('treatment_exchange_requests')
          .select(`
            id,
            requester_id,
            requested_session_date,
            requested_start_time,
            duration_minutes,
            session_type,
            requester_notes,
            status,
            expires_at,
            created_at,
            requester:users!treatment_exchange_requests_requester_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('recipient_id', user.id)
          .in('status', ['pending', 'accepted'])
          .gte('requested_session_date', today)
          .lte('requested_session_date', nextWeekStr)
          .order('requested_session_date', { ascending: true })
          .order('requested_start_time', { ascending: true })
          .limit(5);

        // Fetch sent exchange requests (where user is requester)
        const { data: sentExchangeRequests } = await supabase
          .from('treatment_exchange_requests')
          .select(`
            id,
            recipient_id,
            requested_session_date,
            requested_start_time,
            duration_minutes,
            session_type,
            requester_notes,
            recipient:users!treatment_exchange_requests_recipient_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('requester_id', user.id)
          .eq('status', 'pending')
          .gte('requested_session_date', today)
          .lte('requested_session_date', nextWeekStr)
          .gt('expires_at', new Date().toISOString())
          .order('requested_session_date', { ascending: true })
          .order('requested_start_time', { ascending: true })
          .limit(5);

        // Fetch active slot holds for sent requests (where user is requester)
        const { data: slotHolds } = await supabase
          .from('slot_holds')
          .select(`
            id,
            request_id,
            session_date,
            start_time,
            end_time,
            duration_minutes,
            expires_at,
            status,
            practitioner:users!slot_holds_practitioner_id_fkey(
              first_name,
              last_name
            ),
            request:treatment_exchange_requests!slot_holds_request_id_fkey(
              requester_id,
              recipient_id
            )
          `)
          .eq('status', 'active')
          .gte('session_date', today)
          .lte('session_date', nextWeekStr)
          .gt('expires_at', new Date().toISOString())
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(10); // Get more to filter by requester

        // Check which accepted exchange requests have corresponding client_sessions
        // Only show accepted requests if NO corresponding session exists
        const acceptedRequestIds = (receivedExchangeRequests || [])
          .filter((req: any) => req.status === 'accepted')
          .map((req: any) => req.id);
        
        let existingSessionsForAccepted: string[] = [];
        if (acceptedRequestIds.length > 0) {
          // Check if any client_sessions exist for these accepted requests
          // Match by: therapist_id = recipient_id, client_id = requester_id, date, time, is_peer_booking
          const { data: existingSessions } = await supabase
            .from('client_sessions')
            .select('id, therapist_id, client_id, session_date, start_time, is_peer_booking')
            .eq('therapist_id', user.id)
            .in('status', ['scheduled', 'confirmed', 'in_progress', 'pending_payment'])
            .eq('is_peer_booking', true);
          
          if (existingSessions && existingSessions.length > 0) {
            // Match accepted requests to existing sessions
            existingSessionsForAccepted = (receivedExchangeRequests || [])
              .filter((req: any) => {
                if (req.status !== 'accepted') return false;
                // Check if a session exists for this request
                return existingSessions.some((session: any) => {
                  const reqTime = req.requested_start_time.includes(':') && req.requested_start_time.split(':').length === 3
                    ? req.requested_start_time.substring(0, 5)
                    : req.requested_start_time;
                  const sessionTime = session.start_time.includes(':') && session.start_time.split(':').length === 3
                    ? session.start_time.substring(0, 5)
                    : session.start_time;
                  return (
                    session.therapist_id === user.id &&
                    session.client_id === req.requester_id &&
                    session.session_date === req.requested_session_date &&
                    (sessionTime === reqTime || session.start_time === req.requested_start_time) &&
                    session.is_peer_booking === true
                  );
                });
              })
              .map((req: any) => req.id);
          }
        }

        // Pending received exchange requests for New Bookings sidebar (dedicated query, no date limit)
        // Main receivedExchangeRequests is date-scoped (next 7 days) for Upcoming Sessions; sidebar needs ALL pending
        const { data: pendingSidebarRaw } = await supabase
          .from('treatment_exchange_requests')
          .select(`
            id,
            requester_id,
            requested_session_date,
            requested_start_time,
            duration_minutes,
            created_at,
            requester:users!treatment_exchange_requests_requester_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('recipient_id', user.id)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(20);

        const pendingForSidebar = (pendingSidebarRaw || []).map((req: any) => ({
          id: req.id,
          requester_id: req.requester_id,
          requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
          requested_session_date: req.requested_session_date,
          requested_start_time: req.requested_start_time,
          duration_minutes: req.duration_minutes,
          created_at: req.created_at ?? null,
        }));
        setPendingExchangeRequestsForSidebar(pendingForSidebar);

        // Accepted exchange requests needing reciprocal booking (recipient must book return session)
        const { data: acceptedSidebarRaw } = await supabase
          .from('treatment_exchange_requests')
          .select(`
            id,
            requester_id,
            requested_session_date,
            requested_start_time,
            duration_minutes,
            created_at,
            extension_requested_at,
            extension_approved_at,
            reciprocal_booking_deadline,
            requester:users!treatment_exchange_requests_requester_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('recipient_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(20);

        if (acceptedSidebarRaw && acceptedSidebarRaw.length > 0) {
          const { data: mutualSessions } = await supabase
            .from('mutual_exchange_sessions')
            .select('exchange_request_id, practitioner_b_id, practitioner_b_booked')
            .in('exchange_request_id', acceptedSidebarRaw.map((r: any) => r.id));

          const needsReciprocal = new Set<string>();
          (mutualSessions || []).forEach((ms: any) => {
            if (ms.practitioner_b_id === user.id && ms.practitioner_b_booked !== true) {
              needsReciprocal.add(ms.exchange_request_id);
            }
          });

          const acceptedForSidebar = (acceptedSidebarRaw || [])
            .filter((req: any) => needsReciprocal.has(req.id))
            .map((req: any) => ({
              id: req.id,
              requester_id: req.requester_id,
              requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
              requested_session_date: req.requested_session_date,
              requested_start_time: req.requested_start_time,
              duration_minutes: req.duration_minutes,
              created_at: req.created_at ?? null,
              extension_requested_at: req.extension_requested_at ?? null,
              extension_approved_at: req.extension_approved_at ?? null,
              reciprocal_booking_deadline: req.reciprocal_booking_deadline ?? null,
            }));
          setAcceptedExchangeNeedingReciprocalForSidebar(acceptedForSidebar);
        } else {
          setAcceptedExchangeNeedingReciprocalForSidebar([]);
        }

        // Accepted requests where user is requester (recipient accepted; requester sees "Your request was accepted")
        const { data: acceptedAsRequesterRaw } = await supabase
          .from('treatment_exchange_requests')
          .select(`
            id,
            recipient_id,
            requested_session_date,
            requested_start_time,
            duration_minutes,
            created_at,
            extension_requested_at,
            extension_approved_at,
            extension_days,
            recipient:users!treatment_exchange_requests_recipient_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('requester_id', user.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false })
          .limit(10);

        setAcceptedExchangeForRequesterSidebar((acceptedAsRequesterRaw || []).map((req: any) => ({
          id: req.id,
          recipient_id: req.recipient_id,
          recipient_name: req.recipient ? `${req.recipient.first_name || ''} ${req.recipient.last_name || ''}`.trim() || 'Practitioner' : 'Practitioner',
          requested_session_date: req.requested_session_date,
          requested_start_time: req.requested_start_time,
          duration_minutes: req.duration_minutes,
          created_at: req.created_at ?? null,
          extension_requested_at: req.extension_requested_at ?? null,
          extension_approved_at: req.extension_approved_at ?? null,
          extension_days: req.extension_days ?? null,
        })));

        // Convert received exchange requests to SessionData format
        const receivedExchangeRequestSessions: SessionData[] = (receivedExchangeRequests || [])
          .filter((req: any) => {
            if (req.status === 'pending') {
              return !req.expires_at || new Date(req.expires_at) > new Date();
            }
            // For accepted requests, only show them if NO corresponding client_sessions exists
            if (req.status === 'accepted') {
              return !existingSessionsForAccepted.includes(req.id);
            }
            return false;
          })
          .map((req: any) => ({
            id: req.id,
            session_type: req.session_type || 'Treatment Exchange',
            client_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() : 'Practitioner',
            client_email: '',
            session_date: req.requested_session_date,
            start_time: req.requested_start_time,
            duration_minutes: req.duration_minutes,
            price: 0,
            status: req.status === 'accepted' ? 'accepted_exchange' : 'pending_exchange',
            is_exchange_request: true,
            exchange_request_id: req.id,
            requester_name: req.requester ? `${req.requester.first_name || ''} ${req.requester.last_name || ''}`.trim() : 'Practitioner',
            requester_id: req.requester_id // CRITICAL: Include requester_id for service selection
          }));

        // Convert sent exchange requests to SessionData format
        const sentExchangeRequestSessions: SessionData[] = (sentExchangeRequests || []).map((req: any) => ({
          id: req.id,
          session_type: req.session_type || 'Treatment Exchange',
          client_name: req.recipient ? `${req.recipient.first_name || ''} ${req.recipient.last_name || ''}`.trim() : 'Practitioner',
          client_email: '',
          session_date: req.requested_session_date,
          start_time: req.requested_start_time,
          duration_minutes: req.duration_minutes,
          price: 0,
          status: 'slot_reserved',
          is_exchange_request: true,
          exchange_request_id: req.id,
          requester_name: userProfile?.first_name && userProfile?.last_name 
            ? `${userProfile.first_name} ${userProfile.last_name}`.trim() 
            : 'You'
        }));

        // Convert slot holds to SessionData format (for sent requests)
        // Only include slot holds where user is the requester
        const slotHoldSessions: SessionData[] = (slotHolds || [])
          .filter((hold: any) => {
            // Only include holds linked to requests where user is requester
            return hold.request_id && hold.request?.requester_id === user.id;
          })
          .map((hold: any) => ({
            id: `slot_hold_${hold.id}`,
            session_type: 'Treatment Exchange',
            client_name: hold.practitioner ? `${hold.practitioner.first_name || ''} ${hold.practitioner.last_name || ''}`.trim() : 'Practitioner',
            client_email: '',
            session_date: hold.session_date,
            start_time: hold.start_time,
            duration_minutes: hold.duration_minutes,
            price: 0,
            status: 'slot_reserved',
            is_exchange_request: true,
            exchange_request_id: hold.request_id,
            slot_hold_id: hold.id,
            requester_name: userProfile?.first_name && userProfile?.last_name 
              ? `${userProfile.first_name} ${userProfile.last_name}`.trim() 
              : 'You'
          }));

        // Combine all exchange-related sessions
        const exchangeRequestSessions: SessionData[] = [
          ...receivedExchangeRequestSessions,
          ...sentExchangeRequestSessions,
          ...slotHoldSessions
        ];

        // Combine regular sessions from RPC and exchange requests
        // Filter out cancelled sessions and peer bookings (peer bookings are fetched separately)
        const regularSessions: SessionData[] = (data.upcoming_sessions || [])
          .filter((s: any) => {
            if (!isPractitionerSessionVisible(s)) return false;
            // Filter out peer bookings - they're fetched separately with proper is_reciprocal_booking flag
            if (s.is_peer_booking === true) return false;
            return true;
          })
          .map((s: any) => ({
            id: s.id,
            session_type: s.session_type || 'Client session',
            client_name: s.client_name?.trim() || (s.is_guest_booking ? 'Guest' : ''),
            client_email: s.client_email || '',
            session_date: s.session_date,
            start_time: s.start_time,
            duration_minutes: s.duration_minutes,
            price: s.price || 0,
            status: getDisplaySessionStatus(s),
            payment_status: s.payment_status ?? null,
            is_peer_booking: false,
            is_guest: s.is_guest_booking === true,
            appointment_type: s.appointment_type ?? null,
            visit_address: s.visit_address ?? null
          }));

        // Fetch actual treatment exchange bookings (peer bookings) where user is therapist
        const { data: peerBookingsAsTherapist } = await supabase
          .from('client_sessions')
          .select(`
            *,
            client:users!client_sessions_client_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('therapist_id', user.id)
          .eq('is_peer_booking', true)
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
          .gte('session_date', today)
          .lte('session_date', nextWeekStr)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        // Fetch reciprocal bookings where user is client (receiving treatment)
        const { data: reciprocalBookingsAsClient } = await supabase
          .from('client_sessions')
          .select(`
            *,
            therapist:users!client_sessions_therapist_id_fkey(
              first_name,
              last_name
            )
          `)
          .eq('client_id', user.id)
          .eq('is_peer_booking', true)
          .in('status', ['scheduled', 'confirmed', 'in_progress', 'completed'])
          .gte('session_date', today)
          .lte('session_date', nextWeekStr)
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        // Convert peer bookings to SessionData format
        const peerBookingSessions: SessionData[] = [
          ...(peerBookingsAsTherapist || []).map((s: any) => ({
            id: s.id,
            session_type: s.session_type || 'Treatment Exchange',
            client_name: s.client 
              ? `${s.client.first_name || ''} ${s.client.last_name || ''}`.trim() 
              : s.client_name || 'Practitioner',
            client_email: s.client_email || '',
            session_date: s.session_date,
            start_time: s.start_time,
            duration_minutes: s.duration_minutes,
            price: s.price || 0,
            status: getDisplaySessionStatus(s),
            payment_status: s.payment_status ?? null,
            is_peer_booking: true
          })),
          ...(reciprocalBookingsAsClient || []).map((s: any) => ({
            id: s.id,
            session_type: s.session_type || 'Treatment Exchange (Reciprocal)',
            client_name: s.therapist 
              ? `${s.therapist.first_name || ''} ${s.therapist.last_name || ''}`.trim() 
              : 'Practitioner',
            client_email: '',
            session_date: s.session_date,
            start_time: s.start_time,
            duration_minutes: s.duration_minutes,
            price: s.price || 0,
            status: getDisplaySessionStatus(s),
            payment_status: s.payment_status ?? null,
            is_peer_booking: true,
            is_reciprocal_booking: true // Flag to identify reciprocal bookings
          }))
        ];

        // Pending mobile booking requests (for mobile + hybrid practitioners) – accept/decline on /practice/mobile-requests
        let mobileRequestSessions: SessionData[] = [];
        try {
          const { data: mobileRequests } = await supabase.rpc('get_practitioner_mobile_requests', {
            p_practitioner_id: user.id,
            p_status: 'pending'
          });
          mobileRequestSessions = (mobileRequests || []).map((r: { id: string; requested_date: string; requested_start_time: string; client_name: string; product_name: string; duration_minutes: number }) => ({
            id: r.id,
            session_type: r.product_name || 'Mobile request',
            client_name: r.client_name || 'Client',
            client_email: '',
            session_date: r.requested_date,
            start_time: typeof r.requested_start_time === 'string' ? r.requested_start_time.slice(0, 5) : String(r.requested_start_time).slice(0, 5),
            duration_minutes: r.duration_minutes || 60,
            price: 0,
            status: 'pending',
            payment_status: null,
            is_peer_booking: false,
            is_mobile_request: true
          }));
        } catch {
          mobileRequestSessions = [];
        }

        const allSessions = [...regularSessions, ...exchangeRequestSessions, ...peerBookingSessions, ...mobileRequestSessions].sort((a, b) => {
          const dateCompare = a.session_date.localeCompare(b.session_date);
          if (dateCompare !== 0) return dateCompare;
          return a.start_time.localeCompare(b.start_time);
        }).slice(0, 20); // Increased to accommodate sessions + mobile requests

        setUpcomingSessions(allSessions);
        setOptimisticSessions(allSessions);

        setCreditBalance(
          typeof data.credit_balance === 'number' 
            ? data.credit_balance 
            : (data.credit_balance?.balance ?? data.credit_balance?.current_balance ?? 0)
        );

        // Fetch pending same-day bookings (surface above the fold for approval)
        try {
          const { data: pending } = await supabase.rpc('get_pending_same_day_bookings', { p_practitioner_id: user.id });
          setPendingSameDayBookings(pending || []);
        } catch {
          setPendingSameDayBookings([]);
        }

        // Dedicated fetch for confirmed mobile sessions (New Bookings augment - not reliant on RPC structure)
        try {
          const next60 = new Date();
          next60.setDate(next60.getDate() + 60);
          const next60Str = next60.toISOString().split('T')[0];
          const { data: mobileSessions } = await supabase
            .from('client_sessions')
            .select('id, client_name, session_date, start_time, status')
            .eq('therapist_id', user.id)
            .eq('appointment_type', 'mobile')
            .eq('is_peer_booking', false)
            .in('status', ['confirmed', 'scheduled'])
            .gte('session_date', today)
            .lte('session_date', next60Str)
            .order('session_date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(50);
          const mapped: SessionData[] = (mobileSessions || []).map((s: any) => ({
            id: s.id,
            session_type: 'Client session',
            client_name: s.client_name?.trim() || 'Client',
            client_email: '',
            session_date: s.session_date,
            start_time: s.start_time,
            duration_minutes: 60,
            price: 0,
            status: s.status || 'confirmed',
            payment_status: null,
            is_peer_booking: false,
            is_reciprocal_booking: false,
            appointment_type: 'mobile'
          }));
          setConfirmedMobileSessionsList(mapped);
        } catch {
          setConfirmedMobileSessionsList([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile?.therapist_type, fetchDashboardDataFallback]);

  // Real-time subscription for client sessions
  const { data: realtimeSessions, loading: sessionsLoading } = useRealtimeSubscription(
    'client_sessions',
    `therapist_id=${user?.id}`,
    (payload) => {
      
      // Check if session was just completed
      if (payload.eventType === 'UPDATE' && 
          payload.new.status === 'completed' && 
          payload.old.status !== 'completed') {
        // Show treatment notes prompt
        setCompletedSession({
          id: payload.new.id,
          clientName: payload.new.client_name
        });
        setShowNotesPrompt(true);
      }
      
      // Refresh dashboard data when sessions change
      fetchDashboardData();
    }
  );

  // Real-time subscription for treatment exchange requests
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('treatment_exchange_requests_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_exchange_requests',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          // Refresh dashboard data when exchange requests change
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchDashboardData]);

  // Real-time subscription for mobile booking requests (mobile + hybrid practitioners)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('mobile_booking_requests_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_booking_requests',
          filter: `practitioner_id=eq.${user.id}`
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchDashboardData]);

  // Format elapsed time helper
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect - update every second
  useEffect(() => {
    if (activeSessionId && sessionStartTime) {
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSessionId, sessionStartTime]);

  // Load active session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('activeSession');
    if (stored) {
      try {
        const { sessionId, startTime } = JSON.parse(stored);
        setActiveSessionId(sessionId);
        setSessionStartTime(startTime);
      } catch (e) {
        console.error('Error loading active session:', e);
      }
    }
  }, []);

  // Handler for accepting treatment exchange requests - shows modal for service selection
  const handleAcceptExchangeRequest = useCallback((session: SessionData) => {
    if (!session.exchange_request_id || !user?.id) {
      // Cannot accept: missing exchange_request_id or user.id
        return;
    }
    
    // Prevent opening if modal is already open
    if (showAcceptanceModal) {
      return;
    }
    

    // Show the acceptance modal with service selection
    setSelectedExchangeRequest(session);
    setShowAcceptanceModal(true);
  }, [user?.id, showAcceptanceModal]);

  // Handler for declining treatment exchange requests
  const handleDeclineExchangeRequest = useCallback(async (session: SessionData) => {
    if (!session.exchange_request_id || !user?.id) return;

    try {
      setRespondingToRequest(session.exchange_request_id);
      await TreatmentExchangeService.declineExchangeRequest(
        session.exchange_request_id,
        user.id,
        undefined // No reason for quick decline from dashboard
      );
      
      toast.success('Treatment exchange request declined');

      // Update exchange status immediately so UI reflects declined (PRACTITIONER_DASHBOARD #22)
      setExchangeRequestStatuses(prev => ({ ...prev, [session.exchange_request_id]: 'declined' }));

      await fetchDashboardData();
    } catch (error) {
      console.error('Error declining exchange request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to decline request');
    } finally {
      setRespondingToRequest(null);
    }
  }, [user?.id, fetchDashboardData]);

  const [extendingRequestId, setExtendingRequestId] = useState<string | null>(null);

  const handleRequestExtension = useCallback(async (requestId: string) => {
    if (!user?.id) return;
    try {
      setExtendingRequestId(requestId);
      await TreatmentExchangeService.requestExchangeExtension(requestId, user.id, 3);
      toast.success('Extension requested. Waiting for requester to approve.');
      await fetchDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request extension');
    } finally {
      setExtendingRequestId(null);
    }
  }, [user?.id, fetchDashboardData]);

  const handleApproveExtension = useCallback(async (requestId: string) => {
    if (!user?.id) return;
    try {
      setExtendingRequestId(requestId);
      await TreatmentExchangeService.approveExchangeExtension(requestId, user.id);
      toast.success('Extension approved. Recipient has more time to book.');
      await fetchDashboardData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve extension');
    } finally {
      setExtendingRequestId(null);
    }
  }, [user?.id, fetchDashboardData]);

  // Handler to update session status with optimistic UI and state validation
  const handleSessionStatusUpdate = useCallback(async (sessionId: string, newStatus: string) => {
    if (!user?.id) return;
    
    try {
      setUpdatingSession(sessionId);
      
      // Find session in optimistic state
      const session = optimisticSessions.find(s => s.id === sessionId);
      if (!session) {
        toast.error('Session not found');
        return;
      }
      
      // Validate state transition
      // Pass is_peer_booking and payment_status to allow scheduled -> in_progress for peer bookings
      const validation = validateTransition(
        session.status as any, 
        newStatus as any,
        {
          isPeerBooking: session.is_peer_booking || false,
          paymentStatus: (session as any).payment_status || 'pending'
        }
      );
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid status transition');
        return;
      }
      
      // Optimistic update - update UI immediately
      setOptimisticSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s)
      );

      // Payment guard - enforce payment completion before starting session
      if (newStatus === 'in_progress') {
        const { canStartSession } = await import('@/lib/session-state-machine');
        
        // Fetch fresh session data from database to ensure we have accurate payment_status
        const { data: freshSession, error: fetchError } = await supabase
          .from('client_sessions')
          .select('payment_status, is_peer_booking, price, status')
          .eq('id', sessionId)
          .single();
        
        if (fetchError) {
          console.error('Error fetching session payment status:', fetchError);
          toast.error('Failed to verify payment status');
          setUpdatingSession(null);
          return;
        }
        
        const sessionPaymentStatus = freshSession?.payment_status || session.payment_status || 'pending';
        const validation = canStartSession(
          session.status as any, 
          sessionPaymentStatus,
          {
            isPeerBooking: freshSession?.is_peer_booking === true || session.is_peer_booking === true,
            price: Number(freshSession?.price || session.price) || 0
          }
        );
        if (!validation.valid) {
          console.error('Payment validation failed:', {
            sessionId,
            status: session.status,
            paymentStatus: sessionPaymentStatus,
            isPeerBooking: freshSession?.is_peer_booking || session.is_peer_booking,
            price: freshSession?.price || session.price
          });
          toast.error(validation.error || 'Cannot start session without completed payment');
          setUpdatingSession(null);
          return;
        }
        
        // Set up session timer
        const startTime = Date.now();
        setActiveSessionId(sessionId);
        setSessionStartTime(startTime);
        localStorage.setItem('activeSession', JSON.stringify({ sessionId, startTime }));
        
        // Navigate to SOAP notes page immediately after validation passes
        // The session parameter will trigger the treatment notes modal to open
        navigate(`/practice/clients?session=${sessionId}&tab=sessions`);
      } else if (newStatus === 'completed' || newStatus === 'cancelled') {
        setActiveSessionId(null);
        setSessionStartTime(null);
        setElapsedSeconds(0);
        localStorage.removeItem('activeSession');
      }
      
      // Build update data
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // If completing session, mark payment as completed and prompt for notes
      if (newStatus === 'completed') {
        updateData.payment_status = 'completed';
        updateData.completed_at = new Date().toISOString();
        // Prompt for treatment notes
        setNoteSessionId(sessionId);
        setShowNotesModal(true);
      }
      
      const { error } = await supabase
        .from('client_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) throw error;

      // Process credit earning for completed sessions (ONLY for client/guest bookings, NOT peer bookings)
      if (newStatus === 'completed' && user?.id) {
        try {
          // Get session details for credit calculation
          const { data: sessionData } = await supabase
            .from('client_sessions')
            .select('session_type, duration_minutes, client_id, is_peer_booking')
            .eq('id', sessionId)
            .single();

          // CRITICAL: Do NOT award credits for peer treatment bookings
          // Credits are only earned from client and guest bookings, not peer-to-peer exchanges
          if (sessionData && sessionData.duration_minutes && !sessionData.is_peer_booking) {
            // Calculate and award credits to practitioner
            await CreditManager.processSessionCredits(
              sessionId,
              sessionData.client_id,
              user.id,
              sessionData.session_type || 'general',
              sessionData.duration_minutes
            );

            // Refresh credit balance
            const newBalance = await CreditManager.getBalance(user.id);
            setCreditBalance(newBalance);
            toast.success(`${newBalance > creditBalance ? '+' : ''}${newBalance - creditBalance} credits earned!`);
          }
        } catch (creditError) {
          console.error('Error processing session credits:', creditError);
          // Don't fail the session completion if credits fail
        }

        // Send review request email to client
        try {
          const { NotificationSystem } = await import('@/lib/notification-system');
          await NotificationSystem.sendReviewRequest(sessionId);
        } catch (reviewError) {
          console.error('Error sending review request:', reviewError);
          // Don't fail the session completion if email fails
        }
      }

      // Update real state
      setUpcomingSessions(prev => 
        prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s)
      );

      toast.success(`Session ${newStatus === 'in_progress' ? 'started' : newStatus === 'completed' ? 'completed' : 'updated'} successfully`);
      
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating session:', error);
      // Rollback optimistic update on error
      setOptimisticSessions(upcomingSessions);
      toast.error('Failed to update session status');
    } finally {
      setUpdatingSession(null);
    }
  }, [user?.id, fetchDashboardData, upcomingSessions, optimisticSessions]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const normalized = parseNotificationRows((data || []) as Notification[]);
      setNotifications(normalized);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user?.id]);

  // Handler called after modal accepts the request
  // Now defined after fetchNotifications is available
  const handleExchangeAccepted = useCallback(async () => {
    setSelectedExchangeRequest(null);
    setShowAcceptanceModal(false);
    // Refresh both dashboard data and notifications to reflect the booking
    await Promise.all([
      fetchDashboardData(),
      fetchNotifications()
    ]);
    // Refresh reciprocal bookings status for accepted requests
    const acceptedRequestIds = Object.keys(exchangeRequestStatuses).filter(
      id => exchangeRequestStatuses[id] === 'accepted'
    );
    if (acceptedRequestIds.length > 0) {
      checkReciprocalBookings(acceptedRequestIds);
    }
  }, [fetchDashboardData, fetchNotifications, exchangeRequestStatuses]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id || !notificationId) return;
    
    try {
      await markNotificationRead(notificationId, user.id);

      // Update local state immediately
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  }, [user?.id]);

  const handleAcceptMobileRequest = useCallback(async (requestId: string, notificationId: string) => {
    if (!user?.id) return;
    setMobileRequestProcessingId(requestId);
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('mobile_booking_requests')
        .select('status, stripe_payment_intent_id, payment_status')
        .eq('id', requestId)
        .eq('practitioner_id', user.id)
        .single();
      if (fetchErr || !req) throw new Error('Request not found');
      if (req.status !== 'pending') {
        throw new Error('Request not found or not pending');
      }
      // Per Stripe: some payment methods (e.g. wallets) auto-capture; RPC accepts both 'held' and 'captured'
      if ((req.payment_status !== 'held' && req.payment_status !== 'captured') || !req.stripe_payment_intent_id) {
        throw new Error('Request not found or payment not ready');
      }
      // Only capture when held; skip when already captured (e.g. auto-capture payment methods)
      if (req.payment_status === 'held') {
        const { error: captureError } = await supabase.functions.invoke('mobile-payment', {
          body: { action: 'capture-mobile-payment', payment_intent_id: req.stripe_payment_intent_id },
        });
        if (captureError) throw captureError;
      }
      const { data, error } = await supabase.rpc('accept_mobile_booking_request', {
        p_request_id: requestId,
        p_stripe_payment_intent_id: req.stripe_payment_intent_id,
      });
      if (error) throw error;
      if (!data?.success && data?.error) throw new Error(data.error);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Request accepted! Payment captured and session created.');
      try { await dismissNotification(notificationId, user.id); } catch { /* non-blocking */ }
      await Promise.all([fetchDashboardData(), fetchNotifications()]);
    } catch (err: any) {
      const msg = err?.message || 'Failed to accept request';
      const isStale = /not found|not pending|payment hold not ready|expired|already processed/i.test(msg);
      toast.error(isStale ? 'This request is no longer available.' : msg);
      if (isStale) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        try { await dismissNotification(notificationId, user.id); } catch { /* non-blocking */ }
      }
    } finally {
      setMobileRequestProcessingId(null);
    }
  }, [user?.id, fetchDashboardData, fetchNotifications]);

  const handleDeclineMobileRequest = useCallback(async (requestId: string, notificationId: string) => {
    if (!user?.id) return;
    setMobileRequestProcessingId(requestId);
    try {
      const { data: req, error: fetchErr } = await supabase
        .from('mobile_booking_requests')
        .select('status, stripe_payment_intent_id, payment_status, client_id, requested_date, requested_start_time')
        .eq('id', requestId)
        .eq('practitioner_id', user.id)
        .single();
      if (fetchErr || !req) throw new Error('Request not found');
      if (req.status !== 'pending') {
        throw new Error('Request not found or not pending');
      }
      if (req.payment_status === 'captured') {
        // Refetch so UI hides Decline button on next render
        const { data: refresh } = await supabase
          .from('mobile_booking_requests')
          .select('id, payment_status')
          .eq('id', requestId)
          .single();
        if (refresh) {
          setMobileRequestPaymentStatuses((prev) => ({ ...prev, [requestId]: refresh.payment_status ?? 'captured' }));
        }
        throw new Error('Payment already captured. Please accept the request or contact support for a refund.');
      }
      if (req.payment_status === 'held' && req.stripe_payment_intent_id) {
        const { error: releaseError } = await supabase.functions.invoke('mobile-payment', {
          body: { action: 'release-mobile-payment', payment_intent_id: req.stripe_payment_intent_id },
        });
        if (releaseError) throw releaseError;
      }
      const { data, error } = await supabase.rpc('decline_mobile_booking_request', {
        p_request_id: requestId,
        p_decline_reason: null,
      });
      if (error) throw error;
      if (!data?.success && data?.error) throw new Error(data.error);
      if (req.client_id) {
        const practitionerName = [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ').trim() || 'Your practitioner';
        NotificationSystem.sendMobileBookingDeclinedNotification(req.client_id, {
          requestId,
          practitionerName,
          serviceType: 'Mobile service',
          requestedDate: req.requested_date,
          requestedTime: req.requested_start_time,
          declineReason: null,
          alternateDate: null,
          alternateTime: null,
        }).catch((e) => console.error('Failed to send decline email:', e));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Request declined. Payment released.');
      try { await dismissNotification(notificationId, user.id); } catch { /* non-blocking */ }
      await Promise.all([fetchDashboardData(), fetchNotifications()]);
    } catch (err: any) {
      const msg = err?.message || 'Failed to decline request';
      const isStale = /not found|not pending|payment hold not ready|expired|already processed/i.test(msg);
      toast.error(isStale ? 'This request is no longer available.' : msg);
      if (isStale) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        try { await dismissNotification(notificationId, user.id); } catch { /* non-blocking */ }
      }
    } finally {
      setMobileRequestProcessingId(null);
    }
  }, [user?.id, userProfile, fetchDashboardData, fetchNotifications]);

  // Fetch client progress updates
  const fetchClientProgress = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Get recent exercise completions
      const { data: completions } = await supabase
        .from('exercise_program_progress')
        .select(`
          *,
          program:home_exercise_programs!inner(
            id,
            title,
            client_id,
            practitioner_id
          ),
          session:client_sessions(
            id,
            session_date,
            session_number
          )
        `)
        .eq('program.practitioner_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5);

      // Get recent treatment notes
      const { data: notes } = await supabase
        .from('treatment_notes')
        .select(`
          *,
          session:client_sessions(
            id,
            session_date,
            client_name
          )
        `)
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent pain level metrics
      const { data: painMetrics } = await supabase
        .from('progress_metrics')
        .select(`
          *,
          client:users!progress_metrics_client_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq('practitioner_id', user.id)
        .eq('metric_type', 'pain_level')
        .order('session_date', { ascending: false })
        .limit(5);

      const updates: any[] = [];
      
      // Get client names for exercise completions
      const clientIds = new Set<string>();
      (completions || []).forEach((comp: any) => {
        if (comp.program?.client_id) clientIds.add(comp.program.client_id);
      });
      (notes || []).forEach((note: any) => {
        if (note.session?.client_id) clientIds.add(note.session.client_id);
      });
      (painMetrics || []).forEach((metric: any) => {
        if (metric.client_id) clientIds.add(metric.client_id);
      });

      const clientNamesMap: Record<string, string> = {};
      if (clientIds.size > 0) {
        const { data: clients } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', Array.from(clientIds));
        
        (clients || []).forEach((client: any) => {
          clientNamesMap[client.id] = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client';
        });
      }

      // Add exercise completions
      (completions || []).forEach((comp: any) => {
        if (comp.program && comp.session) {
          updates.push({
            type: 'exercise_completion',
            id: comp.id,
            clientName: clientNamesMap[comp.program.client_id] || 'Client',
            programName: comp.program.title,
            date: comp.completed_at || comp.completed_date,
            compliance: 100, // Calculate if needed
            session: comp.session
          });
        }
      });

      // Add treatment notes
      (notes || []).forEach((note: any) => {
        if (note.session) {
          updates.push({
            type: 'note',
            id: note.id,
            clientName: note.session.client_name || clientNamesMap[note.session.client_id] || 'Client',
            date: note.created_at,
            session: note.session
          });
        }
      });

      // Add pain level reports
      (painMetrics || []).forEach((metric: any) => {
        if (metric.value >= 7) {
          const clientName = metric.client 
            ? `${metric.client.first_name || ''} ${metric.client.last_name || ''}`.trim()
            : clientNamesMap[metric.client_id] || 'Client';
          updates.push({
            type: 'pain_report',
            id: metric.id,
            clientName: clientName || 'Client',
            painLevel: metric.value,
            date: metric.session_date,
            notes: 'Post-exercise feedback'
          });
        }
      });

      // Sort by date and limit
      updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setClientProgressUpdates(updates.slice(0, 3));
    } catch (error) {
      console.error('Error fetching client progress:', error);
    }
  }, [user?.id]);

  // Real-time subscription for mutual_exchange_sessions to update notification status
  // Use useEffect with manual channel subscription to handle OR conditions
  // This must be after fetchNotifications is defined
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`mutual-exchange-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mutual_exchange_sessions',
          filter: `practitioner_a_id=eq.${user.id}`
        },
        (payload) => {
          // Refresh notifications when mutual session changes
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mutual_exchange_sessions',
          filter: `practitioner_b_id=eq.${user.id}`
        },
        (payload) => {
          // Refresh notifications when mutual session changes
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_sessions',
          filter: `is_peer_booking=eq.true`
        },
        (payload) => {
          // Check if this session is related to any of our exchange requests
          const session = payload.new || payload.old;
          if (session && (session.therapist_id === user.id || session.client_id === user.id)) {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  // Real-time subscription for notifications
  // This must be after fetchNotifications is defined
  // We re-fetch notifications on real-time updates to ensure consolidation and date checking logic is applied
  useRealtimeSubscription(
    'notifications',
    `recipient_id=eq.${user?.id}`,
    (payload) => {
      // Re-fetch notifications to apply consolidation, date checking, and sorting logic
      // This ensures all notifications are properly processed with the latest logic
      // Use a small delay to batch rapid updates
      setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      // Show toast for new unread notifications immediately
      if (payload.eventType === 'INSERT' && payload.new.read_at === null) {
        let parsedData = payload.new.data;
        if (typeof payload.new.data === 'string') {
          try {
            parsedData = JSON.parse(payload.new.data);
          } catch (e) {
            parsedData = {};
          }
        }
        
        toast.info(payload.new.title || 'New Notification', {
          description: payload.new.body,
          duration: 5000
        });
      }
    }
  );

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchNotifications();
      fetchClientProgress();
    }
  }, [user, location.pathname, fetchDashboardData, fetchNotifications, fetchClientProgress]);

  const metricCards: MetricCard[] = [
    {
      key: "revenue",
      label: "Monthly revenue",
      value: formatCurrency(stats.monthlyRevenue),
      helper: "This month",
      icon: CreditCard,
      accentClass: "text-primary"
    },
    {
      key: "sessions",
      label: "Total sessions",
      value: formatCount(stats.totalSessions),
      helper: "All time",
      icon: Calendar,
      accentClass: "text-muted-foreground"
    },
    {
      key: "completed",
      label: "Completed sessions",
      value: formatCount(stats.completedSessions),
      helper: "Successfully completed",
      icon: Heart,
      accentClass: "text-success"
    },
    {
      key: "credits",
      label: "Credit balance",
      value: formatCount(creditBalance),
      helper: "Available credits",
      icon: Coins,
      accentClass: "text-accent"
    }
  ];

  if (stats.cancelledSessions > 0) {
    metricCards.push({
      key: "cancelled",
      label: "Cancelled sessions",
      value: formatCount(stats.cancelledSessions),
      helper: "By you",
      icon: XCircle,
      accentClass: "text-warning"
    });
  }

  if (stats.totalRefunds > 0) {
    metricCards.push({
      key: "refunds",
      label: "Total refunds",
      value: formatCurrency(stats.totalRefunds),
      helper: "Refunded to clients",
      icon: CreditCard,
      accentClass: "text-error"
    });
  }

  const upcomingCount = optimisticSessions?.length || 0;
  const todaySessions = optimisticSessions.filter(s => {
    const sessionDate = new Date(s.session_date);
    return isToday(sessionDate);
  });

  // Detect overlapping sessions (double booking) in today's schedule
  const hasOverlappingSessions = useMemo(() => {
    if (todaySessions.length < 2) return false;
    const toMinutes = (t: string) => {
      const parts = (t || '').split(':');
      return parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
    };
    for (let i = 0; i < todaySessions.length; i++) {
      const a = todaySessions[i];
      const durA = a.duration_minutes || 60;
      const startA = toMinutes(a.start_time);
      const endA = startA + durA;
      for (let j = i + 1; j < todaySessions.length; j++) {
        const b = todaySessions[j];
        const durB = b.duration_minutes || 60;
        const startB = toMinutes(b.start_time);
        const endB = startB + durB;
        if (startA < endB && startB < endA) return true;
      }
    }
    return false;
  }, [todaySessions]);

  // Get today's date formatted
  const todayDate = format(new Date(), 'EEEE, MMM d');
  const completionRate = stats.totalSessions > 0 
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100) 
    : 0;

  // Same 6-check activation as ProfileCompletionWidget so dashboard and widget show same %
  const profileActivationStatus = useMemo(() => {
    if (!userProfile || userProfile.user_role === 'client') return null;
    if (!profileActivationData) return calculateProfileActivationStatus(userProfile, null, 0, 0, 0);
    return calculateProfileActivationStatus(
      userProfile,
      profileActivationData.hasAvailability,
      profileActivationData.qualificationsCount,
      profileActivationData.productsCount,
      profileActivationData.qualificationDocumentsCount
    );
  }, [userProfile, profileActivationData]);

  // New-booking notifications only: incoming booking confirmations/requests plus actionable
  // treatment-exchange notifications. Filter client-side to avoid enum mismatches during rollout.
  const bookingNotifications = notifications.filter(isNewBookingNotification);

  // Augment with confirmed mobile sessions (dedicated fetch - not reliant on RPC/slice limits)
  const notificationSessionIds = new Set(
    bookingNotifications
      .map((n) => (n.data?.session_id ?? n.data?.sessionId) as string)
      .filter(Boolean)
  );
  const confirmedMobileSessions = (confirmedMobileSessionsList || [])
    .filter((s) => !notificationSessionIds.has(s.id))
    .map(
      (s): NormalizedNotification =>
        ({
          id: `session-${s.id}`,
          type: "booking_confirmed",
          family: "booking",
          title: "Mobile Session Confirmed",
          message: `Session with ${s.client_name || "Client"} on ${s.session_date} at ${s.start_time?.slice(0, 5) || ""} is confirmed.`,
          data: {
            session_id: s.id,
            sessionId: s.id,
            client_name: s.client_name,
            clientName: s.client_name,
            session_date: s.session_date,
            sessionDate: s.session_date,
            session_time: s.start_time,
            sessionTime: s.start_time
          },
          source_type: "mobile_booking_request",
          source_id: null,
          user_id: user?.id ?? null,
          read: true,
          dismissed_at: null,
          created_at: null
        })
    )
    .sort((a, b) => {
      const aDate = a.data?.session_date ?? "";
      const bDate = b.data?.session_date ?? "";
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return (a.data?.session_time ?? "").localeCompare(b.data?.session_time ?? "");
    });

  // Exchange items: use treatment_exchange_requests (DB source of truth), NOT notifications (stale)
  const pendingExchangeItems: NormalizedNotification[] = pendingExchangeRequestsForSidebar.map((req) => ({
    id: `exchange-${req.id}`,
    type: "treatment_exchange_request",
    family: "exchange" as const,
    title: "New Treatment Exchange Request",
    message: `${req.requester_name} has requested a ${req.duration_minutes}-minute treatment exchange`,
    data: {
      requestId: req.id,
      request_id: req.id,
      requester_id: req.requester_id,
      requesterId: req.requester_id,
      practitionerName: req.requester_name,
      sessionDate: req.requested_session_date,
      session_date: req.requested_session_date,
      startTime: req.requested_start_time,
      requested_start_time: req.requested_start_time,
      duration: req.duration_minutes,
      duration_minutes: req.duration_minutes,
    },
    source_type: "treatment_exchange_request",
    source_id: req.id,
    user_id: user?.id ?? null,
    read: false,
    dismissed_at: null,
    created_at: req.created_at,
  }));

  const acceptedNeedingReciprocalItems: NormalizedNotification[] = acceptedExchangeNeedingReciprocalForSidebar.map((req) => ({
    id: `exchange-reciprocal-${req.id}`,
    type: "exchange_reciprocal_booking_reminder",
    family: "exchange" as const,
    title: "Book your return session",
    message: `You accepted an exchange with ${req.requester_name}. Book your return session to complete the exchange.`,
    data: {
      requestId: req.id,
      request_id: req.id,
      requester_id: req.requester_id,
      requesterId: req.requester_id,
      practitionerName: req.requester_name,
      sessionDate: req.requested_session_date,
      session_date: req.requested_session_date,
      startTime: req.requested_start_time,
      requested_start_time: req.requested_start_time,
      duration: req.duration_minutes,
      duration_minutes: req.duration_minutes,
      extension_requested_at: req.extension_requested_at,
      extension_approved_at: req.extension_approved_at,
      reciprocal_booking_deadline: req.reciprocal_booking_deadline,
    },
    source_type: "treatment_exchange_request",
    source_id: req.id,
    user_id: user?.id ?? null,
    read: false,
    dismissed_at: null,
    created_at: req.created_at,
  }));

  const acceptedForRequesterItems: NormalizedNotification[] = acceptedExchangeForRequesterSidebar.map((req) => ({
    id: `exchange-accepted-requester-${req.id}`,
    type: "exchange_request_accepted",
    family: "exchange" as const,
    title: "Request accepted",
    message: `${req.recipient_name} accepted your treatment exchange request. They will book their return session to complete the exchange.`,
    data: {
      requestId: req.id,
      request_id: req.id,
      recipient_id: req.recipient_id,
      practitionerName: req.recipient_name,
      sessionDate: req.requested_session_date,
      session_date: req.requested_session_date,
      startTime: req.requested_start_time,
      requested_start_time: req.requested_start_time,
      duration: req.duration_minutes,
      duration_minutes: req.duration_minutes,
      extension_requested_at: req.extension_requested_at,
      extension_approved_at: req.extension_approved_at,
      extension_days: req.extension_days,
    },
    source_type: "treatment_exchange_request",
    source_id: req.id,
    user_id: user?.id ?? null,
    read: false,
    dismissed_at: null,
    created_at: req.created_at,
  }));

  const exchangeItemsFromDb: NormalizedNotification[] = [
    ...pendingExchangeItems,
    ...acceptedNeedingReciprocalItems,
    ...acceptedForRequesterItems,
  ];

  // Exclude exchange notifications (we use DB instead); keep mobile, clinic, etc.
  // exchange_request_accepted for requester comes from acceptedForRequesterItems (DB)
  const nonExchangeNotifications = bookingNotifications.filter(
    (n) => n.source_type !== "treatment_exchange_request" && n.source_type !== "slot_hold"
  );

  const allBookingItems: NormalizedNotification[] = [
    ...nonExchangeNotifications,
    ...exchangeItemsFromDb,
    ...confirmedMobileSessions,
  ].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
  const unreadBookingCount = allBookingItems.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StatsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-10 w-48 rounded-md bg-muted animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SessionCardSkeleton key={i} />
                ))}
              </div>
            </div>
            <aside className="space-y-6">
              <div className="h-8 w-36 rounded-md bg-muted animate-pulse mb-4" />
              <MessageSkeleton count={4} />
              <div className="h-8 w-28 rounded-md bg-muted animate-pulse mt-6 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <main id="main-content" className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top cards: Stripe, Treatment Exchange, Complete Profile */}
        <div className="space-y-3 mb-8">
          {/* Stripe Connect Requirement */}
          {hasStripeConnect === false && !stripeConnectCardDismissed && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 p-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm shrink-0">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary leading-tight">Payment setup required</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Connect your Stripe account to take bookings and receive payments.</p>
                  </div>
                </div>
                <Button onClick={() => navigate('/profile#services')} variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 rounded-full shrink-0">
                  Complete setup
                </Button>
              </div>
              <div className="pt-3 border-t border-primary/20 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(`practitioner-notification-stripe-connect-dismissed-${user?.id}`, 'true');
                      setStripeConnectCardDismissed(true);
                    } catch {
                      setStripeConnectCardDismissed(true);
                    }
                  }}
                  aria-label="Dismiss"
                  className="min-h-[44px] min-w-[44px] p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Treatment Exchange Call-to-Action (same card style as Complete Your Profile) */}
          {userProfile && !userProfile.treatment_exchange_opt_in && !treatmentExchangeCtaDismissed && (
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="mt-0.5 p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">Enable Treatment Exchange</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Exchange sessions with other practitioners using credits. Build your professional network.</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/credits#peer-treatment')} size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-full font-medium shrink-0">
                    Enable Now
                  </Button>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(`practitioner-notification-treatment-exchange-dismissed-${user?.id}`, 'true');
                        setTreatmentExchangeCtaDismissed(true);
                      } catch {
                        setTreatmentExchangeCtaDismissed(true);
                      }
                    }}
                    aria-label="Dismiss"
                    className="min-h-[44px] min-w-[44px] p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Profile Call-to-Action (same 6-check % as ProfileCompletionWidget) */}
          {profileActivationStatus && profileActivationStatus.percentage < 100 && !completeProfileCtaDismissed && (
            <CompleteProfileCta
              onClick={() => navigate('/profile')}
              completionPercent={profileActivationStatus.percentage}
              onDismiss={() => {
                try {
                  sessionStorage.setItem(`practitioner-notification-complete-profile-cta-dismissed-${user?.id}`, 'true');
                  setCompleteProfileCtaDismissed(true);
                } catch {
                  setCompleteProfileCtaDismissed(true);
                }
              }}
            />
          )}
        </div>

        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Overview for <span className="text-primary font-semibold">{todayDate}</span> • You have <span className="font-bold">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</span> today.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main column: metrics, Today's Schedule */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EarningsWidget therapistId={user?.id} />
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sessions</p>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatCount(stats.totalSessions)}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2"><span className="font-semibold">{formatCount(stats.totalSessions)}</span> sessions this month</p>
              </div>
            </div>

            {/* Same-day approvals (surfaced above the fold when pending) */}
            {pendingSameDayBookings.length > 0 && (
              <Card className="rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5" />
                    Same-day bookings need your approval
                  </CardTitle>
                  <CardDescription>
                    {pendingSameDayBookings.length} same-day booking{pendingSameDayBookings.length !== 1 ? 's' : ''} awaiting approval. Payment is held until you approve or decline.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SameDayBookingApproval
                    practitionerId={user?.id || ''}
                    onApprovalChange={fetchDashboardData}
                  />
                </CardContent>
              </Card>
            )}

            {/* Double-booking conflict warning */}
            {hasOverlappingSessions && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Schedule conflict detected</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    You have overlapping sessions today. Please review and resolve the conflict.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50" onClick={() => navigate("/practice/schedule")}>
                    View Full Schedule
                  </Button>
                </div>
              </div>
            )}

            {/* Today's Schedule card */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Today's Schedule <span className="text-primary font-medium ml-2">{format(new Date(), "EEEE d")}</span>
                </h2>
                <Button variant="ghost" size="sm" className="text-primary font-semibold hover:underline" onClick={() => navigate("/practice/schedule")}>
                  Full Diary
                </Button>
              </div>
              {todaySessions.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No sessions today</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">Your day is clear. Use this time to update your profile or review client notes.</p>
                  <Button className="mt-8 rounded-full font-medium" onClick={() => navigate("/practice/schedule")}>
                    View Full Schedule
                  </Button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {todaySessions.map((s) => (
                    <Card key={s.id} className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-base">
                          {(s as SessionData).is_mobile_request ? "📍" : s.is_exchange_request ? "🤝" : "🧑‍⚕️"}
                        </div>
                        <div className="min-w-0 flex-1">
                          {(s as SessionData).is_mobile_request ? (
                            <div className="space-y-2">
                              <p className="font-semibold text-foreground">Mobile request</p>
                              <p className="text-sm text-muted-foreground">{(s as SessionData).client_name} · {(s as SessionData).session_type} · {(s as SessionData).duration_minutes} mins</p>
                              <Button size="sm" onClick={() => navigate(`/practice/mobile-requests?requestId=${(s as SessionData).id}`)}>Review request</Button>
                            </div>
                          ) : (s as SessionData).is_exchange_request && (s as SessionData).status === "pending_exchange" ? (
                            (() => {
                              const reqId = (s as SessionData).exchange_request_id;
                              const knownStatus = reqId ? exchangeRequestStatuses[reqId] : null;
                              const isNoLongerPending = knownStatus === 'accepted' || knownStatus === 'declined';
                              const isDisabled = respondingToRequest === reqId || isNoLongerPending;
                              return (
                                <div className="space-y-2">
                                  <p className="font-semibold text-foreground">Treatment Exchange Request</p>
                                  <p className="text-sm text-muted-foreground">From: {(s as SessionData).requester_name || (s as SessionData).client_name}</p>
                                  {isNoLongerPending ? (
                                    <p className="text-sm text-muted-foreground">Request {knownStatus === 'accepted' ? 'accepted' : 'declined'}</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isDisabled}
                                        title={isDisabled ? (knownStatus === 'accepted' ? 'Request already accepted' : knownStatus === 'declined' ? 'Request already declined' : 'Processing…') : undefined}
                                        onClick={() => { if (window.confirm(`Release slot so ${(s as SessionData).requester_name || (s as SessionData).client_name} can request a different time?`)) handleDeclineExchangeRequest(s as SessionData); }}
                                      >
                                        Reschedule
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={isDisabled}
                                        title={isDisabled ? (knownStatus === 'accepted' ? 'Request already accepted' : knownStatus === 'declined' ? 'Request already declined' : 'Processing…') : undefined}
                                        onClick={() => handleAcceptExchangeRequest(s as SessionData)}
                                      >
                                        Accept
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="space-y-2">
                              <p className="font-semibold text-foreground">
                                {(s as SessionData).client_name}
                                {(s as SessionData).is_guest && <span className="text-muted-foreground font-normal"> (Guest)</span>}
                              </p>
                              <p className="text-sm text-muted-foreground">{(s as SessionData).session_type || "Session"} · {(s as SessionData).duration_minutes} mins</p>
                              {!(s as SessionData).is_peer_booking && (userProfile?.therapist_type === 'hybrid' || userProfile?.therapist_type === 'mobile') && (
                                (() => {
                                  const sd = s as SessionData;
                                  const appType = sd.appointment_type ?? 'clinic';
                                  const loc = getSessionLocation(
                                    { appointment_type: appType, visit_address: sd.visit_address },
                                    { clinic_address: userProfile?.clinic_address ?? undefined, location: userProfile?.location ?? undefined }
                                  );
                                  return (
                                    <p className="text-xs text-muted-foreground">
                                      {appType === 'mobile' ? 'Mobile' : 'Clinic'}
                                      {loc.sessionLocation && ` · ${loc.sessionLocation.length > 40 ? loc.sessionLocation.slice(0, 40) + '…' : loc.sessionLocation}`}
                                    </p>
                                  );
                                })()
                              )}
                              {!(s as SessionData).is_peer_booking && (
                                <div className="flex flex-wrap gap-2">
                                  {((s as SessionData).status === "scheduled" || (s as SessionData).status === "confirmed") && (
                                    <Button size="sm" onClick={() => handleSessionStatusUpdate((s as SessionData).id, "in_progress")} disabled={updatingSession === (s as SessionData).id}><Play className="h-3.5 w-3.5 mr-1" /> Start</Button>
                                  )}
                                  {!(s as SessionData).is_guest && (
                                    <Button size="sm" variant="outline" onClick={() => navigate("/practice/clients")}>Profile</Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => navigate(`/practice/clients?session=${(s as SessionData).id}&tab=treatment-notes`)}>Notes</Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground shrink-0">{formatTimeWithoutSeconds(s.start_time)}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar: New Bookings (top), Profile, This Week */}
          <aside className="lg:col-span-4 space-y-6">
            {/* New Bookings - modern cozy layout with inline Accept/Decline for mobile requests */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm bg-card/95 backdrop-blur transition-shadow hover:shadow-[var(--shadow-soft)]">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">New Bookings</h2>
                  {unreadBookingCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">{unreadBookingCount} new</span>
                  )}
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
                {allBookingItems.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Calendar className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No new bookings</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">New clinic and mobile requests will appear here.</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/practice/schedule")}>
                      View schedule
                    </Button>
                  </div>
                ) : (
                  allBookingItems.slice(0, 10).map((n) => {
                    const requiresReview = requiresReviewAction(n);
                    const isMobileRequest = n.family === "mobile_request" || n.source_type === "mobile_booking_request";
                    const mobileRequestId = isMobileRequest ? getMobileRequestId(n) : null;
                    const mobileStatus = mobileRequestId ? mobileRequestStatuses[mobileRequestId] : null;
                    const mobilePaymentStatus = mobileRequestId ? mobileRequestPaymentStatuses[mobileRequestId] : null;
                    const isMobileExpired = mobileRequestId && mobileStatus && mobileStatus !== "pending";
                    const canDecline = mobilePaymentStatus === "held"; // Decline only when held; captured needs refund
                    const isProcessing = mobileRequestId && mobileRequestProcessingId === mobileRequestId;
                    const preview = formatBookingNotificationPreview(n);

                    return (
                      <div
                        key={n.id}
                        className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors rounded-xl mx-2 my-1"
                      >
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            if (isMobileRequest && mobileRequestId && n.type !== 'booking_confirmed') {
                              navigate(`/practice/mobile-requests?requestId=${mobileRequestId}`);
                            } else {
                              // Synthetic exchange items (id starts with 'exchange-') have no DB notification; skip markAsRead
                              const markAsReadForNav = typeof n.id === 'string' && n.id.startsWith('exchange-')
                                ? undefined
                                : markNotificationAsRead;
                              handleNotificationNavigation(n, navigate, markAsReadForNav, userProfile?.user_role);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-white text-[15px] leading-tight">
                                  {preview.who}
                                </span>
                                {preview.badge && (
                                  <span
                                    className={
                                      preview.badge === "Mobile"
                                        ? "text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                                        : preview.badge === "Exchange"
                                        ? "text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                                        : "text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                                    }
                                  >
                                    {preview.badge}
                                  </span>
                                )}
                              </div>
                              {preview.when && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                                  {preview.when}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                        {isMobileRequest && mobileRequestId && n.type !== 'booking_confirmed' && (
                          <div className="flex gap-2 mt-3 items-center" onClick={(e) => e.stopPropagation()}>
                            {isMobileExpired ? (
                              <>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Expired
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-full h-8 px-3 text-xs"
                                  onClick={async () => {
                                    setNotifications((prev) => prev.filter((n2) => n2.id !== n.id));
                                    try { await dismissNotification(n.id, user?.id ?? ""); } catch { /* non-blocking */ }
                                  }}
                                >
                                  Dismiss
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  className="rounded-full h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleAcceptMobileRequest(mobileRequestId, n.id)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <span className="flex items-center gap-1.5">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                                    </span>
                                  ) : mobilePaymentStatus === "captured" ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Accept
                                    </>
                                  )}
                                </Button>
                                {canDecline ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full h-8 px-4 text-xs font-medium border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    onClick={() => handleDeclineMobileRequest(mobileRequestId, n.id)}
                                    disabled={isProcessing}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Decline
                                  </Button>
                                ) : null}
                              </>
                            )}
                          </div>
                        )}
                        {n.type === "exchange_reciprocal_booking_reminder" && n.source_id && (
                          <div className="flex gap-2 mt-3 items-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="rounded-full h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => navigate(`/practice/exchange-requests?request=${n.source_id}`)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Book return
                            </Button>
                            {(n.data as Record<string, unknown>)?.extension_requested_at == null && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full h-8 px-4 text-xs font-medium border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                onClick={() => handleRequestExtension(n.source_id as string)}
                                disabled={extendingRequestId === n.source_id}
                              >
                                {extendingRequestId === n.source_id ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <>
                                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Request extension
                                  </>
                                )}
                              </Button>
                            )}
                            {(n.data as Record<string, unknown>)?.extension_requested_at && !(n.data as Record<string, unknown>)?.extension_approved_at && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">Extension requested</span>
                            )}
                          </div>
                        )}
                        {n.type === "exchange_request_accepted" && n.source_id && (n.data as Record<string, unknown>)?.extension_requested_at && !(n.data as Record<string, unknown>)?.extension_approved_at && (
                          <div className="flex gap-2 mt-3 items-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="rounded-full h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApproveExtension(n.source_id as string)}
                              disabled={extendingRequestId === n.source_id}
                            >
                              {extendingRequestId === n.source_id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve +{(n.data as Record<string, unknown>)?.extension_days ?? 3} days
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {isExchangeRequest(n) && n.source_id && requiresReview && !isMobileRequest && n.type !== "exchange_reciprocal_booking_reminder" && n.type !== "exchange_request_accepted" && (
                          <div className="flex gap-2 mt-3 items-center" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const reqId = n.source_id as string;
                              const knownStatus = exchangeRequestStatuses[reqId];
                              const isNoLongerPending = knownStatus === "accepted" || knownStatus === "declined";
                              const isDisabled = respondingToRequest === reqId || isNoLongerPending;
                              const d = n.data && typeof n.data === "object" ? n.data as Record<string, unknown> : {};
                              const sessionLike = {
                                exchange_request_id: reqId,
                                requester_name: (d.practitionerName as string) ?? preview.who,
                                requester_id: (d.requester_id ?? d.requesterId) as string | undefined,
                                session_date: (d.session_date ?? d.sessionDate) as string | undefined,
                                start_time: (d.startTime ?? d.requested_start_time) as string | undefined,
                                duration_minutes: (d.duration ?? d.duration_minutes ?? 60) as number,
                              } as SessionData;
                              if (isNoLongerPending) {
                                return (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Request {knownStatus === "accepted" ? "accepted" : "declined"}
                                  </span>
                                );
                              }
                              return (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full h-8 px-4 text-xs font-medium border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    onClick={() => {
                                      if (window.confirm(`Release slot so ${sessionLike.requester_name} can request a different time?`)) {
                                        handleDeclineExchangeRequest(sessionLike);
                                      }
                                    }}
                                    disabled={isDisabled}
                                  >
                                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Reschedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="rounded-full h-8 px-4 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleAcceptExchangeRequest(sessionLike)}
                                    disabled={isDisabled}
                                  >
                                    {respondingToRequest === reqId ? (
                                      <span className="flex items-center gap-1.5">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                                      </span>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Accept
                                      </>
                                    )}
                                  </Button>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl overflow-hidden">
                    {userProfile?.profile_photo_url ? (
                      <img src={userProfile.profile_photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      ([userProfile?.first_name, userProfile?.last_name].filter(Boolean).map((n) => (n as string)[0]).join("").toUpperCase().slice(0, 2) || user?.email?.slice(0, 2).toUpperCase() || "MM")
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {[userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(" ") || "Practitioner"}
                    </h3>
                    <Button variant="ghost" size="sm" className="h-auto py-0 px-0 text-primary font-semibold text-xs hover:underline flex items-center gap-1.5" onClick={() => navigate("/profile")}>
                      <Settings className="h-3.5 w-3.5" /> My Profile
                    </Button>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Sessions today</span>
                    <span className="font-bold text-slate-900 dark:text-white">{todaySessions.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Earnings this month</span>
                    <span className="font-bold text-primary">{formatCurrency(stats.monthlyRevenue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 dark:text-white">This Week</h3>
                  <Button variant="ghost" size="sm" className="text-primary text-xs font-semibold hover:underline" onClick={() => navigate("/practice/schedule")}>View all</Button>
                </div>
                {(optimisticSessions?.length ?? 0) === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
                    <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No upcoming sessions this week</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Your schedule is open for new bookings.</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/practice/schedule")}>
                      View full schedule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(optimisticSessions || []).slice(0, 5).map((s) => (
                      <div key={s.id} className="text-sm py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{(s as SessionData).session_type || "Session"}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{getFriendlyDateLabel(s.session_date)} · {formatTimeWithoutSeconds(s.start_time)}</p>
                            {(userProfile?.therapist_type === 'hybrid' || userProfile?.therapist_type === 'mobile') && !(s as SessionData).is_mobile_request && !(s as SessionData).is_exchange_request && (
                              (() => {
                                const sd = s as SessionData;
                                const appType = sd.appointment_type ?? 'clinic';
                                const loc = getSessionLocation(
                                  { appointment_type: appType, visit_address: sd.visit_address },
                                  { clinic_address: userProfile?.clinic_address ?? undefined, location: userProfile?.location ?? undefined }
                                );
                                return (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{appType === 'mobile' ? 'Mobile' : 'Clinic'}{loc.sessionLocation ? ` · ${loc.sessionLocation}` : ''}</p>
                                );
                              })()
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => navigate(`/practice/sessions/${(s as SessionData).id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Treatment Notes Prompt - Removed until TreatmentNotesPrompt component exists */}

      {/* Treatment Exchange Response Modal - Reschedule only (no Decline to prevent credits fraud) */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Different Time</DialogTitle>
            <DialogDescription>
              {selectedExchangeRequest && (
                <>
                  Genuinely busy at this time? Release the slot and suggest when you&apos;re available. {selectedExchangeRequest.requester_name || selectedExchangeRequest.client_name} can then send a new request.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">When are you available? (Optional but helpful)</label>
              <Textarea
                placeholder="e.g. I'm available Tuesdays after 2pm, or next week"
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedExchangeRequest) {
                    handleDeclineExchangeRequest(selectedExchangeRequest);
                  }
                }}
                disabled={respondingToRequest !== null}
                className="flex-1"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button
                onClick={() => {
                  if (selectedExchangeRequest) {
                    handleAcceptExchangeRequest(selectedExchangeRequest);
                  }
                }}
                disabled={respondingToRequest !== null}
                className="flex-1"
              >
                {respondingToRequest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Treatment Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Treatment Notes</DialogTitle>
            <DialogDescription>
              Would you like to add treatment notes for this completed session?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter treatment notes here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowNotesModal(false);
                setNoteContent('');
                setNoteSessionId(null);
              }}>
                Skip
              </Button>
              <Button onClick={async () => {
                if (!noteSessionId || !user?.id) return;
                const trimmed = noteContent?.trim() ?? '';
                if (!trimmed) {
                  toast.error('Please enter note content');
                  return;
                }
                try {
                  // Get session details
                  const { data: sessionData } = await supabase
                    .from('client_sessions')
                    .select('client_id')
                    .eq('id', noteSessionId)
                    .single();
                  
                  if (sessionData) {
                    // Create treatment note - client_id can be null for guest sessions; status draft until Complete
                    const { error } = await supabase
                      .from('treatment_notes')
                      .insert({
                        session_id: noteSessionId,
                        practitioner_id: user.id,
                        client_id: sessionData.client_id || null, // Allow null for guest sessions
                        note_type: 'general',
                        content: trimmed,
                        template_type: 'FREE_TEXT',
                        status: 'draft'
                      } as any);
                    
                    if (error) throw error;
                    toast.success('Treatment notes created');
                  }
                } catch (error) {
                  console.error('Error creating notes:', error);
                  toast.error('Failed to create treatment notes');
                } finally {
                  setShowNotesModal(false);
                  setNoteContent('');
                  setNoteSessionId(null);
                }
              }}
              disabled={!noteContent?.trim()}
            >
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exchange Acceptance Modal with Service Selection */}
      {selectedExchangeRequest && selectedExchangeRequest.exchange_request_id && selectedExchangeRequest.requester_id && (
        <ExchangeAcceptanceModal
          open={showAcceptanceModal}
          onOpenChange={(open) => {
            setShowAcceptanceModal(open);
            if (!open) {
              setSelectedExchangeRequest(null);
            }
          }}
          requestId={selectedExchangeRequest.exchange_request_id}
          requesterId={selectedExchangeRequest.requester_id}
          requesterName={selectedExchangeRequest.requester_name || selectedExchangeRequest.client_name || 'Practitioner'}
          requestedSessionDate={selectedExchangeRequest.session_date}
          requestedStartTime={selectedExchangeRequest.start_time}
          requestedDuration={selectedExchangeRequest.duration_minutes || 60}
          recipientId={user?.id || ''}
          onAccepted={handleExchangeAccepted}
          isAlreadyAccepted={selectedExchangeRequest.is_already_accepted || false}
        />
      )}
    </div>
  );
};
