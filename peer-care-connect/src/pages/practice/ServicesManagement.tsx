import React, { useState, useEffect, useMemo } from 'react';
import { ProductManager } from '@/components/practitioner/ProductManager';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileCompletionWidget } from '@/components/profile/ProfileCompletionWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { calculateProfileActivationStatus, hasValidAvailability } from '@/lib/profile-completion';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';

const ServicesManagement = () => {
  const { userProfile } = useAuth();
  const [hasAvailability, setHasAvailability] = useState<boolean | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [qualificationsCount, setQualificationsCount] = useState<number>(0);
  const [loadingQualifications, setLoadingQualifications] = useState(true);
  const [qualificationDocumentsCount, setQualificationDocumentsCount] = useState<number>(0);
  const [loadingQualificationDocuments, setLoadingQualificationDocuments] = useState(true);

  // Batch load availability and qualifications together to reduce stuttering
  useEffect(() => {
    const loadProfileData = async () => {
      if (!userProfile?.id) {
        setHasAvailability(false);
        setQualificationsCount(0);
        setQualificationDocumentsCount(0);
        setLoadingAvailability(false);
        setLoadingQualifications(false);
        setLoadingQualificationDocuments(false);
        return;
      }

      try {
        // Load both in parallel to reduce blocking
        const [availabilityResult, qualificationsResult, qualificationDocumentsResult] = await Promise.all([
          supabase
            .from('practitioner_availability')
            .select('working_hours')
            .eq('user_id', userProfile.id)
            .maybeSingle(),
          supabase
            .from('qualifications')
            .select('*', { count: 'exact', head: true })
            .eq('practitioner_id', userProfile.id),
          supabase
            .from('practitioner_qualification_documents')
            .select('*', { count: 'exact', head: true })
            .eq('practitioner_id', userProfile.id)
        ]);

        // Process availability
        if (availabilityResult.error && availabilityResult.error.code !== 'PGRST116') {
          console.error('Error checking availability:', availabilityResult.error);
          setHasAvailability(false);
        } else if (availabilityResult.data?.working_hours) {
          const hasEnabledDay = hasValidAvailability(availabilityResult.data.working_hours);
          setHasAvailability(hasEnabledDay);
        } else {
          setHasAvailability(false);
        }
        setLoadingAvailability(false);

        // Process qualifications
        if (qualificationsResult.error && qualificationsResult.error.code !== 'PGRST116') {
          console.error('Error checking qualifications:', qualificationsResult.error);
          setQualificationsCount(0);
        } else {
          setQualificationsCount(qualificationsResult.count || 0);
        }
        setLoadingQualifications(false);

        // Process qualification documents
        if (qualificationDocumentsResult.error && qualificationDocumentsResult.error.code !== 'PGRST116') {
          console.error('Error checking qualification documents:', qualificationDocumentsResult.error);
          setQualificationDocumentsCount(0);
        } else {
          setQualificationDocumentsCount(qualificationDocumentsResult.count || 0);
        }
        setLoadingQualificationDocuments(false);
      } catch (error) {
        console.error('Error loading profile data:', error);
        setHasAvailability(false);
        setQualificationsCount(0);
        setQualificationDocumentsCount(0);
        setLoadingAvailability(false);
        setLoadingQualifications(false);
        setLoadingQualificationDocuments(false);
      }
    };

    loadProfileData();
  }, [userProfile?.id]);

  // Check if profile is complete enough to manage services
  // Use shared function for consistency with widget - exclude services check since we're gating access TO create services
  const isProfileComplete = React.useMemo(() => {
    if (!userProfile || loadingAvailability || loadingQualifications) return false;
    
    // Use shared function - pass productsCount = 0 to exclude services check
    // (since we're gating access TO create services, we shouldn't require services to exist)
    const activationStatus = calculateProfileActivationStatus(
      userProfile, 
      hasAvailability, 
      qualificationsCount,
      0, // productsCount = 0 since we're gating access TO create services
      qualificationDocumentsCount
    );
    
    // Check if first 5 items are complete (excluding services)
    // This means 5 out of 6 checks should be complete
    const nonServiceChecks = activationStatus.checks.filter(c => c.id !== 'services');
    const completedNonService = nonServiceChecks.filter(c => c.isComplete).length;
    
    console.log('🔓 Services page: Profile completion check:', {
      totalChecks: activationStatus.checks.length,
      nonServiceChecks: nonServiceChecks.length,
      completedNonService,
      checks: activationStatus.checks.map(c => ({ id: c.id, label: c.label, isComplete: c.isComplete })),
      isComplete: completedNonService === 5
    });
    
    return completedNonService === 5; // All 5 non-service checks complete
  }, [userProfile, hasAvailability, qualificationsCount, qualificationDocumentsCount, loadingAvailability, loadingQualifications, loadingQualificationDocuments]);

  // Show loading skeleton while checking profile completion
  if (loadingAvailability || loadingQualifications || loadingQualificationDocuments) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-6 space-y-8">
          <FadeIn>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6 space-y-8">
        {!isProfileComplete ? (
          <FadeIn delay={0.2}>
            <div className="max-w-3xl mx-auto space-y-6">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4 text-primary-foreground">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Lock className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Profile Completion Required</h3>
                    <p className="text-primary/90 max-w-md mx-auto mt-2">
                      To ensure quality and trust on our marketplace, please complete your professional profile before creating services.
                    </p>
                  </div>
                  
                  {userProfile && (
                    <div className="w-full max-w-md">
                      <ProfileCompletionWidget userProfile={userProfile} />
                    </div>
                  )}
                  
                  <Button asChild variant="outline" className="mt-4">
                    <Link to="/profile#professional">Go to Profile Settings</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <ProductManager />
          </FadeIn>
        )}
      </div>
    </div>
  );
};

export default ServicesManagement;
