import React from 'react';
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
  clinicLabel = 'Clinic',
  mobileLabel = 'Mobile',
  practitionerName,
}) => {
  const clinicAria = practitionerName
    ? `Book clinic session with ${practitionerName}`
    : 'Book clinic session';
  const mobileAria = practitionerName
    ? `Request visit to my location with ${practitionerName}`
    : 'Request visit to my location';

  return (
    <div className={cn('flex flex-wrap gap-2 min-w-0', className)}>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onBookClinic();
        }}
        size={buttonSize}
        aria-label={clinicAria}
        className={cn(fullWidth && 'flex-1 min-w-0 text-xs sm:text-sm')}
      >
        {clinicLabel}
      </Button>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onRequestMobile();
        }}
        size={buttonSize}
        aria-label={mobileAria}
        className={cn(fullWidth && 'flex-1 min-w-0 text-xs sm:text-sm')}
      >
        {mobileLabel}
      </Button>
    </div>
  );
};

