import { AvailabilitySettings } from '@/components/practice/AvailabilitySettings';

interface SchedulerEmbedProps {
  className?: string;
}

const SchedulerEmbed = ({ className }: SchedulerEmbedProps) => {
  // Render availability settings in embedded mode
  return <AvailabilitySettings embedded className={className} />;
};

export default SchedulerEmbed;


