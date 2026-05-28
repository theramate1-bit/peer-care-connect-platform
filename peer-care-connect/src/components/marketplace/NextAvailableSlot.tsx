import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getNextAvailableSlot } from '@/lib/next-available-slot';

interface NextAvailableSlotProps {
  therapistId: string;
  durationMinutes?: number;
  className?: string;
}

/**
 * Displays the next available appointment time for a practitioner (e.g. "Next available: Tomorrow at 2:00 PM").
 * Used on marketplace therapist cards. Data is cached to reduce API calls.
 */
export const NextAvailableSlot: React.FC<NextAvailableSlotProps> = ({
  therapistId,
  durationMinutes = 60,
  className = ''
}) => {
  const [slot, setSlot] = useState<{ label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!therapistId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getNextAvailableSlot(therapistId, durationMinutes)
      .then((result) => {
        if (cancelled) return;
        if (result) setSlot({ label: result.label });
        else setSlot(null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [therapistId, durationMinutes]);

  if (loading) {
    return (
      <div className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!slot) {
    return (
      <p className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Check back soon</span>
      </p>
    );
  }

  return (
    <p className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Next available: <span className="font-medium text-foreground">{slot.label}</span>
      </span>
    </p>
  );
};
