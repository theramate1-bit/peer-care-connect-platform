import { supabase } from '@/integrations/supabase/client';
import { extractMetricsFromSoap, ExtractedMetric, normalizeMetric } from '@/lib/metric-extraction';
import { toast } from 'sonner';

export interface AutoInsertResult {
  inserted: number;
  skipped: number;
  lowConfidence: number;
  errors: string[];
  lowConfidenceMetrics: ExtractedMetric[];
}

export interface AutoInsertOptions {
  confidenceThreshold?: number; // Default: 0.7
  enableAutoInsert?: boolean; // Default: true
  skipDuplicates?: boolean; // Default: true
}

/**
 * Automatically extract and insert metrics from SOAP notes
 * High-confidence metrics are inserted automatically, low-confidence metrics are returned for review
 */
export async function autoInsertMetricsFromSOAP(
  sessionId: string,
  clientId: string,
  practitionerId: string,
  sessionDate: string,
  subjective: string,
  objective: string,
  assessment: string,
  plan: string,
  options: AutoInsertOptions = {}
): Promise<AutoInsertResult> {
  const {
    confidenceThreshold = 0.7,
    enableAutoInsert = true,
    skipDuplicates = true
  } = options;

  const result: AutoInsertResult = {
    inserted: 0,
    skipped: 0,
    lowConfidence: 0,
    errors: [],
    lowConfidenceMetrics: []
  };

  // Feature flag check
  if (!enableAutoInsert) {
    return result;
  }

  // Skip if all sections are empty
  if (!subjective && !objective && !assessment && !plan) {
    return result;
  }

  try {
    // Extract metrics using existing extraction function
    const extractedMetrics = await extractMetricsFromSoap(
      subjective || '',
      objective || '',
      assessment || '',
      plan || ''
    );

    if (extractedMetrics.length === 0) {
      return result;
    }

    // Separate high and low confidence metrics
    const highConfidenceMetrics: ExtractedMetric[] = [];
    const lowConfidenceMetrics: ExtractedMetric[] = [];

    for (const metric of extractedMetrics) {
      const normalized = normalizeMetric(metric);
      
      // Validate metric
      if (!isValidMetric(normalized)) {
        result.errors.push(`Invalid metric: ${normalized.metric_name} - validation failed`);
        continue;
      }

      if (normalized.confidence >= confidenceThreshold) {
        highConfidenceMetrics.push(normalized);
      } else {
        lowConfidenceMetrics.push(normalized);
      }
    }

    result.lowConfidence = lowConfidenceMetrics.length;
    result.lowConfidenceMetrics = lowConfidenceMetrics;

    // Insert high-confidence metrics
    if (highConfidenceMetrics.length > 0) {
      const insertResults = await insertMetrics(
        sessionId,
        clientId,
        practitionerId,
        sessionDate,
        highConfidenceMetrics,
        skipDuplicates
      );

      result.inserted = insertResults.inserted;
      result.skipped = insertResults.skipped;
      result.errors.push(...insertResults.errors);
    }

  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error during metric extraction';
    result.errors.push(`Extraction failed: ${errorMessage}`);
    console.error('[autoInsertMetricsFromSOAP] Error:', error);
  }

  return result;
}

/**
 * Validate a metric before insertion
 */
function isValidMetric(metric: ExtractedMetric): boolean {
  // Check metric name is not empty
  if (!metric.metric_name || metric.metric_name.trim().length === 0) {
    return false;
  }

  // Check max_value is positive
  if (metric.max_value <= 0) {
    return false;
  }

  // Check value is within bounds
  if (metric.value < 0 || metric.value > metric.max_value) {
    return false;
  }

  // Check value is a valid number
  if (isNaN(metric.value) || !isFinite(metric.value)) {
    return false;
  }

  // Check max_value is a valid number
  if (isNaN(metric.max_value) || !isFinite(metric.max_value)) {
    return false;
  }

  return true;
}

/**
 * Insert metrics into database with duplicate checking
 */
