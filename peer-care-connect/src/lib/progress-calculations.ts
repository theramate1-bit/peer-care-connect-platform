import { format, subDays, subWeeks, subMonths, differenceInDays, differenceInWeeks } from 'date-fns';

export interface ProgressMetric {
  id: string;
  metric_name: string;
  metric_type: string;
  value: number;
  max_value: number;
  unit: string;
  session_date: string;
  created_at: string;
}

export interface ProgressGoal {
  id: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: string;
  linked_metric_name?: string | null;
}

export interface ExerciseCompletion {
  completed_date: string;
  exercise_name: string;
  pain_level?: number;
  difficulty_rating?: number;
}

export interface MetricTrend {
  metricName: string;
  period: 'week' | 'month' | 'all';
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  currentValue: number;
  previousValue: number;
  currentDate: string;
  previousDate: string;
}

export interface GoalProgress {
  goalId: string;
  goalName: string;
  progressPercent: number;
  currentValue: number;
  targetValue: number;
  daysRemaining: number;
  estimatedCompletionDate: string | null;
  onTrack: boolean;
  status: string;
}

export interface Correlation {
  metricName: string;
  exerciseName: string;
  correlation: number; // -1 to 1
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

/**
 * Calculate trend for a metric over a time period
 */
export function calculateMetricTrend(
  metrics: ProgressMetric[],
  metricName: string,
  timePeriod: 'week' | 'month' | 'all' = 'month'
): MetricTrend | null {
  const metricData = metrics
    .filter(m => m.metric_name === metricName)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

  if (metricData.length < 2) return null;

  const now = new Date();
  let cutoffDate: Date;
  
  switch (timePeriod) {
    case 'week':
      cutoffDate = subWeeks(now, 1);
      break;
    case 'month':
      cutoffDate = subMonths(now, 1);
      break;
    default:
      cutoffDate = new Date(0); // All time
  }

  const recentMetrics = metricData.filter(m => new Date(m.session_date) >= cutoffDate);
  if (recentMetrics.length < 2) {
    // Fall back to all metrics if not enough in period
    if (metricData.length < 2) return null;
  }

  const dataToUse = recentMetrics.length >= 2 ? recentMetrics : metricData;
  const current = dataToUse[dataToUse.length - 1];
  const previous = dataToUse[0];

  // Normalize values for comparison
  const currentNormalized = current.value / current.max_value;
  const previousNormalized = previous.value / previous.max_value;
  
  const change = currentNormalized - previousNormalized;
  const changePercent = previousNormalized !== 0 
    ? (change / previousNormalized) * 100 
    : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changePercent) > 5) {
    direction = changePercent > 0 ? 'up' : 'down';
  }

  return {
    metricName,
    period: timePeriod,
    change,
    changePercent: Math.abs(changePercent),
    direction,
    currentValue: current.value,
    previousValue: previous.value,
    currentDate: current.session_date,
    previousDate: previous.session_date
  };
}

/**
 * Calculate progress for a goal
 */
