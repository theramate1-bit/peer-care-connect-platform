import { TherapistDashboard } from "@/components/dashboards/TherapistDashboard";
import ClientDashboard from "@/pages/client/ClientDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Dashboard = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  // Check localStorage for role fallback
  const localStorageRole = localStorage.getItem('selectedRole');
  const roleSelectionTime = localStorage.getItem('roleSelectionTimestamp');
  const isRecentRoleSelection = roleSelectionTime && (Date.now() - parseInt(roleSelectionTime)) < 300000; // 5 minutes
  
  // Use localStorage role if database role is missing and selection was recent
  const effectiveRole = userProfile?.user_role || (isRecentRoleSelection ? localStorageRole : null);

  // Render different dashboards based on user role
  if (effectiveRole === 'client') {
    return <ClientDashboard />;
  }

  // All practitioners use the same unified dashboard
  return <TherapistDashboard />;
};

export default Dashboard;