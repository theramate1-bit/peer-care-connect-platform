import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Heart, Bone, user, Stethoscope, Hand } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const RoleSelection = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPractitionerTypes, setShowPractitionerTypes] = useState(false);

  const handleRoleSelection = async (role: 'client' | 'sports_therapist' | 'massage_therapist' | 'osteopath') => {
    if (!user) {
      toast.error("Please log in first");
      navigate("/login");
      return;
    }

    console.log('🎯 RoleSelection: Starting role selection', { userId: user.id, role });
    setLoading(true);
    try {
      // Update user role in database using the proper function
      console.log('🎯 RoleSelection: Updating user role in database');
      const { data, error } = await supabase.rpc('assign_user_role', {
        user_id: user.id,
        role_name: role
      });

      console.log('🎯 RoleSelection: Database update result', { data, error });

      if (error) {
        console.error('❌ RoleSelection: Role update error:', error);
        toast.error(`Failed to set role: ${error.message}`);
        return;
      }

      console.log('✅ RoleSelection: Role updated successfully');
      toast.success(`Welcome as a ${role.replace('_', ' ')}!`);
      
      // Refresh the user profile to get the updated role
      console.log('🔄 RoleSelection: Refreshing user profile');
      await refreshProfile();
      
      // Redirect to role-specific onboarding
      console.log('🎯 RoleSelection: Redirecting to onboarding');
      navigate(`/onboarding?role=${role}`);
    } catch (error) {
      console.error('❌ RoleSelection: Unexpected error:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePractitionerSelection = () => {
    setShowPractitionerTypes(true);
  };

  const handleBackToMain = () => {
    setShowPractitionerTypes(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to TheraMate.</CardTitle>
          <CardDescription className="text-lg">
            Please choose your role to get started
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {!showPractitionerTypes ? (
            <>
              {/* Client Option */}
          <div className="border rounded-lg p-6 transition-[border-color,background-color] duration-200 ease-out">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">I'm a Client</h3>
                <p className="text-gray-600 mb-4">
                  I'm looking for musculoskeletal health services from qualified practitioners.
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li>• Book sessions with osteopaths, sports therapists, and massage therapists</li>
                  <li>• Track your treatment progress and health goals</li>
                  <li>• Access your treatment notes and session history</li>
                  <li>• Communicate directly with your practitioners</li>
                </ul>
                <Button
                  onClick={() => handleRoleSelection('client')}
                  disabled={loading}
                  className="w-full"
                >
                  Continue as Client
                </Button>
              </div>
            </div>
          </div>

          {/* Practitioner Option */}
          <div className="border rounded-lg p-6 transition-[border-color,background-color] duration-200 ease-out">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">I'm a Practitioner</h3>
                <p className="text-gray-600 mb-4">
                  I'm a qualified musculoskeletal health professional providing services to clients.
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-4">
                  <li>• Manage your practice and client bookings</li>
                  <li>• Document treatment sessions and client progress</li>
                  <li>• Accept payments and manage your earnings</li>
                  <li>• Grow your client base through our platform</li>
                </ul>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Practitioner Types:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      <Bone className="w-3 h-3 mr-1" />
                      Osteopath
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      <Activity className="w-3 h-3 mr-1" />
                      Sports Therapist
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      <Heart className="w-3 h-3 mr-1" />
                      Massage Therapist
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handlePractitionerSelection}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  Continue as Practitioner
                </Button>
              </div>
            </div>
          </div>

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  Don't worry, you can always update your profile information later.
                  This helps us customize your experience.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Back Button */}
              <Button 
                variant="outline" 
                onClick={handleBackToMain}
                className="mb-4"
              >
                ← Back to Role Selection
              </Button>

              {/* Practitioner Types */}
              <div className="space-y-4">
                {/* Sports Therapist */}
                <div 
                  className="border rounded-lg p-6 transition-[border-color,background-color] duration-200 ease-out cursor-pointer"
                  onClick={() => handleRoleSelection('sports_therapist')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Activity className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Sports Therapist</h3>
                      <p className="text-gray-600 mb-4">
                        Specialized in sports injury prevention, treatment, and rehabilitation.
                      </p>
                      <Button 
                        className="w-full" 
                        disabled={loading}
                      >
                        Continue as Sports Therapist
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Massage Therapist */}
                <div 
                  className="border rounded-lg p-6 transition-[border-color,background-color] duration-200 ease-out cursor-pointer"
                  onClick={() => handleRoleSelection('massage_therapist')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Hand className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Massage Therapist</h3>
                      <p className="text-gray-600 mb-4">
                        Focused on therapeutic massage, relaxation, and soft tissue treatment.
                      </p>
                      <Button 
                        className="w-full" 
                        disabled={loading}
                      >
                        Continue as Massage Therapist
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Osteopath */}
                <div 
                  className="border rounded-lg p-6 transition-[border-color,background-color] duration-200 ease-out cursor-pointer"
                  onClick={() => handleRoleSelection('osteopath')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Osteopath</h3>
                      <p className="text-gray-600 mb-4">
                        Holistic approach to musculoskeletal health through manual therapy and diagnosis.
                      </p>
                      <Button 
                        className="w-full" 
                        disabled={loading}
                      >
                        Continue as Osteopath
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
