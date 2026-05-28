import { supabase } from '@/integrations/supabase/client';

export interface ExtractedGoal {
  goal_name: string;
  description: string;
  target_value: number;
  target_unit: string;
  target_date: string; // ISO date string
  confidence: number;
  source_section: 'subjective' | 'objective' | 'assessment' | 'plan';
  notes?: string;
}

export interface ExtractGoalsResponse {
  goals: ExtractedGoal[];
  total_found: number;
  filtered_count: number;
}

/**
 * Extract goals from SOAP note sections using AI
 * Focuses on Plan and Assessment sections where goals are typically stated
 */
export async function extractGoalsFromSoap(
  subjective: string,
  objective: string,
  assessment: string,
  plan: string
): Promise<ExtractedGoal[]> {
  try {
    const { data, error } = await supabase.functions.invoke('extract-goals', {
      body: {
        subjective: subjective || '',
        objective: objective || '',
        assessment: assessment || '',
        plan: plan || '',
      },
    });

    if (error) {
      // Silently fall back to regex extraction for any Edge Function errors
      console.warn('[extractGoalsFromSoap] Edge Function unavailable, using fallback extraction:', error.message);
      return fallbackExtractGoals(subjective, objective, assessment, plan);
    }

    if (data && (data as any).error) {
      console.warn('[extractGoalsFromSoap] Edge Function returned error, using fallback extraction:', (data as any).error);
      return fallbackExtractGoals(subjective, objective, assessment, plan);
    }

    const response = data as ExtractGoalsResponse;
    if (response && response.goals && Array.isArray(response.goals) && response.goals.length > 0) {
      return response.goals;
    }
    
    // If no goals found from AI, try fallback
    return fallbackExtractGoals(subjective, objective, assessment, plan);
  } catch (error: any) {
    // Silently fall back to regex-based extraction if AI fails
    console.warn('[extractGoalsFromSoap] Extraction error, using fallback:', error.message || error);
    return fallbackExtractGoals(subjective, objective, assessment, plan);
  }
}

/**
 * Fallback regex-based extraction for common goal patterns
 */
function fallbackExtractGoals(
  subjective: string,
  objective: string,
  assessment: string,
  plan: string
): ExtractedGoal[] {
  const goals: ExtractedGoal[] = [];
  
  // Focus on Plan and Assessment sections for goals
  const planText = plan || '';
  const assessmentText = assessment || '';
  const combinedText = `${assessmentText}\n${planText}`;

  // Extract goals with target values (e.g., "Goal: Increase ROM to 90 degrees")
  const goalWithValuePatterns = [
    /(?:goal|objective|target|aim)[:\s]+(?:to\s+)?(?:increase|improve|reduce|decrease|achieve|reach|attain)\s+(?:.*?)\s+(?:to|at|of)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)?/gi,
    /(?:increase|improve|reduce|decrease|achieve|reach|attain)\s+(?:.*?)\s+(?:to|at|of)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z°]+)?/gi,
  ];

  goalWithValuePatterns.forEach(pattern => {
    const matches = combinedText.matchAll(pattern);
    for (const match of matches) {
      const targetValue = parseFloat(match[1] || '0');
      const unit = (match[2] || '').trim();
      const fullMatch = match[0];
      
      if (targetValue > 0) {
        // Extract goal name from context
        const goalName = extractGoalName(fullMatch, combinedText, match.index || 0);
        
        goals.push({
          goal_name: goalName,
          description: fullMatch.trim(),
          target_value: targetValue,
          target_unit: unit || '',
          target_date: calculateTargetDate(combinedText, match.index || 0), // Try to extract date or default to 3 months
          confidence: 0.6,
          source_section: planText.includes(fullMatch) ? 'plan' : 'assessment',
          notes: `Extracted from: ${fullMatch.substring(0, 100)}`,
        });
      }
    }
  });

  // Extract pain reduction goals (e.g., "Goal: Reduce pain to 3/10")
  const painReductionPattern = /(?:goal|objective|target)[:\s]+(?:to\s+)?(?:reduce|decrease|lower)\s+(?:.*?)?pain\s+(?:to|at|below)\s+(\d+)\s*\/\s*10/gi;
  const painMatches = combinedText.matchAll(painReductionPattern);
  for (const match of painMatches) {
    const targetValue = parseFloat(match[1] || '0');
    if (targetValue >= 0 && targetValue <= 10) {
      goals.push({
        goal_name: 'Pain Reduction',
        description: match[0].trim(),
        target_value: targetValue,
        target_unit: '/10',
        target_date: calculateTargetDate(combinedText, match.index || 0),
        confidence: 0.7,
        source_section: planText.includes(match[0]) ? 'plan' : 'assessment',
        notes: 'Pain reduction goal',
      });
    }
  }

  // Remove duplicates (same goal_name and similar target_value)
  const uniqueGoals = goals.filter((goal, index, self) =>
    index === self.findIndex(g => 
      g.goal_name.toLowerCase() === goal.goal_name.toLowerCase() && 
      Math.abs(g.target_value - goal.target_value) < 1
    )
  );

  return uniqueGoals;
}

