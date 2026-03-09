/**
 * Default durations and configurations for each service type
 * These represent industry-standard durations for each service
 */

export interface ServiceDefault {
  value: string;
  label: string;
  defaultDurationMinutes: number;
  typicalDurationRange: { min: number; max: number };
  description?: string;
}

export const SERVICE_DEFAULTS: Record<string, ServiceDefault> = {
  // Sports Therapist Services
  'sports_injury_assessment': {
    value: 'sports_injury_assessment',
    label: 'Sports Injury Assessment',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Comprehensive assessment of sports-related injuries'
  },
  'exercise_rehabilitation': {
    value: 'exercise_rehabilitation',
    label: 'Exercise Rehabilitation',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Structured rehabilitation program with exercise prescription'
  },
  'strength_conditioning': {
    value: 'strength_conditioning',
    label: 'Strength & Conditioning',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 75 },
    description: 'Training programs for strength and athletic performance'
  },
  'injury_prevention': {
    value: 'injury_prevention',
    label: 'Injury Prevention Programs',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 75 },
    description: 'Preventive exercise and education programs'
  },
  'performance_enhancement': {
    value: 'performance_enhancement',
    label: 'Sports Performance Enhancement',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Performance optimization and athletic development'
  },
  'return_to_play': {
    value: 'return_to_play',
    label: 'Return to Play Protocols',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Graduated return to sport protocols'
  },
  
  // Massage Therapist Services
  'deep_tissue': {
    value: 'deep_tissue',
    label: 'Deep Tissue Massage',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Intense pressure massage targeting deep muscle layers'
  },
  'sports_massage': {
    value: 'sports_massage',
    label: 'Sports Massage',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Therapeutic massage for athletes and active individuals. Includes consultation to understand your needs.'
  },
  'swedish_massage': {
    value: 'swedish_massage',
    label: 'Swedish Massage',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 30, max: 90 },
    description: 'Classic relaxation massage with long strokes'
  },
  'trigger_point': {
    value: 'trigger_point',
    label: 'Trigger Point Therapy',
    defaultDurationMinutes: 45,
    typicalDurationRange: { min: 30, max: 60 },
    description: 'Focused treatment of trigger points and muscle knots'
  },
  'myofascial_release': {
    value: 'myofascial_release',
    label: 'Myofascial Release',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Gentle stretching of fascial tissue'
  },
  'relaxation_massage': {
    value: 'relaxation_massage',
    label: 'Relaxation Massage',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 30, max: 90 },
    description: 'Gentle, soothing massage for stress relief'
  },
  
  // Osteopath Services
  'structural_osteopathy': {
    value: 'structural_osteopathy',
    label: 'Structural Osteopathy',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 75 },
    description: 'Manual therapy focusing on structural alignment'
  },
  'cranial_osteopathy': {
    value: 'cranial_osteopathy',
    label: 'Cranial Osteopathy',
    defaultDurationMinutes: 45,
    typicalDurationRange: { min: 30, max: 60 },
    description: 'Gentle treatment of the head, spine, and sacrum'
  },
  'visceral_osteopathy': {
    value: 'visceral_osteopathy',
    label: 'Visceral Osteopathy',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 75 },
    description: 'Treatment of internal organ function and mobility'
  },
  'paediatric_osteopathy': {
    value: 'paediatric_osteopathy',
    label: 'Paediatric Osteopathy',
    defaultDurationMinutes: 45,
    typicalDurationRange: { min: 30, max: 60 },
    description: 'Specialized osteopathic treatment for children'
  },
  'sports_osteopathy': {
    value: 'sports_osteopathy',
    label: 'Sports Osteopathy',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Osteopathic treatment for athletes and sports injuries'
  },
  'postural_assessment': {
    value: 'postural_assessment',
    label: 'Postural Assessment',
    defaultDurationMinutes: 45,
    typicalDurationRange: { min: 30, max: 60 },
    description: 'Comprehensive postural analysis and correction'
  },
  // Common services available to all therapist types
  'massage': {
    value: 'massage',
    label: 'Massage',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 30, max: 90 },
    description: 'Therapeutic massage treatment'
  },
  'acupuncture': {
    value: 'acupuncture',
    label: 'Acupuncture',
    defaultDurationMinutes: 60,
    typicalDurationRange: { min: 45, max: 90 },
    description: 'Acupuncture treatment using fine needles'
  },
  'cupping': {
    value: 'cupping',
    label: 'Cupping',
    defaultDurationMinutes: 30,
    typicalDurationRange: { min: 20, max: 45 },
    description: 'Cupping therapy treatment'
  },
  'mobilisation': {
    value: 'mobilisation',
    label: 'Mobilisation',
    defaultDurationMinutes: 45,
    typicalDurationRange: { min: 30, max: 60 },
    description: 'Joint and soft tissue mobilisation'
  },
  'manipulation': {
    value: 'manipulation',
    label: 'Manipulation',
    defaultDurationMinutes: 30,
    typicalDurationRange: { min: 15, max: 45 },
    description: 'Manual manipulation techniques'
  },
  'stretching': {
    value: 'stretching',
    label: 'Stretching',
    defaultDurationMinutes: 30,
    typicalDurationRange: { min: 15, max: 60 },
    description: 'Therapeutic stretching and flexibility work'
  }
};

