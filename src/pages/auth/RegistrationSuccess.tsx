import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, ArrowRight, Clock, User, Shield, CreditCard } from "lucide-react";
import { toast } from "sonner";

const RegistrationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);
  
  const { email, userRole, message } = location.state || {};

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheckEmail = () => {
    navigate('/auth/verify-email', { 
      state: { 
        email,
        message: 'Please check your email and click the verification link to activate your account.',
        userRole
      } 
    });
  };

  const handleGoToLogin = () => {
    navigate('/login', { state: { intendedRole: userRole } });
  };

  const isProfessional = userRole && ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-green-600">
            Registration Successful! 🎉
          </CardTitle>
          <CardDescription className="text-lg">
            Welcome to TheraMate! Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">

          {/* Professional Next Steps */}
          {isProfessional && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🚀 What's Next for Professionals?
              </h3>
              
              <div className="grid gap-4">
                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Verify Your Email</h4>
                    <p className="text-green-800 text-sm">
                      Click the verification link in your email to activate your account
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Complete Professional Verification</h4>
                    <p className="text-green-800 text-sm">
                      Upload your credentials and complete your professional profile
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Set Up Your Services</h4>
                    <p className="text-green-800 text-sm">
                      Define your services, pricing, and availability
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Start Receiving Clients</h4>
                    <p className="text-green-800 text-sm">
                      Begin accepting bookings and growing your practice
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Next Steps */}
          {!isProfessional && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🎯 What's Next for Clients?
              </h3>
              
              <div className="grid gap-4">
                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Verify Your Email</h4>
                    <p className="text-green-800 text-sm">
                      Click the verification link in your email to activate your account
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Complete Your Profile</h4>
                    <p className="text-green-800 text-sm">
                      Tell us about your wellness goals and preferences
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 mb-1">Find Your Perfect Therapist</h4>
                    <p className="text-green-800 text-sm">
                      Browse qualified professionals and book your first session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleGoToLogin}
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Login
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationSuccess;
