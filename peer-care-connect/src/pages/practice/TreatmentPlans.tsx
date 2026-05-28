import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface TreatmentPlanRow {
  id: string;
  title: string;
  goals: any[];
  interventions: any[];
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_id: string;
}

const TreatmentPlans: React.FC = () => {
  const { userProfile } = useAuth();
  const { isPro, loading: planLoading } = usePlan();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<TreatmentPlanRow[]>([]);
  const [title, setTitle] = useState('');
  const [goals, setGoals] = useState('');
  const [interventions, setInterventions] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!userProfile?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from('treatment_plans')
        .select('id, title, goals, interventions, status, start_date, end_date, client_id')
        .eq('practitioner_id', userProfile.id)
        .order('created_at', { ascending: false });
      setPlans((data as any) || []);
      setLoading(false);
    };
    load();
  }, [userProfile?.id]);

  if (planLoading || loading) return null;
  if (!isPro) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12 space-y-2">
            <h3 className="text-lg font-semibold">Pro plan required</h3>
            <p className="text-muted-foreground">Custom treatment plans are available on the Pro plan.</p>
            <Button onClick={() => (window.location.href = '/pricing')}>View plans</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const createPlan = async () => {
    if (!userProfile?.id || !clientId || !title) return;
    const payload = {
      practitioner_id: userProfile.id,
      client_id: clientId,
      title,
      goals: safeJson(goals, []),
      interventions: safeJson(interventions, []),
      status: 'active'
    };
    const { data, error } = await supabase.from('treatment_plans').insert(payload).select().single();
    if (!error && data) {
      setPlans([data as any, ...plans]);
      setTitle(''); setGoals(''); setInterventions(''); setClientId('');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Treatment Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} />
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Textarea placeholder='Goals (JSON array)' value={goals} onChange={e => setGoals(e.target.value)} />
          <Textarea placeholder='Interventions (JSON array)' value={interventions} onChange={e => setInterventions(e.target.value)} />
          <Button onClick={createPlan}>Save Plan</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(p => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">{p.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>Status: {p.status}</div>
              <div>Client: {p.client_id}</div>
              <div>Goals: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(p.goals)}</pre></div>
              <div>Interventions: <pre className="whitespace-pre-wrap break-words">{JSON.stringify(p.interventions)}</pre></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

function safeJson(input: string, fallback: any) {
  try { return input ? JSON.parse(input) : fallback; } catch { return fallback; }
}

export default TreatmentPlans;


