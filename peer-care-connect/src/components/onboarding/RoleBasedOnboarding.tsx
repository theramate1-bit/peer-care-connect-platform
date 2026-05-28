import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Heart, 
  Activity, 
  Bone, 
  Users,
  Calendar,
  Star,
  MessageSquare,
  Settings,
  Target,
  Award,
  Waves,
  Leaf,
  Sparkles,
  Shield,
  Zap,
  DollarSign,
  Package,
  Loader2,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PaymentSetupStep from './PaymentSetupStep';
import ServicesSetupStep from './ServicesSetupStep';
import { OfficialSubscriptionSelection } from './OfficialSubscriptionSelection';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  isRequired: boolean;
}

interface RoleBasedOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

export const RoleBasedOnboarding: React.FC<RoleBasedOnboardingProps> = ({
  onComplete,
  onSkip,
  className
}) => {
  const { userProfile, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // Professional data state
  const [professionalData, setProfessionalData] = useState({
    bio: '',
    location: '',
    experience_years: 0,
    professional_body: '',
    registration_number: '',
    specializations: [] as string[]
  });

  const [availableSpecializations, setAvailableSpecializations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [verifyingSubscription, setVerifyingSubscription] = useState(false);
  const [verifyingCredits, setVerifyingCredits] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');

  // Poll for subscription with retry mechanism
  const pollForSubscription = async (maxAttempts = 20, interval = 3000): Promise<boolean> => {
    setVerifyingSubscription(true);
    setVerificationStatus('Verifying your subscription...');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (!error && subscription) {
          setVerifyingSubscription(false);
          setVerificationStatus('Subscription verified!');
          return true;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
          setVerificationStatus(`Verifying subscription... (${attempt + 1}/${maxAttempts})`);
        }
      } catch (error) {
        console.error('Error polling subscription:', error);
      }
    }

    setVerifyingSubscription(false);
    setVerificationStatus('Subscription verification timed out');
    return false;
  };

  // Poll for credits with retry mechanism
  const pollForCredits = async (maxAttempts = 10, interval = 3000): Promise<boolean> => {
    setVerifyingCredits(true);
    setVerificationStatus('Allocating credits...');
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data: credits, error } = await supabase
          .from('credits')
          .select('balance, current_balance')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (!error && credits && (credits.balance > 0 || credits.current_balance > 0)) {
          setVerifyingCredits(false);
          setVerificationStatus('Credits verified!');
          return true;
        }

        // Try to trigger credit allocation if subscription exists
        if (attempt === 2 && !credits) {
          setVerificationStatus('Triggering credit allocation...');
          await attemptCreditAllocation();
        }

        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
          setVerificationStatus(`Allocating credits... (${attempt + 1}/${maxAttempts})`);
        }
      } catch (error) {
        console.error('Error polling credits:', error);
      }
    }

    setVerifyingCredits(false);
    setVerificationStatus('Credit allocation timed out');
    return false;
  };

  // Attempt to manually trigger credit allocation
  const attemptCreditAllocation = async (): Promise<void> => {
    try {
      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, monthly_credits, current_period_start, current_period_end')
        .eq('user_id', user?.id)
        .in('status', ['active', 'trialing'])
        .single();

      if (subscription) {
        // Call RPC to allocate credits
        const { error } = await supabase.rpc('allocate_monthly_credits', {
          p_user_id: user?.id,
          p_subscription_id: subscription.id,
          p_amount: subscription.monthly_credits || 60,
          p_allocation_type: 'initial',
          p_period_start: subscription.current_period_start,
          p_period_end: subscription.current_period_end
        });

        if (error) {
          console.error('Error allocating credits:', error);
        }
      }
    } catch (error) {
      console.error('Error in attemptCreditAllocation:', error);
    }
  };

  // Poll for Stripe Connect account verification
  const pollForConnectAccount = async (maxAttempts = 15, interval = 4000): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data: connectAccount } = await supabase
          .from('connect_accounts')
          .select('charges_enabled, payouts_enabled, account_status')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (connectAccount && 
            connectAccount.charges_enabled && 
            connectAccount.payouts_enabled &&
            connectAccount.account_status === 'active') {
          setVerificationStatus('Payment account verified!');
          return true;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
          setVerificationStatus(`Verifying payment account... (${attempt + 1}/${maxAttempts})`);
        }
      } catch (error) {
        console.error('Error polling connect account:', error);
      }
    }

    setVerificationStatus('Payment account verification timed out');
    return false;
  };

  // Load available specializations
  useEffect(() => {
    const loadSpecializations = async () => {
      if (!userProfile?.user_role || userProfile.user_role === 'client') return;
      
      const { data, error } = await supabase
        .from('specializations')
        .select('*')
        .eq('category', userProfile.user_role);
      
      if (!error && data) {
        setAvailableSpecializations(data);
      }
    };
    
    loadSpecializations();
  }, [userProfile?.user_role]);

  // Function to save professional data
  const saveProfessionalData = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return false;
    }

    // Validation
    if (!professionalData.bio || professionalData.bio.length < 50) {
      toast.error('Bio must be at least 50 characters');
      return false;
    }
    if (!professionalData.location) {
      toast.error('Location is required');
      return false;
    }
    if (professionalData.experience_years < 0) {
      toast.error('Please enter valid years of experience');
      return false;
    }
    if (professionalData.specializations.length === 0) {
      toast.error('Please select at least one specialization');
      return false;
    }

    setSaving(true);
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          bio: professionalData.bio,
          location: professionalData.location,
          experience_years: professionalData.experience_years,
          professional_body: professionalData.professional_body || null,
          registration_number: professionalData.registration_number || null,
          profile_completed: true,
          treatment_exchange_enabled: true, // Automatically enable treatment exchange when profile is completed
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Save specializations
      // First delete existing
      await supabase
        .from('practitioner_specializations')
        .delete()
        .eq('practitioner_id', user.id);

      // Then insert new ones
      if (professionalData.specializations.length > 0) {
        const { error: specError } = await supabase
          .from('practitioner_specializations')
          .insert(
            professionalData.specializations.map(specId => ({
              practitioner_id: user.id,
              specialization_id: specId
            }))
          );

        if (specError) throw specError;
      }

      toast.success('Professional profile saved!');
      return true;
    } catch (error: any) {
      console.error('Error saving professional data:', error);
      toast.error(error.message || 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getRoleSpecificSteps = (): OnboardingStep[] => {
    const baseSteps: OnboardingStep[] = [
      {
        id: 'welcome',
        title: 'Welcome to TheraMate!',
        description: 'Let\'s get you set up for success',
        icon: Heart,
        isRequired: true,
        content: (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Welcome to your personalized healthcare platform!
              </h3>
              <p className="text-muted-foreground">
                We'll guide you through setting up your profile and getting the most out of TheraMate.
              </p>
            </div>
          </div>
        )
      }
    ];

    switch (userProfile?.user_role) {
      case 'client':
        return [
          ...baseSteps,
          {
            id: 'profile-setup',
            title: 'Complete Your Profile',
            description: 'Help us understand your wellness needs',
            icon: Users,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Tell us about yourself</h3>
                  <p className="text-muted-foreground">
                    A complete profile helps us match you with the right therapists
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Health Goals</div>
                      <div className="text-sm text-muted-foreground">What do you want to achieve?</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Preferred Therapy Types</div>
                      <div className="text-sm text-muted-foreground">Sports therapy, massage, osteopathy, etc.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">Location & Availability</div>
                      <div className="text-sm text-muted-foreground">When and where you'd like sessions</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'find-therapists',
            title: 'Discover Therapists',
            description: 'Learn how to find and book with qualified professionals',
            icon: Target,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Find your perfect therapist</h3>
                  <p className="text-muted-foreground">
                    Browse our network of verified healthcare professionals
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Search className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Search & Filter</div>
                    <div className="text-sm text-muted-foreground">Find therapists by specialty, location, availability</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Read Reviews</div>
                    <div className="text-sm text-muted-foreground">See what other clients say about their experience</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Book Sessions</div>
                    <div className="text-sm text-muted-foreground">Schedule appointments that fit your schedule</div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'wellness-tracking',
            title: 'Track Your Progress',
            description: 'Monitor your wellness journey and improvements',
            icon: Heart,
            isRequired: false,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Your wellness dashboard</h3>
                  <p className="text-muted-foreground">
                    Keep track of your therapy sessions and wellness improvements
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Session History</div>
                      <div className="text-sm text-muted-foreground">View all your past and upcoming sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Heart className="h-5 w-5 text-pink-600" />
                    <div>
                      <div className="font-medium">Wellness Metrics</div>
                      <div className="text-sm text-muted-foreground">Track your health and wellness progress</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium">Favorite Therapists</div>
                      <div className="text-sm text-muted-foreground">Bookmark your preferred healthcare professionals</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      case 'sports_therapist':
        return [
          ...baseSteps,
          {
            id: 'professional-setup',
            title: 'Professional Profile',
            description: 'Set up your sports therapy practice profile',
            icon: Activity,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Build your professional presence</h3>
                  <p className="text-muted-foreground">
                    Complete your profile to attract clients
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Professional Bio *</Label>
                    <Textarea
                      id="bio"
                      value={professionalData.bio}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, bio: e.target.value}))}
                      placeholder="Describe your professional background, approach, and what makes you unique..."
                      rows={4}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 50 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={professionalData.location}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, location: e.target.value}))}
                        placeholder="City, Country"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="experience">Years of Experience *</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        max="70"
                        value={professionalData.experience_years}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, experience_years: parseInt(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="registration_number">Registration Number</Label>
                      <Input
                        id="registration_number"
                        value={professionalData.registration_number}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, registration_number: e.target.value})}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="professional_body">Professional Body</Label>
                    <Select 
                      value={professionalData.professional_body}
                      onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, professional_body: value}))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your professional body" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="society_of_sports_therapists">Society of Sports Therapists</SelectItem>
                        <SelectItem value="british_association_of_sports_therapists">British Association of Sports Therapists</SelectItem>
                        <SelectItem value="chartered_society_of_physiotherapy">Chartered Society of Physiotherapy</SelectItem>
                        <SelectItem value="british_osteopathic_association">British Osteopathic Association</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specializations *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSpecializations.map((spec) => (
                        <div key={spec.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={spec.id}
                            checked={professionalData.specializations.includes(spec.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: [...professionalData.specializations, spec.id]
                                });
                              } else {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: professionalData.specializations.filter(s => s !== spec.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={spec.id} className="text-sm font-normal">{spec.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'subscription',
            title: 'Choose Your Plan',
            description: 'Select a subscription plan to continue',
            icon: CreditCard,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Subscribe to get started</h3>
                  <p className="text-muted-foreground">
                    Choose the plan that fits your practice needs
                  </p>
                </div>
                <OfficialSubscriptionSelection onCheckoutInitiated={handleStepComplete} />
              </div>
            )
          },
          {
            id: 'payment-setup',
            title: 'Payment Setup',
            description: 'Connect your bank account to receive payments',
            icon: DollarSign,
            isRequired: true,
            content: <PaymentSetupStep onComplete={handleStepComplete} />
          },
          {
            id: 'services-setup',
            title: 'Custom Services',
            description: 'Add custom service packages (optional)',
            icon: Package,
            isRequired: false,
            content: <ServicesSetupStep onComplete={handleStepComplete} onSkip={handleStepSkip} />
          },
          {
            id: 'athlete-management',
            title: 'Manage Athletes',
            description: 'Learn how to work with your athlete clients',
            icon: Users,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Athlete client management</h3>
                  <p className="text-muted-foreground">
                    Tools and features to help you provide the best sports therapy care
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Performance Tracking</div>
                    <div className="text-sm text-muted-foreground">Monitor athlete progress and improvements</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Injury Assessment</div>
                    <div className="text-sm text-muted-foreground">Document and track injury recovery</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Training Programs</div>
                    <div className="text-sm text-muted-foreground">Create personalized training plans</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="font-medium">Session Scheduling</div>
                    <div className="text-sm text-muted-foreground">Manage appointments and availability</div>
                  </div>
                </div>
              </div>
            )
          }
        ];

      case 'massage_therapist':
        return [
          ...baseSteps,
          {
            id: 'wellness-profile',
            title: 'Wellness Practice Profile',
            description: 'Set up your massage therapy practice',
            icon: Heart,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Complete your profile to attract clients</h3>
                  <p className="text-muted-foreground">
                    Build a profile that attracts clients seeking relaxation and wellness
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Professional Bio *</Label>
                    <Textarea
                      id="bio"
                      value={professionalData.bio}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, bio: e.target.value}))}
                      placeholder="Describe your professional background, approach, and what makes you unique..."
                      rows={4}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 50 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={professionalData.location}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, location: e.target.value}))}
                        placeholder="City, Country"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="experience">Years of Experience *</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        max="70"
                        value={professionalData.experience_years}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, experience_years: parseInt(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="registration_number">Registration Number</Label>
                      <Input
                        id="registration_number"
                        value={professionalData.registration_number}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, registration_number: e.target.value})}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="professional_body">Professional Body</Label>
                    <Select 
                      value={professionalData.professional_body}
                      onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, professional_body: value}))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your professional body" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="society_of_sports_therapists">Society of Sports Therapists</SelectItem>
                        <SelectItem value="british_association_of_sports_therapists">British Association of Sports Therapists</SelectItem>
                        <SelectItem value="chartered_society_of_physiotherapy">Chartered Society of Physiotherapy</SelectItem>
                        <SelectItem value="british_osteopathic_association">British Osteopathic Association</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specializations *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSpecializations.map((spec) => (
                        <div key={spec.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={spec.id}
                            checked={professionalData.specializations.includes(spec.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: [...professionalData.specializations, spec.id]
                                });
                              } else {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: professionalData.specializations.filter(s => s !== spec.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={spec.id} className="text-sm font-normal">{spec.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'subscription',
            title: 'Choose Your Plan',
            description: 'Select a subscription plan to continue',
            icon: CreditCard,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Subscribe to get started</h3>
                  <p className="text-muted-foreground">
                    Choose the plan that fits your practice needs
                  </p>
                </div>
                <OfficialSubscriptionSelection onCheckoutInitiated={handleStepComplete} />
              </div>
            )
          },
          {
            id: 'payment-setup',
            title: 'Payment Setup',
            description: 'Connect your bank account to receive payments',
            icon: DollarSign,
            isRequired: true,
            content: <PaymentSetupStep onComplete={handleStepComplete} />
          },
          {
            id: 'services-setup',
            title: 'Custom Services',
            description: 'Add custom service packages (optional)',
            icon: Package,
            isRequired: false,
            content: <ServicesSetupStep onComplete={handleStepComplete} onSkip={handleStepSkip} />
          }
        ];

      case 'osteopath':
        return [
          ...baseSteps,
          {
            id: 'osteopathy-profile',
            title: 'Osteopathy Practice Profile',
            description: 'Set up your osteopathy practice',
            icon: Bone,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Complete your profile to attract clients</h3>
                  <p className="text-muted-foreground">
                    Create a profile that attracts patients seeking musculoskeletal care
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bio">Professional Bio *</Label>
                    <Textarea
                      id="bio"
                      value={professionalData.bio}
                      onChange={(e) => setProfessionalData((prev) => ({ ...prev, bio: e.target.value}))}
                      placeholder="Describe your professional background, approach, and what makes you unique..."
                      rows={4}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 50 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={professionalData.location}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, location: e.target.value}))}
                        placeholder="City, Country"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="experience">Years of Experience *</Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        max="70"
                        value={professionalData.experience_years}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, experience_years: parseInt(e.target.value) || 0}))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="registration_number">Registration Number</Label>
                      <Input
                        id="registration_number"
                        value={professionalData.registration_number}
                        onChange={(e) => setProfessionalData((prev) => ({ ...prev, registration_number: e.target.value})}
                        placeholder="Optional"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="professional_body">Professional Body</Label>
                    <Select 
                      value={professionalData.professional_body}
                      onValueChange={(value) => setProfessionalData((prev) => ({ ...prev, professional_body: value}))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your professional body" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="society_of_sports_therapists">Society of Sports Therapists</SelectItem>
                        <SelectItem value="british_association_of_sports_therapists">British Association of Sports Therapists</SelectItem>
                        <SelectItem value="chartered_society_of_physiotherapy">Chartered Society of Physiotherapy</SelectItem>
                        <SelectItem value="british_osteopathic_association">British Osteopathic Association</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specializations *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableSpecializations.map((spec) => (
                        <div key={spec.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={spec.id}
                            checked={professionalData.specializations.includes(spec.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: [...professionalData.specializations, spec.id]
                                });
                              } else {
                                setProfessionalData({
                                  ...professionalData,
                                  specializations: professionalData.specializations.filter(s => s !== spec.id)
                                });
                              }
                            }}
                          />
                          <Label htmlFor={spec.id} className="text-sm font-normal">{spec.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: 'subscription',
            title: 'Choose Your Plan',
            description: 'Select a subscription plan to continue',
            icon: CreditCard,
            isRequired: true,
            content: (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Subscribe to get started</h3>
                  <p className="text-muted-foreground">
                    Choose the plan that fits your practice needs
                  </p>
                </div>
                <OfficialSubscriptionSelection onCheckoutInitiated={handleStepComplete} />
              </div>
            )
          },
          {
            id: 'payment-setup',
            title: 'Payment Setup',
            description: 'Connect your bank account to receive payments',
            icon: DollarSign,
            isRequired: true,
            content: <PaymentSetupStep onComplete={handleStepComplete} />
          },
          {
            id: 'services-setup',
            title: 'Custom Services',
            description: 'Add custom service packages (optional)',
            icon: Package,
            isRequired: false,
            content: <ServicesSetupStep onComplete={handleStepComplete} onSkip={handleStepSkip} />
          }
        ];

      default:
        return baseSteps;
    }
  };

  const steps = getRoleSpecificSteps();
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleStepComplete = async () => {
    // If on professional setup step, save data first
    if (currentStepData.id === 'professional-setup' || 
        currentStepData.id === 'wellness-profile' || 
        currentStepData.id === 'osteopathy-profile') {
      const saved = await saveProfessionalData();
      if (!saved) return; // Don't advance if save failed
    }

    // If on subscription step, BLOCK and verify subscription before proceeding
    if (currentStepData.id === 'subscription') {
      setSaving(true);
      
      // Poll for subscription (blocking - will retry for up to 60 seconds)
      const subscriptionVerified = await pollForSubscription();
      
      if (!subscriptionVerified) {
        toast.error('Could not verify subscription. Please wait a moment and try again.');
        setSaving(false);
        return; // BLOCK progression
      }

      // Poll for credits (blocking - will retry for up to 30 seconds)
      const creditsVerified = await pollForCredits();
      
      if (!creditsVerified) {
        toast.error('Credits not allocated yet. Please wait or contact support.');
        setSaving(false);
        return; // BLOCK progression
      }

      toast.success('All set! Your subscription and credits have been verified.');
      setSaving(false);
    }

    // If on payment-setup step, verify Connect account
    if (currentStepData.id === 'payment-setup') {
      setSaving(true);
      
      // Poll for Connect account (60 seconds max)
      const connectVerified = await pollForConnectAccount();
      
      if (!connectVerified) {
        toast.error('Payment account setup incomplete. Please finish setup with Stripe.');
        setSaving(false);
        return; // BLOCK progression
      }

      toast.success('Payment account verified!');
      setSaving(false);
    }

    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(prev => prev + 1);
    } else {
      // Final validation before completing onboarding
      if (user?.id && userProfile?.user_role && userProfile.user_role !== 'client') {
        // Verify subscription exists
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        // Verify credits exist
        const { data: credits } = await supabase
          .from('credits')
          .select('balance, current_balance')
          .eq('user_id', user.id)
          .maybeSingle();

        // Verify Stripe Connect account
        const { data: connectAccount } = await supabase
          .from('connect_accounts')
          .select('charges_enabled, payouts_enabled, account_status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!subscription) {
          toast.error('Subscription verification failed. Please try again.');
          return;
        }

        if (!credits || (credits.balance === 0 && credits.current_balance === 0)) {
          toast.error('Credit allocation incomplete. Please wait a moment and try again.');
          return;
        }

        if (!connectAccount || 
            !connectAccount.charges_enabled || 
            !connectAccount.payouts_enabled) {
          toast.error('Payment account setup incomplete. Please complete Stripe Connect setup.');
          return;
        }
      }

      setCompletedSteps(prev => new Set([...prev, steps[currentStep].id]));
      
      // Mark onboarding as completed
      if (user?.id) {
        await supabase
          .from('users')
          .update({ onboarding_status: 'completed' })
          .eq('id', user.id);
      }
      
      onComplete();
    }
  };

  const handleStepSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSkip();
    }
  };

  if (!currentStepData) return null;

  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <currentStepData.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Badge variant="outline">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStepData.content}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button variant="ghost" onClick={onSkip}>
                Skip for now
              </Button>
            </div>
            <Button onClick={handleStepComplete} disabled={saving || verifyingSubscription || verifyingCredits}>
              {saving || verifyingSubscription || verifyingCredits ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {verificationStatus || (currentStepData.id === 'subscription' ? 'Verifying...' : 'Saving...')}
                </>
              ) : (
                <>
                  {currentStepData.id === 'subscription' 
                    ? "I've Completed Payment" 
                    : currentStep === steps.length - 1 
                    ? 'Get Started' 
                    : 'Next'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
