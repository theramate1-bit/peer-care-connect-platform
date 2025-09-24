import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProfileBuilder from '@/components/profiles/ProfileBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CreateProfile = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated or not a therapist
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (userProfile?.user_role === 'client') {
      navigate('/dashboard');
      return;
    }
  }, [user, userProfile, navigate]);

  if (!user || userProfile?.user_role === 'client') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Create Your Professional Profile</h1>
              <p className="text-sm text-muted-foreground">
                Build trust with potential clients by creating a comprehensive profile
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Builder */}
      <ProfileBuilder />
    </div>
  );
};

export default CreateProfile;
