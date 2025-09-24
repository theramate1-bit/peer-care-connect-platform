import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { User, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OAuthCompletion = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: location.state?.firstName || '',
    lastName: location.state?.lastName || '',
    userRole: (() => {
      // Check location state first, then sessionStorage for intended role
      const intendedRoleFromState = location.state?.intendedRole;
      const intendedRoleFromStorage = sessionStorage.getItem('intendedRole');
      const intendedRole = intendedRoleFromState || intendedRoleFromStorage;
      
      console.log('🔍 OAuthCompletion - Intended role from state:', intendedRoleFromState);
      console.log('🔍 OAuthCompletion - Intended role from sessionStorage:', intendedRoleFromStorage);
      console.log('🔍 OAuthCompletion - Final intended role:', intendedRole);
      
      // Check if it's a specific practitioner role
      if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(intendedRole)) {
        return intendedRole as 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath';
      }
      
      // Check if it's the generic 'professional' role
      if (intendedRole === 'professional') {
        // Default to sports_therapist for professionals, they can change it
        return 'sports_therapist' as 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath';
      }
      
      // Default to client
      return 'client' as 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath';
    })(),
    termsAccepted: false,
  });

  const handleCompleteRegistration = async () => {
    if (!formData.termsAccepted) {
      toast.error('Please accept the terms and conditions to continue');
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please provide your first and last name');
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not found');
      }

      // Update user metadata with collected information
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_role: formData.userRole,
          full_name: `${formData.firstName} ${formData.lastName}`,
          onboarding_status: 'pending',
          profile_completed: false,
          oauth_completed: true,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update or create user profile in database
      const userData = {
        id: user.id,
        email: user.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        user_role: formData.userRole,
        onboarding_status: 'pending',
        profile_completed: false,
        phone: null,
        is_verified: true, // OAuth users are verified
        is_active: true,
        oauth_completed: true,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Upsert user profile (insert or update)
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'id' });

      if (upsertError) {
        console.error('Profile upsert error:', upsertError);
        // Continue anyway, profile might already exist
      }

      toast.success('Registration completed successfully!');
      
      // Clear the intended role from sessionStorage since it's no longer needed
      sessionStorage.removeItem('intendedRole');
      
      // Navigate to onboarding based on user role
      if (formData.userRole === 'client') {
        navigate('/onboarding', { 
          state: { 
            userRole: formData.userRole,
            fromOAuth: true,
            firstName: formData.firstName,
            lastName: formData.lastName
          } 
        });
      } else {
        navigate('/onboarding', { 
          state: { 
            userRole: formData.userRole,
            fromOAuth: true,
            firstName: formData.firstName,
            lastName: formData.lastName
          } 
        });
      }

    } catch (error) {
      console.error('OAuth completion error:', error);
      toast.error('Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            We need a few more details to complete your account setup
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* OAuth Success Indicator */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Google Account Connected</p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Your Google account has been successfully linked. Please complete the registration below.
            </p>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">I am a... *</Label>
            {(() => {
              const intendedRoleFromState = location.state?.intendedRole;
              const intendedRoleFromStorage = sessionStorage.getItem('intendedRole');
              const intendedRole = intendedRoleFromState || intendedRoleFromStorage;
              
              if (['sports_therapist', 'massage_therapist', 'osteopath', 'professional'].includes(intendedRole)) {
                return (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      <p className="text-sm text-blue-800 font-medium">Professional Account Detected</p>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      You selected "Professional" on the portal page. Please confirm your specific profession below.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <RadioGroup
              value={formData.userRole}
              onValueChange={(value: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath') => 
                setFormData({ ...formData, userRole: value })
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="client" id="client" />
                <Label htmlFor="client" className="flex-1 cursor-pointer">
                  <div className="font-medium">Client</div>
                  <div className="text-sm text-muted-foreground">Looking for therapy services</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sports_therapist" id="sports_therapist" />
                <Label htmlFor="sports_therapist" className="flex-1 cursor-pointer">
                  <div className="font-medium">Sports Therapist</div>
                  <div className="text-sm text-muted-foreground">Provide sports therapy services</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="massage_therapist" id="massage_therapist" />
                <Label htmlFor="massage_therapist" className="flex-1 cursor-pointer">
                  <div className="font-medium">Massage Therapist</div>
                  <div className="text-sm text-muted-foreground">Provide massage therapy services</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="osteopath" id="osteopath" />
                <Label htmlFor="osteopath" className="flex-1 cursor-pointer">
                  <div className="font-medium">Osteopath</div>
                  <div className="text-sm text-muted-foreground">Provide osteopathic services</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, termsAccepted: checked as boolean })
                }
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                . I understand that my data will be processed according to these policies.
              </Label>
            </div>
          </div>

          {/* Complete Registration Button */}
          <Button
            onClick={handleCompleteRegistration}
            disabled={loading || !formData.termsAccepted || !formData.firstName.trim() || !formData.lastName.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing Registration...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>

          {/* Back to Manual Registration */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/register')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Prefer to register manually? Click here
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCompletion;
