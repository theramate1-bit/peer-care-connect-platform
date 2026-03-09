import { supabase } from '@/integrations/supabase/client';

/**
 * Link a goal to a metric for automatic updates
 */
export async function linkGoalToMetric(
  goalId: string,
  metricName: string,
  metricType?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('progress_goals')
      .update({
        linked_metric_name: metricName,
        linked_metric_type: metricType || null,
        auto_update_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error linking goal to metric:', error);
    return { success: false, error: error.message || 'Failed to link goal' };
  }
}

/**
 * Unlink a goal from its metric
 */
export async function unlinkGoalFromMetric(
  goalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('progress_goals')
      .update({
        linked_metric_name: null,
        linked_metric_type: null,
        auto_update_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error unlinking goal from metric:', error);
    return { success: false, error: error.message || 'Failed to unlink goal' };
  }
}

/**
 * Manually trigger goal update from linked metric
 * This is useful when auto-update is disabled or for manual refresh
 */
export async function updateGoalFromMetric(
  goalId: string
): Promise<{ success: boolean; error?: string; updated?: boolean }> {
  try {
    // Get the goal
    const { data: goal, error: goalError } = await supabase
      .from('progress_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError) throw goalError;
    if (!goal) return { success: false, error: 'Goal not found' };
    if (!goal.linked_metric_name) {
      return { success: false, error: 'Goal is not linked to a metric' };
    }

    // Get the latest metric value
    const { data: metrics, error: metricsError } = await supabase
      .from('progress_metrics')
      .select('*')
      .eq('client_id', goal.client_id)
      .eq('metric_name', goal.linked_metric_name)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (metricsError) throw metricsError;
    if (!metrics || metrics.length === 0) {
      return { success: true, updated: false }; // No metric data yet
    }

    const latestMetric = metrics[0];
    const newCurrentValue = latestMetric.value;
    const newStatus = newCurrentValue >= goal.target_value ? 'achieved' : goal.status;

    // Update the goal
    const { error: updateError } = await supabase
      .from('progress_goals')
      .update({
        current_value: newCurrentValue,
        status: newStatus === 'achieved' && goal.status !== 'achieved' ? 'achieved' : goal.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId);

    if (updateError) throw updateError;

    return { success: true, updated: true };
  } catch (error: any) {
    console.error('Error updating goal from metric:', error);
    return { success: false, error: error.message || 'Failed to update goal' };
  }
}

/**
 * Check if a goal should be marked as achieved
 */
export async function checkGoalAchievement(
  goalId: string
): Promise<{ success: boolean; achieved?: boolean; error?: string }> {
  try {
    const { data: goal, error } = await supabase
      .from('progress_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) throw error;
    if (!goal) return { success: false, error: 'Goal not found' };

    const achieved = goal.current_value >= goal.target_value;
    
    if (achieved && goal.status !== 'achieved') {
      // Update status to achieved
      const { error: updateError } = await supabase
        .from('progress_goals')
        .update({
          status: 'achieved',
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);

      if (updateError) throw updateError;
    }

    return { success: true, achieved };
  } catch (error: any) {
    console.error('Error checking goal achievement:', error);
    return { success: false, error: error.message || 'Failed to check goal achievement' };
  }
}

/**
 * Update all linked goals for a client when a metric changes
 * This is called client-side as a backup to the database trigger
 */
export async function updateLinkedGoalsForMetric(
  clientId: string,
  metricName: string
): Promise<{ success: boolean; updated: number; error?: string }> {
  try {
    // Get all active goals linked to this metric
    const { data: goals, error: goalsError } = await supabase
      .from('progress_goals')
      .select('*')
      .eq('client_id', clientId)
      .eq('linked_metric_name', metricName)
      .eq('auto_update_enabled', true)
      .eq('status', 'active');

    if (goalsError) throw goalsError;
    if (!goals || goals.length === 0) {
      return { success: true, updated: 0 };
    }

    // Get the latest metric value
    const { data: metrics, error: metricsError } = await supabase
      .from('progress_metrics')
      .select('*')
      .eq('client_id', clientId)
      .eq('metric_name', metricName)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (metricsError) throw metricsError;
    if (!metrics || metrics.length === 0) {
      return { success: true, updated: 0 };
    }

    const latestMetric = metrics[0];
    let updatedCount = 0;

    // Update each linked goal
    for (const goal of goals) {
      const newCurrentValue = latestMetric.value;
      const newStatus = newCurrentValue >= goal.target_value ? 'achieved' : 'active';

      const { error: updateError } = await supabase
        .from('progress_goals')
        .update({
          current_value: newCurrentValue,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    return { success: true, updated: updatedCount };
  } catch (error: any) {
    console.error('Error updating linked goals for metric:', error);
    return { success: false, updated: 0, error: error.message || 'Failed to update linked goals' };
  }
}

