import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RealVerificationDashboard } from '@/components/admin/RealVerificationDashboard';

const AdminVerificationDashboard = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated or not an admin
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (userProfile?.user_role !== 'admin') {
      navigate('/dashboard');
      return;
    }
  }, [user, userProfile, navigate]);

  if (!user || userProfile?.user_role !== 'admin') {
    return null;
  }

  return <RealVerificationDashboard />;
};

export default AdminVerificationDashboard;
