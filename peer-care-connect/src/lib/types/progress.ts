export interface ProgressMetricMetadata {
  joint?: string;
  movement?: string;
  pain_scale_type?: 'VAS' | 'NRS'; // Visual Analog Scale or Numerical Rating Scale
  strength_scale_type?: 'Oxford' | 'Dynamometer';
  side?: 'left' | 'right' | 'bilateral';
  [key: string]: any;
}

export interface ProgressMetric {
  id: string;
  client_id: string;
  practitioner_id: string;
  session_id: string | null;
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
  metric_name: string;
  value: number;
  max_value: number;
  unit: string;
  notes: string;
  session_date: string;
  metadata?: ProgressMetricMetadata;
  created_at: string;
}

export interface ProgressGoal {
  id: string;
  client_id: string;
  practitioner_id: string;
  goal_name: string;
  description: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'achieved' | 'paused' | 'cancelled';
  linked_metric_name?: string | null;
  linked_metric_type?: string | null;
  auto_update_enabled?: boolean;
  created_at: string;
  updated_at: string;
}


