/**
 * Smart Search Matching Engine
 * Processes user input and matches to conditions and practitioners
 */

import { conditionsDatabase, ConditionProfile } from './training-data';
import { supabase } from '@/integrations/supabase/client';

export interface DetailedSymptomInfo {
  location: string[];
  characteristics: string[];
  timing: string[];
  severity: number;
  duration: string;
  triggers: string[];
  reliefFactors: string[];
  impactOnDailyLife: string[];
}

export interface ConversationContext {
  symptoms: string[];
  detailedSymptoms: DetailedSymptomInfo;
  location: string | null;
  urgency: 'low' | 'medium' | 'high' | null;
  preferences: {
    practitionerType?: string[];
    sessionType?: string;
    priceRange?: [number, number];
  };
  detectedConditions: string[];
  conversationHistory: string[];
  // New fields for redesigned flow
  painType: 'acute' | 'chronic' | 'relaxation' | null;
  injuryType: 'recent_injury' | 'gradual_onset' | null;
  seenHealthcareProfessional: boolean | null;
  severity: 'low' | 'medium' | 'high' | null; // Inferred, not asked
  stage: 'greeting' | 'pain_type_selection' | 'acute_injury_flow' | 'chronic_injury_flow' | 'relaxation_flow' | 'healthcare_professional_check' | 'ready_for_recommendations' | 'booking_assistance';
}

export interface RecommendationResult {
  practitioner: any;
  matchScore: number;
  reasons: string[];
  suggestedService: string;
  conditionMatch?: ConditionProfile; // Made optional since it may not always be available
}

export interface SmartResponse {
  message: string;
  suggestions: string[];
  recommendations: RecommendationResult[] | null;
  updatedContext: ConversationContext;
  nextStage?: string;
}

function generateEmpatheticResponse(context: ConversationContext, stage: string): string {
  const messageCount = context.conversationHistory.length;
  const hasUrgency = context.symptoms.includes('urgent');
  const isChronic = context.symptoms.includes('chronic');

  // Vary responses based on context
  const empathyPhrases = [
    "I understand that must be difficult.",
    "That sounds really frustrating.",
    "I can see this is affecting your daily life.",
    "Thanks for sharing that with me.",
  ];

  const encouragement = [
    "Let's find you the right help.",
    "We'll get you sorted out.",
    "I'm here to help you find the perfect practitioner.",
  ];

  if (hasUrgency) {
    return "I can see this is urgent for you. " + encouragement[Math.floor(Math.random() * encouragement.length)];
  }

  if (isChronic && messageCount > 3) {
    return "Living with ongoing pain is tough. " + encouragement[Math.floor(Math.random() * encouragement.length)];
  }

  if (messageCount > 5) {
    return "Thanks for being patient with my questions. " + encouragement[Math.floor(Math.random() * encouragement.length)];
  }

  return empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)] + " " + encouragement[Math.floor(Math.random() * encouragement.length)];
}

/**
 * Detect urgent medical needs requiring immediate attention
 * Only for serious neural symptoms, not high pain scores
 */