async function insertMetrics(
  sessionId: string,
  clientId: string,
  practitionerId: string,
  sessionDate: string,
  metrics: ExtractedMetric[],
  skipDuplicates: boolean
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const result = {
    inserted: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // Check for existing metrics if skipDuplicates is enabled
  const metricsToInsert: ExtractedMetric[] = [];

  if (skipDuplicates) {
    for (const metric of metrics) {
      try {
        // Check if metric already exists using direct query (more reliable than RPC)
        let query = supabase
          .from('progress_metrics')
          .select('id')
          .eq('client_id', clientId)
          .eq('metric_name', metric.metric_name.trim())
          .eq('session_date', sessionDate)
          .limit(1);

        if (sessionId) {
          query = query.eq('session_id', sessionId);
        } else {
          query = query.is('session_id', null);
        }

        const { data: existing, error: checkError } = await query;

        if (checkError) {
          console.warn('[insertMetrics] Error checking for duplicate:', checkError);
          // Continue anyway - better to try insert than skip
          metricsToInsert.push(metric);
        } else if (existing && existing.length > 0) {
          result.skipped++;
        } else {
          metricsToInsert.push(metric);
        }
      } catch (error) {
        console.warn('[insertMetrics] Error checking duplicate, proceeding with insert:', error);
        metricsToInsert.push(metric);
      }
    }
  } else {
    metricsToInsert.push(...metrics);
  }

  if (metricsToInsert.length === 0) {
    return result;
  }

  // Prepare inserts with metadata parsing
  const inserts = metricsToInsert.map(metric => {
    // Parse metadata from metric name if not provided
    let metadata = metric.metadata || {};
    
    // If metadata is missing for mobility/strength, try to parse from metric_name
    if ((metric.metric_type === 'mobility' || metric.metric_type === 'strength') && !metadata.joint && !metadata.movement) {
      metadata = parseStructuredDataFromMetricName(metric.metric_name, metric.metric_type);
    }
    
    return {
      client_id: clientId,
      practitioner_id: practitionerId,
      session_id: sessionId || null,
      metric_type: metric.metric_type,
      metric_name: metric.metric_name.trim(),
      value: Math.max(0, Math.min(metric.value, metric.max_value)), // Clamp value
      max_value: metric.max_value,
      unit: (metric.unit || '').trim(),
      notes: (metric.notes || '').trim(),
      session_date: sessionDate,
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    };
  });

  // Insert metrics with error handling per metric
  try {
    const { data, error } = await supabase
      .from('progress_metrics')
      .insert(inserts)
      .select();

    if (error) {
      // Try inserting one by one to identify which ones fail
      for (const insert of inserts) {
        try {
          const { error: singleError } = await supabase
            .from('progress_metrics')
            .insert(insert)
            .select()
            .single();

          if (singleError) {
            // Check if it's a duplicate error
            if (singleError.code === '23505' || singleError.message?.includes('duplicate')) {
              result.skipped++;
            } else {
              result.errors.push(`Failed to insert ${insert.metric_name}: ${singleError.message}`);
            }
          } else {
            result.inserted++;
          }
        } catch (singleError: any) {
          result.errors.push(`Failed to insert ${insert.metric_name}: ${singleError.message || 'Unknown error'}`);
        }
      }
    } else {
      result.inserted = data?.length || 0;
    }
  } catch (error: any) {
    result.errors.push(`Bulk insert failed: ${error.message || 'Unknown error'}`);
    console.error('[insertMetrics] Bulk insert error:', error);
  }

  return result;
}

/**
 * Parse structured data (joint, side, movement) from metric name
 * Used as fallback when AI doesn't provide structured metadata
 */
function parseStructuredDataFromMetricName(metricName: string, metricType: string): { joint?: string; movement?: string; side?: 'left' | 'right' | 'bilateral' } {
  const metadata: { joint?: string; movement?: string; side?: 'left' | 'right' | 'bilateral' } = {};
  const nameLower = metricName.toLowerCase();
  
  // Extract side
  if (nameLower.includes('right')) {
    metadata.side = 'right';
  } else if (nameLower.includes('left')) {
    metadata.side = 'left';
  } else if (nameLower.includes('bilateral') || nameLower.includes('both')) {
    metadata.side = 'bilateral';
  }
  
  // Common joints
  const joints = ['knee', 'hip', 'shoulder', 'ankle', 'elbow', 'wrist', 'neck', 'spine', 'back', 'lumbar', 'thoracic', 'cervical'];
  for (const joint of joints) {
    if (nameLower.includes(joint)) {
      metadata.joint = joint.charAt(0).toUpperCase() + joint.slice(1);
      break;
    }
  }
  
  // Common movements
  const movements = ['flexion', 'extension', 'abduction', 'adduction', 'rotation', 'side flexion', 'lateral flexion', 'elevation', 'depression'];
  for (const movement of movements) {
    if (nameLower.includes(movement)) {
      metadata.movement = movement.charAt(0).toUpperCase() + movement.slice(1);
      break;
    }
  }
  
  return metadata;
}

/**
 * Show user-friendly toast notifications based on results
 */
export function showAutoInsertResults(result: AutoInsertResult): void {
  if (result.inserted > 0) {
    toast.success(
      `${result.inserted} metric${result.inserted !== 1 ? 's' : ''} automatically added to Progress. View in the Progress tab.`,
      {
        duration: 4000
      }
    );
  }

  if (result.skipped > 0) {
    toast.info(
      `${result.skipped} metric${result.skipped !== 1 ? 's' : ''} skipped (already exists)`,
      {
        duration: 2000
      }
    );
  }

  if (result.lowConfidence > 0) {
    toast.warning(
      `${result.lowConfidence} metric${result.lowConfidence !== 1 ? 's' : ''} need${result.lowConfidence === 1 ? 's' : ''} review (low confidence)`,
      {
        duration: 4000
      }
    );
  }

  if (result.errors.length > 0) {
    console.error('[showAutoInsertResults] Errors:', result.errors);
    // Don't show all errors to user, just log them
    if (result.inserted === 0 && result.lowConfidence === 0) {
      toast.error('Failed to extract metrics from SOAP notes', {
        duration: 3000
      });
    }
  }
}

