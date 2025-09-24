import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Users, Activity, Heart, Bone, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const roles = [
    {
      value: 'client',
      title: 'Client',
      description: 'Looking for healthcare services',
      icon: Users,
      details: 'Book sessions with qualified healthcare professionals in your area'
    },
    {
      value: 'sports_therapist',
      title: 'Sports Therapist',
      description: 'Sports injury specialist',
      icon: Activity,
      details: 'Provide sports therapy and injury rehabilitation services'
    },
    {
      value: 'massage_therapist',
      title: 'Massage Therapist',
      description: 'Licensed massage professional',
      icon: Heart,
      details: 'Offer various massage therapy techniques and treatments'
    },
    {
      value: 'osteopath',
      title: 'Osteopath',
      description: 'Registered osteopathic practitioner',
      icon: Bone,
      details: 'Provide holistic osteopathic treatment and care'
    }
  ];

  const handleContinue = async () => {
    if (!selectedRole) {
      toast.error('Please select your role to continue');
      return;
    }

    if (!user) {
      toast.error('Please sign in to continue');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          user_role: selectedRole,
        }
      });

      if (updateError) {
        throw updateError;
      }

      // Update user profile in database
      const { error: profileError } = await supabase
        .from('users')
        .update({
          user_role: selectedRole,
          onboarding_status: selectedRole === 'client' ? 'pending' : 'role_selected',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Role selected successfully!');
      
      // Navigate based on role
      if (selectedRole === 'client') {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }

    } catch (error: any) {
      console.error('Role selection error:', error);
      toast.error('Failed to update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground text-center">
              Loading...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to TheraMate!</CardTitle>
          <CardDescription>
            Please select your role to customize your experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <RadioGroup
            value={selectedRole}
            onValueChange={setSelectedRole}
            className="space-y-4"
          >
            {roles.map((role) => {
              const IconComponent = role.icon;
              return (
                <div key={role.value} className="relative">
                  <RadioGroupItem
                    value={role.value}
                    id={role.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={role.value}
                    className="flex items-start space-x-4 p-6 rounded-lg border-2 border-muted cursor-pointer hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{role.title}</div>
                      <div className="text-sm text-muted-foreground mb-2">{role.description}</div>
                      <div className="text-sm">{role.details}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-muted-foreground peer-checked:text-primary" />
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <Button
            onClick={handleContinue}
            disabled={loading || !selectedRole}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Setting up your account...
              </>
            ) : (
              'Continue to Onboarding'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;