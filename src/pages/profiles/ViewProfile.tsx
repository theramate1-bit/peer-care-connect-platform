import { useParams } from 'react-router-dom';
import ProfileViewer from '@/components/profiles/ProfileViewer';

const ViewProfile = () => {
  const { therapistId } = useParams<{ therapistId: string }>();

  if (!therapistId) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-muted-foreground">Therapist not found</h1>
            <p className="text-muted-foreground mt-2">The requested therapist profile could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return <ProfileViewer therapistId={therapistId} />;
};

export default ViewProfile;