export function calculateGoalProgress(
  goal: ProgressGoal,
  linkedMetrics?: ProgressMetric[]
): GoalProgress {
  const progressPercent = goal.target_value > 0
    ? Math.min((goal.current_value / goal.target_value) * 100, 100)
    : 0;

  const targetDate = new Date(goal.target_date);
  const now = new Date();
  const daysRemaining = Math.max(0, differenceInDays(targetDate, now));

  // Estimate completion date based on current progress rate
  let estimatedCompletionDate: string | null = null;
  let onTrack = true;

  if (linkedMetrics && linkedMetrics.length >= 2) {
    // Calculate rate of change from linked metrics
    const sortedMetrics = linkedMetrics
      .filter(m => m.metric_name === goal.linked_metric_name)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

    if (sortedMetrics.length >= 2) {
      const first = sortedMetrics[0];
      const last = sortedMetrics[sortedMetrics.length - 1];
      const daysBetween = differenceInDays(new Date(last.session_date), new Date(first.session_date));
      
      if (daysBetween > 0) {
        const valueChange = last.value - first.value;
        const dailyRate = valueChange / daysBetween;
        
        if (dailyRate !== 0) {
          const remainingValue = goal.target_value - goal.current_value;
          const daysToComplete = remainingValue / dailyRate;
          estimatedCompletionDate = format(
            new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000),
            'yyyy-MM-dd'
          );
          
          // Check if on track (estimated date should be before or close to target date)
          const estimatedDate = new Date(estimatedCompletionDate);
          const daysDifference = differenceInDays(estimatedDate, targetDate);
          onTrack = daysDifference <= 7; // Within a week is considered on track
        }
      }
    }
  } else {
    // Simple linear projection if no linked metrics
    if (goal.current_value > 0 && goal.target_value > goal.current_value) {
      const progressRate = goal.current_value / differenceInDays(now, new Date(goal.created_at || now));
      if (progressRate > 0) {
        const remainingValue = goal.target_value - goal.current_value;
        const daysToComplete = remainingValue / progressRate;
        estimatedCompletionDate = format(
          new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000),
          'yyyy-MM-dd'
        );
        const estimatedDate = new Date(estimatedCompletionDate);
        onTrack = estimatedDate <= targetDate || differenceInDays(estimatedDate, targetDate) <= 7;
      }
    }
  }

  return {
    goalId: goal.id,
    goalName: goal.goal_name,
    progressPercent,
    currentValue: goal.current_value,
    targetValue: goal.target_value,
    daysRemaining,
    estimatedCompletionDate,
    onTrack,
    status: goal.status
  };
}

/**
 * Predict goal completion date
 */
export function predictGoalCompletion(
  goal: ProgressGoal,
  metrics: ProgressMetric[]
): string | null {
  if (!goal.linked_metric_name) return null;

  const linkedMetrics = metrics
    .filter(m => m.metric_name === goal.linked_metric_name)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

  if (linkedMetrics.length < 2) return null;

  const first = linkedMetrics[0];
  const last = linkedMetrics[linkedMetrics.length - 1];
  const daysBetween = differenceInDays(new Date(last.session_date), new Date(first.session_date));
  
  if (daysBetween <= 0) return null;

  const valueChange = last.value - first.value;
  const dailyRate = valueChange / daysBetween;
  
  if (dailyRate === 0 || dailyRate < 0) return null; // Not improving or getting worse

  const remainingValue = goal.target_value - goal.current_value;
  const daysToComplete = remainingValue / dailyRate;
  
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysToComplete);
  
  return format(completionDate, 'yyyy-MM-dd');
}

/**
 * Find correlations between metrics and exercise completions
 */
