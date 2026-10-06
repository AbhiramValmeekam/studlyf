import { z } from 'zod';
import { ONBOARDING_INTENTS } from '../../database/schema/index.js';
import { text } from '../../common/validation/index.js';

export const emailSchema = z
  .string({ message: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ message: 'Must be a valid email address' }));

export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), 'Password must contain at least one letter and one number');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, 'Must be a valid phone number');

export const registerBody = z
  .object({
    name: text(100),
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.nullish(),
    /** Optional onboarding answer captured on the sign-up form. */
    intent: z.enum(ONBOARDING_INTENTS).optional(),
  })
  .strict();

export const loginBody = z
  .object({
    email: emailSchema,
    password: z.string({ message: 'Password is required' }).min(1, 'Password is required').max(128),
  })
  .strict();

export const tokenBody = z.object({ token: z.string().trim().min(10).max(128) }).strict();
export const emailBody = z.object({ email: emailSchema }).strict();
export const resetBody = z.object({ token: z.string().trim().min(10).max(128), password: passwordSchema }).strict();
