import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, MapPin, Phone, Mail, Shield, Upload, Check, Loader2, Trash2, Plus, AlertCircle, X, CheckCircle, Calendar, Building2, Car, Building, FileText, Image, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from 'sonner';
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadService } from "@/lib/file-upload";
import { ProductManager } from "@/components/practitioner/ProductManager";
import { BookingLinkManager } from "@/components/practitioner/BookingLinkManager";
import { SettingsSubscription } from "@/pages/settings/SettingsSubscription";
import ProfileBillingTab from "@/components/profile/ProfileBillingTab";
import SchedulerEmbed from "@/components/practice/SchedulerEmbed";
import SmartLocationPicker from "@/components/ui/SmartLocationPicker";
import ProfileCreditsTab from "@/components/profile/ProfileCreditsTab";
import { calculateProfileActivationStatus, hasValidAvailability } from "@/lib/profile-completion";
import { ProfileCompletionWidget } from "@/components/profile/ProfileCompletionWidget";
import { Slider } from "@/components/ui/slider";
import { logger } from "@/lib/logger";
import { validateDetailedStreetAddress } from "@/lib/address-validation";

const Profile = () => {
  const { user, userProfile, updateProfile, refreshProfile } = useAuth();
  // Get initial tab from hash or default to 'professional' for practitioners, 'personal' for clients
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    const validTabs = ['personal', 'professional', 'services', 'credits', 'preferences', 'subscription', 'billing'];
    if (validTabs.includes(hash)) return hash;
    // Default to 'professional' - will be adjusted in useEffect based on user role
    return 'professional';
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingClinicImage, setUploadingClinicImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [dataVersion, setDataVersion] = useState<number>(0);
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasAvailability, setHasAvailability] = useState<boolean | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  // Track if user is actively typing to prevent scroll jumps
  const isTypingRef = useRef<boolean>(false);
  const scrollPositionRef = useRef<number>(0);
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);

  // Form data for personal information - initialized as null (no fallbacks)
  const [personalData, setPersonalData] = useState<{
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  }>({
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
  });

  // Form data for professional information (therapists only) - initialized as null (no fallbacks)
  const [professionalData, setProfessionalData] = useState<{
    bio: string | null;
    location: string | null;
    clinic_address: string | null;
    clinic_latitude: number | null;
    clinic_longitude: number | null;
    clinic_image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    therapist_type: 'clinic_based' | 'mobile' | 'hybrid' | null;
    base_address: string | null;
    base_latitude: number | null;
    base_longitude: number | null;
    mobile_service_radius_km: number | null;
    experience_years: number | null;
    professional_body: string | null;
    professional_body_other: string | null;
    registration_number: string | null;
    qualification_type: string | null;
    qualification_expiry: string | null;
    qualification_file_url: string | null;
    professional_statement: string | null;
    treatment_philosophy: string | null;
    response_time_hours: number | null;
    services_offered: any[];
    has_liability_insurance: boolean | null;
  }>({
    bio: null,
    location: null,
    clinic_address: null,
    clinic_latitude: null,
    clinic_longitude: null,
    clinic_image_url: null,
    latitude: null,
    longitude: null,
    therapist_type: null,
    base_address: null,
    base_latitude: null,
    base_longitude: null,
    mobile_service_radius_km: null,
    experience_years: null,
    professional_body: null,
    professional_body_other: null,
    registration_number: null,
    qualification_type: null,
    qualification_expiry: null,
    qualification_file_url: null,
    professional_statement: null,
    treatment_philosophy: null,
    response_time_hours: null,
    services_offered: [],
    has_liability_insurance: false,
  });

  // Separate state for qualifications
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [showQualificationDialog, setShowQualificationDialog] = useState(false);

  // Qualification documents (uploaded files: PDF, images, DOC/DOCX) for profile & marketplace
  const [qualificationDocuments, setQualificationDocuments] = useState<{
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    created_at: string;
  }[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null);
  const QUALIFICATION_DOC_MAX_BYTES = 10 * 1024 * 1024; // 10MB
  const QUALIFICATION_DOC_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
  const QUALIFICATION_DOC_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];

  const [newQualification, setNewQualification] = useState({
    name: '',
    institution: '',
    year_obtained: new Date().getFullYear()
  });
  const [newQualificationDocument, setNewQualificationDocument] = useState<File | null>(null);

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    calendarReminders: true,
    marketingEmails: false,
    profileVisible: true,
    showContactInfo: false,
    autoAcceptBookings: false,
    receiveInAppNotifications: true,
    platformUpdates: false
  });

  const mapPreferencesFromSources = (
    userPrefs: any,
    notificationPrefs?: {
      email?: boolean | null;
      sms?: boolean | null;
      in_app?: boolean | null;
      email_reminders?: boolean | null;
    } | null
  ) => ({
    emailNotifications: notificationPrefs?.email ?? userPrefs?.emailNotifications ?? true,
    smsNotifications: notificationPrefs?.sms ?? userPrefs?.smsNotifications ?? false,
    calendarReminders: notificationPrefs?.email_reminders ?? userPrefs?.calendarReminders ?? true,
    marketingEmails: userPrefs?.marketingEmails ?? false,
    profileVisible: userPrefs?.profileVisible ?? true,
    showContactInfo: userPrefs?.showContactInfo ?? false,
    autoAcceptBookings: userPrefs?.autoAcceptBookings ?? false,
    receiveInAppNotifications: notificationPrefs?.in_app ?? userPrefs?.receiveInAppNotifications ?? true,
    platformUpdates: userPrefs?.platformUpdates ?? false,
  });

  // Handle hash changes for tab navigation and set default tab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = ['personal', 'professional', 'services', 'credits', 'preferences', 'subscription'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        // Default to 'professional' for practitioners, 'personal' for clients
        const defaultTab = userProfile?.user_role && userProfile.user_role !== 'client' ? 'professional' : 'personal';
        setActiveTab(defaultTab);
        // Update hash to match default tab
        if (!hash) {
          window.location.hash = defaultTab;
        }
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    // Also check on mount in case hash is already set
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [userProfile?.user_role]);

  // Loading state for initial data fetch
  const [loadingProfileData, setLoadingProfileData] = useState(true);
  const [profileDataError, setProfileDataError] = useState<string | null>(null);

  // Initialize form data - query database directly (no fallbacks)
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) {
        setLoadingProfileData(false);
        return;
      }
      
      setLoadingProfileData(true);
      setProfileDataError(null);
      
      try {
        logger.debug('Loading profile data', { userId: user.id }, 'Profile');
        
        // Query database directly for current user data
        // NOTE: Removed 'specializations' from SELECT - using practitioner_specializations junction table exclusively
        const { data: userData, error } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone, bio, location, clinic_address, clinic_latitude, clinic_longitude, clinic_image_url, latitude, longitude, therapist_type, base_address, base_latitude, base_longitude, mobile_service_radius_km, experience_years, professional_body, professional_body_other, registration_number, qualification_type, qualification_expiry, qualification_file_url, response_time_hours, services_offered, profile_photo_url, user_role, preferences, has_liability_insurance')
          .eq('id', user.id)
          .single();
        
        if (error) {
          logger.error('Error loading profile data', error, 'Profile');
          setProfileDataError(error.message);
          setLoadingProfileData(false);
          return;
        }
        
        if (!userData) {
          logger.warn('No user data returned from database', undefined, 'Profile');
          setProfileDataError('No profile data found');
          setLoadingProfileData(false);
          return;
        }
        
        // Load professional_statement and treatment_philosophy from therapist_profiles table
        let therapistProfileData = null;
        if (userData.user_role && userData.user_role !== 'client') {
          const { data: therapistProfile } = await supabase
            .from('therapist_profiles')
            .select('professional_statement, treatment_philosophy')
            .eq('user_id', user.id)
            .maybeSingle();
          
          therapistProfileData = therapistProfile;
        }
        
          logger.debug('Loaded profile data from database', {
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            phone: userData.phone,
            bio: userData.bio,
            location: userData.location,
            experience_years: userData.experience_years,
            professional_body: userData.professional_body,
            registration_number: userData.registration_number,
            clinic_address: (userData as any).clinic_address,
            qualification_type: userData.qualification_type,
            profile_photo_url: userData.profile_photo_url
          });
          
          console.log('✅ Setting personalData state:', {
            first_name: userData.first_name ?? null,
            last_name: userData.last_name ?? null,
            email: userData.email ?? null,
            phone: userData.phone ?? null
          });
          
          if (userData.user_role && userData.user_role !== 'client') {
            logger.debug('Setting professionalData state', {
              bio: userData.bio ?? null,
              location: userData.location ?? null,
              experience_years: userData.experience_years ?? null,
              clinic_address: (userData as any).clinic_address ?? null,
            registration_number: userData.registration_number ?? null,
            professional_body: userData.professional_body ?? null,
            has_liability_insurance: userData.has_liability_insurance ?? false
            });
          }
          
        // Use database values only - no fallbacks
          setPersonalData({
          first_name: userData.first_name ?? null,
          last_name: userData.last_name ?? null,
          email: userData.email ?? null,
          phone: userData.phone ?? null,
          });

          // Load professional data for practitioners
          if (userData.user_role && userData.user_role !== 'client') {
            setProfessionalData({
            bio: userData.bio ?? null,
            location: userData.location ?? null,
            clinic_address: (userData as any).clinic_address ?? null,
            clinic_latitude: (userData as any).clinic_latitude ?? null,
            clinic_longitude: (userData as any).clinic_longitude ?? null,
            clinic_image_url: (userData as any).clinic_image_url ?? null,
            latitude: (userData as any).latitude ?? null,
            longitude: (userData as any).longitude ?? null,
            therapist_type: (userData as any).therapist_type ?? null,
            base_address: (userData as any).base_address ?? null,
            base_latitude: (userData as any).base_latitude ?? null,
            base_longitude: (userData as any).base_longitude ?? null,
            mobile_service_radius_km: (userData as any).mobile_service_radius_km ?? (userData as any).service_radius_km ?? null,
            experience_years: userData.experience_years ?? null,
            professional_body: userData.professional_body ?? null,
            professional_body_other: (userData as any).professional_body_other ?? null,
            registration_number: userData.registration_number ?? null,
            qualification_type: userData.qualification_type ?? null,
            qualification_expiry: userData.qualification_expiry ?? null,
            qualification_file_url: userData.qualification_file_url ?? null,
              // Load professional_statement and treatment_philosophy from therapist_profiles table
            professional_statement: therapistProfileData?.professional_statement ?? null,
            treatment_philosophy: therapistProfileData?.treatment_philosophy ?? null,
            response_time_hours: userData.response_time_hours ?? null,
            // services_offered is jsonb NOT NULL with default '[]'::jsonb - should always be array
            services_offered: Array.isArray(userData.services_offered) ? userData.services_offered : [],
            has_liability_insurance: userData.has_liability_insurance ?? false
            });
          }

          // Initialize profile photo URL
        setProfilePhotoUrl(userData.profile_photo_url ?? null);
          
          // Initialize preferences from users.preferences + notification_preferences (channel-level source).
          const { data: notificationPrefs } = await supabase
            .from('notification_preferences')
            .select('email, sms, in_app, email_reminders')
            .eq('user_id', user.id)
            .maybeSingle();

          setPreferences(mapPreferencesFromSources(userData.preferences, notificationPrefs));
        
        setLoadingProfileData(false);
      } catch (error: any) {
        logger.error('Error loading profile data', error, 'Profile');
        setProfileDataError(error?.message || 'Failed to load profile data');
        setLoadingProfileData(false);
      }
    };
    
    loadProfileData();
  }, [user?.id]);
  

  // Real-time subscription for user profile updates with optimistic locking
  useRealtimeSubscription(
    'users',
    `id=eq.${user?.id}`,
    (payload) => {
      logger.debug('Real-time profile update', { payload }, 'Profile');
      if (payload.eventType === 'UPDATE') {
        // Check if user is currently editing OR has unsaved changes
        if (editingFields.size > 0 || hasChanges) {
          // Show notification instead of auto-updating to prevent overwriting unsaved changes
          toast(
            "Profile Updated Remotely",
            {
              description: "Your profile was updated from another device. Save your changes first, or refresh to see remote changes.",
              action: (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            ),
            }
          );
          return; // Don't update if user has unsaved changes
        }
        
        // No conflicts, safe to update
        const updatedPersonalData = {
          first_name: payload.new.first_name ?? null,
          last_name: payload.new.last_name ?? null,
          email: payload.new.email ?? null,
          phone: payload.new.phone ?? null,
        };
        
        const updatedPreferences = mapPreferencesFromSources(payload.new.preferences);
        
        let updatedProfessionalData = professionalData;
        if (payload.new && userProfile?.user_role !== 'client') {
          updatedProfessionalData = {
            bio: payload.new.bio ?? null,
            location: payload.new.location ?? null,
            clinic_address: (payload.new as any).clinic_address ?? null,
            clinic_latitude: (payload.new as any).clinic_latitude ?? null,
            clinic_longitude: (payload.new as any).clinic_longitude ?? null,
            clinic_image_url: (payload.new as any).clinic_image_url ?? null,
            latitude: (payload.new as any).latitude ?? null,
            longitude: (payload.new as any).longitude ?? null,
            therapist_type: (payload.new as any).therapist_type ?? null,
            base_address: (payload.new as any).base_address ?? null,
            base_latitude: (payload.new as any).base_latitude ?? null,
            base_longitude: (payload.new as any).base_longitude ?? null,
            mobile_service_radius_km: (payload.new as any).mobile_service_radius_km ?? (payload.new as any).service_radius_km ?? null,
            experience_years: payload.new.experience_years ?? null,
            professional_body: payload.new.professional_body ?? null,
            professional_body_other: (payload.new as any).professional_body_other ?? null,
            registration_number: payload.new.registration_number ?? null,
            qualification_type: payload.new.qualification_type ?? null,
            qualification_expiry: (payload.new as any).qualification_expiry ?? null,
            qualification_file_url: (payload.new as any).qualification_file_url ?? null,
            // NOTE: professional_statement and treatment_philosophy are updated via separate subscription
            professional_statement: professionalData.professional_statement,
            treatment_philosophy: professionalData.treatment_philosophy,
            response_time_hours: payload.new.response_time_hours ?? null,
            // services_offered is jsonb NOT NULL - should always be array
            services_offered: Array.isArray(payload.new.services_offered) ? payload.new.services_offered : [],
            has_liability_insurance: (payload.new as any).has_liability_insurance ?? false
          };
        }
        
        // Update all state
        setPersonalData(updatedPersonalData);
        setPreferences(updatedPreferences);
        if (userProfile?.user_role !== 'client') {
          setProfessionalData(updatedProfessionalData);
        }
        setProfilePhotoUrl(payload.new.profile_photo_url ?? null);
        
        // Update initialData to prevent false hasChanges flag
        setInitialData({
          personal: updatedPersonalData,
          professional: updatedProfessionalData,
          preferences: updatedPreferences
        });
        
        setDataVersion(prev => prev + 1);
      }
    }
  );

  // Real-time subscription for therapist_profiles (professional_statement and treatment_philosophy)
  useRealtimeSubscription(
    'therapist_profiles',
    `user_id=eq.${user?.id}`,
    (payload) => {
      logger.debug('Real-time therapist profile update', { payload }, 'Profile');
      if (payload.eventType === 'UPDATE' && payload.new && userProfile?.user_role !== 'client') {
        // Check if user is currently editing these fields OR has unsaved changes
        const isEditingTherapistFields = editingFields.has('professional_statement') || editingFields.has('treatment_philosophy');
        
        if (isEditingTherapistFields || hasChanges) {
          // Show notification instead of auto-updating to prevent overwriting unsaved changes
          toast(
            "Profile Updated Remotely",
            {
              description: "Your professional statement or treatment philosophy was updated from another device. Save your changes first, or refresh to see remote changes.",
              action: (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
              ),
            }
          );
          return; // Don't update if user has unsaved changes
        }
        
        // No conflicts, safe to update - use database values only (no fallbacks)
        const updatedProfessionalData = {
          ...professionalData,
          professional_statement: payload.new.professional_statement ?? null,
          treatment_philosophy: payload.new.treatment_philosophy ?? null,
        };
        
        setProfessionalData(updatedProfessionalData);
        
        // Update initialData to prevent false hasChanges flag
        if (initialData) {
          setInitialData({
            ...initialData,
            professional: updatedProfessionalData
          });
        }
        
        setDataVersion(prev => prev + 1);
      }
    }
  );

  // Real-time subscription for practitioner_availability
  useRealtimeSubscription(
    'practitioner_availability',
    `user_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Real-time availability update:', payload);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new?.working_hours) {
          // Use shared utility function for consistent checking
          const hasEnabledDay = hasValidAvailability(payload.new.working_hours);
          console.log('✅ Profile: Updated availability from real-time:', { hasEnabledDay });
          setHasAvailability(hasEnabledDay);
          setDataVersion(prev => prev + 1); // Force widget re-render
        } else {
          setHasAvailability(false);
          setDataVersion(prev => prev + 1); // Force widget re-render
        }
      } else if (payload.eventType === 'DELETE') {
        setHasAvailability(false);
        setDataVersion(prev => prev + 1); // Force widget re-render
      }
    }
  );

  // Real-time subscription for qualifications
  useRealtimeSubscription(
    'qualifications',
    `practitioner_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Real-time qualifications update:', payload);
      if (payload.eventType === 'INSERT' && payload.new) {
        setQualifications(prev => [...prev, payload.new].sort((a, b) => 
          (b.year_obtained || 0) - (a.year_obtained || 0)
        ));
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        setQualifications(prev => prev.map(qual => 
          qual.id === payload.new.id ? payload.new : qual
        ).sort((a, b) => (b.year_obtained || 0) - (a.year_obtained || 0)));
      } else if (payload.eventType === 'DELETE' && payload.old) {
        setQualifications(prev => prev.filter(qual => qual.id !== payload.old.id));
      }
      // Force widget re-render when qualifications change
      setDataVersion(prev => prev + 1);
    }
  );

  // Helper functions to track when user is editing fields (prevents real-time updates from interrupting)
  const handleFieldFocus = useCallback((fieldName: string) => {
    setEditingFields(prev => new Set(prev).add(fieldName));
  }, []);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setEditingFields(prev => {
      const next = new Set(prev);
      next.delete(fieldName);
      return next;
    });
  }, []);

  // Real-time subscription for products
  useRealtimeSubscription(
    'practitioner_products',
    `practitioner_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Real-time products update:', payload);
      // Re-fetch products count when products change
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        loadProductsCount();
        // Force widget re-render when products change
        setDataVersion(prev => prev + 1);
      }
    }
  );

  // Real-time subscription for connect_accounts

  // Track initial data for change detection - set after data loads
  const [initialQualifications, setInitialQualifications] = useState<any[]>([]);
  
  useEffect(() => {
    // Only set initialData after personalData has been loaded (check for null/undefined, not empty string)
    if (!initialData && !loadingProfileData && (personalData.email !== null || personalData.first_name !== null || personalData.last_name !== null)) {
      setInitialData({
        personal: { ...personalData },
        professional: { ...professionalData },
        preferences: { ...preferences }
      });
    }
  }, [personalData, professionalData, preferences, initialData, loadingProfileData]);
  
  // Track initial qualifications when they're loaded
  const hasInitializedQuals = useRef(false);
  useEffect(() => {
    // Only set initial state once when data is first loaded from database
    if (!hasInitializedQuals.current) {
      hasInitializedQuals.current = true;
      setInitialQualifications([...qualifications]);
      console.log('📝 Initial qualifications set:', qualifications.length);
    }
  }, [qualifications.length]); // Only depend on length to avoid resetting on every change

  // Track changes with debouncing - wait for user to finish typing
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Preserve scroll position during typing (Safari and cross-platform fix)
  useEffect(() => {
    if (isTypingRef.current) {
      // Save current scroll position
      scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    }
  }, [personalData, professionalData]);

  // Restore scroll position after render if user was typing
  useEffect(() => {
    if (isTypingRef.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'auto' });
      });
    }
  });

  useEffect(() => {
    if (!initialData) return;
    
    // Clear existing timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    
    // Mark as typing when data changes
    isTypingRef.current = true;
    setIsUserTyping(true);
    
    // Wait 1 second after user stops typing before checking for changes
    changeTimeoutRef.current = setTimeout(() => {
      const personalChanged = JSON.stringify(initialData.personal) !== JSON.stringify(personalData);
      const professionalChanged = JSON.stringify(initialData.professional) !== JSON.stringify(professionalData);
      const preferencesChanged = JSON.stringify(initialData.preferences) !== JSON.stringify(preferences);
      const qualificationsChanged = JSON.stringify(initialQualifications) !== JSON.stringify(qualifications);
      
      const changed = personalChanged || professionalChanged || preferencesChanged || qualificationsChanged;
      setHasChanges(changed);
      
      // User has stopped typing
      isTypingRef.current = false;
      setIsUserTyping(false);
    }, 1000);
    
    // Cleanup timeout on unmount
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [personalData, professionalData, preferences, initialData, qualifications, initialQualifications]);

  // Load qualifications - query database directly for user_role (not stale userProfile)
  const loadQualifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // First get user_role from database
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', user.id)
        .single();
      
      if (roleError || !userData || userData.user_role === 'client') {
        return;
      }
      
      // Load user's qualifications
      const { data: quals, error: qualsError } = await supabase
        .from('qualifications')
        .select('*')
        .eq('practitioner_id', user.id)
        .order('year_obtained', { ascending: false });
      
      if (qualsError) {
        console.error('❌ Error loading qualifications:', qualsError);
      } else {
        console.log('✅ Loaded qualifications:', { count: quals?.length, quals });
        setQualifications(quals ?? []);
        // setInitialQualifications will be handled by useEffect
      }
      
    } catch (error) {
      console.error('Error loading qualifications:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadQualifications();
  }, [loadQualifications]);

  const loadQualificationDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', user.id)
        .single();
      if (roleError || !userData || userData.user_role === 'client') return;

      const { data, error } = await supabase
        .from('practitioner_qualification_documents')
        .select('id, file_url, file_name, file_type, file_size_bytes, created_at')
        .eq('practitioner_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setQualificationDocuments(data ?? []);
    } catch (e) {
      console.error('Error loading qualification documents:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadQualificationDocuments();
  }, [loadQualificationDocuments]);

  // Load products count
  const loadProductsCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // First get user_role from database
      const { data: userData, error: roleError } = await supabase
        .from('users')
        .select('user_role')
        .eq('id', user.id)
        .single();
      
      if (roleError || !userData || userData.user_role === 'client') {
        setProductsCount(0);
        return;
      }
      
      // Load active products count
      const { count, error: productsError } = await supabase
        .from('practitioner_products')
        .select('*', { count: 'exact', head: true })
        .eq('practitioner_id', user.id)
        .eq('is_active', true);
      
      if (productsError) {
        console.error('❌ Error loading products count:', productsError);
        setProductsCount(0);
      } else {
        console.log('✅ Loaded products count:', { count: count || 0 });
        setProductsCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading products count:', error);
      setProductsCount(0);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProductsCount();
  }, [loadProductsCount]);


  // Initial availability check - real-time subscription handles updates
  useEffect(() => {
    const checkAvailability = async () => {
      if (!user?.id) {
        setHasAvailability(false);
        setLoadingAvailability(false);
        return;
      }

      try {
        const { data: availability, error } = await supabase
          .from('practitioner_availability')
          .select('working_hours')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking availability:', error);
          setHasAvailability(false);
        } else if (availability?.working_hours) {
          // Use shared utility function for consistent checking
          const hasEnabledDay = hasValidAvailability(availability.working_hours);
          setHasAvailability(hasEnabledDay);
        } else {
          setHasAvailability(false);
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        setHasAvailability(false);
      } finally {
        setLoadingAvailability(false);
      }
    };

    checkAvailability();
  }, [user?.id]);


  // Validation function
  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    // Personal info validation
    if (!personalData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!personalData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (personalData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.email)) {
      errors.email = 'Invalid email format';
    }
    if (personalData.phone && !/^[\d\s\+\-\(\)]+$/.test(personalData.phone)) {
      errors.phone = 'Invalid phone number format';
    }
    
    // Professional validation (practitioners only)
    if (userProfile?.user_role !== 'client') {
      if (professionalData.experience_years !== null && (professionalData.experience_years < 0 || professionalData.experience_years > 70)) {
        errors.experience_years = 'Please enter a valid number of years (0-70)';
      }
      // Bio validation removed - allow any length bio (including short ones)
      if (!professionalData.therapist_type) {
        errors.therapist_type = 'Please select your practitioner type';
      } else if (professionalData.therapist_type === 'clinic_based') {
        if (!professionalData.clinic_address?.trim()) {
          errors.clinic_address = 'Clinic address is required for clinic-based practitioners';
        }
      } else if (professionalData.therapist_type === 'mobile') {
        if (!professionalData.base_address?.trim()) {
          errors.base_address = 'Base address is required for mobile practitioners';
        } else {
          const detailedAddressValidation = validateDetailedStreetAddress(professionalData.base_address);
          if (!detailedAddressValidation.isValid) {
            errors.base_address = detailedAddressValidation.message || 'Please enter a full base address';
          }
        }
        if (
          professionalData.mobile_service_radius_km === null ||
          professionalData.mobile_service_radius_km <= 0
        ) {
          errors.mobile_service_radius_km = 'Service radius is required for mobile practitioners';
        }
      } else if (professionalData.therapist_type === 'hybrid') {
        if (!professionalData.clinic_address?.trim()) {
          errors.clinic_address = 'Clinic address is required for hybrid practitioners';
        }
        if (!professionalData.base_address?.trim()) {
          errors.base_address = 'Base address is required for hybrid practitioners';
        } else {
          const detailedAddressValidation = validateDetailedStreetAddress(professionalData.base_address);
          if (!detailedAddressValidation.isValid) {
            errors.base_address = detailedAddressValidation.message || 'Please enter a full base address';
          }
        }
        if (
          professionalData.mobile_service_radius_km === null ||
          professionalData.mobile_service_radius_km <= 0
        ) {
          errors.mobile_service_radius_km = 'Service radius is required for hybrid practitioners';
        }
      }
      if (professionalData.professional_body === 'other' && !professionalData.professional_body_other?.trim()) {
        errors.professional_body_other = 'Please specify your professional body';
      }
    }
    
    setValidationErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Consolidated save handler
  const handleSaveAll = async () => {
    // Validate first
    const { isValid, errors } = validateForm();
    if (!isValid) {
      const errorFields = Object.keys(errors);
      const errorMessages = errorFields.map(field => {
        const fieldLabel = field.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        return `${fieldLabel}: ${errors[field]}`;
      }).join(', ');
      
      toast.error("Validation Error", {
        description: errorMessages || "Please fix the errors in the form",
      });
      return;
    }
    
    setLoading(true);
    try {
      const promises = [];
      
      // Save personal data
      if (JSON.stringify(initialData?.personal) !== JSON.stringify(personalData)) {
        promises.push(updateProfile(personalData));
      }
      
      // Save professional data (practitioners only)
      if (userProfile?.user_role !== 'client' && 
          JSON.stringify(initialData?.professional) !== JSON.stringify(professionalData)) {
        promises.push(
          updateProfile({
            bio: professionalData.bio ?? null,
            location: professionalData.location ?? null,
            clinic_address: professionalData.clinic_address ?? null,
            clinic_latitude: professionalData.clinic_latitude ?? null,
            clinic_longitude: professionalData.clinic_longitude ?? null,
            clinic_image_url: professionalData.clinic_image_url ?? null,
            latitude: professionalData.latitude ?? null,
            longitude: professionalData.longitude ?? null,
            therapist_type: professionalData.therapist_type ?? null,
            base_address: professionalData.base_address ?? null,
            base_latitude: professionalData.base_latitude ?? null,
            base_longitude: professionalData.base_longitude ?? null,
            mobile_service_radius_km: professionalData.mobile_service_radius_km ?? null,
            experience_years: professionalData.experience_years ?? null,
            professional_body: professionalData.professional_body ?? null,
            professional_body_other: professionalData.professional_body === 'other'
              ? (professionalData.professional_body_other ?? '').trim() || null
              : null,
            registration_number: professionalData.registration_number ?? null,
            qualification_type: professionalData.qualification_type ?? null,
            qualification_expiry: professionalData.qualification_expiry ?? null,
            qualification_file_url: professionalData.qualification_file_url ?? null,
            response_time_hours: professionalData.response_time_hours ?? null,
            services_offered: professionalData.services_offered,
            has_liability_insurance: professionalData.has_liability_insurance ?? false
          })
        );
        
        // Save professional_statement and treatment_philosophy to therapist_profiles table
        if (professionalData.professional_statement || professionalData.treatment_philosophy) {
          const therapistProfileUpdate: any = {
            user_id: user?.id,
          };
          
          if (professionalData.professional_statement) {
            therapistProfileUpdate.professional_statement = professionalData.professional_statement;
          }
          if (professionalData.treatment_philosophy) {
            therapistProfileUpdate.treatment_philosophy = professionalData.treatment_philosophy;
          }
          
          promises.push(
            supabase
              .from('therapist_profiles')
              .upsert(therapistProfileUpdate, {
                onConflict: 'user_id'
              })
              .then(({ error }) => {
                if (error) {
                  console.error('Error saving therapist profile:', error);
                  throw error;
                }
                return { error: null };
              })
          );
        }
      }
      
      // Save preferences
      if (JSON.stringify(initialData?.preferences) !== JSON.stringify(preferences)) {
        promises.push(updateProfile({ preferences }));
        if (user?.id) {
          promises.push(
            supabase
              .from('notification_preferences')
              .upsert(
                {
                  user_id: user.id,
                  email: preferences.emailNotifications,
                  sms: preferences.smsNotifications,
                  in_app: preferences.receiveInAppNotifications,
                  email_reminders: preferences.calendarReminders,
                  email_address: personalData.email || null,
                  phone_number: personalData.phone || null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              )
          );
        }
      }
      
      // Execute all promises and check for errors
      const results = await Promise.allSettled(
        promises.map(p => 
          p.catch(err => {
            console.error('❌ Promise error caught:', err);
            return { error: err };
          })
        )
      );
      
      // Check if any updates failed
      const errors = results
        .map((result, index) => {
          if (result.status === 'rejected') {
            const errorMsg = result.reason?.message || result.reason || 'Unknown error';
            console.error(`❌ Update ${index + 1} rejected:`, result.reason);
            return `Update ${index + 1} failed: ${errorMsg}`;
          }
          if (result.value?.error) {
            const errorMsg = result.value.error?.message || result.value.error || 'Unknown error';
            console.error(`❌ Update ${index + 1} returned error:`, result.value.error);
            return `Update ${index + 1} failed: ${errorMsg}`;
          }
          return null;
        })
        .filter(Boolean);
      
      if (errors.length > 0) {
        console.error('❌ Profile save errors:', errors);
        const errorMessage = errors.length === 1 
          ? errors[0] 
          : `Multiple errors occurred: ${errors.join('; ')}`;
        toast.error('Failed to save profile', {
          description: errorMessage
        });
        throw new Error(errorMessage);
      }
      
      // CRITICAL: Refresh AuthContext profile first to update userProfile
      await refreshProfile();
      
      // Wait a moment for AuthContext to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reload profile data to update form fields (query database directly)
      // NOTE: Removed 'specializations' from SELECT - using practitioner_specializations junction table exclusively
      const { data: freshUserData, error: freshError } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, bio, location, clinic_address, clinic_latitude, clinic_longitude, clinic_image_url, latitude, longitude, therapist_type, base_address, base_latitude, base_longitude, mobile_service_radius_km, experience_years, professional_body, professional_body_other, registration_number, qualification_type, qualification_expiry, qualification_file_url, response_time_hours, services_offered, profile_photo_url, user_role, preferences, has_liability_insurance')
        .eq('id', user?.id)
        .single();
      
      // Load fresh therapist profile data
      let freshTherapistProfile = null;
      if (freshUserData?.user_role && freshUserData.user_role !== 'client') {
        const { data: therapistProfile } = await supabase
          .from('therapist_profiles')
          .select('professional_statement, treatment_philosophy')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        freshTherapistProfile = therapistProfile;
      }
      
      if (freshError) {
        console.error('❌ Error fetching fresh user data:', freshError);
      }
      
        if (freshUserData) {
          console.log('✅ Fresh user data loaded after save:', {
            first_name: freshUserData.first_name,
            last_name: freshUserData.last_name,
            email: freshUserData.email
          });
          
          // Use database values only - no fallbacks
          const updatedPersonalData = {
            first_name: freshUserData.first_name ?? null,
            last_name: freshUserData.last_name ?? null,
            email: freshUserData.email ?? null,
            phone: freshUserData.phone ?? null,
          };
          
          setPersonalData(updatedPersonalData);
          
          // Force a re-render by updating dataVersion
          setDataVersion(prev => prev + 1);
        
          let updatedProfessionalData = professionalData;
          if (freshUserData.user_role && freshUserData.user_role !== 'client') {
            updatedProfessionalData = {
              bio: freshUserData.bio ?? null,
              location: freshUserData.location ?? null,
              clinic_address: (freshUserData as any).clinic_address ?? null,
              clinic_latitude: (freshUserData as any).clinic_latitude ?? null,
              clinic_longitude: (freshUserData as any).clinic_longitude ?? null,
            clinic_image_url: (freshUserData as any).clinic_image_url ?? null,
              latitude: (freshUserData as any).latitude ?? null,
              longitude: (freshUserData as any).longitude ?? null,
              therapist_type: (freshUserData as any).therapist_type ?? null,
              base_address: (freshUserData as any).base_address ?? null,
              base_latitude: (freshUserData as any).base_latitude ?? null,
              base_longitude: (freshUserData as any).base_longitude ?? null,
              mobile_service_radius_km: (freshUserData as any).mobile_service_radius_km ?? (freshUserData as any).service_radius_km ?? null,
              experience_years: freshUserData.experience_years ?? null,
              professional_body: freshUserData.professional_body ?? null,
              professional_body_other: (freshUserData as any).professional_body_other ?? null,
              registration_number: freshUserData.registration_number ?? null,
              qualification_type: freshUserData.qualification_type ?? null,
              qualification_expiry: freshUserData.qualification_expiry ?? null,
              qualification_file_url: freshUserData.qualification_file_url ?? null,
              // Load professional_statement and treatment_philosophy from therapist_profiles table
              professional_statement: freshTherapistProfile?.professional_statement ?? null,
              treatment_philosophy: freshTherapistProfile?.treatment_philosophy ?? null,
              response_time_hours: freshUserData.response_time_hours ?? null,
              // services_offered is jsonb NOT NULL with default '[]'::jsonb - should always be array
              services_offered: Array.isArray(freshUserData.services_offered) ? freshUserData.services_offered : [],
              has_liability_insurance: (freshUserData as any).has_liability_insurance ?? false
            };
            setProfessionalData(updatedProfessionalData);
          }
        
        const { data: freshNotificationPrefs } = await supabase
          .from('notification_preferences')
          .select('email, sms, in_app, email_reminders')
          .eq('user_id', user.id)
          .maybeSingle();
        const updatedPreferences = mapPreferencesFromSources(freshUserData.preferences, freshNotificationPrefs);
        setPreferences(updatedPreferences);
        
        // Update initial data with fresh data
        setInitialData({
          personal: updatedPersonalData,
          professional: updatedProfessionalData,
          preferences: updatedPreferences
        });
      }
      
      // Reload qualifications to ensure UI is in sync
      // Fetch fresh data directly from database after save
      if (userProfile?.user_role !== 'client' && user?.id) {
        // Fetch fresh qualifications
        const { data: freshQuals } = await supabase
          .from('qualifications')
          .select('*')
          .eq('practitioner_id', user.id)
          .order('year_obtained', { ascending: false });
        
        if (freshQuals !== null) {
          setQualifications(freshQuals);
          setInitialQualifications([...freshQuals]);
          setDataVersion(prev => prev + 1); // Force widget re-render
          console.log('✅ Updated qualifications after save:', freshQuals.length);
        } else {
          setQualifications([]);
          setInitialQualifications([]);
          setDataVersion(prev => prev + 1); // Force widget re-render
        }
      }
      
      setHasChanges(false);
      
      toast.success("Success", {
        description: "All changes saved successfully",
      });
      
      // Scroll to top after successful save
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('❌ Profile save error:', error);
      const errorMessage = error?.message || error?.error?.message || "Failed to save changes. Please check the console for details.";
      toast.error("Failed to save profile", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Qualification handlers
  const handleAddQualification = async () => {
    if (!newQualification.name || !user?.id) return;
    if (!newQualificationDocument) {
      toast.error("Document required", {
        description: "Please upload the qualification document in this popup before adding.",
      });
      return;
    }
    
    try {
      setLoading(true);

      const normalizedName = newQualification.name.trim().toLowerCase();
      const normalizedInstitution = (newQualification.institution || '').trim().toLowerCase();
      const duplicateExists = qualifications.some((qual) =>
        String(qual.name || '').trim().toLowerCase() === normalizedName &&
        String(qual.institution || '').trim().toLowerCase() === normalizedInstitution &&
        Number(qual.year_obtained || 0) === Number(newQualification.year_obtained || 0)
      );

      if (duplicateExists) {
        toast.error("Duplicate qualification", {
          description: "This qualification already exists. Edit the existing one instead of adding a duplicate.",
        });
        return;
      }
      
      const { data: insertedQualification, error } = await supabase
        .from('qualifications')
        .insert({
          practitioner_id: user.id,
          name: newQualification.name,
          institution: newQualification.institution || null,
          year_obtained: newQualification.year_obtained
        })
        .select('id')
        .single();
      
      if (error) throw error;

      try {
        await uploadQualificationDocument(newQualificationDocument, undefined, true);
      } catch (uploadError) {
        if (insertedQualification?.id) {
          await supabase.from('qualifications').delete().eq('id', insertedQualification.id);
        }
        throw new Error('Qualification document upload failed. Qualification was not saved.');
      }

      toast.success("Success", {
        description: "Qualification and document added successfully",
      });
      setNewQualification({ name: '', institution: '', year_obtained: new Date().getFullYear() });
      setNewQualificationDocument(null);
      setShowQualificationDialog(false);
      
      // Reload qualifications after add
      const { data: updatedQuals } = await supabase
        .from('qualifications')
        .select('*')
        .eq('practitioner_id', user.id)
        .order('year_obtained', { ascending: false });
      
      if (updatedQuals !== null) {
        setQualifications(updatedQuals);
        // Update initial state if this is the first qualification
        if (!hasInitializedQuals.current) {
          hasInitializedQuals.current = true;
        }
        setInitialQualifications([...updatedQuals]);
      }
      
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to add qualification",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQualification = async (qualId: string) => {
    if (!confirm('Are you sure you want to delete this qualification?')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('qualifications')
        .delete()
        .eq('id', qualId);
      
      if (error) throw error;
      
      toast.success("Success", {
        description: "Qualification deleted successfully",
      });
      
      // Reload qualifications after deletion
      const { data: updatedQuals } = await supabase
        .from('qualifications')
        .select('*')
        .eq('practitioner_id', user.id)
        .order('year_obtained', { ascending: false });
      
      if (updatedQuals !== null) {
        setQualifications(updatedQuals);
        setInitialQualifications([...updatedQuals]);
      } else {
        setQualifications([]);
        setInitialQualifications([]);
      }
      
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to delete qualification",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateQualificationFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !QUALIFICATION_DOC_EXTENSIONS.includes(ext)) {
      return `Unsupported format. Use: ${QUALIFICATION_DOC_ACCEPT}`;
    }
    if (file.size > QUALIFICATION_DOC_MAX_BYTES) {
      return `File too large. Maximum size is 10MB.`;
    }
    return null;
  };

  const uploadQualificationDocument = async (file: File, replaceId?: string, silent = false) => {
    if (!user?.id) return;
    const err = validateQualificationFile(file);
    if (err) {
      if (!silent) toast.error(err);
      return;
    }
    if (replaceId) setReplacingDocumentId(replaceId);
    else setUploadingDocument(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${replaceId || crypto.randomUUID()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('qualifications')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('qualifications').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      if (replaceId) {
        const { error: delRow } = await supabase
          .from('practitioner_qualification_documents')
          .delete()
          .eq('id', replaceId)
          .eq('practitioner_id', user.id);
        if (delRow) throw delRow;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('practitioner_qualification_documents')
        .insert({
          practitioner_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: ext,
          file_size_bytes: file.size,
        })
        .select('id, file_url, file_name, file_type, file_size_bytes, created_at')
        .single();

      if (insertError) throw insertError;
      if (inserted) {
        setQualificationDocuments((prev) =>
          replaceId ? prev.map((d) => (d.id === replaceId ? inserted : d)) : [inserted, ...prev]
        );
        if (!silent) toast.success(replaceId ? 'Document replaced.' : 'Document uploaded.');
      }
    } catch (e: any) {
      if (!silent) toast.error(e?.message || 'Upload failed.');
      if (silent) throw e;
    } finally {
      setUploadingDocument(false);
      setReplacingDocumentId(null);
    }
  };

  const deleteQualificationDocument = async (id: string) => {
    if (!user?.id || !confirm('Remove this qualification document?')) return;
    try {
      const { error } = await supabase
        .from('practitioner_qualification_documents')
        .delete()
        .eq('id', id)
        .eq('practitioner_id', user.id);
      if (error) throw error;
      setQualificationDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document removed.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove.');
    }
  };

  const calculateCompletionPercentage = useMemo(() => {
    // Only calculate for practitioners
    const isPractitioner = userProfile?.user_role && userProfile.user_role !== 'client';
    if (!isPractitioner) {
      return 0;
    }

    // Use the official profile activation status calculation (same as widget)
    // This ensures consistency between widget and sidebar
    // Pass qualifications count and products count from local state
    const activationStatus = calculateProfileActivationStatus(
      userProfile,
      hasAvailability,
      qualifications.length,
      productsCount,
      qualificationDocuments.length
    );

    // Debug logging
    console.log('📊 Profile Activation Status Calculation:', {
      percentage: activationStatus.percentage,
      completed: activationStatus.completed,
      total: activationStatus.total,
      checks: activationStatus.checks.map(c => ({ id: c.id, label: c.label, isComplete: c.isComplete })),
      userProfile: {
        bio: userProfile.bio,
        bioLength: userProfile.bio?.length,
        experience_years: userProfile.experience_years,
        qualification_type: userProfile.qualification_type,
        location: userProfile.location,
        mobile_service_radius_km: userProfile.mobile_service_radius_km ?? userProfile.service_radius_km
      },
      hasAvailability,
      qualificationsCount: qualifications.length,
      qualificationDocumentsCount: qualificationDocuments.length,
      productsCount
    });

    return activationStatus.percentage;
  }, [userProfile, hasAvailability, qualifications.length, productsCount, qualificationDocuments.length]);

  const completionPercentage = calculateCompletionPercentage;

  // Create merged profile object for real-time widget updates
  // This combines userProfile from AuthContext with local state changes for immediate feedback
  const mergedProfileForWidget = useMemo(() => {
    if (!userProfile) return null;
    
    // Merge userProfile with local state changes for real-time updates
    return {
      ...userProfile,
      // Override with local state if it exists (for immediate feedback)
      first_name: personalData.first_name ?? userProfile.first_name,
      last_name: personalData.last_name ?? userProfile.last_name,
      email: personalData.email ?? userProfile.email,
      phone: personalData.phone ?? userProfile.phone,
      bio: professionalData.bio ?? userProfile.bio,
      location: professionalData.location ?? userProfile.location,
      experience_years: professionalData.experience_years ?? userProfile.experience_years,
      qualification_type: professionalData.qualification_type ?? userProfile.qualification_type,
      // Keep other fields from userProfile
    };
  }, [userProfile, personalData, professionalData]);

  const getUserTypeLabel = () => {
    switch (userProfile?.user_role) {
      case 'sports_therapist': return 'Sports Therapist';
      case 'massage_therapist': return 'Massage Therapist';
      case 'osteopath': return 'Osteopath';
      case 'client': return 'Client';
      default: return 'User';
    }
  };

  // Loading guard - prevent rendering during critical loading states
  if (!user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show loading state while profile data is being fetched
  if (loadingProfileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  // Show error state if profile data failed to load
  if (profileDataError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to Load Profile</h2>
          <p className="text-muted-foreground mb-4">{profileDataError}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const first = personalData.first_name?.charAt(0) ?? '';
    const last = personalData.last_name?.charAt(0) ?? '';
    const initials = (first + last).toUpperCase();
    return initials || (userProfile?.email?.charAt(0) ?? 'U').toUpperCase();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      toast.error("Invalid File Type", {
        description: "Please select an image file (JPG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Please select an image smaller than 5MB');
      toast.error("File Too Large", {
        description: "Please select an image smaller than 5MB",
      });
      return;
    }

    const uploadWithRetry = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setUploadingPhoto(true);
          
          // Upload file to Supabase Storage
          const uploadedFile = await FileUploadService.uploadFile(file, 'profile-photos', {
            maxSize: 5 * 1024 * 1024,
            compressImages: true,
            quality: 0.9
          });

          // Update user profile with new photo URL
          const { error } = await updateProfile({
            profile_photo_url: uploadedFile.url
          });

          if (error) throw error;

          setProfilePhotoUrl(uploadedFile.url);
          
          toast.success("Photo Updated", {
            description: "Your profile photo has been updated successfully",
          });
          
          return; // Success, exit retry loop
          
        } catch (error: any) {
          console.error(`Photo upload attempt ${attempt} failed:`, error);
          
          if (attempt === retries) {
            // Final attempt failed
            setUploadError(error.message || 'Failed to upload photo');
            toast.error("Upload Failed", {
              description: `Failed after ${retries} attempts. Please try again.`,
            });
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    };

    try {
      await uploadWithRetry();
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleClinicImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      toast.error("Invalid File Type", {
        description: "Please select an image file (JPG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Please select an image smaller than 5MB');
      toast.error("File Too Large", {
        description: "Please select an image smaller than 5MB",
      });
      return;
    }

    const uploadWithRetry = async (retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setUploadingClinicImage(true);
          
          // Upload file to Supabase Storage
          const uploadedFile = await FileUploadService.uploadFile(file, 'profile-photos', {
            maxSize: 5 * 1024 * 1024,
            compressImages: true,
            quality: 0.9,
            pathPrefix: 'clinic'
          });

          // Update user profile with new clinic image URL
          const { error } = await updateProfile({
            clinic_image_url: uploadedFile.url
          });

          if (error) throw error;

          setProfessionalData((prev) => ({ ...prev, clinic_image_url: uploadedFile.url }));
          
          toast.success("Clinic Image Updated", {
            description: "Your clinic image has been updated successfully",
          });
          
          return; // Success, exit retry loop
          
        } catch (error: any) {
          console.error(`Clinic image upload attempt ${attempt} failed:`, error);
          
          if (attempt === retries) {
            // Final attempt failed
            setUploadError(error.message || 'Failed to upload clinic image');
            toast.error("Upload Failed", {
              description: `Failed after ${retries} attempts. Please try again.`,
            });
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    };

    try {
      await uploadWithRetry();
    } finally {
      setUploadingClinicImage(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Profile Completion Widget */}
        {mergedProfileForWidget && mergedProfileForWidget.user_role !== 'client' && (
          <div className="mb-6">
            <ProfileCompletionWidget 
              userProfile={mergedProfileForWidget}
              // Use stable key during typing to prevent remounts (fixes scroll-to-top bug in Safari)
              // Only remount widget when user stops typing and data actually changes
              key={isUserTyping ? 'widget-stable-typing' : `widget-${dataVersion}`}
            />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src={profilePhotoUrl ?? userProfile?.profile_photo_url ?? null} />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingPhoto}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mb-4"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {uploadError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {uploadError}
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-2 h-auto p-0 text-xs"
                          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                        >
                          Try Again
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold">
                      {personalData.first_name ?? ''} {personalData.last_name ?? ''}
                    </h3>
                    <p className="text-sm text-muted-foreground">{getUserTypeLabel()}</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Profile Completion</span>
                    <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionPercentage < 100 ? "Complete your profile to get more bookings" : "Profile complete!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs 
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                // Update hash when tab changes
                window.location.hash = value;
              }}
              className="space-y-6"
            >
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <TabsList className={`flex w-auto min-w-full md:grid md:w-full ${userProfile?.user_role !== 'client' ? 'md:grid-cols-6' : 'md:grid-cols-4'}`}>
                {/* Only show Personal Info tab for clients */}
                {userProfile?.user_role === 'client' && (
                    <TabsTrigger value="personal" className="whitespace-nowrap flex-shrink-0">Personal Info</TabsTrigger>
                )}
                {userProfile?.user_role !== 'client' && (
                  <>
                      <TabsTrigger value="professional" className="whitespace-nowrap flex-shrink-0">Professional</TabsTrigger>
                      <TabsTrigger value="services" className="whitespace-nowrap flex-shrink-0">Schedule</TabsTrigger>
                      <TabsTrigger value="credits" className="whitespace-nowrap flex-shrink-0">Credits</TabsTrigger>
                  </>
                )}
                  <TabsTrigger value="preferences" className="whitespace-nowrap flex-shrink-0">Preferences</TabsTrigger>
                  <TabsTrigger value="subscription" className="whitespace-nowrap flex-shrink-0">Subscription</TabsTrigger>
                  {userProfile?.user_role !== 'client' && (
                    <TabsTrigger value="billing" className="whitespace-nowrap flex-shrink-0">Billing</TabsTrigger>
                  )}
              </TabsList>
              </div>

              {/* Personal Information - Only for clients */}
              {userProfile?.user_role === 'client' && (
                <TabsContent value="personal">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Your basic contact information and personal details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={personalData.first_name ?? ""}
                            disabled={loading}
                            onFocus={() => setEditingFields(prev => new Set(prev).add('first_name'))}
                            onBlur={() => {
                              const newSet = new Set(editingFields);
                              newSet.delete('first_name');
                              setEditingFields(newSet);
                            }}
                            onChange={(e) => setPersonalData({ ...personalData, first_name: e.target.value || null })}
                          />
                          {validationErrors.first_name && (
                            <p className="text-xs text-destructive mt-1">{validationErrors.first_name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={personalData.last_name ?? ""}
                            disabled={loading}
                            onFocus={() => setEditingFields(prev => new Set(prev).add('last_name'))}
                            onBlur={() => {
                              const newSet = new Set(editingFields);
                              newSet.delete('last_name');
                              setEditingFields(newSet);
                            }}
                            onChange={(e) => setPersonalData({ ...personalData, last_name: e.target.value || null })}
                          />
                          {validationErrors.last_name && (
                            <p className="text-xs text-destructive mt-1">{validationErrors.last_name}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            className="pl-10"
                            value={personalData.email ?? ""}
                            disabled={loading}
                            onFocus={() => setEditingFields(prev => new Set(prev).add('email'))}
                            onBlur={() => {
                              const newSet = new Set(editingFields);
                              newSet.delete('email');
                              setEditingFields(newSet);
                            }}
                            onChange={(e) => setPersonalData({ ...personalData, email: e.target.value || null })}
                          />
                          {validationErrors.email && (
                            <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            className="pl-10"
                            value={personalData.phone ?? ""}
                            disabled={loading}
                            onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value || null })}
                          />
                          {validationErrors.phone && (
                            <p className="text-xs text-destructive mt-1">{validationErrors.phone}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Professional Information (Only for non-clients) */}
              {userProfile?.user_role !== 'client' && (
                <TabsContent value="professional">
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Information</CardTitle>
                      <CardDescription>
                        Your credentials, specialties, and service details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Basic Contact Information */}
                      <div className="space-y-4 pb-4 border-b">
                        <h3 className="text-sm font-semibold">Basic Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="profFirstName">First Name</Label>
                            <Input
                              id="profFirstName"
                              value={personalData.first_name ?? ""}
                              disabled={loading}
                              onChange={(e) => setPersonalData({ ...personalData, first_name: e.target.value || null })}
                            />
                            {validationErrors.first_name && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.first_name}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profLastName">Last Name</Label>
                            <Input
                              id="profLastName"
                              value={personalData.last_name ?? ""}
                              disabled={loading}
                              onChange={(e) => setPersonalData({ ...personalData, last_name: e.target.value || null })}
                            />
                            {validationErrors.last_name && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.last_name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="profEmail">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="profEmail"
                              type="email"
                              className="pl-10"
                              value={personalData.email ?? ""}
                              disabled={loading}
                              onChange={(e) => setPersonalData({ ...personalData, email: e.target.value || null })}
                            />
                            {validationErrors.email && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="profPhone">Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="profPhone"
                              type="tel"
                              className="pl-10"
                              value={personalData.phone ?? ""}
                              disabled={loading}
                              onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value || null })}
                            />
                            {validationErrors.phone && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Practitioner type: Clinic / Mobile / Hybrid - only for practitioners */}
                      <div className="space-y-3 pb-4 border-b">
                        <h3 className="text-sm font-semibold">Practitioner type</h3>
                        <p className="text-xs text-muted-foreground">
                          How you deliver services. This affects how you appear in the marketplace.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setProfessionalData((prev) => ({ ...prev, therapist_type: 'clinic_based' }))}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-[border-color,background-color] duration-200 ease-out ${
                              professionalData.therapist_type === 'clinic_based'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Building2 className={`h-8 w-8 shrink-0 ${
                              professionalData.therapist_type === 'clinic_based' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <div>
                              <span className="font-medium block">Clinic-based</span>
                              <span className="text-xs text-muted-foreground">Services at a fixed location</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfessionalData((prev) => ({ ...prev, therapist_type: 'mobile' }))}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-[border-color,background-color] duration-200 ease-out ${
                              professionalData.therapist_type === 'mobile'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Car className={`h-8 w-8 shrink-0 ${
                              professionalData.therapist_type === 'mobile' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <div>
                              <span className="font-medium block">Travels to you</span>
                              <span className="text-xs text-muted-foreground">You go to clients</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfessionalData((prev) => ({ ...prev, therapist_type: 'hybrid' }))}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-[border-color,background-color] duration-200 ease-out ${
                              professionalData.therapist_type === 'hybrid'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Building className={`h-8 w-8 shrink-0 ${
                              professionalData.therapist_type === 'hybrid' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <div>
                              <span className="font-medium block">Clinic + Mobile</span>
                              <span className="text-xs text-muted-foreground">Both options</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Base address and service radius - when mobile or hybrid */}
                      {(professionalData.therapist_type === 'mobile' || professionalData.therapist_type === 'hybrid') && (
                        <div className="space-y-4 pb-4 border-b">
                          <h3 className="text-sm font-semibold">Mobile service area</h3>
                          <div className="space-y-2">
                            <Label htmlFor="base_address">Base address (travel radius from here)</Label>
                            <SmartLocationPicker
                              id="base_address"
                              value={professionalData.base_address ?? ''}
                              onChange={(value) => setProfessionalData((prev) => ({ ...prev, base_address: value || null }))}
                              onLocationSelect={(lat, lon, address) => {
                                setProfessionalData((prev) => ({
                                  ...prev,
                                  base_address: address,
                                  base_latitude: lat,
                                  base_longitude: lon
                                }));
                              }}
                              placeholder="Address you travel from (e.g. home or clinic)"
                            />
                            {validationErrors.base_address && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.base_address}</p>
                            )}
                          </div>
                          <div className="space-y-2 max-w-xs">
                            <Label htmlFor="mobile_service_radius_km">Service radius (km)</Label>
                            <Input
                              id="mobile_service_radius_km"
                              type="number"
                              min={1}
                              max={150}
                              value={professionalData.mobile_service_radius_km ?? ''}
                              disabled={loading}
                              onChange={(e) => {
                                const v = e.target.value;
                                setProfessionalData({
                                  ...professionalData,
                                  mobile_service_radius_km: v === '' ? null : parseInt(v, 10) || null
                                });
                              }}
                              placeholder="e.g. 25"
                            />
                            <p className="text-xs text-muted-foreground">How far you travel from your base address</p>
                            {validationErrors.mobile_service_radius_km && (
                              <p className="text-xs text-destructive mt-1">{validationErrors.mobile_service_radius_km}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Bio</Label>
                        <Textarea
                          id="bio"
                          value={professionalData.bio ?? ""}
                          disabled={loading}
                          onChange={(e) => {
                            // Mark as typing and preserve scroll position (Safari and cross-platform fix)
                            isTypingRef.current = true;
                            setIsUserTyping(true);
                            const scrollY = window.scrollY || document.documentElement.scrollTop;
                            scrollPositionRef.current = scrollY;
                            
                            setProfessionalData((prev) => ({ ...prev, bio: e.target.value || null }));
                            
                            // Restore scroll position immediately to prevent scroll-to-top bug
                            requestAnimationFrame(() => {
                              if (scrollY > 0) {
                                window.scrollTo({ top: scrollY, behavior: 'auto' });
                              }
                            });
                          }}
                          onFocus={() => {
                            handleFieldFocus('bio');
                            isTypingRef.current = true;
                            setIsUserTyping(true);
                          }}
                          onBlur={() => {
                            handleFieldBlur('bio');
                            // Reset typing flag after a delay to allow debounced updates
                            setTimeout(() => {
                              isTypingRef.current = false;
                              setIsUserTyping(false);
                            }, 1200);
                          }}
                          rows={4}
                          placeholder="Describe your professional background and approach..."
                        />
                        {validationErrors.bio && (
                          <p className="text-xs text-destructive mt-1">{validationErrors.bio}</p>
                        )}
                      </div>

                      <div className={`grid gap-4 ${professionalData.therapist_type === 'clinic_based' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {professionalData.therapist_type === 'clinic_based' && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="location">Service Location</Label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="location"
                                  className="pl-10"
                                  value={professionalData.location ?? ""}
                                  disabled={loading}
                                  onChange={(e) => setProfessionalData((prev) => ({ ...prev, location: e.target.value || null }))}
                                  onFocus={() => handleFieldFocus('location')}
                                  onBlur={() => handleFieldBlur('location')}
                                  placeholder="City, State/Country"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">Used for service area and distance calculations</p>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="experience">Years of Experience</Label>
                          <Input
                            id="experience"
                            type="number"
                            value={professionalData.experience_years ?? ""}
                            disabled={loading}
                            onChange={(e) => setProfessionalData((prev) => ({ ...prev, experience_years: e.target.value ? parseInt(e.target.value) : null }))}
                            onFocus={() => handleFieldFocus('experience_years')}
                            onBlur={() => handleFieldBlur('experience_years')}
                          />
                          {validationErrors.experience_years && (
                            <p className="text-xs text-destructive mt-1">{validationErrors.experience_years}</p>
                          )}
                        </div>
                      </div>

                      {professionalData.therapist_type !== 'mobile' && (
                      <div className="space-y-2">
                        <Label htmlFor="clinic_address">Clinic Address</Label>
                        <SmartLocationPicker
                          id="clinic_address"
                          value={professionalData.clinic_address}
                          onChange={(value) => setProfessionalData((prev) => ({ ...prev, clinic_address: value }))}
                          onLocationSelect={(lat, lon, address) => {
                            setProfessionalData({
                              ...professionalData,
                              clinic_address: address,
                              clinic_latitude: lat,
                              clinic_longitude: lon
                            });
                          }}
                          placeholder="Enter your clinic or practice address"
                        />
                        {professionalData.clinic_address && (
                          <p className="text-xs text-muted-foreground">
                            This address will be displayed in the marketplace and shown to clients when booking
                          </p>
                        )}
                        {validationErrors.clinic_address && (
                          <p className="text-xs text-destructive mt-1">{validationErrors.clinic_address}</p>
                        )}
                      </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="clinic_image">Clinic/Practice Image</Label>
                        <div className="flex items-center gap-4">
                          {professionalData.clinic_image_url ? (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <img
                                src={professionalData.clinic_image_url}
                                alt="Clinic image"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  const { error } = await updateProfile({ clinic_image_url: null });
                                  if (!error) {
                                    setProfessionalData((prev) => ({ ...prev, clinic_image_url: null }));
                                    toast.success("Image Removed", {
                                      description: "Clinic image has been removed",
                                    });
                                  }
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                disabled={loading}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                              <Upload className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              id="clinic_image"
                              type="file"
                              accept="image/*"
                              onChange={handleClinicImageUpload}
                              disabled={uploadingClinicImage || loading}
                              className="cursor-pointer"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload an image of your clinic or practice location. This will be displayed in the marketplace instead of a map.
                            </p>
                            {uploadingClinicImage && (
                              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Uploading...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="professionalBody">Professional Body/Registration</Label>
                        <Select 
                          value={professionalData.professional_body ?? ""} 
                          onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, professional_body: value || null }))}
                          disabled={loading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your professional body" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="society_of_sports_therapists">Society of Sports Therapists</SelectItem>
                            <SelectItem value="british_association_of_sports_therapists">British Association of Sports Therapists</SelectItem>
                            <SelectItem value="british_association_of_sports_rehabilitators">British Association of Sports Rehabilitators and Therapists (BASRaT)</SelectItem>
                            <SelectItem value="chartered_society_of_physiotherapy">Chartered Society of Physiotherapy</SelectItem>
                            <SelectItem value="british_osteopathic_association">British Osteopathic Association</SelectItem>
                            <SelectItem value="general_osteopathic_council">General Osteopathic Council</SelectItem>
                            <SelectItem value="complementary_natural_healthcare_council">Complementary and Natural Healthcare Council (CNHC)</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {professionalData.professional_body === 'other' && (
                        <div className="space-y-2">
                          <Label htmlFor="professionalBodyOther">Specify professional body *</Label>
                          <Input
                            id="professionalBodyOther"
                            value={professionalData.professional_body_other ?? ''}
                            onChange={(e) => setProfessionalData((prev) => ({ ...prev, professional_body_other: e.target.value || null }))}
                            placeholder="Enter your professional body name"
                            maxLength={200}
                            disabled={loading}
                            className={validationErrors.professional_body_other ? 'border-red-500' : ''}
                            aria-required="true"
                          />
                          {validationErrors.professional_body_other && (
                            <p className="text-sm text-destructive">{validationErrors.professional_body_other}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Max 200 characters</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber">Registration Number</Label>
                          <Input
                            id="registrationNumber"
                            value={professionalData.registration_number ?? ""}
                            disabled={loading}
                            onChange={(e) => setProfessionalData((prev) => ({ ...prev, registration_number: e.target.value || null }))}
                            onFocus={() => handleFieldFocus('registration_number')}
                            onBlur={() => handleFieldBlur('registration_number')}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Do you have liability insurance for the ALL services you will provide?</Label>
                            <p className="text-sm text-muted-foreground">If yes, "Liability Insured" will be displayed on your profile.</p>
                          </div>
                          <Switch
                            checked={professionalData.has_liability_insurance ?? false}
                            onCheckedChange={(checked) => setProfessionalData((prev) => ({ ...prev, has_liability_insurance: checked }))}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Primary Qualification Certificate (from onboarding) */}
                      {professionalData.qualification_type && (
                        <div className="space-y-4 pb-4 border-b">
                          <Label>Primary Qualification Certificate</Label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="qualificationType" className="text-sm text-muted-foreground">Type</Label>
                              <Input
                                id="qualificationType"
                                value={professionalData.qualification_type === 'itmmif' ? 'ITMMIF' : 
                                       professionalData.qualification_type === 'atmmif' ? 'ATMMIF' : 
                                       professionalData.qualification_type === 'equivalent' ? 'Equivalent' :
                                       professionalData.qualification_type === 'none' ? 'None' :
                                       professionalData.qualification_type ?? ''}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            {professionalData.qualification_expiry && (
                              <div className="space-y-2">
                                <Label htmlFor="qualificationExpiry" className="text-sm text-muted-foreground">Expiry Date</Label>
                                <Input
                                  id="qualificationExpiry"
                                  value={new Date(professionalData.qualification_expiry).toLocaleDateString()}
                                  disabled
                                  className="bg-muted"
                                />
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Certificate File</Label>
                            {professionalData.qualification_file_url ? (
                              <div className="flex items-center gap-2">
                                <a 
                                  href={professionalData.qualification_file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <Shield className="h-4 w-4" />
                                  View Certificate
                                </a>
                                <span className="text-xs text-muted-foreground">• Uploaded</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    
                                    try {
                                      toast.info('Uploading certificate...');
                                      
                                      // Upload file to Supabase Storage
                                      // Path should be {userId}/qualification_{timestamp}.{ext}
                                      // The bucket is already 'qualifications', so no prefix needed
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `qualification_${Date.now()}.${fileExt}`;
                                      const filePath = `${user?.id}/${fileName}`;

                                      const { error: uploadError } = await supabase.storage
                                        .from('qualifications')
                                        .upload(filePath, file, {
                                          cacheControl: '3600',
                                          upsert: false
                                        });

                                      if (uploadError) {
                                        console.error('Upload error details:', uploadError);
                                        throw uploadError;
                                      }

                                      // Get public URL
                                      const { data: urlData } = supabase.storage
                                        .from('qualifications')
                                        .getPublicUrl(filePath);

                                      // Update users table
                                      const { error: updateError } = await supabase
                                        .from('users')
                                        .update({ qualification_file_url: urlData.publicUrl })
                                        .eq('id', user?.id);

                                      if (updateError) throw updateError;

                                      toast.success('Certificate uploaded successfully!');
                                      await updateProfile({ qualification_file_url: urlData.publicUrl });
                                      
                                      // Reload page to show the new file
                                      window.location.reload();
                                    } catch (error: any) {
                                      console.error('Certificate upload error:', error);
                                      toast.error('Failed to upload certificate: ' + error.message);
                                    }
                                  }}
                                  className="text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Upload your qualification certificate (PDF, JPG, PNG - Max 10MB)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Qualifications</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQualificationDialog(true)}
                            disabled={loading}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Qualification
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {qualifications.map((qual) => (
                            <Card key={qual.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{qual.name}</p>
                                    {qual.verified && (
                                      <Badge variant="default" className="text-xs">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  {qual.institution && (
                                    <p className="text-sm text-muted-foreground">{qual.institution}</p>
                                  )}
                                  {qual.year_obtained && (
                                    <p className="text-xs text-muted-foreground">Year: {qual.year_obtained}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteQualification(qual.id)}
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                          
                          {qualifications.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No qualifications added yet
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Services (Only for practitioners) */}
              {userProfile?.user_role !== 'client' && (
                <TabsContent value="services">
                  <div className="space-y-6">
                    {/* Direct Booking Link */}
                    <BookingLinkManager />
                    
                    {/* Embed Scheduler instead of legacy services */}
                    {/** Compact scheduler embed */}
                    {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                    {/* @ts-ignore */}
                    <SchedulerEmbed />
                  </div>
                </TabsContent>
              )}

              {/* Credits Tab (Only for practitioners) */}
              {userProfile?.user_role !== 'client' && (
                <TabsContent value="credits">
                  <ProfileCreditsTab />
                </TabsContent>
              )}

              {/* Preferences */}
              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Account Preferences
                    </CardTitle>
                    <CardDescription>
                      Manage your notification settings. Changes are saved when you click Save All Changes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Notifications</h4>
                      <p className="text-sm text-muted-foreground">Choose which notifications you receive by email and in the platform.</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Booking confirmations and changes</Label>
                            <p className="text-sm text-muted-foreground">Email when bookings are confirmed or changed</p>
                          </div>
                          <Switch
                            checked={preferences.emailNotifications}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, emailNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Reminders and alerts</Label>
                            <p className="text-sm text-muted-foreground">Session and calendar reminders</p>
                          </div>
                          <Switch
                            checked={preferences.calendarReminders}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, calendarReminders: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>In-platform messages</Label>
                            <p className="text-sm text-muted-foreground">Messages and notifications in the app</p>
                          </div>
                          <Switch
                            checked={preferences.receiveInAppNotifications}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, receiveInAppNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Platform updates</Label>
                            <p className="text-sm text-muted-foreground">Product news and feature updates</p>
                          </div>
                          <Switch
                            checked={preferences.platformUpdates}
                            onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, platformUpdates: checked }))}
                          />
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              {/* Subscription Management */}
              <TabsContent value="subscription" className="space-y-6">
                <SettingsSubscription />
              </TabsContent>

              {/* Billing & Payments - Only for practitioners */}
              {userProfile?.user_role !== 'client' && (
                <TabsContent value="billing" className="space-y-6">
                  <ProfileBillingTab />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
        
        {/* Add Qualification Dialog */}
        <Dialog
          open={showQualificationDialog}
          onOpenChange={(open) => {
            setShowQualificationDialog(open);
            if (!open) {
              setNewQualificationDocument(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Qualification</DialogTitle>
              <DialogDescription>
                Add a professional qualification or certification
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="qual-name">Qualification Name *</Label>
                <Input
                  id="qual-name"
                  value={newQualification.name}
                  onChange={(e) => setNewQualification({ ...newQualification, name: e.target.value })}
                  placeholder="e.g., BSc Sports Therapy"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qual-institution">Institution</Label>
                <Input
                  id="qual-institution"
                  value={newQualification.institution}
                  onChange={(e) => setNewQualification({ ...newQualification, institution: e.target.value })}
                  placeholder="e.g., University of London"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="qual-year">Year Obtained</Label>
                <Input
                  id="qual-year"
                  type="number"
                  value={newQualification.year_obtained}
                  onChange={(e) => setNewQualification({ ...newQualification, year_obtained: parseInt(e.target.value) })}
                  min="1950"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qual-document">Qualification document *</Label>
                <Input
                  id="qual-document"
                  type="file"
                  accept={QUALIFICATION_DOC_ACCEPT}
                  onChange={(e) => setNewQualificationDocument(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Add the certificate/licence here to avoid duplicate entries later.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQualificationDialog(false);
                  setNewQualificationDocument(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddQualification} disabled={!newQualification.name || !newQualificationDocument || loading}>
                Add Qualification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Global Save Button - Fixed at bottom */}
        {/* Only show on tabs that have editable content (not on read-only tabs like Credits) */}
        {hasChanges && ['personal', 'professional', 'preferences'].includes(activeTab) && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg py-4 z-50">
            <div className="container mx-auto px-6 flex justify-end">
              <Button 
                onClick={handleSaveAll} 
                disabled={loading}
                size="lg"
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