export function findMetricCorrelations(
  metrics: ProgressMetric[],
  exercises: ExerciseCompletion[]
): Correlation[] {
  const correlations: Correlation[] = [];

  // Group exercises by name
  const exerciseGroups = exercises.reduce((acc, ex) => {
    if (!acc[ex.exercise_name]) {
      acc[ex.exercise_name] = [];
    }
    acc[ex.exercise_name].push(ex);
    return acc;
  }, {} as Record<string, ExerciseCompletion[]>);

  // Get unique metric names
  const metricNames = Array.from(new Set(metrics.map(m => m.metric_name)));

  // For each metric, check correlation with each exercise
  for (const metricName of metricNames) {
    const metricData = metrics
      .filter(m => m.metric_name === metricName)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

    for (const [exerciseName, exerciseData] of Object.entries(exerciseGroups)) {
      // Simple correlation: check if exercise frequency correlates with metric improvement
      const correlation = calculateSimpleCorrelation(metricData, exerciseData);
      
      if (Math.abs(correlation) > 0.3) {
        const strength = Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak';
        const description = correlation > 0
          ? `More ${exerciseName} completions correlate with improved ${metricName}`
          : `More ${exerciseName} completions correlate with worsened ${metricName}`;

        correlations.push({
          metricName,
          exerciseName,
          correlation,
          strength,
          description
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Simple correlation calculation
 */
function calculateSimpleCorrelation(
  metrics: ProgressMetric[],
  exercises: ExerciseCompletion[]
): number {
  if (metrics.length < 2 || exercises.length < 2) return 0;

  // Create time series data
  const metricValues: number[] = [];
  const exerciseCounts: number[] = [];
  
  // Group by week
  const weeks = new Map<string, { metric: number; exercises: number }>();
  
  for (const metric of metrics) {
    const weekKey = format(new Date(metric.session_date), 'yyyy-ww');
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, { metric: 0, exercises: 0 });
    }
    const week = weeks.get(weekKey)!;
    week.metric += metric.value / metric.max_value; // Normalize
  }

  for (const exercise of exercises) {
    const weekKey = format(new Date(exercise.completed_date), 'yyyy-ww');
    if (weeks.has(weekKey)) {
      weeks.get(weekKey)!.exercises += 1;
    }
  }

  const weekData = Array.from(weeks.values());
  if (weekData.length < 2) return 0;

  // Calculate correlation coefficient
  const metricMean = weekData.reduce((sum, w) => sum + w.metric, 0) / weekData.length;
  const exerciseMean = weekData.reduce((sum, w) => sum + w.exercises, 0) / weekData.length;

  let numerator = 0;
  let metricVariance = 0;
  let exerciseVariance = 0;

  for (const week of weekData) {
    const metricDiff = week.metric - metricMean;
    const exerciseDiff = week.exercises - exerciseMean;
    numerator += metricDiff * exerciseDiff;
    metricVariance += metricDiff * metricDiff;
    exerciseVariance += exerciseDiff * exerciseDiff;
  }

  const denominator = Math.sqrt(metricVariance * exerciseVariance);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Generate all insights for a client
 */
export interface ClientInsights {
  trends: MetricTrend[];
  goalProgress: GoalProgress[];
  correlations: Correlation[];
  summary: {
    totalMetrics: number;
    activeGoals: number;
    achievedGoals: number;
    mostImprovedMetric: string | null;
    upcomingDeadlines: Array<{ goalName: string; daysRemaining: number }>;
  };
}

export async function generateInsights(
  clientId: string,
  metrics: ProgressMetric[],
  goals: ProgressGoal[],
  exercises: ExerciseCompletion[]
): Promise<ClientInsights> {
  // Calculate trends for all metrics
  const trends: MetricTrend[] = [];
  const uniqueMetricNames = Array.from(new Set(metrics.map(m => m.metric_name)));
  
  for (const metricName of uniqueMetricNames) {
    const trend = calculateMetricTrend(metrics, metricName, 'month');
    if (trend) trends.push(trend);
  }

  // Calculate goal progress
  const goalProgress: GoalProgress[] = goals
    .filter(g => g.status === 'active')
    .map(goal => {
      const linkedMetrics = goal.linked_metric_name
        ? metrics.filter(m => m.metric_name === goal.linked_metric_name)
        : undefined;
      return calculateGoalProgress(goal, linkedMetrics);
    });

  // Find correlations
  const correlations = findMetricCorrelations(metrics, exercises);

  // Generate summary
  const activeGoals = goals.filter(g => g.status === 'active');
  const achievedGoals = goals.filter(g => g.status === 'achieved');
  
  const mostImprovedTrend = trends
    .filter(t => t.direction === 'up')
    .sort((a, b) => b.changePercent - a.changePercent)[0];
  
  const upcomingDeadlines = goalProgress
    .filter(gp => gp.daysRemaining > 0 && gp.daysRemaining <= 30)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5)
    .map(gp => ({
      goalName: gp.goalName,
      daysRemaining: gp.daysRemaining
    }));

  return {
    trends,
    goalProgress,
    correlations,
    summary: {
      totalMetrics: uniqueMetricNames.length,
      activeGoals: activeGoals.length,
      achievedGoals: achievedGoals.length,
      mostImprovedMetric: mostImprovedTrend?.metricName || null,
      upcomingDeadlines
    }
  };
}

