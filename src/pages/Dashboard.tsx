import { TherapistDashboard } from "@/components/dashboards/TherapistDashboard";
import { SportsTherapistDashboard } from "@/components/dashboards/SportsTherapistDashboard";
import { MassageTherapistDashboard } from "@/components/dashboards/MassageTherapistDashboard";
import { OsteopathDashboard } from "@/components/dashboards/OsteopathDashboard";
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

  // Render role-specific practitioner dashboards
  switch (effectiveRole) {
    case 'sports_therapist':
      return <SportsTherapistDashboard />;
    case 'massage_therapist':
      return <MassageTherapistDashboard />;
    case 'osteopath':
      return <OsteopathDashboard />;
    default:
      // Fallback to generic therapist dashboard for unknown roles
      return <TherapistDashboard />;
  }
};

export default Dashboard;