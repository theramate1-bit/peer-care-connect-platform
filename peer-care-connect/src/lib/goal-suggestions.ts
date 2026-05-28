import { supabase } from '@/integrations/supabase/client';

export interface SuggestedGoal {
  goal_name: string;
  description: string;
  target_value: number;
  target_date: string;
  linked_metric_name: string;
  confidence: number;
  reason: string;
}

/**
 * Calculate suggested target value based on current metric value and improvement percentage
 * For metrics where lower is better (pain level)
 */
export function calculateSuggestedTarget(
  currentValue: number,
  maxValue: number,
  improvementPercent: number = 30
): number {
  // Calculate target as current value - improvement (reduction)
  const reduction = (currentValue * improvementPercent) / 100;
  const suggestedTarget = currentValue - reduction;
  
  // Ensure target is within bounds
  return Math.max(0, Math.min(suggestedTarget, maxValue));
}

/**
 * Calculate target for metrics where higher is better (strength, mobility, function)
 */
export function calculateSuggestedTargetHigherIsBetter(
  currentValue: number,
  maxValue: number,
  improvementPercent: number = 20
): number {
  const improvement = (currentValue * improvementPercent) / 100;
  const suggestedTarget = currentValue + improvement;
  return Math.max(0, Math.min(suggestedTarget, maxValue));
}

/**
 * Suggest goals based on a newly added metric
 */
export async function suggestGoalsFromMetric(
  clientId: string,
  metricName: string,
  metricType: string,
  currentValue: number,
  maxValue: number
): Promise<SuggestedGoal[]> {
  const suggestions: SuggestedGoal[] = [];

  // Check if a goal already exists for this metric
  const { data: existingGoals } = await supabase
    .from('progress_goals')
    .select('goal_name')
    .eq('client_id', clientId)
    .eq('linked_metric_name', metricName)
    .eq('status', 'active')
    .limit(1);

  if (existingGoals && existingGoals.length > 0) {
    // Goal already exists, don't suggest
    return suggestions;
  }

  // Calculate target date (3 months from now)
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + 3);
  const targetDateStr = targetDate.toISOString().split('T')[0];

  // Determine if higher is better based on metric type
  const higherIsBetter = ['strength', 'mobility', 'flexibility', 'function'].includes(metricType);
  
  // Calculate suggested target value
  let targetValue: number;
  let reason: string;
  
  if (higherIsBetter) {
    // For strength, mobility, etc. - aim for 20% improvement
    targetValue = calculateSuggestedTargetHigherIsBetter(currentValue, maxValue, 20);
    reason = `Aim for 20% improvement from current value of ${currentValue}`;
  } else {
    // For pain level - aim for 30% reduction
    targetValue = calculateSuggestedTarget(currentValue, maxValue, 30);
    reason = `Aim for 30% reduction from current value of ${currentValue}`;
  }

  // Round target value appropriately
  if (metricType === 'pain_level' || metricType === 'strength') {
    targetValue = Math.round(targetValue);
  } else {
    targetValue = Math.round(targetValue * 10) / 10; // One decimal place
  }

  // Create goal name based on metric
  const goalName = `Improve ${metricName}`;
  const description = `Target: ${targetValue}${metricType === 'pain_level' ? '/10' : metricType === 'strength' ? '/5' : ''} (currently ${currentValue})`;

  suggestions.push({
    goal_name: goalName,
    description,
    target_value: targetValue,
    target_date: targetDateStr,
    linked_metric_name: metricName,
    confidence: 0.8,
    reason,
  });

  return suggestions;
}

/**
 * Find matching metrics for a goal name (fuzzy matching)
 */
export async function findMatchingMetrics(
  clientId: string,
  goalName: string
): Promise<Array<{ metric_name: string; match_score: number }>> {
  try {
    // Get all unique metric names for this client
    const { data: metrics } = await supabase
      .from('progress_metrics')
      .select('metric_name')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (!metrics || metrics.length === 0) {
      return [];
    }

    // Get unique metric names
    const uniqueMetrics = Array.from(new Set(metrics.map(m => m.metric_name)));

    // Simple fuzzy matching - check if goal name contains metric name or vice versa
    const goalNameLower = goalName.toLowerCase();
    const matches = uniqueMetrics
      .map(metricName => {
        const metricNameLower = metricName.toLowerCase();
        
        // Exact match
        if (goalNameLower === metricNameLower) {
          return { metric_name: metricName, match_score: 1.0 };
        }
        
        // Goal name contains metric name
        if (goalNameLower.includes(metricNameLower)) {
          return { metric_name: metricName, match_score: 0.9 };
        }
        
        // Metric name contains goal name
        if (metricNameLower.includes(goalNameLower)) {
          return { metric_name: metricName, match_score: 0.8 };
        }
        
        // Check for word overlap
        const goalWords = goalNameLower.split(/\s+/);
        const metricWords = metricNameLower.split(/\s+/);
        const commonWords = goalWords.filter(w => metricWords.includes(w));
        
        if (commonWords.length > 0) {
          const overlap = commonWords.length / Math.max(goalWords.length, metricWords.length);
          return { metric_name: metricName, match_score: overlap * 0.7 };
        }
        
        return null;
      })
      .filter((match): match is { metric_name: string; match_score: number } => match !== null)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3); // Top 3 matches

    return matches;
  } catch (error) {
    console.error('[findMatchingMetrics] Error:', error);
    return [];
  }
}