export function detectUrgentMedicalNeeds(symptoms: string[], message: string): boolean {
  const neuralPatterns = [
    /losing sensation in (feet|legs|hands|arms)/i,
    /lost sensation/i,
    /numbness in (feet|legs|hands|arms).*and.*(can't|unable|loss)/i,
    /can't feel (feet|legs|hands|arms)/i,
    /tingling.*and.*(numbness|loss of sensation)/i,
    /losing feeling in (feet|legs|hands|arms)/i
  ];

  return neuralPatterns.some(pattern => pattern.test(message));
}

/**
 * Detect workload/activity context for gradual onset vs specific injury
 */
export function detectInjuryMechanism(message: string): {
  hasSpecificMechanism: boolean;
  isGradualOnset: boolean;
  workloadIncrease: boolean;
} {
  const lowerMessage = message.toLowerCase();

  // Specific injury mechanisms
  const specificMechanismPatterns = [
    /(fell|tripped|slipped|twisted|pulled|tore|strained|sprained|heard.*pop|felt.*snap|felt.*crack)/i,
    /(during|while|when).*(playing|training|exercise|workout|lifting|running)/i,
    /(sudden|acute|just happened|recent injury)/i
  ];

  // Gradual onset indicators
  const gradualOnsetPatterns = [
    /(gradual|slowly|over time|increased|workload.*increase|more.*work|sitting.*too long|desk work)/i,
    /(months|weeks).*(of|with).*(pain|discomfort)/i,
    /(no specific|no particular|don't know|not sure).*(injury|incident|mechanism)/i
  ];

  // Workload increase
  const workloadPatterns = [
    /(workload|work load|hours|work).*(increase|increased|more|heavier)/i,
    /(construction|manual|physical).*(work|job|labor)/i
  ];

  return {
    hasSpecificMechanism: specificMechanismPatterns.some(p => p.test(message)),
    isGradualOnset: gradualOnsetPatterns.some(p => p.test(lowerMessage)),
    workloadIncrease: workloadPatterns.some(p => p.test(lowerMessage))
  };
}

export function extractSymptoms(text: string, previousSymptoms: string[] = []): string[] {
  const symptoms: string[] = [];
  const lowerText = text.toLowerCase();

  // Core pain/discomfort indicators (only add if clear pain context)
  const hasPainContext = /pain|hurt|ache|sore|discomfort|problem|issue|injury/i.test(text);

  if (hasPainContext) {
    // Pain type
    if (/sharp|stabbing|shooting/i.test(lowerText)) symptoms.push('sharp_pain');
    if (/dull|aching|throbbing/i.test(lowerText)) symptoms.push('dull_pain');
    if (/burning|tingling|numb/i.test(lowerText)) symptoms.push('nerve_pain');
    if (/stiff|tight|locked|frozen/i.test(lowerText)) symptoms.push('stiffness');
  }

  // Body parts - only extract if mentioned with pain/problem (natural language only, not asked)
  const bodyPartPatterns = [
    { pattern: /\b(lower back|lumbar|spine)\b/i, symptom: 'lower_back_issue' },
    { pattern: /\b(upper back|thoracic)\b/i, symptom: 'upper_back_issue' },
    { pattern: /\b(neck|cervical)\b/i, symptom: 'neck_issue' },
    { pattern: /\b(shoulder|rotator cuff)\b/i, symptom: 'shoulder_issue' },
    { pattern: /\b(knee|patella)\b/i, symptom: 'knee_issue' },
    { pattern: /\b(hip|pelvis|groin)\b/i, symptom: 'hip_issue' },
    { pattern: /\b(ankle|foot|heel)\b/i, symptom: 'ankle_foot_issue' },
    { pattern: /\b(elbow|wrist|hand)\b/i, symptom: 'elbow_wrist_issue' },
  ];

  bodyPartPatterns.forEach(({ pattern, symptom }) => {
    if (pattern.test(text) && hasPainContext) {
      symptoms.push(symptom);
    }
  });

  // Activity context - only if clearly related to pain
  const activityPatterns = [
    { pattern: /\b(gym|lifting|weights|workout|training)\b.*\b(pain|hurt|injury|problem)/i, symptom: 'gym_related' },
    { pattern: /\b(running|jogging|marathon)\b.*\b(pain|hurt|injury|problem)/i, symptom: 'running_related' },
    { pattern: /\b(desk|computer|office|sitting)\b.*\b(pain|hurt|problem)/i, symptom: 'desk_work_related' },
    { pattern: /\b(sports?|athletic|playing)\b.*\b(injury|hurt|pain)/i, symptom: 'sports_injury' },
  ];

  activityPatterns.forEach(({ pattern, symptom }) => {
    if (pattern.test(text)) {
      symptoms.push(symptom);
    }
  });

  // Urgency indicators (but don't trigger for high pain scores alone)
  if (/urgent|emergency|severe|unbearable|can't (take|stand|cope)|desperate/i.test(lowerText)) {
    symptoms.push('urgent');
  }

  // Duration
  if (/chronic|months|years|long.?term|ongoing|persistent|more than.*months/i.test(lowerText)) {
    symptoms.push('chronic');
  }
  if (/acute|sudden|just (started|happened)|recent|new|recent injury/i.test(lowerText)) {
    symptoms.push('acute');
  }

  return [...new Set(symptoms)];
}

export function extractDetailedSymptomInfo(
  userMessage: string,
  currentDetails: DetailedSymptomInfo,
  stage: string
): DetailedSymptomInfo {
  const lowerMessage = userMessage.toLowerCase();
  const updatedDetails = { ...currentDetails };

  // Extract location information
  const bodyParts = [
    'lower back', 'upper back', 'neck', 'shoulders', 'knees', 'hips',
    'ankles', 'wrists', 'elbows', 'feet', 'hands', 'head', 'chest'
  ];

  bodyParts.forEach(part => {
    if (lowerMessage.includes(part) && !updatedDetails.location.includes(part)) {
      updatedDetails.location.push(part);
    }
  });

  // Extract pain characteristics
  const characteristics = [
    'sharp', 'dull', 'aching', 'throbbing', 'burning', 'stiff', 'tight',
    'numb', 'tingling', 'stabbing', 'cramping', 'sore'
  ];

  characteristics.forEach(char => {
    if (lowerMessage.includes(char) && !updatedDetails.characteristics.includes(char)) {
      updatedDetails.characteristics.push(char);
    }
  });

  // Extract timing information
  const timingKeywords = [
    'morning', 'evening', 'night', 'after sitting', 'during activity',
    'after exercise', 'all the time', 'when i wake up', 'bedtime'
  ];

  timingKeywords.forEach(timing => {
    if (lowerMessage.includes(timing) && !updatedDetails.timing.includes(timing)) {
      updatedDetails.timing.push(timing);
    }
  });

  // Extract severity (look for numbers 1-10)
  const severityMatch = lowerMessage.match(/([1-9]|10)/);
  if (severityMatch && updatedDetails.severity === 0) {
    updatedDetails.severity = parseInt(severityMatch[1]);
  }

  // Extract duration
  const durationKeywords = [
    'just started', 'days', 'weeks', 'months', 'years', 'recently',
    'a while', 'long time', 'over a year'
  ];

  durationKeywords.forEach(duration => {
    if (lowerMessage.includes(duration) && updatedDetails.duration === '') {
      updatedDetails.duration = duration;
    }
  });

  // Extract triggers
  const triggerKeywords = [
    'sitting', 'standing', 'bending', 'lifting', 'walking', 'running',
    'exercise', 'work', 'stress', 'cold weather'
  ];

  triggerKeywords.forEach(trigger => {
    if (lowerMessage.includes(trigger) && !updatedDetails.triggers.includes(trigger)) {
      updatedDetails.triggers.push(trigger);
    }
  });

  // Extract relief factors
  const reliefKeywords = [
    'rest', 'heat', 'ice', 'massage', 'stretching', 'medication',
    'lying down', 'hot bath', 'exercise'
  ];

  reliefKeywords.forEach(relief => {
    if (lowerMessage.includes(relief) && !updatedDetails.reliefFactors.includes(relief)) {
      updatedDetails.reliefFactors.push(relief);
    }
  });

  // Extract impact on daily life
  const impactKeywords = [
    'work', 'sleep', 'exercise', 'daily activities', 'can\'t', 'unable to',
    'difficult to', 'affects my', 'limits my'
  ];

  impactKeywords.forEach(impact => {
    if (lowerMessage.includes(impact) && !updatedDetails.impactOnDailyLife.includes(impact)) {
      updatedDetails.impactOnDailyLife.push(impact);
    }
  });

  return updatedDetails;
}

export function matchConditions(symptoms: string[]): Array<{
  condition: ConditionProfile;
  confidence: 'high' | 'medium' | 'low';
  score: number;
}> {
  if (symptoms.length === 0) return [];

  return conditionsDatabase
    .map(condition => {
      const score = calculateConditionMatchScore(condition, symptoms);
      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (score >= 0.6) confidence = 'high';
      else if (score >= 0.3) confidence = 'medium';
      else confidence = 'low';

      return { condition, confidence, score };
    })
    .filter(match => match.score > 0.15) // Lower threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function calculateConditionMatchScore(condition: ConditionProfile, symptoms: string[]): number {
  let score = 0;
  let totalMatches = 0;

  // Require multiple strong matches before suggesting a condition
  const requiredMatches = Math.max(2, Math.floor(condition.keywords.length * 0.3));

  symptoms.forEach(symptom => {
    // Exact symptom match (highest weight)
    if (condition.symptoms.some(s => s.toLowerCase().includes(symptom.toLowerCase()))) {
      score += 4;
      totalMatches++;
    }

    // Strong keyword match (high weight) - require exact or very close match
    const strongKeywordMatch = condition.keywords.some(k => {
      const keyword = k.toLowerCase();
      const symptomLower = symptom.toLowerCase();
      // Exact match or keyword contains the symptom
      return keyword === symptomLower || keyword.includes(symptomLower);
    });

    if (strongKeywordMatch) {
      score += 3;
      totalMatches++;
    }

    // Body part match (medium weight)
    if (condition.bodyParts.some(bp => bp.toLowerCase().includes(symptom.toLowerCase()))) {
      score += 2;
      totalMatches++;
    }
  });

  // Only return a score if we have enough matches to be confident
  if (totalMatches < requiredMatches) {
    return 0;
  }

  // Normalize score but require higher threshold
  const normalizedScore = score / (condition.symptoms.length * 4 + condition.keywords.length * 3 + condition.bodyParts.length * 2);

  // Require at least 0.3 score (30% match) to suggest a condition
  return normalizedScore >= 0.3 ? normalizedScore : 0;
}

export function determineConversationStage(context: ConversationContext): string {
  const messageCount = context.conversationHistory.length;
  const lastMessage = context.conversationHistory[context.conversationHistory.length - 1] || '';
  const lowerLastMessage = lastMessage.toLowerCase();

  // Stage 0: Initial greeting
  if (messageCount === 0) return 'greeting';

  // If healthcare professional question was answered, move to recommendations
  if (context.stage === 'healthcare_professional_check' && context.seenHealthcareProfessional !== null) {
    return 'ready_for_recommendations';
  }

  // Stage 1: Pain type selection (after greeting)
  if (context.stage === 'greeting' && messageCount === 1) {
    // Detect which option user selected
    if (/in pain|pain|hurting|ache/i.test(lowerLastMessage)) {
      return 'pain_type_selection';
    }
    if (/injured|injury|hurt myself|sustained/i.test(lowerLastMessage)) {
      return 'pain_type_selection'; // Also goes to pain flow
    }
    if (/relaxation|stress relief|relax|massage|tension|unwind/i.test(lowerLastMessage)) {
      return 'relaxation_flow';
    }
    return 'pain_type_selection'; // Default to pain flow
  }

  // Stage 2: Acute vs Chronic (if in pain flow)
  if (context.stage === 'pain_type_selection' || context.stage === 'acute_injury_flow' || context.stage === 'chronic_injury_flow') {
    // Check if user selected acute or chronic
    if (/recent injury|sustained.*recent|acute|sudden|just happened|new injury/i.test(lowerLastMessage)) {
      return 'acute_injury_flow';
    }
    if (/chronic|months|more than.*months|2 months|long term|ongoing|persistent/i.test(lowerLastMessage)) {
      return 'chronic_injury_flow';
    }

    // If already in acute flow, check for healthcare professional question
    if (context.stage === 'acute_injury_flow') {
      // If question hasn't been answered yet, stay in acute flow to ask it
      if (context.seenHealthcareProfessional === null) {
        return 'acute_injury_flow'; // Stay here to ask the question
      }
      // If answered, move to recommendations
      return 'ready_for_recommendations';
    }

    // If healthcare professional question was answered, move to recommendations
    if (context.seenHealthcareProfessional !== null && context.painType === 'acute') {
      return 'ready_for_recommendations';
    }

    // If in chronic flow, move to recommendations quickly
    if (context.stage === 'chronic_injury_flow' && messageCount >= 2) {
      return 'ready_for_recommendations';
    }
  }

  // Stage 3: Relaxation flow (fast-track to recommendations)
  if (context.stage === 'relaxation_flow' && messageCount >= 1) {
    return 'ready_for_recommendations';
  }

  // Fast-track: After 2-3 messages max, always move to recommendations
  if (messageCount >= 3) {
    return 'ready_for_recommendations';
  }

  // Default: stay in current stage or move forward
  return context.stage || 'greeting';
}

export function detectUserIntent(message: string): {
  wantsRecommendations: boolean;
  wantsToSkip: boolean;
  isConfused: boolean;
  isFrustrated: boolean;
} {
  const lower = message.toLowerCase();

  return {
    wantsRecommendations: /show me|recommend|find me|just show|skip to/i.test(lower),
    wantsToSkip: /skip|move on|next|just show me|don't need/i.test(lower),
    isConfused: /confused|don't understand|what do you mean|huh|unclear/i.test(lower),
    isFrustrated: /frustrated|annoying|waste of time|just show|forget it/i.test(lower)
  };
}

export async function processUserInput(
  userMessage: string,
  context: ConversationContext
): Promise<SmartResponse> {
  // Check user intent first
  const intent = detectUserIntent(userMessage);

  // If user wants recommendations NOW, skip to recommendations
  if (intent.wantsRecommendations || intent.isFrustrated || intent.wantsToSkip) {
    const updatedContext = {
      ...context,
      conversationHistory: [...context.conversationHistory, userMessage],
      stage: 'ready_for_recommendations' as any
    };
    return await generateRecommendationsResponse(updatedContext);
  }

  // Check for urgent medical needs FIRST (before processing)
  const extractedSymptoms = extractSymptoms(userMessage);
  const updatedSymptoms = [...new Set([...context.symptoms, ...extractedSymptoms])];

  if (detectUrgentMedicalNeeds(updatedSymptoms, userMessage)) {
    return {
      message: "Based on your symptoms, we advise that you seek urgent medical attention. Loss of sensation can indicate serious neurological issues that require immediate evaluation by a healthcare professional.",
      suggestions: ["I understand, show me practitioners anyway", "I'll seek medical attention"],
      recommendations: null,
      updatedContext: {
        ...context,
        conversationHistory: [...context.conversationHistory, userMessage],
        symptoms: updatedSymptoms,
        urgency: 'high'
      }
    };
  }

  // Update conversation history
  const updatedHistory = [...context.conversationHistory, userMessage];

  // Extract detailed symptom information (from natural language only)
  let updatedDetailedSymptoms = context.detailedSymptoms || {
    location: [],
    characteristics: [],
    timing: [],
    severity: 0,
    duration: '',
    triggers: [],
    reliefFactors: [],
    impactOnDailyLife: []
  };

  // Update detailed symptoms based on user input (natural language extraction)
  updatedDetailedSymptoms = extractDetailedSymptomInfo(userMessage, updatedDetailedSymptoms, context.stage);

  // Detect pain type and injury mechanism
  let painType = context.painType;
  let injuryType = context.injuryType;
  let seenHealthcareProfessional = context.seenHealthcareProfessional;

  const lowerMessage = userMessage.toLowerCase();

  // Detect pain type selection
  if (/in pain|pain|hurting|ache/i.test(lowerMessage) && !context.painType) {
    painType = 'acute'; // Default, will be refined
  }
  if (/injured|injury|hurt myself|sustained/i.test(lowerMessage) && !context.painType) {
    painType = 'acute';
  }
  if (/relaxation|stress relief|relax|massage|tension|unwind/i.test(lowerMessage)) {
    painType = 'relaxation';
  }

  // Detect acute vs chronic
  if (/recent injury|sustained.*recent|acute|sudden|just happened|new injury/i.test(lowerMessage)) {
    painType = 'acute';
    injuryType = 'recent_injury';
  }
  if (/chronic|months|more than.*months|2 months|long term|ongoing|persistent/i.test(lowerMessage)) {
    painType = 'chronic';
    injuryType = 'gradual_onset';
  }

  // Detect healthcare professional question answer
  if (/yes|yeah|yep|have been|seen|visited|consulted|osteopath|sports therapist|physiotherapist/i.test(lowerMessage)) {
    seenHealthcareProfessional = true;
  }
  if (/no|nope|haven't|not yet|not been/i.test(lowerMessage)) {
    seenHealthcareProfessional = false;
  }

  // Infer severity from symptoms (don't ask)
  let severity: 'low' | 'medium' | 'high' | null = context.severity;
  if (updatedSymptoms.includes('urgent') || updatedSymptoms.includes('nerve_pain')) {
    severity = 'high';
  } else if (updatedSymptoms.length > 3 || updatedSymptoms.includes('sharp_pain')) {
    severity = 'medium';
  } else if (updatedSymptoms.length > 0) {
    severity = 'low';
  }

  // Update context with detected values BEFORE determining stage
  const contextWithUpdates = {
    ...context,
    symptoms: updatedSymptoms,
    detailedSymptoms: updatedDetailedSymptoms,
    conversationHistory: updatedHistory,
    painType: painType || context.painType,
    injuryType: injuryType || context.injuryType,
    seenHealthcareProfessional: seenHealthcareProfessional !== null ? seenHealthcareProfessional : context.seenHealthcareProfessional,
    severity: severity || context.severity
  };

  // Determine conversation stage based on updated context
  const currentStage = determineConversationStage(contextWithUpdates);

  let updatedContext: ConversationContext = {
    ...contextWithUpdates,
    stage: currentStage as any
  };

  // Generate appropriate response based on stage
  switch (currentStage) {
    case 'greeting':
      return generateGreetingResponse(updatedContext);

    case 'pain_type_selection':
      return generatePainTypeResponse(updatedContext);

    case 'acute_injury_flow':
      return await generateAcuteInjuryResponse(updatedContext);

    case 'chronic_injury_flow':
      return await generateChronicInjuryResponse(updatedContext);

    case 'relaxation_flow':
      return await generateRelaxationResponse(updatedContext);

    case 'healthcare_professional_check':
      return await generateHealthcareProfessionalResponse(updatedContext);

    case 'ready_for_recommendations':
      return await generateRecommendationsResponse(updatedContext);

    default:
      return generateGreetingResponse(updatedContext);
  }
}

function generateGreetingResponse(context: ConversationContext): SmartResponse {
  return {
    message: "I want to understand your pain. Let's find the best service and the best practitioner for you. What can I help you with?",
    suggestions: [
      "I'm in pain",
      "I want relaxation/stress relief"
    ],
    recommendations: null,
    updatedContext: context,
    nextStage: 'pain_type_selection'
  };
}

/**
 * Generate response for pain type selection (Q2)
 */
function generatePainTypeResponse(context: ConversationContext): SmartResponse {
  return {
    message: "Select which applies to you?",
    suggestions: [
      "I've sustained a recent injury causing pain",
      "I've been in pain for a period of more than 2 months"
    ],
    recommendations: null,
    updatedContext: {
      ...context,
      stage: 'pain_type_selection'
    },
    nextStage: 'acute_injury_flow' // Will be refined based on user selection
  };
}

/**
 * Generate response for acute injury flow
 */
async function generateAcuteInjuryResponse(context: ConversationContext): Promise<SmartResponse> {
  // Check if we've already asked about healthcare professional
  if (context.seenHealthcareProfessional === null) {
    return {
      message: "You've sustained a recent injury causing pain (acute injury - short-term). Have you been seen by a healthcare professional for this? (Osteopath, Sports Therapist, Physiotherapist)",
      suggestions: [
        "Yes, I have been seen",
        "No, I haven't been seen yet"
      ],
      recommendations: null,
      updatedContext: {
        ...context,
        stage: 'healthcare_professional_check',
        painType: 'acute',
        injuryType: 'recent_injury'
      },
      nextStage: 'healthcare_professional_check'
    };
  }

  // Already answered, generate recommendations immediately
  const updatedContext: ConversationContext = {
    ...context,
    stage: 'ready_for_recommendations' as const
  };
  return await generateRecommendationsResponse(updatedContext);
}

/**
 * Generate response for chronic injury flow
 */
async function generateChronicInjuryResponse(context: ConversationContext): Promise<SmartResponse> {
  const updatedContext: ConversationContext = {
    ...context,
    painType: 'chronic' as const,
    injuryType: 'gradual_onset' as const,
    stage: 'ready_for_recommendations' as const
  };
  // Immediately generate recommendations for chronic flow
  return await generateRecommendationsResponse(updatedContext);
}

/**
 * Generate response for relaxation/stress relief flow
 */
async function generateRelaxationResponse(context: ConversationContext): Promise<SmartResponse> {
  const updatedContext: ConversationContext = {
    ...context,
    painType: 'relaxation' as const,
    stage: 'ready_for_recommendations' as const
  };
  // Immediately generate recommendations for relaxation flow
  return await generateRecommendationsResponse(updatedContext);
}

/**
 * Generate response after healthcare professional check
 */
async function generateHealthcareProfessionalResponse(context: ConversationContext): Promise<SmartResponse> {
  // After answering healthcare professional question, generate recommendations
  const updatedContext: ConversationContext = {
    ...context,
    stage: 'ready_for_recommendations' as const
  };
  return await generateRecommendationsResponse(updatedContext);
}

// Removed: generateDetailedSymptomQuestions - no longer asking in-depth questions
// Removed: generateClarifyingResponse - no longer asking about goals/preferences

async function generateRecommendationsResponse(context: ConversationContext): Promise<SmartResponse> {
  // Get matches for condition matching in recommendations (used later)
  const matches = matchConditions(context.symptoms);

  // Determine practitioner type based on pain type and context
  let recommendedRoles: ('sports_therapist' | 'osteopath' | 'massage_therapist')[] = [];
  let recommendationMessage = '';

  // Relaxation flow - always massage therapist
  if (context.painType === 'relaxation') {
    recommendedRoles = ['massage_therapist'];
    recommendationMessage = "For relaxation and stress relief, I recommend seeing a Massage Therapist. They're qualified to provide soft tissue treatment services. Recommended to relieve symptoms for pain/injury with lower severity.";
  }
  // Acute injury flow - always recommend ST/Osteo
  else if (context.painType === 'acute' && context.injuryType === 'recent_injury') {
    recommendedRoles = ['sports_therapist', 'osteopath'];
    recommendationMessage = "Based on your recent injury, I recommend seeing a Sports Therapist or Osteopath. They're qualified to assess and diagnose injuries, provide rehabilitation, and offer symptom-relieving treatment. Recommended if injury diagnosis is unknown and requires longer-term recovery support.";
  }
  // Chronic injury flow - always recommend ST/Osteo
  else if (context.painType === 'chronic' && context.injuryType === 'gradual_onset') {
    recommendedRoles = ['sports_therapist', 'osteopath'];
    recommendationMessage = "Based on your chronic pain, I recommend seeing a Sports Therapist or Osteopath. They're qualified to assess and diagnose injuries, provide rehabilitation, and offer symptom-relieving treatment. Recommended if injury diagnosis is unknown and requires longer-term recovery support.";
  }
  // Fallback - try to match conditions
  else {
    const topMatch = matches[0];

    if (topMatch && topMatch.confidence !== 'low') {
      recommendedRoles = topMatch.condition.recommendedPractitioners;
      recommendationMessage = `Based on your symptoms, I recommend seeing ${topMatch.condition.recommendedPractitioners.map(role =>
        role === 'osteopath' ? 'an Osteopath' :
          role === 'sports_therapist' ? 'a Sports Therapist' :
            'a Massage Therapist'
      ).join(' or ')}. ${getPractitionerDescription(recommendedRoles[0])}`;
    } else {
      // No confident match - show all types
      recommendedRoles = ['sports_therapist', 'osteopath', 'massage_therapist'];
      recommendationMessage = "Based on what you've told me, here are some highly-rated practitioners who can help. They'll assess your specific needs during the first session.";
    }
  }

  // Query practitioners
  const { data: practitioners, error } = await supabase
    .from('users')
    .select('*')
    .in('user_role', recommendedRoles as any)
    .eq('is_active', true as any)
    .eq('profile_completed', true as any)
    .eq('onboarding_status', 'completed' as any)
    .limit(10);

  if (error) {
    console.error('Error fetching practitioners:', error);
    return {
      message: "I'm having trouble finding practitioners right now. Please try again or use the traditional search.",
      suggestions: ["Try again", "Use traditional search"],
      recommendations: null,
      updatedContext: context
    };
  }

  if (!practitioners || practitioners.length === 0) {
    return {
      message: "I don't see any practitioners available for your specific needs right now. Would you like to try a broader search?",
      suggestions: ["Show me all practitioners", "Try different symptoms", "Contact support"],
      recommendations: null,
      updatedContext: context
    };
  }

  // Score and rank practitioners
  const rankedPractitioners = practitioners
    .map(practitioner => ({
      practitioner,
      matchScore: scorePractitionerSimple(practitioner, context),
      reasons: generateSimpleMatchReasons(practitioner, context),
      suggestedService: 'initial_consultation',
      conditionMatch: matches?.[0]?.condition
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  return {
    message: recommendationMessage,
    suggestions: [
      "Tell me more",
      "I'd like to book"
    ],
    recommendations: rankedPractitioners,
    updatedContext: {
      ...context,
      stage: 'booking_assistance'
    }
  };
}

/**
 * Get practitioner type description
 */
function getPractitionerDescription(role: string): string {
  if (role === 'sports_therapist') {
    return "Sports Therapists are qualified to assess and diagnose injuries, provide rehabilitation, and offer symptom-relieving treatment. Recommended if injury diagnosis is unknown and requires longer-term recovery support.";
  }
  if (role === 'osteopath') {
    return "Osteopaths are qualified to assess and diagnose injuries, provide rehabilitation, and offer symptom-relieving treatment. Recommended if injury diagnosis is unknown and requires longer-term recovery support.";
  }
  if (role === 'massage_therapist') {
    return "Massage Therapists are qualified to provide soft tissue treatment services. Recommended to relieve symptoms for pain/injury with lower severity.";
  }
  return "";
}

/**
 * Simplified practitioner scoring
 */
function scorePractitionerSimple(practitioner: any, context: ConversationContext): number {
  let score = 50; // Base score

  // Experience years (max 20 points)
  score += Math.min((practitioner.experience_years || 0) * 2, 20);

  // Rating (max 25 points)
  if (practitioner.average_rating) {
    score += practitioner.average_rating * 5;
  }

  // Session count (max 10 points)
  if (practitioner.total_sessions > 50) {
    score += 10;
  }

  // Location preference (max 10 points)
  if (context.location && practitioner.location === context.location) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Simplified match reasons
 */
function generateSimpleMatchReasons(practitioner: any, context: ConversationContext): string[] {
  const reasons: string[] = [];

  if (practitioner.experience_years >= 5) {
    reasons.push(`${practitioner.experience_years}+ years experience`);
  }

  if (practitioner.average_rating >= 4.5) {
    reasons.push(`Highly rated (${practitioner.average_rating.toFixed(1)})`);
  }

  if (practitioner.total_sessions > 50) {
    reasons.push('Experienced with many clients');
  }

  return reasons.slice(0, 3);
}

function scorePractitioner(
  practitioner: any,
  condition: ConditionProfile,
  context: ConversationContext
): number {
  let score = 50; // Base score

  // Experience years (max 20 points)
  score += Math.min(practitioner.experience_years * 2, 20);

  // Rating (max 25 points)
  if (practitioner.average_rating) {
    score += practitioner.average_rating * 5;
  }

  // Specializations match (max 15 points)
  const matchingSpecs = practitioner.specializations?.filter(spec =>
    condition.treatmentApproaches.some(approach =>
      spec.toLowerCase().includes(approach.toLowerCase())
    )
  );
  score += (matchingSpecs?.length || 0) * 5;

  // Location preference (max 10 points)
  if (context.location && practitioner.location === context.location) {
    score += 10;
  }

  // Price preference (max 10 points)
  if (context.preferences.priceRange) {
    const [min, max] = context.preferences.priceRange;
    if (practitioner.hourly_rate >= min && practitioner.hourly_rate <= max) {
      score += 10;
    }
  }

  // Session count (max 10 points)
  if (practitioner.total_sessions > 50) {
    score += 10;
  }

  return Math.min(score, 100);
}

function generateMatchReasons(
  practitioner: any,
  condition: ConditionProfile,
  context: ConversationContext
): string[] {
  const reasons: string[] = [];

  if (practitioner.experience_years >= 5) {
    reasons.push(`${practitioner.experience_years}+ years experience`);
  }

  if (practitioner.average_rating >= 4.5) {
    reasons.push(`Highly rated (${practitioner.average_rating.toFixed(1)})`);
  }

  const matchingSpecs = practitioner.specializations?.filter(spec =>
    condition.treatmentApproaches.some(approach =>
      spec.toLowerCase().includes(approach.toLowerCase())
    )
  );

  if (matchingSpecs && matchingSpecs.length > 0) {
    reasons.push(`Specializes in ${matchingSpecs[0]}`);
  }

  if (practitioner.total_sessions > 50) {
    reasons.push('Experienced with many clients');
  }

  if (practitioner.bio && condition.treatmentApproaches.some(approach =>
    practitioner.bio.toLowerCase().includes(approach.toLowerCase())
  )) {
    reasons.push('Experienced with this condition');
  }

  // Add context-specific reasons based on user's symptoms
  if (context.detailedSymptoms.location.length > 0) {
    const locationMatch = context.detailedSymptoms.location.some(loc =>
      practitioner.bio?.toLowerCase().includes(loc.toLowerCase())
    );
    if (locationMatch) {
      reasons.push(`Experienced with ${context.detailedSymptoms.location[0]} issues`);
    }
  }

  return reasons.slice(0, 3);
}

function generateRecommendationExplanation(
  condition: ConditionProfile,
  symptoms: DetailedSymptomInfo,
  practitioner: any
): string {
  const explanations: string[] = [];

  // Base explanation about the condition
  if (symptoms.location.length > 0) {
    explanations.push(`Specializes in ${symptoms.location[0]} conditions`);
  }

  // Treatment approach explanation
  if (condition.treatmentApproaches.length > 0) {
    explanations.push(`Uses ${condition.treatmentApproaches[0]} techniques`);
  }

  // Experience explanation
  if (practitioner.experience_years >= 5) {
    explanations.push(`${practitioner.experience_years}+ years treating similar cases`);
  }

  // Symptom-specific explanation
  if (symptoms.characteristics.length > 0) {
    explanations.push(`Effective for ${symptoms.characteristics[0]} pain`);
  }

  return explanations.join(' • ');
}

function createSymptomSummary(symptoms: DetailedSymptomInfo): string {
  const summary: string[] = [];

  if (symptoms.location.length > 0) {
    summary.push(`- ${symptoms.location.join(', ')} pain`);
  }

  if (symptoms.characteristics.length > 0) {
    summary.push(`- ${symptoms.characteristics.join(', ')} sensation`);
  }

  if (symptoms.severity > 0) {
    summary.push(`- Severity: ${symptoms.severity}/10`);
  }

  if (symptoms.duration) {
    summary.push(`- Duration: ${symptoms.duration}`);
  }

  if (symptoms.timing.length > 0) {
    summary.push(`- Worst: ${symptoms.timing.join(', ')}`);
  }

  if (symptoms.impactOnDailyLife.length > 0) {
    summary.push(`- Affects: ${symptoms.impactOnDailyLife.join(', ')}`);
  }

  return summary.join('\n');
}

function createTreatmentExplanation(condition: ConditionProfile, symptoms: DetailedSymptomInfo): string {
  const explanations: string[] = [];

  // Condition-specific explanation
  explanations.push(`- Your symptoms indicate ${condition.name.toLowerCase()}`);

  // Treatment approach explanation
  if (condition.treatmentApproaches.length > 0) {
    explanations.push(`- ${condition.treatmentApproaches[0]} is most effective for this type of condition`);
  }

  // Urgency-based explanation
  if (condition.urgencyLevel === 'high') {
    explanations.push(`- Early intervention is important for optimal recovery`);
  } else if (condition.urgencyLevel === 'medium') {
    explanations.push(`- Treatment can help prevent the condition from worsening`);
  }

  // Expected outcomes
  if (condition.expectedOutcomes.length > 0) {
    explanations.push(`- Expected outcomes: ${condition.expectedOutcomes.join(', ')}`);
  }

  return explanations.join('\n');
}
