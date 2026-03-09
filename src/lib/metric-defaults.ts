import { supabase } from '@/integrations/supabase/client';

export interface MetricDefaults {
  value?: number;
  max_value: number;
  unit: string;
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
}

/**
 * Get default max value based on metric type
 */
export function getDefaultMaxValue(metricType: string): number {
  switch (metricType) {
    case 'pain_level':
      return 10;
    case 'strength':
      return 5;
    case 'mobility':
      return 180; // degrees
    case 'flexibility':
      return 180; // degrees
    case 'function':
      return 100; // percentage
    default:
      return 10;
  }
}

/**
 * Get default unit based on metric type
 */
export function getDefaultUnit(metricType: string): string {
  switch (metricType) {
    case 'pain_level':
      return '/10';
    case 'strength':
      return '/5';
    case 'mobility':
      return 'degrees';
    case 'flexibility':
      return 'degrees';
    case 'function':
      return '%';
    default:
      return '';
  }
}

/**
 * Get smart defaults for a metric based on client history
 */
export async function getSmartMetricDefaults(
  clientId: string,
  metricName: string,
  metricType: string
): Promise<MetricDefaults> {
  const defaults: MetricDefaults = {
    max_value: getDefaultMaxValue(metricType),
    unit: getDefaultUnit(metricType),
    metric_type: metricType as any,
  };

  // If metric name is provided, try to find last value for this metric
  if (metricName && metricName.trim().length >= 3) {
    try {
      const { data: lastMetric } = await supabase
        .from('progress_metrics')
        .select('value, max_value, unit')
        .eq('client_id', clientId)
        .ilike('metric_name', `%${metricName.trim()}%`)
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastMetric) {
        defaults.value = lastMetric.value;
        // Use the last metric's max_value and unit if they exist
        if (lastMetric.max_value) {
          defaults.max_value = lastMetric.max_value;
        }
        if (lastMetric.unit) {
          defaults.unit = lastMetric.unit;
        }
      }
    } catch (error) {
      // If no previous metric found, use defaults
      console.log('[getSmartMetricDefaults] No previous metric found, using defaults');
    }
  }

  return defaults;
}

/**
 * Get the last value for a specific metric name
 */
export async function getLastMetricValue(
  clientId: string,
  metricName: string
): Promise<{ value: number; max_value: number; unit: string } | null> {
  try {
    const { data: lastMetric } = await supabase
      .from('progress_metrics')
      .select('value, max_value, unit')
      .eq('client_id', clientId)
      .eq('metric_name', metricName.trim())
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMetric) {
      return {
        value: lastMetric.value,
        max_value: lastMetric.max_value || getDefaultMaxValue('custom'),
        unit: lastMetric.unit || '',
      };
    }
  } catch (error) {
    // No previous metric found
  }

  return null;
}

