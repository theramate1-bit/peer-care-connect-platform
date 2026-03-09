import { supabase } from '@/integrations/supabase/client';

export interface ExtractedMetric {
  metric_type: 'pain_level' | 'mobility' | 'strength' | 'flexibility' | 'function' | 'custom';
  metric_name: string;
  value: number;
  max_value: number;
  unit: string;
  notes?: string;
  confidence: number;
  source_section: 'subjective' | 'objective' | 'assessment' | 'plan';
  metadata?: {
    joint?: string;
    movement?: string;
    side?: 'left' | 'right' | 'bilateral';
    [key: string]: any;
  };
}

export interface ExtractMetricsResponse {
  metrics: ExtractedMetric[];
  total_found: number;
  filtered_count: number;
}

/**
 * Extract metrics from SOAP note sections using AI
 */
export async function extractMetricsFromSoap(
  subjective: string,
  objective: string,
  assessment: string,
  plan: string
): Promise<ExtractedMetric[]> {
  try {
    const { data, error } = await supabase.functions.invoke('extract-metrics', {
      body: {
        subjective: subjective || '',
        objective: objective || '',
        assessment: assessment || '',
        plan: plan || '',
      },
    });

    if (error) {
      // Silently fall back to regex extraction for any Edge Function errors
      console.warn('[extractMetricsFromSoap] Edge Function unavailable, using fallback extraction:', error.message);
      return fallbackExtractMetrics(subjective, objective, assessment, plan);
    }

    if (data && (data as any).error) {
      console.warn('[extractMetricsFromSoap] Edge Function returned error, using fallback extraction:', (data as any).error);
      return fallbackExtractMetrics(subjective, objective, assessment, plan);
    }

    const response = data as ExtractMetricsResponse;
    if (response && response.metrics && Array.isArray(response.metrics) && response.metrics.length > 0) {
      return response.metrics;
    }
    
    // If no metrics found from AI, try fallback
    return fallbackExtractMetrics(subjective, objective, assessment, plan);
  } catch (error: any) {
    // Silently fall back to regex-based extraction if AI fails
    console.warn('[extractMetricsFromSoap] Extraction error, using fallback:', error.message || error);
    return fallbackExtractMetrics(subjective, objective, assessment, plan);
  }
}

/**
 * Fallback regex-based extraction for common patterns
 */