/**
 * Get default duration for a service type
 */
export function getServiceDefaultDuration(serviceValue: string | null | undefined): number {
  if (!serviceValue || typeof serviceValue !== 'string') {
    return 60;
  }
  return SERVICE_DEFAULTS[serviceValue]?.defaultDurationMinutes || 60;
}

/**
 * Get typical duration range for a service type
 */
export function getServiceDurationRange(serviceValue: string | null | undefined): { min: number; max: number } {
  if (!serviceValue || typeof serviceValue !== 'string') {
    return { min: 30, max: 90 }; // Default range
  }
  return SERVICE_DEFAULTS[serviceValue]?.typicalDurationRange || { min: 30, max: 90 };
}

/**
 * Get service label from value
 */
export function getServiceLabel(serviceValue: string | null | undefined): string {
  // Handle null, undefined, or non-string values
  if (!serviceValue || typeof serviceValue !== 'string') {
    return '';
  }
  
  // Try exact match first
  if (SERVICE_DEFAULTS[serviceValue]?.label) {
    return SERVICE_DEFAULTS[serviceValue].label;
  }
  
  // Try case-insensitive match
  const lowerValue = serviceValue.toLowerCase();
  const matchedKey = Object.keys(SERVICE_DEFAULTS).find(key => key.toLowerCase() === lowerValue);
  if (matchedKey) {
    return SERVICE_DEFAULTS[matchedKey].label;
  }
  
  // Fallback: format the service code nicely (replace underscores with spaces, capitalize words)
  return serviceValue
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get default description for a service type
 */
export function getServiceDefaultDescription(serviceValue: string | null | undefined): string {
  if (!serviceValue || typeof serviceValue !== 'string') {
    return '';
  }
  return SERVICE_DEFAULTS[serviceValue]?.description || '';
}

/**
 * Calculate default price based on duration
 * Note: hourly_rate is no longer used - prices should be set per service/product
 * This function is deprecated and returns 0. Use service/product pricing instead.
 * @deprecated Use service/product pricing instead of hourly rate
 */
export function calculateDefaultPrice(_hourlyRate: number, _durationMinutes: number): number {
  // Hourly rate no longer used - return 0
  // Prices should be configured per service/product
  return 0;
}

/**
 * Generate default package name from service and duration
 */
export function generateDefaultPackageName(serviceValue: string | null | undefined, durationMinutes: number): string {
  const serviceLabel = getServiceLabel(serviceValue);
  if (!serviceLabel) {
    return `${durationMinutes} minute session`;
  }
  return `${serviceLabel} - ${durationMinutes} minutes`;
}

/**
 * Get all service defaults for a role
 */
export function getServiceDefaultsForRole(role: 'sports_therapist' | 'massage_therapist' | 'osteopath'): ServiceDefault[] {
  // Common services available to all therapist types
  const commonServices = [
    'massage',
    'acupuncture',
    'cupping',
    'mobilisation',
    'manipulation',
    'stretching'
  ];

  const serviceMap: Record<string, string[]> = {
    sports_therapist: [
      ...commonServices,
      'sports_injury_assessment',
      'exercise_rehabilitation',
      'strength_conditioning',
      'injury_prevention',
      'performance_enhancement',
      'return_to_play'
    ],
    massage_therapist: [
      ...commonServices,
      'deep_tissue',
      'sports_massage',
      'swedish_massage',
      'trigger_point',
      'myofascial_release',
      'relaxation_massage'
    ],
    osteopath: [
      ...commonServices,
      'structural_osteopathy',
      'cranial_osteopathy',
      'visceral_osteopathy',
      'paediatric_osteopathy',
      'sports_osteopathy',
      'postural_assessment'
    ]
  };

  const services = serviceMap[role] || [];
  return services.map(value => SERVICE_DEFAULTS[value]).filter(Boolean);
}

