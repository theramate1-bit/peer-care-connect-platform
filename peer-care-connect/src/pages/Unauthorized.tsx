import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const isClient = userProfile?.user_role === 'client';
  const isPractitioner = userProfile?.user_role && userProfile.user_role !== 'client';

  const getRedirectPath = () => {
    if (isClient) return '/client/dashboard';
    if (isPractitioner) return '/dashboard';
    return '/';
  };

  // Auto-redirect clients to their dashboard
  useEffect(() => {
    if (isClient) {
      navigate('/client/dashboard', { replace: true });
    }
  }, [isClient, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            {isClient && (
              <p>This area is for healthcare professionals only. Please use the Client Portal.</p>
            )}
            {isPractitioner && (
              <p>This area is for clients only. Please use the Professional Dashboard.</p>
            )}
            {!isClient && !isPractitioner && (
              <p>Please sign in to access your dashboard.</p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => navigate(getRedirectPath())} 
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
          
          <div className="text-center">
            <Link 
              to="/help" 
              className="text-sm text-primary hover:underline"
            >
              Need help? Contact Support
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