function fallbackExtractMetrics(
  subjective: string,
  objective: string,
  assessment: string,
  plan: string
): ExtractedMetric[] {
  const metrics: ExtractedMetric[] = [];
  const fullText = `${subjective}\n${objective}\n${assessment}\n${plan}`;

  // Extract pain levels (e.g., "6/10 pain", "pain level 7 out of 10")
  const painPatterns = [
    /(\d+)\s*\/\s*10\s*(?:pain|discomfort|ache)/gi,
    /pain\s*(?:level|score)?\s*(?:of|is)?\s*(\d+)\s*(?:out\s*of|\/)\s*10/gi,
    /(\d+)\s*out\s*of\s*10\s*(?:pain|discomfort)/gi,
  ];

  painPatterns.forEach(pattern => {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      const value = parseInt(match[1] || match[0].match(/\d+/)?.[0] || '0');
      if (value >= 0 && value <= 10) {
        metrics.push({
          metric_type: 'pain_level',
          metric_name: 'Pain Level',
          value,
          max_value: 10,
          unit: '/10',
          confidence: 0.7,
          source_section: subjective.includes(match[0]) ? 'subjective' : 'objective',
        });
      }
    }
  });

  // Extract ROM measurements (e.g., "Flexion 120°", "ROM: Abduction 90°")
  const romPatterns = [
    /(?:ROM|range\s*of\s*motion|flexion|abduction|adduction|rotation|extension)[:\s]+(\d+)\s*°/gi,
    /(\w+)\s*(?:ROM|flexion|abduction|adduction|rotation|extension)[:\s]+(\d+)\s*°/gi,
  ];

  romPatterns.forEach(pattern => {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      const value = parseInt(match[2] || match[1] || '0');
      const movement = match[1]?.toLowerCase() || 'ROM';
      if (value > 0 && value <= 360) {
        metrics.push({
          metric_type: 'mobility',
          metric_name: `${movement.charAt(0).toUpperCase() + movement.slice(1)} ROM`,
          value,
          max_value: 180, // Default max for most joint movements
          unit: 'degrees',
          confidence: 0.6,
          source_section: objective.includes(match[0]) ? 'objective' : 'assessment',
        });
      }
    }
  });

  // Extract strength scores (e.g., "4/5 strength", "Strength: 3/5")
  const strengthPatterns = [
    /(\d+)\s*\/\s*5\s*(?:strength|power)/gi,
    /strength[:\s]+(\d+)\s*(?:out\s*of|\/)\s*5/gi,
    /(\d+)\s*out\s*of\s*5\s*(?:strength|power)/gi,
  ];

  strengthPatterns.forEach(pattern => {
    const matches = fullText.matchAll(pattern);
    for (const match of matches) {
      const value = parseInt(match[1] || match[0].match(/\d+/)?.[0] || '0');
      if (value >= 0 && value <= 5) {
        metrics.push({
          metric_type: 'strength',
          metric_name: 'Muscle Strength',
          value,
          max_value: 5,
          unit: '/5',
          confidence: 0.65,
          source_section: objective.includes(match[0]) ? 'objective' : 'assessment',
        });
      }
    }
  });

  // Remove duplicates (same metric_name and similar value)
  const uniqueMetrics = metrics.filter((metric, index, self) =>
    index === self.findIndex(m => 
      m.metric_name === metric.metric_name && 
      Math.abs(m.value - metric.value) < 2
    )
  );

  return uniqueMetrics;
}

/**
 * Parse pain level from text (helper function)
 */
export function parsePainLevel(text: string): { value: number; max: number } | null {
  const patterns = [
    /(\d+)\s*\/\s*10/,
    /pain\s*(?:level|score)?\s*(?:of|is)?\s*(\d+)\s*(?:out\s*of|\/)\s*10/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1] || match[0].match(/\d+/)?.[0] || '0');
      if (value >= 0 && value <= 10) {
        return { value, max: 10 };
      }
    }
  }

  return null;
}

/**
 * Parse ROM measurement from text (helper function)
 */
export function parseROM(text: string): Array<{ name: string; value: number; unit: string }> {
  const roms: Array<{ name: string; value: number; unit: string }> = [];
  const pattern = /(?:ROM|range\s*of\s*motion|flexion|abduction|adduction|rotation|extension)[:\s]+(\d+)\s*°/gi;
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const value = parseInt(match[1] || '0');
    if (value > 0 && value <= 360) {
      roms.push({
        name: match[0].split(/[:\s]+/)[0],
        value,
        unit: 'degrees',
      });
    }
  }

  return roms;
}

/**
 * Parse strength score from text (helper function)
 */
export function parseStrength(text: string): { value: number; max: number } | null {
  const pattern = /(\d+)\s*\/\s*5\s*(?:strength|power)/i;
  const match = text.match(pattern);
  if (match) {
    const value = parseInt(match[1] || '0');
    if (value >= 0 && value <= 5) {
      return { value, max: 5 };
    }
  }
  return null;
}

/**
 * Normalize and validate extracted metric
 */
export function normalizeMetric(metric: ExtractedMetric): ExtractedMetric {
  // Ensure value is within bounds
  const normalizedValue = Math.max(0, Math.min(metric.value, metric.max_value));
  
  // Ensure confidence is between 0 and 1
  const normalizedConfidence = Math.max(0, Math.min(1, metric.confidence || 0.5));
  
  // Trim metric name
  const normalizedName = metric.metric_name.trim();
  
  return {
    ...metric,
    value: normalizedValue,
    confidence: normalizedConfidence,
    metric_name: normalizedName,
    unit: metric.unit.trim(),
    notes: metric.notes?.trim(),
  };
}

