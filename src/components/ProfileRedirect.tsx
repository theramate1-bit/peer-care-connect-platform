import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ClientProfile from '@/pages/client/ClientProfile';
import Profile from '@/pages/Profile';
import { useState, useEffect } from 'react';

const ProfileRedirect = () => {
  const { userProfile, loading } = useAuth();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Show timeout message after 15 seconds
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, 15000);

      return () => clearTimeout(timeout);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [loading]);

  if (loading) {
    return (
      <LoadingSpinner 
        fullScreen 
        message={showTimeoutMessage ? "Loading is taking longer than expected. Please refresh the page or try signing out and back in." : "Loading your profile..."} 
        showRefreshButton={showTimeoutMessage}
        onRefresh={() => window.location.reload()}
      />
    );
  }

  if (!userProfile) {
    return <LoadingSpinner fullScreen message="Please sign in to access your profile..." />;
  }

  // Show appropriate profile component based on user role
  if (userProfile.user_role === 'client') {
    return <ClientProfile />;
  } else if (['sports_therapist', 'massage_therapist', 'osteopath'].includes(userProfile.user_role)) {
    return <Profile />;
  } else {
    // Fallback to client profile for unknown roles
    return <ClientProfile />;
  }
};

export default ProfileRedirect;
