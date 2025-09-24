import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TherapistProfile {
  id: string;
  user_id: string;
  bio?: string;
  location?: string;
  experience_years?: number;
  specializations?: string[];
  qualifications?: string[];
  hourly_rate?: number;
  availability?: any;
  professional_body?: string;
  registration_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTherapistProfile = () => {
  const { user, userProfile } = useAuth();
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTherapistProfile = async () => {
    if (!user || userProfile?.user_role === 'client') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setTherapistProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTherapistProfile = async (updates: Partial<TherapistProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const updateData = {
        user_id: user.id,
        ...updates,
      };
      delete (updateData as any).updated_at;

      // Type cast professional_body to match the database enum
      if (updateData.professional_body && typeof updateData.professional_body === 'string') {
        const validBodies = ['society_of_sports_therapists', 'british_association_of_sports_therapists', 'chartered_society_of_physiotherapy', 'british_osteopathic_association', 'other'];
        if (!validBodies.includes(updateData.professional_body)) {
          updateData.professional_body = 'other';
        }
      }

      const { data, error } = await supabase
        .from('users')
        .upsert(updateData as any)
        .select()
        .single();

      if (error) throw error;

      setTherapistProfile(data);
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  };

  useEffect(() => {
    fetchTherapistProfile();
  }, [user, userProfile]);

  return {
    therapistProfile,
    loading,
    error,
    updateTherapistProfile,
    refetch: fetchTherapistProfile,
  };
};