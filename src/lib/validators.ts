import { z } from 'zod';

// Session validation
export const sessionSchema = z.object({
  client_email: z.string().email('Valid email required'),
  client_name: z.string().min(2, 'Name must be at least 2 characters'),
  session_date: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Session date must be in the future'
  ),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  duration_minutes: z.number().refine(
    (val) => [30, 45, 60, 75, 90].includes(val),
    'Duration must be 30, 45, 60, 75, or 90 minutes'
  ),
  price: z.number().min(0, 'Price must be positive'),
  session_type: z.string().min(1, 'Session type required')
});

// Allowed durations per practitioner_product_durations / practitioner_products CHECK (30, 45, 60, 75, 90)
export const ALLOWED_DURATION_MINUTES = [30, 45, 60, 75, 90] as const;

// Product validation
export const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  price_amount: z.number().min(0, 'Price must be positive'),
  duration_minutes: z.number().refine(
    (val) => ALLOWED_DURATION_MINUTES.includes(val as 30 | 45 | 60 | 75 | 90),
    `Duration must be one of: ${ALLOWED_DURATION_MINUTES.join(', ')} minutes`
  ).optional(),
  currency: z.literal('gbp')
});

// Payment validation
export const paymentSchema = z.object({
  amount: z.number().min(100, 'Minimum payment is £1'),
  practitioner_id: z.string().uuid(),
  price_id: z.string().startsWith('price_'),
  client_email: z.string().email()
});

// Profile validation
export const profileSchema = z.object({
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  email: z.string().email(),
  phone_number: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().min(2).max(100).optional()
});

// Helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

