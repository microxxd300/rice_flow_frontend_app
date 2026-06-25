import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Password validation schema
 * Min 8 characters, must contain uppercase, lowercase, number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number');

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  url: z.string().url('Invalid URL'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
} as const;
