import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const SettingsPrivacyTools: React.FC = () => {
  const [loading, setLoading] = useState<'access' | 'erasure' | null>(null);
  const [notes, setNotes] = useState('');

  const submitRequest = async (type: 'access' | 'erasure') => {
    try {
      setLoading(type);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        toast.error('Please sign in');
        return;
      }
      const { error } = await supabase.from('dsar_requests').insert({
        user_id: user.user.id,
        request_type: type,
        notes: notes ? { message: notes } : {},
      });
      if (error) throw error;
      toast.success('Request submitted');
      setNotes('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit request');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Submit a request to access a copy of your data or to request deletion (subject to legal exemptions).
          </p>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional details (optional)</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context to help us locate your data (e.g., date ranges)" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submitRequest('access')} disabled={loading !== null}>
              {loading === 'access' ? 'Submitting…' : 'Request data export'}
            </Button>
            <Button variant="outline" onClick={() => submitRequest('erasure')} disabled={loading !== null}>
              {loading === 'erasure' ? 'Submitting…' : 'Request deletion'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            We may pause the response time to verify your identity or ask for more details (per the Data (Use and Access) Act 2025). You’ll receive updates by email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPrivacyTools;


