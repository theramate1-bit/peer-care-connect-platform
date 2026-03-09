import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClientProgressTracker } from '@/components/session/ClientProgressTracker';
import { useAuth } from '@/contexts/AuthContext';
import { Target } from 'lucide-react';

const ClientGoals = () => {
  const { user, userProfile } = useAuth();

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
            <Target className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>My Goals</CardTitle>
              <CardDescription>
                Goals set with your practitioner to focus your treatment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ClientProgressTracker
            clientId={clientId}
            clientName={clientName}
            readOnly={true}
            defaultTab="goals"
            hideInternalTabs={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientGoals;
