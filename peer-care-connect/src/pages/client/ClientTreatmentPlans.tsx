import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PlanRow { id: string; title: string; goals: any[]; interventions: any[]; status: string; practitioner_id: string; }

const ClientTreatmentPlans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('treatment_plans')
        .select('id, title, goals, interventions, status, practitioner_id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });
      setPlans((data as any) || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  if (loading) return null;
  return (
    <div className="container mx-auto p-6 space-y-4">
      {plans.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No treatment plans yet.</CardContent></Card>
      ) : (
        plans.map(p => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>Status: {p.status}</div>
              <div>Goals: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(p.goals)}</pre></div>
              <div>Interventions: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(p.interventions)}</pre></div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ClientTreatmentPlans;


