import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';
import { useAuth } from '@/contexts/AuthContext';
import { Activity } from 'lucide-react';

const ClientProgress = () => {
  const { user, userProfile } = useAuth();

  // Use user?.id as primary (matches RLS auth.uid()), fallback to userProfile?.id
  const clientId = user?.id || userProfile?.id;

  if (!clientId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <p>Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const clientName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : 'Client';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>My Progress</CardTitle>
              <CardDescription>
                Track your treatment progress, metrics, and goals over time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClientProgressTracker
            clientId={clientId}
            clientName={clientName}
            readOnly={true}
            defaultTab="progress"
            hideInternalTabs={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProgress;

