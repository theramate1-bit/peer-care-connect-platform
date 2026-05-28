/**
 * Centralized Form Utilities
 * 
 * This utility provides consistent form validation,
 * state management, and error handling patterns.
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { handleValidationError } from './error-handling';

export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormOptions<T> {
  initialData: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit?: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

/**
 * Custom hook for form state management
 */
export function useFormState<T extends Record<string, any>>(
  options: FormOptions<T>
) {
  const {
    initialData,
    validationSchema,
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true
  } = options;

  const [formState, setFormState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: !validationSchema ? true : validationSchema.safeParse(initialData).success
  });

  /**
   * Validate form data against schema
   */
  const validate = useCallback((data: T): Partial<Record<keyof T, string>> => {
    if (!validationSchema) return {};

    const result = validationSchema.safeParse(data);
    if (result.success) return {};

    const errors: Partial<Record<keyof T, string>> = {};
    result.error.errors.forEach((error) => {
      const path = error.path.join('.') as keyof T;
      errors[path] = error.message;
    });

    return errors;
  }, [validationSchema]);

  /**
   * Update form field value
   */
  const setFieldValue = useCallback((
    field: keyof T,
    value: any,
    shouldValidate = validateOnChange
  ) => {
    setFormState(prev => {
      const newData = { ...prev.data, [field]: value };
      const errors = shouldValidate ? validate(newData) : prev.errors;
      const isValid = Object.keys(errors).length === 0;

      return {
        ...prev,
        data: newData,
        errors,
        isValid
      };
    });
  }, [validate, validateOnChange]);

  /**
   * Mark field as touched
   */
  const setFieldTouched = useCallback((
    field: keyof T,
    touched = true,
    shouldValidate = validateOnBlur
  ) => {
    setFormState(prev => {
      const newTouched = { ...prev.touched, [field]: touched };
      const errors = shouldValidate ? validate(prev.data) : prev.errors;
      const isValid = Object.keys(errors).length === 0;

      return {
        ...prev,
        touched: newTouched,
        errors,
        isValid
      };
    });
  }, [validate, validateOnBlur]);

  /**
   * Set field error
   */
  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: false
    }));
  }, []);

  /**
   * Clear field error
   */
  const clearFieldError = useCallback((field: keyof T) => {
    setFormState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      const isValid = Object.keys(newErrors).length === 0;

      return {
        ...prev,
        errors: newErrors,
        isValid
      };
    });
  }, []);

  /**
   * Set multiple field values
   */
  const setValues = useCallback((values: Partial<T>) => {
    setFormState(prev => {
      const newData = { ...prev.data, ...values };
      const errors = validate(newData);
      const isValid = Object.keys(errors).length === 0;

      return {
        ...prev,
        data: newData,
        errors,
        isValid
      };
    });
  }, [validate]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setFormState({
      data: initialData,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: !validationSchema ? true : validationSchema.safeParse(initialData).success
    });
  }, [initialData, validationSchema]);

  /**
   * Submit form
   */
  const submitForm = useCallback(async () => {
    if (!onSubmit) return;

    const errors = validate(formState.data);
    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({
        ...prev,
        errors,
        isValid: false
      }));
      
      handleValidationError(Object.values(errors));
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(formState.data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.data, onSubmit, validate]);

  /**
   * Get field props for input components
   */
  const getFieldProps = useCallback((field: keyof T) => ({
    value: formState.data[field],
    onChange: (value: any) => setFieldValue(field, value),
    onBlur: () => setFieldTouched(field),
    error: formState.touched[field] ? formState.errors[field] : undefined,
    hasError: Boolean(formState.touched[field] && formState.errors[field])
  }), [formState, setFieldValue, setFieldTouched]);

  return {
    ...formState,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    clearFieldError,
    setValues,
    resetForm,
    submitForm,
    getFieldProps,
    validate: () => validate(formState.data)
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
  required: z.string().min(1, 'This field is required'),
  optionalString: z.string().optional(),
  positiveNumber: z.number().min(0, 'Value must be positive'),
  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Please enter a valid date'),
  array: z.array(z.string()).min(1, 'At least one item is required')
};

/**
 * Form validation utilities
 */
export const formValidation = {
  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number format
   */
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate password strength
   */
  isStrongPassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate required fields
   */
  validateRequired: (data: Record<string, any>, requiredFields: string[]): string[] => {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field} is required`);
      }
    });

    return errors;
  },

  /**
   * Validate field length
   */
  validateLength: (value: string, min: number, max: number, fieldName: string): string | null => {
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    if (value.length > max) {
      return `${fieldName} must be less than ${max} characters`;
    }
    return null;
  }
};

/**
 * Form field utilities
 */
export const formFields = {
  /**
   * Create input props for form fields
   */
  createInputProps: <T extends Record<string, any>>(
    formState: FormState<T>,
    field: keyof T,
    setFieldValue: (field: keyof T, value: any) => void,
    setFieldTouched: (field: keyof T, touched?: boolean) => void
  ) => ({
    value: formState.data[field] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setFieldValue(field, e.target.value);
    },
    onBlur: () => setFieldTouched(field),
    error: formState.touched[field] ? formState.errors[field] : undefined,
    hasError: Boolean(formState.touched[field] && formState.errors[field])
  }),

  /**
   * Create select props for form fields
   */
  createSelectProps: <T extends Record<string, any>>(
    formState: FormState<T>,
    field: keyof T,
    setFieldValue: (field: keyof T, value: any) => void,
    setFieldTouched: (field: keyof T, touched?: boolean) => void
  ) => ({
    value: formState.data[field] || '',
    onValueChange: (value: string) => {
      setFieldValue(field, value);
    },
    onBlur: () => setFieldTouched(field),
    error: formState.touched[field] ? formState.errors[field] : undefined,
    hasError: Boolean(formState.touched[field] && formState.errors[field])
  }),

  /**
   * Create checkbox props for form fields
   */
  createCheckboxProps: <T extends Record<string, any>>(
    formState: FormState<T>,
    field: keyof T,
    setFieldValue: (field: keyof T, value: any) => void,
    setFieldTouched: (field: keyof T, touched?: boolean) => void
  ) => ({
    checked: Boolean(formState.data[field]),
    onCheckedChange: (checked: boolean) => {
      setFieldValue(field, checked);
    },
    onBlur: () => setFieldTouched(field),
    error: formState.touched[field] ? formState.errors[field] : undefined,
    hasError: Boolean(formState.touched[field] && formState.errors[field])
  })
};
