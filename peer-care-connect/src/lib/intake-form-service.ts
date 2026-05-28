/**
 * Intake Form Service
 * Handles form templates, validation, and submission for pre-treatment intake forms
 */

import { supabase } from '@/integrations/supabase/client';

export interface IntakeFormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface IntakeFormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sports_injury' | 'general_wellness' | 'osteopathy' | 'massage' | 'general';
  fields: IntakeFormField[];
}

export interface IntakeFormData {
  [key: string]: string | string[] | boolean | number | null;
}

export class IntakeFormService {
  /**
   * Get form template based on service type
   */
  static getFormTemplate(serviceType: string): IntakeFormTemplate {
    const normalizedType = serviceType.toLowerCase();

    // Sports injury focused templates
    if (
      normalizedType.includes('sports') ||
      normalizedType.includes('injury') ||
      normalizedType.includes('rehabilitation') ||
      normalizedType.includes('performance') ||
      normalizedType.includes('conditioning')
    ) {
      return this.getSportsInjuryTemplate();
    }

    // Osteopathy focused templates
    if (
      normalizedType.includes('osteopathy') ||
      normalizedType.includes('structural') ||
      normalizedType.includes('cranial') ||
      normalizedType.includes('visceral') ||
      normalizedType.includes('postural')
    ) {
      return this.getOsteopathyTemplate();
    }

    // Massage focused templates
    if (
      normalizedType.includes('massage') ||
      normalizedType.includes('deep_tissue') ||
      normalizedType.includes('swedish') ||
      normalizedType.includes('relaxation')
    ) {
      return this.getMassageTemplate();
    }

    // Default general wellness template
    return this.getGeneralWellnessTemplate();
  }

