import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface KPIRow { period: string; sessions: number; revenue: number; clients: number; }
interface MixRow { session_type: string; count: number; revenue: number; }

const AdvancedReports: React.FC = () => {
  const { userProfile } = useAuth();
  const { isPro, loading: planLoading } = usePlan();
  const [kpis, setKpis] = useState<KPIRow[]>([]);
  const [mix, setMix] = useState<MixRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userProfile?.id) { setLoading(false); return; }
      const { data: kpiData } = await supabase
        .from('v_practice_kpis')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('period', { ascending: false })
        .limit(12);
      const { data: mixData } = await supabase
        .from('v_service_mix')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('revenue', { ascending: false });
      setKpis((kpiData as any) || []);
      setMix((mixData as any) || []);
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
            <p className="text-muted-foreground">Advanced reporting is available on the Pro plan.</p>
            <Button onClick={() => (window.location.href = '/pricing')}>View plans</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportCsv = (rows: any[], filename: string) => {
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left">Period</th><th className="text-right">Sessions</th><th className="text-right">Clients</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>
                {kpis.map(r => (
                  <tr key={r.period}>
                    <td>{new Date(r.period).toLocaleDateString()}</td>
                    <td className="text-right">{r.sessions}</td>
                    <td className="text-right">{r.clients}</td>
                    <td className="text-right">£{Number(r.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3"><Button variant="outline" onClick={() => exportCsv(kpis, 'revenue_by_period.csv')}>Export CSV</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="text-left">Session Type</th><th className="text-right">Count</th><th className="text-right">Revenue</th></tr></thead>
              <tbody>
                {mix.map(r => (
                  <tr key={r.session_type}>
                    <td>{r.session_type}</td>
                    <td className="text-right">{r.count}</td>
                    <td className="text-right">£{Number(r.revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3"><Button variant="outline" onClick={() => exportCsv(mix, 'service_mix.csv')}>Export CSV</Button></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedReports;


