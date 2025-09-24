import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendReset = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password-confirm`,
      });

      if (error) {
        console.error('❌ Password reset error:', error);
        toast.error('Failed to send reset email. Please try again.');
      } else {
        console.log('✅ Password reset email sent successfully');
        toast.success('Password reset email sent! Check your inbox.');
        setStep(2);
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-50 to-wellness-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">
            {step === 1 ? "Reset Your Password" : "Check Your Email"}
          </CardTitle>
          <CardDescription>
            {step === 1 
              ? "Enter your email address and we'll send you a link to reset your password"
              : "We've sent a password reset link to your email address"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-wellness-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to use the email address associated with your therapist account.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleSendReset} 
                className="w-full"
                disabled={!email || isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </>
          )}

          {step === 2 && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-wellness-100 p-3">
                  <CheckCircle className="h-8 w-8 text-wellness-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-wellness-600">
                  We've sent a password reset link to:
                </p>
                <p className="font-medium">{email}</p>
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Didn't receive the email? Check your spam folder or try again with a different email address.
                </AlertDescription>
              </Alert>
              
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            <Link 
              to="/login" 
              className="text-wellness-600 hover:text-wellness-700 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;