  /**
   * Sports Injury Template
   */
  private static getSportsInjuryTemplate(): IntakeFormTemplate {
    return {
      id: 'sports_injury',
      name: 'Sports Injury Intake Form',
      description: 'Please provide details about your injury and athletic background',
      category: 'sports_injury',
      fields: [
        {
          id: 'primary_concern',
          label: 'Primary Injury/Concern',
          type: 'textarea',
          required: false,
          placeholder: 'Describe your injury, when it occurred, and current symptoms...'
        },
        {
          id: 'injury_location',
          label: 'Location of Injury',
          type: 'text',
          required: false,
          placeholder: 'e.g., Right knee, Lower back, Left shoulder'
        },
        {
          id: 'injury_date',
          label: 'When did this injury occur?',
          type: 'date',
          required: false
        },
        {
          id: 'mechanism_of_injury',
          label: 'How did the injury occur?',
          type: 'select',
          required: false,
          options: [
            { value: 'training', label: 'During Training' },
            { value: 'competition', label: 'During Competition' },
            { value: 'gradual', label: 'Gradual Onset' },
            { value: 'accident', label: 'Accident/Incident' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          id: 'pain_level',
          label: 'Current Pain Level (0-10)',
          type: 'number',
          required: false,
          validation: {
            min: 0,
            max: 10,
            message: 'Please enter a number between 0 and 10'
          },
          placeholder: '0 = No pain, 10 = Severe pain'
        },
        {
          id: 'functional_limitations',
          label: 'Functional Limitations',
          type: 'textarea',
          required: false,
          placeholder: 'What activities or movements are limited or painful?'
        },
        {
          id: 'sport_activity',
          label: 'Sport/Activity Level',
          type: 'text',
          required: false,
          placeholder: 'e.g., Football, Running, Weightlifting, Weekend Warrior'
        },
        {
          id: 'training_frequency',
          label: 'Training Frequency',
          type: 'select',
          required: false,
          options: [
            { value: 'daily', label: 'Daily' },
            { value: '5-6x_week', label: '5-6x per week' },
            { value: '3-4x_week', label: '3-4x per week' },
            { value: '1-2x_week', label: '1-2x per week' },
            { value: 'occasional', label: 'Occasional' }
          ]
        },
        {
          id: 'previous_treatment',
          label: 'Previous Treatment',
          type: 'textarea',
          required: false,
          placeholder: 'Have you received treatment for this injury before? What helped?'
        },
        {
          id: 'medical_conditions',
          label: 'Relevant Medical Conditions',
          type: 'textarea',
          required: false,
          placeholder: 'Any medical conditions that may be relevant (e.g., arthritis, diabetes)'
        },
        {
          id: 'medications',
          label: 'Current Medications',
          type: 'textarea',
          required: false,
          placeholder: 'List any medications you are currently taking'
        },
        {
          id: 'allergies',
          label: 'Allergies',
          type: 'text',
          required: false,
          placeholder: 'Any allergies we should be aware of?'
        }
      ]
    };
  }

  /**
   * Osteopathy Template
   */
  private static getOsteopathyTemplate(): IntakeFormTemplate {
    return {
      id: 'osteopathy',
      name: 'Osteopathic Intake Form',
      description: 'Please provide information about your condition and medical history',
      category: 'osteopathy',
      fields: [
        {
          id: 'primary_concern',
          label: 'Main Reason for Visit',
          type: 'textarea',
          required: false,
          placeholder: 'Describe your main concern or condition...'
        },
        {
          id: 'symptom_duration',
          label: 'How long have you had these symptoms?',
          type: 'select',
          required: false,
          options: [
            { value: 'less_week', label: 'Less than a week' },
            { value: '1-4_weeks', label: '1-4 weeks' },
            { value: '1-3_months', label: '1-3 months' },
            { value: '3-6_months', label: '3-6 months' },
            { value: '6-12_months', label: '6-12 months' },
            { value: 'over_year', label: 'Over a year' }
          ]
        },
        {
          id: 'pain_location',
          label: 'Location of Pain/Discomfort',
          type: 'text',
          required: false,
          placeholder: 'e.g., Lower back, Neck, Hip'
        },
        {
          id: 'pain_type',
          label: 'Type of Pain',
          type: 'select',
          required: false,
          options: [
            { value: 'sharp', label: 'Sharp' },
            { value: 'dull', label: 'Dull/Achy' },
            { value: 'burning', label: 'Burning' },
            { value: 'numbness', label: 'Numbness/Tingling' },
            { value: 'stiffness', label: 'Stiffness' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          id: 'aggravating_factors',
          label: 'What makes it worse?',
          type: 'textarea',
          required: false,
          placeholder: 'Activities, positions, or movements that worsen symptoms'
        },
        {
          id: 'relieving_factors',
          label: 'What makes it better?',
          type: 'textarea',
          required: false,
          placeholder: 'Activities, positions, or treatments that help'
        },
        {
          id: 'medical_history',
          label: 'Medical History',
          type: 'textarea',
          required: false,
          placeholder: 'Past surgeries, major injuries, chronic conditions...'
        },
        {
          id: 'medications',
          label: 'Current Medications',
          type: 'textarea',
          required: false,
          placeholder: 'List all current medications'
        },
        {
          id: 'allergies',
          label: 'Allergies',
          type: 'text',
          required: false,
          placeholder: 'Any known allergies'
        },
        {
          id: 'lifestyle_factors',
          label: 'Lifestyle Factors',
          type: 'textarea',
          required: false,
          placeholder: 'Occupation, exercise routine, sleep patterns, stress levels'
        },
        {
          id: 'previous_osteopathy',
          label: 'Previous Osteopathic Treatment',
          type: 'textarea',
          required: false,
          placeholder: 'Have you had osteopathic treatment before? What was helpful?'
        }
      ]
    };
  }

  /**
   * Massage Template
   */
  private static getMassageTemplate(): IntakeFormTemplate {
    return {
      id: 'massage',
      name: 'Massage Therapy Intake Form',
      description: 'Please provide information to help us tailor your massage session',
      category: 'massage',
      fields: [
        {
          id: 'session_goals',
          label: 'Session Goals',
          type: 'textarea',
          required: false,
          placeholder: 'What would you like to achieve from this session? (relaxation, pain relief, sports recovery, etc.)'
        },
        {
          id: 'areas_of_focus',
          label: 'Areas of Focus',
          type: 'text',
          required: false,
          placeholder: 'e.g., Neck and shoulders, Lower back, Legs'
        },
        {
          id: 'pressure_preference',
          label: 'Pressure Preference',
          type: 'select',
          required: false,
          options: [
            { value: 'light', label: 'Light' },
            { value: 'medium', label: 'Medium' },
            { value: 'firm', label: 'Firm' },
            { value: 'very_firm', label: 'Very Firm' },
            { value: 'varies', label: 'Varies by area' }
          ]
        },
        {
          id: 'current_pain',
          label: 'Current Pain/Discomfort',
          type: 'textarea',
          required: false,
          placeholder: 'Any areas of pain, tension, or discomfort?'
        },
        {
          id: 'medical_conditions',
          label: 'Medical Conditions',
          type: 'textarea',
          required: false,
          placeholder: 'Any medical conditions we should be aware of?'
        },
        {
          id: 'medications',
          label: 'Current Medications',
          type: 'textarea',
          required: false,
          placeholder: 'List any medications you are currently taking'
        },
        {
          id: 'allergies',
          label: 'Allergies (especially to oils/lotions)',
          type: 'text',
          required: false,
          placeholder: 'Any allergies to massage oils, lotions, or ingredients?'
        },
        {
          id: 'contraindications',
          label: 'Contraindications',
          type: 'textarea',
          required: false,
          placeholder: 'Pregnancy, recent surgery, open wounds, skin conditions, etc.'
        },
        {
          id: 'previous_massage',
          label: 'Previous Massage Experience',
          type: 'textarea',
          required: false,
          placeholder: 'Have you had massage before? What did you find helpful?'
        },
        {
          id: 'preferences',
          label: 'Additional Preferences',
          type: 'textarea',
          required: false,
          placeholder: 'Music preference, temperature, any special requests...'
        }
      ]
    };
  }

  /**
   * General Wellness Template
   */
  private static getGeneralWellnessTemplate(): IntakeFormTemplate {
    return {
      id: 'general_wellness',
      name: 'General Intake Form',
      description: 'Please provide basic information for your session',
      category: 'general_wellness',
      fields: [
        {
          id: 'primary_concern',
          label: 'Primary Reason for Visit',
          type: 'textarea',
          required: false,
          placeholder: 'What brings you in today?'
        },
        {
          id: 'current_symptoms',
          label: 'Current Symptoms',
          type: 'textarea',
          required: false,
          placeholder: 'Describe any current symptoms or concerns'
        },
        {
          id: 'medical_history',
          label: 'Medical History',
          type: 'textarea',
          required: false,
          placeholder: 'Any relevant medical history, past injuries, or conditions'
        },
        {
          id: 'medications',
          label: 'Current Medications',
          type: 'textarea',
          required: false,
          placeholder: 'List any medications you are currently taking'
        },
        {
          id: 'allergies',
          label: 'Allergies',
          type: 'text',
          required: false,
          placeholder: 'Any known allergies?'
        },
        {
          id: 'goals',
          label: 'Treatment Goals',
          type: 'textarea',
          required: false,
          placeholder: 'What would you like to achieve from treatment?'
        }
      ]
    };
  }

  /**
   * Validate form data against template
   */
  static validateFormData(template: IntakeFormTemplate, data: IntakeFormData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const field of template.fields) {
      if (field.required) {
        const value = data[field.id];

        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`);
          continue;
        }

        if (field.type === 'checkbox' && !value) {
          errors.push(`${field.label} must be accepted`);
          continue;
        }
      }

      // Additional validation
      if (field.validation && data[field.id]) {
        const value = data[field.id];
        
        if (field.type === 'number' && typeof value === 'number') {
          if (field.validation.min !== undefined && value < field.validation.min) {
            errors.push(`${field.label}: ${field.validation.message || `Minimum value is ${field.validation.min}`}`);
          }
          if (field.validation.max !== undefined && value > field.validation.max) {
            errors.push(`${field.label}: ${field.validation.message || `Maximum value is ${field.validation.max}`}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Submit intake form for a session
   */
  static async submitIntakeForm(
    sessionId: string,
    formData: IntakeFormData,
    template: IntakeFormTemplate
  ): Promise<{ success: boolean; error?: string; formId?: string }> {
    try {
      const { data, error } = await supabase.rpc('complete_intake_form', {
        p_session_id: sessionId,
        p_form_data: formData,
        p_form_template: template.id
      });

      if (error) {
        // If RPC function doesn't exist (PGRST202), treat as optional - return success
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          return {
            success: true,
            formId: undefined
          };
        }
        throw error;
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Failed to submit intake form'
        };
      }

      return {
        success: true,
        formId: data.form_id
      };
    } catch (error: any) {
      // If RPC function doesn't exist, treat intake form as optional
      if (error?.code === 'PGRST202' || error?.message?.includes('Could not find the function')) {
        return {
          success: true,
          formId: undefined
        };
      }
      
      // Only log actual errors, not missing RPC functions
      console.error('Error submitting intake form:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit intake form'
      };
    }
  }

  /**
   * Check if intake form is required for a session
   */
  static async isFormRequired(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_intake_form_required', {
        p_session_id: sessionId
      });

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error('Error checking form requirement:', error);
      return false;
    }
  }

  /**
   * Get existing intake form for a session
   */
  static async getIntakeForm(sessionId: string): Promise<IntakeFormData | null> {
    try {
      const { data, error } = await supabase
        .from('booking_intake_forms')
        .select('form_data')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data?.form_data as IntakeFormData || null;
    } catch (error) {
      console.error('Error fetching intake form:', error);
      return null;
    }
  }
}

