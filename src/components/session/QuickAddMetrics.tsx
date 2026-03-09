import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, TrendingUp, Minus, CheckCircle, BarChart3 } from 'lucide-react';
import { getDefaultMaxValue, getDefaultUnit } from '@/lib/metric-defaults';

interface QuickAddMetricsProps {
  onQuickAdd: (metricType: string, maxValue: number, unit: string) => void;
  disabled?: boolean;
}

export const QuickAddMetrics: React.FC<QuickAddMetricsProps> = ({
  onQuickAdd,
  disabled = false
}) => {
  const quickAddOptions = [
    {
      label: 'Pain Level',
      type: 'pain_level',
      icon: AlertTriangle,
      maxValue: getDefaultMaxValue('pain_level'),
      unit: getDefaultUnit('pain_level')
    },
    {
      label: 'ROM',
      type: 'mobility',
      icon: Activity,
      maxValue: getDefaultMaxValue('mobility'),
      unit: getDefaultUnit('mobility')
    },
    {
      label: 'Strength',
      type: 'strength',
      icon: TrendingUp,
      maxValue: getDefaultMaxValue('strength'),
      unit: getDefaultUnit('strength')
    },
    {
      label: 'Flexibility',
      type: 'flexibility',
      icon: Minus,
      maxValue: getDefaultMaxValue('flexibility'),
      unit: getDefaultUnit('flexibility')
    },
    {
      label: 'Function',
      type: 'function',
      icon: CheckCircle,
      maxValue: getDefaultMaxValue('function'),
      unit: getDefaultUnit('function')
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {quickAddOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.type}
            variant="outline"
            size="sm"
            onClick={() => onQuickAdd(option.type, option.maxValue, option.unit)}
            disabled={disabled}
            className="min-h-[44px] sm:min-h-0"
            aria-label={`Quick add ${option.label} metric`}
          >
            <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
};

