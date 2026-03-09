import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, AlertTriangle, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateProfileActivationStatus, hasValidAvailability } from '@/lib/profile-completion';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface ProfileCompletionWidgetProps {
  userProfile: any;
  className?: string;
}

export const ProfileCompletionWidget: React.FC<ProfileCompletionWidgetProps> = ({ userProfile, className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasAvailability, setHasAvailability] = useState<boolean | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [qualificationsCount, setQualificationsCount] = useState<number>(0);
  const [loadingQualifications, setLoadingQualifications] = useState(true);
  const [qualificationDocumentsCount, setQualificationDocumentsCount] = useState<number>(0);
  const [loadingQualificationDocuments, setLoadingQualificationDocuments] = useState(true);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const storageKey = useMemo(
    () => `practitioner-notification-profile-completion-dismissed${user?.id ? `-${user.id}` : ''}`,
    [user?.id]
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = sessionStorage.getItem(storageKey);
      setDismissed(stored === 'true');
    } catch {
      setDismissed(false);
    }
  }, [user?.id, storageKey]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(storageKey, 'true');
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  // Check availability asynchronously
  useEffect(() => {
    const checkAvailability = async () => {
      if (!user?.id || !userProfile) {
        setHasAvailability(false);
        setLoadingAvailability(false);
        return;
      }

      try {
        setLoadingAvailability(true);
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
          console.log('✅ Availability check result:', { hasEnabledDay, working_hours: availability.working_hours });
          setHasAvailability(hasEnabledDay);
        } else {
          console.log('⚠️ No availability found');
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
  }, [user?.id, userProfile]);

  // Check qualification documents count asynchronously
  useEffect(() => {
    const checkQualificationDocuments = async () => {
      if (!user?.id || !userProfile) {
        setQualificationDocumentsCount(0);
        setLoadingQualificationDocuments(false);
        return;
      }

      try {
        setLoadingQualificationDocuments(true);
        const { count, error } = await supabase
          .from('practitioner_qualification_documents')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user.id);

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking qualification documents:', error);
          setQualificationDocumentsCount(0);
        } else {
          setQualificationDocumentsCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking qualification documents:', error);
        setQualificationDocumentsCount(0);
      } finally {
        setLoadingQualificationDocuments(false);
      }
    };

    checkQualificationDocuments();
  }, [user?.id, userProfile]);

  // Check qualifications count asynchronously
  useEffect(() => {
    const checkQualifications = async () => {
      if (!user?.id || !userProfile) {
        setQualificationsCount(0);
        setLoadingQualifications(false);
        return;
      }

      try {
        setLoadingQualifications(true);
        const { count, error } = await supabase
          .from('qualifications')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user.id);

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking qualifications:', error);
          setQualificationsCount(0);
        } else {
          console.log('✅ Qualifications check result:', { count: count || 0 });
          setQualificationsCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking qualifications:', error);
        setQualificationsCount(0);
      } finally {
        setLoadingQualifications(false);
      }
    };

    checkQualifications();
  }, [user?.id, userProfile]);

  // Check products count asynchronously
  useEffect(() => {
    const checkProducts = async () => {
      if (!user?.id || !userProfile) {
        setProductsCount(0);
        setLoadingProducts(false);
        return;
      }

      try {
        setLoadingProducts(true);
        const { count, error } = await supabase
          .from('practitioner_products')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user.id)
          .eq('is_active', true);

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking products:', error);
          setProductsCount(0);
        } else {
          console.log('✅ Products check result:', { count: count || 0 });
          setProductsCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking products:', error);
        setProductsCount(0);
      } finally {
        setLoadingProducts(false);
      }
    };

    checkProducts();
  }, [user?.id, userProfile]);

  // Listen for custom availability update events (for immediate updates)
  useEffect(() => {
    const handleAvailabilityUpdate = (event: CustomEvent) => {
      console.log('📢 Widget: Received availabilityUpdated event:', event.detail);
      if (event.detail?.working_hours) {
        const hasEnabledDay = hasValidAvailability(event.detail.working_hours);
        console.log('✅ Widget: Updated availability from event:', { hasEnabledDay });
        setHasAvailability(hasEnabledDay);
        setLoadingAvailability(false);
      }
    };

    window.addEventListener('availabilityUpdated', handleAvailabilityUpdate as EventListener);
    return () => {
      window.removeEventListener('availabilityUpdated', handleAvailabilityUpdate as EventListener);
    };
  }, []);

  // Real-time subscription for practitioner_availability updates
  useRealtimeSubscription(
    'practitioner_availability',
    `user_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Widget: Real-time availability update:', payload);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new?.working_hours) {
          // Use shared utility function for consistent checking
          const hasEnabledDay = hasValidAvailability(payload.new.working_hours);
          console.log('✅ Widget: Updated availability from real-time:', { hasEnabledDay, working_hours: payload.new.working_hours });
          setHasAvailability(hasEnabledDay);
          setLoadingAvailability(false);
        } else {
          console.log('⚠️ Widget: No working_hours in payload');
          setHasAvailability(false);
          setLoadingAvailability(false);
        }
      } else if (payload.eventType === 'DELETE') {
        console.log('🗑️ Widget: Availability deleted');
        setHasAvailability(false);
        setLoadingAvailability(false);
      }
    }
  );

  // Real-time subscription for qualifications updates
  useRealtimeSubscription(
    'qualifications',
    `practitioner_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Widget: Real-time qualifications update:', payload);
      // Re-fetch count when qualifications change
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        // Fetch updated count
        supabase
          .from('qualifications')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user?.id)
          .then(({ count, error }) => {
            if (!error) {
              console.log('✅ Widget: Updated qualifications count:', { count: count || 0 });
              setQualificationsCount(count || 0);
            }
          });
      }
    }
  );

  // Real-time subscription for qualification document updates
  useRealtimeSubscription(
    'practitioner_qualification_documents',
    `practitioner_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Widget: Real-time qualification documents update:', payload);
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        supabase
          .from('practitioner_qualification_documents')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user?.id)
          .then(({ count, error }) => {
            if (!error) {
              setQualificationDocumentsCount(count || 0);
            }
          });
      }
    }
  );

  // Real-time subscription for products updates
  useRealtimeSubscription(
    'practitioner_products',
    `practitioner_id=eq.${user?.id}`,
    (payload) => {
      console.log('🔄 Widget: Real-time products update:', payload);
      // Re-fetch count when products change
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
        // Fetch updated count
        supabase
          .from('practitioner_products')
          .select('*', { count: 'exact', head: true })
          .eq('practitioner_id', user?.id)
          .eq('is_active', true)
          .then(({ count, error }) => {
            if (!error) {
              console.log('✅ Widget: Updated products count:', { count: count || 0 });
              setProductsCount(count || 0);
            }
          });
      }
    }
  );

  const completionStatus = useMemo(() => {
    // Use the shared calculation function with qualifications and products count
    const activationStatus = calculateProfileActivationStatus(
      userProfile,
      hasAvailability,
      qualificationsCount,
      productsCount,
      qualificationDocumentsCount
    );
    
    // Add navigation actions to each check
    const checksWithActions = activationStatus.checks.map((check) => ({
      ...check,
      action: () => {
        if (check.id === 'availability') {
          navigate('/profile#services');
        } else if (check.id === 'services') {
          // Navigate to scheduler for practitioners as requested
          navigate('/practice/scheduler');
        } else {
          navigate('/profile#professional');
        }
      },
      tab: check.id === 'availability' ? 'services' : check.id === 'services' ? 'services' : 'professional'
    }));

    return {
      percentage: activationStatus.percentage,
      checks: checksWithActions
    };
  }, [userProfile, hasAvailability, qualificationsCount, productsCount, qualificationDocumentsCount, navigate]);

  // Show loading state while checking availability, qualifications, or products
  if (loadingAvailability || loadingQualifications || loadingQualificationDocuments || loadingProducts) {
    return (
      <Card className={`border-primary/20 shadow-sm ${className}`}>
        <CardHeader className="pb-3 bg-primary/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
              Loading Profile Status...
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (completionStatus.percentage === 100 || dismissed) return null;

  return (
    <Card className={`border-primary/20 shadow-sm ${className}`}>
      <CardHeader className="pb-3 bg-primary/5">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Complete Your Profile
          </CardTitle>
          <span className="text-sm font-bold text-primary">{completionStatus.percentage}%</span>
        </div>
        <Progress value={completionStatus.percentage} className="h-2" />
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Complete these steps to activate your profile and start accepting bookings.
        </p>
        <div className="space-y-3">
          {completionStatus.checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                {check.isComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={`text-sm ${check.isComplete ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                  {check.label}
                </span>
              </div>
              {!check.isComplete && (
                <Checkbox
                  id={`profile-fix-${check.id}`}
                  checked={false}
                  onCheckedChange={() => check.action()}
                  aria-label={`Go to fix: ${check.label}`}
                  className="border-primary text-primary"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
