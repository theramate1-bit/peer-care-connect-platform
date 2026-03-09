import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits');

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const addressSchema = z.string()
  .min(5, 'Address must be at least 5 characters')
  .max(200, 'Address must be less than 200 characters');

export const citySchema = z.string()
  .min(2, 'City must be at least 2 characters')
  .max(50, 'City must be less than 50 characters')
  .regex(/^[a-zA-Z\s\-']+$/, 'City can only contain letters, spaces, hyphens, and apostrophes');

export const postalCodeSchema = z.string()
  .regex(/^[A-Za-z0-9\s\-]+$/, 'Postal code contains invalid characters')
  .min(3, 'Postal code must be at least 3 characters')
  .max(10, 'Postal code must be less than 10 characters');

export const bioSchema = z.string()
  .min(10, 'Bio must be at least 10 characters')
  .max(1000, 'Bio must be less than 1000 characters');

export const hourlyRateSchema = z.number()
  .min(0, 'Hourly rate cannot be negative')
  .max(1000, 'Hourly rate cannot exceed $1000');

export const experienceSchema = z.number()
  .min(0, 'Experience cannot be negative')
  .max(50, 'Experience cannot exceed 50 years');

// User registration validation
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  userRole: z.enum(['client', 'sports_therapist', 'massage_therapist', 'osteopath']),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// User profile validation
export const userProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema.optional(),
  bio: bioSchema.optional(),
  location: addressSchema.optional(),
  city: citySchema.optional(),
  state: z.string().max(50).optional(),
  country: z.string().max(50).optional(),
  postalCode: postalCodeSchema.optional()
});

// Therapist profile validation
export const therapistProfileSchema = z.object({
  bio: bioSchema,
  location: addressSchema,
  city: citySchema,
  state: z.string().max(50),
  country: z.string().max(50),
  postalCode: postalCodeSchema,
  specializations: z.array(z.string()).optional(), // Specializations are optional
  qualifications: z.array(z.string()).min(1, 'Please add at least one qualification'),
  experienceYears: experienceSchema,
  hourlyRate: hourlyRateSchema,
  professionalStatement: z.string().min(20, 'Professional statement must be at least 20 characters').max(500, 'Professional statement must be less than 500 characters'),
  treatmentPhilosophy: z.string().min(20, 'Treatment philosophy must be at least 20 characters').max(500, 'Treatment philosophy must be less than 500 characters')
});

// Session booking validation
export const sessionBookingSchema = z.object({
  sessionType: z.string().min(1, 'Please select a session type'),
  duration: z.number().refine(
    (val) => [30, 45, 60, 75, 90].includes(val),
    'Duration must be 30, 45, 60, 75, or 90 minutes'
  ),
  sessionDate: z.date().min(new Date(), 'Session date must be in the future'),
  sessionTime: z.string().min(1, 'Please select a session time'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  useCredits: z.boolean().optional()
});

// Credit purchase validation
export const creditPurchaseSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least 1').max(1000, 'Amount cannot exceed 1000'),
  paymentMethod: z.enum(['card', 'credits']),
  description: z.string().max(200, 'Description must be less than 200 characters').optional()
});

// Message validation
export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message must be less than 2000 characters'),
  conversationId: z.string().uuid('Invalid conversation ID')
});

// Review validation
export const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(500, 'Comment must be less than 500 characters'),
  sessionId: z.string().uuid('Invalid session ID')
});

// Location validation
export const locationSchema = z.object({
  address: addressSchema,
  city: citySchema,
  state: z.string().max(50).optional(),
  country: z.string().max(50),
  postalCode: postalCodeSchema.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceRadiusKm: z.number().min(1).max(200)
});

// Verification document validation
export const verificationDocumentSchema = z.object({
  documentType: z.enum(['license', 'qualification', 'insurance', 'background_check']),
  documentNumber: z.string().min(1, 'Document number is required').max(100, 'Document number must be less than 100 characters'),
  issuingAuthority: z.string().min(1, 'Issuing authority is required').max(200, 'Issuing authority must be less than 200 characters'),
  issueDate: z.date().max(new Date(), 'Issue date cannot be in the future'),
  expiryDate: z.date().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional()
});

// Utility functions
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(err => err.message)
  };
};

export const validatePhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

// Form validation helper
export const getFieldError = (errors: any, fieldName: string): string | undefined => {
  return errors?.[fieldName]?.message;
};

// Custom validation rules
export const createCustomValidator = (rule: (value: any) => boolean, message: string) => {
  return z.any().refine(rule, { message });
};

// Rate limiting validation
export const validateRateLimit = (attempts: number, maxAttempts: number, timeWindow: number): boolean => {
  // This would typically be implemented with a proper rate limiting service
  return attempts < maxAttempts;
};

// XSS prevention
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  // Use DOMPurify for proper HTML sanitization
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false
  });
};

/**
 * SQL injection prevention (basic)
 * @deprecated This function is insufficient for SQL injection prevention.
 * ALWAYS use parameterized queries with Supabase client instead of string concatenation.
 * This function may be removed in a future version.
 * 
 * Example of CORRECT usage:
 * ✅ const { data } = await supabase.from('table').select('*').eq('column', userInput);
 * 
 * Example of INCORRECT usage:
 * ❌ const query = `SELECT * FROM table WHERE column = '${sanitizeSqlInput(userInput)}'`;
 */
export const sanitizeSqlInput = (input: string): string => {
  console.warn('sanitizeSqlInput() is deprecated. Use parameterized queries instead.');
  return input
    .replace(/['"]/g, '')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
};
