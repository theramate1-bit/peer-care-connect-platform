import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';

interface VerificationBadgeProps {
  status: 'pending' | 'verified' | 'rejected' | 'under_review';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const VerificationBadge = ({ status, size = 'md', showTooltip = true }: VerificationBadgeProps) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'verified':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
          text: 'Verified',
          description: 'This practitioner has been verified by our team'
        };
      case 'under_review':
        return {
          icon: Clock,
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
          text: 'Under Review',
          description: 'This practitioner is currently being verified'
        };
      case 'rejected':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
          text: 'Verification Failed',
          description: 'This practitioner failed verification'
        };
      default:
        return {
          icon: AlertCircle,
          variant: 'outline' as const,
          className: 'border-gray-300 text-gray-600',
          text: 'Pending Verification',
          description: 'This practitioner is awaiting verification'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-5 px-2 text-xs';
      case 'lg':
        return 'h-8 px-3 text-sm';
      default:
        return 'h-6 px-2.5 text-xs';
    }
  };

  const badge = (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${getSizeClasses()} flex items-center space-x-1 cursor-default`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'}`} />
      <span>{config.text}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerificationBadge;
