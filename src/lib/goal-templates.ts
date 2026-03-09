export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  target_value_formula: string; // e.g., "current * 0.7" for 30% reduction
  target_date_days: number; // Days from now
  metric_type_suggestions: string[];
  example: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'reduce-pain',
    name: 'Reduce Pain',
    description: 'Reduce pain level by 30-50%',
    target_value_formula: 'current * 0.7', // 30% reduction
    target_date_days: 90,
    metric_type_suggestions: ['pain_level'],
    example: 'Reduce Lower Back Pain from 7/10 to 5/10'
  },
  {
    id: 'improve-rom',
    name: 'Improve Range of Motion',
    description: 'Increase ROM by 20-30%',
    target_value_formula: 'current * 1.25', // 25% increase
    target_date_days: 90,
    metric_type_suggestions: ['mobility'],
    example: 'Improve Shoulder Flexion from 90° to 120°'
  },
  {
    id: 'increase-strength',
    name: 'Increase Strength',
    description: 'Improve strength by 1-2 grades',
    target_value_formula: 'current + 1', // Add 1 grade
    target_date_days: 90,
    metric_type_suggestions: ['strength'],
    example: 'Increase Quad Strength from 3/5 to 4/5'
  },
  {
    id: 'improve-flexibility',
    name: 'Improve Flexibility',
    description: 'Increase flexibility by 15-25%',
    target_value_formula: 'current * 1.2', // 20% increase
    target_date_days: 90,
    metric_type_suggestions: ['flexibility'],
    example: 'Improve Hamstring Flexibility from 60° to 90°'
  },
  {
    id: 'improve-function',
    name: 'Improve Function',
    description: 'Improve functional ability by 20-30%',
    target_value_formula: 'current * 1.25', // 25% increase
    target_date_days: 90,
    metric_type_suggestions: ['function'],
    example: 'Increase Walking Distance from 50m to 100m'
  }
];

/**
 * Calculate target value from template formula
 */
export function calculateTargetFromTemplate(
  template: GoalTemplate,
  currentValue: number
): number {
  const formula = template.target_value_formula;
  
  // Simple formula evaluation
  if (formula.includes('*')) {
    const multiplier = parseFloat(formula.split('*')[1].trim());
    return Math.round(currentValue * multiplier * 10) / 10;
  } else if (formula.includes('+')) {
    const addend = parseFloat(formula.split('+')[1].trim());
    return Math.round((currentValue + addend) * 10) / 10;
  } else if (formula.includes('-')) {
    const subtrahend = parseFloat(formula.split('-')[1].trim());
    return Math.round((currentValue - subtrahend) * 10) / 10;
  }
  
  return currentValue;
}

/**
 * Get target date from template
 */
export function getTargetDateFromTemplate(template: GoalTemplate): string {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + template.target_date_days);
  return targetDate.toISOString().split('T')[0];
}

