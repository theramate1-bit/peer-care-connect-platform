import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'sports_therapist' | 'massage_therapist' | 'osteopath' | 'client' | string | null;

interface ServicesConfiguratorProps {
  onSaved?: (services: string[]) => void;
  title?: string;
  description?: string;
}

const ServicesConfigurator = ({ onSaved, title = 'Services Offered', description = 'Select the services you provide. These will appear on your profile and help clients find you.' }: ServicesConfiguratorProps) => {
  const { user, userProfile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<string[]>([]);
  const role: Role = userProfile?.user_role || null;

  const options = useMemo(() => {
    switch (role) {
      case 'sports_therapist':
        return [
          { label: 'Sports Injury Assessment', value: 'sports_injury_assessment' },
          { label: 'Exercise Rehabilitation', value: 'exercise_rehabilitation' },
          { label: 'Strength & Conditioning', value: 'strength_conditioning' },
          { label: 'Injury Prevention Programs', value: 'injury_prevention' },
          { label: 'Sports Performance Enhancement', value: 'performance_enhancement' },
          { label: 'Return to Play Protocols', value: 'return_to_play' }
        ];
      case 'massage_therapist':
        return [
          { label: 'Deep Tissue Massage', value: 'deep_tissue' },
          { label: 'Sports Massage', value: 'sports_massage' },
          { label: 'Swedish Massage', value: 'swedish_massage' },
          { label: 'Trigger Point Therapy', value: 'trigger_point' },
          { label: 'Myofascial Release', value: 'myofascial_release' },
          { label: 'Relaxation Massage', value: 'relaxation_massage' }
        ];
      case 'osteopath':
        return [
          { label: 'Structural Osteopathy', value: 'structural_osteopathy' },
          { label: 'Cranial Osteopathy', value: 'cranial_osteopathy' },
          { label: 'Visceral Osteopathy', value: 'visceral_osteopathy' },
          { label: 'Paediatric Osteopathy', value: 'paediatric_osteopathy' },
          { label: 'Sports Osteopathy', value: 'sports_osteopathy' },
          { label: 'Postural Assessment', value: 'postural_assessment' }
        ];
      default:
        return [];
    }
  }, [role]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('users')
        .select('services_offered')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setServices(Array.isArray(data.services_offered) ? data.services_offered : []);
      }
    };
    load();
  }, [user?.id]);

  const toggle = (value: string, checked: boolean) => {
    setServices((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({ services_offered: services })
        .eq('id', user.id);
      if (error) throw error;
      await updateProfile({ services_offered: services });
      toast.success('Services updated', { description: 'Your services have been saved.' });
      onSaved?.(services);
    } catch (e: any) {
      toast.error('Failed to save services', { description: e.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (role === 'client') return null;

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title || description ? "space-y-4" : "space-y-4 pt-6"}>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Selected services become categories for your custom packages. You'll be able to create and organize packages under each service type.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`svc_${opt.value}`}
                checked={services.includes(opt.value)}
                onCheckedChange={(checked) => toggle(opt.value, !!checked)}
              />
              <Label htmlFor={`svc_${opt.value}`} className="text-sm">
                {opt.label}
              </Label>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground">No services available for your role.</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Services'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServicesConfigurator;


