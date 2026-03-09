import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HybridBookingChooserProps {
  onBookClinic: () => void;
  onRequestMobile: () => void;
  className?: string;
  buttonSize?: 'sm' | 'default' | 'lg';
  fullWidth?: boolean;
  clinicLabel?: string;
  mobileLabel?: string;
  practitionerName?: string;
}

export const HybridBookingChooser: React.FC<HybridBookingChooserProps> = ({
  onBookClinic,
  onRequestMobile,
  className,
  buttonSize = 'sm',
  fullWidth = false,
  clinicLabel = 'Book at Clinic',
  mobileLabel = 'Request Visit to My Location',
  practitionerName,
}) => {
  const clinicAria = practitionerName
    ? `Book clinic session with ${practitionerName}`
    : 'Book clinic session';
  const mobileAria = practitionerName
    ? `Request visit to my location with ${practitionerName}`
    : 'Request visit to my location';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button
        onClick={onBookClinic}
        size={buttonSize}
        aria-label={clinicAria}
        className={cn(fullWidth && 'flex-1')}
      >
        <Calendar className="h-4 w-4 mr-2" />
        {clinicLabel}
      </Button>
      <Button
        variant="outline"
        onClick={onRequestMobile}
        size={buttonSize}
        aria-label={mobileAria}
        className={cn(fullWidth && 'flex-1')}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {mobileLabel}
      </Button>
    </div>
  );
};