/**
 * Extract goal name from context
 */
function extractGoalName(match: string, fullText: string, matchIndex: number): string {
  // Try to find a preceding sentence or phrase that describes the goal
  const beforeMatch = fullText.substring(Math.max(0, matchIndex - 100), matchIndex);
  const sentences = beforeMatch.split(/[.!?]\s+/);
  const lastSentence = sentences[sentences.length - 1]?.trim() || '';
  
  // Look for common goal indicators
  const goalIndicators = ['goal', 'objective', 'target', 'aim', 'outcome'];
  for (const indicator of goalIndicators) {
    if (lastSentence.toLowerCase().includes(indicator)) {
      // Extract the main subject
      const parts = lastSentence.split(/[:\-]/);
      if (parts.length > 1) {
        return parts[parts.length - 1].trim().substring(0, 100);
      }
    }
  }
  
  // Fallback: extract key words from the match
  const words = match.split(/\s+/).filter(w => 
    !['to', 'at', 'of', 'the', 'a', 'an', 'increase', 'improve', 'reduce', 'decrease', 'achieve', 'reach'].includes(w.toLowerCase())
  );
  
  if (words.length > 0) {
    return words.slice(0, 5).join(' ').substring(0, 100);
  }
  
  return 'Treatment Goal';
}

/**
 * Calculate target date from context or default to 3 months from now
 */
function calculateTargetDate(text: string, matchIndex: number): string {
  // Look for date mentions near the match
  const context = text.substring(Math.max(0, matchIndex - 200), Math.min(text.length, matchIndex + 200));
  
  // Common date patterns
  const datePatterns = [
    /(?:in|within|by|target|deadline)[:\s]+(\d+)\s*(?:week|month|day)s?/i,
    /(?:in|within|by|target|deadline)[:\s]+(\d+)\s*(?:wk|mo|d)\b/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = context.match(pattern);
    if (match) {
      const number = parseInt(match[1] || '3');
      const unit = match[0].toLowerCase();
      const date = new Date();
      
      if (unit.includes('week') || unit.includes('wk')) {
        date.setDate(date.getDate() + (number * 7));
      } else if (unit.includes('month') || unit.includes('mo')) {
        date.setMonth(date.getMonth() + number);
      } else if (unit.includes('day') || unit.includes('d')) {
        date.setDate(date.getDate() + number);
      }
      
      return date.toISOString().split('T')[0];
    }
  }
  
  // Default to 3 months from now
  const defaultDate = new Date();
  defaultDate.setMonth(defaultDate.getMonth() + 3);
  return defaultDate.toISOString().split('T')[0];
}

/**
 * Normalize and validate extracted goal
 */
export function normalizeGoal(goal: ExtractedGoal): ExtractedGoal {
  // Ensure target_value is positive
  const normalizedTargetValue = Math.max(0.01, goal.target_value);
  
  // Ensure confidence is between 0 and 1
  const normalizedConfidence = Math.max(0, Math.min(1, goal.confidence || 0.5));
  
  // Trim strings
  const normalizedGoalName = goal.goal_name.trim().substring(0, 200);
  const normalizedDescription = goal.description.trim().substring(0, 1000);
  
  // Validate target_date format
  let normalizedTargetDate = goal.target_date;
  try {
    const date = new Date(goal.target_date);
    if (isNaN(date.getTime())) {
      // Invalid date, default to 3 months from now
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 3);
      normalizedTargetDate = defaultDate.toISOString().split('T')[0];
    } else {
      normalizedTargetDate = date.toISOString().split('T')[0];
    }
  } catch {
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    normalizedTargetDate = defaultDate.toISOString().split('T')[0];
  }
  
  return {
    ...goal,
    goal_name: normalizedGoalName,
    description: normalizedDescription,
    target_value: normalizedTargetValue,
    confidence: normalizedConfidence,
    target_date: normalizedTargetDate,
    target_unit: goal.target_unit.trim(),
    notes: goal.notes?.trim(),
  };
}

