import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

export function toFieldErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.length ? issue.path.join('.') : '_root',
    message: issue.message,
  }));
}

/** Parse untrusted input or throw a 400 VALIDATION_ERROR that names each bad field. */
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw AppError.validation(toFieldErrors(result.error));
  return result.data;
}

// ---- reusable field schemas -------------------------------------------------

/** MongoDB ObjectId as a 24-char hex string. Validating ids up front also stops operator injection ({ "$gt": "" }). */
export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Must be a valid id').transform((v) => v.toLowerCase());

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

/** Absolute http(s) URL only — rejects javascript:, data:, etc. */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Must be an http(s) URL');

/** For CTAs/links: an in-site path ("/explore") or an absolute http(s) URL. */
export const linkUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    if (/^\/(?!\/)[^\s]*$/.test(v)) return true; // "/path" but not protocol-relative "//evil"
    try {
      const u = new URL(v);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Must be a site path starting with "/" or an http(s) URL');

export const text = (max, min = 1) => z.string().trim().min(min).max(max);
export const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v === '' ? null : v));

export const isoDate = z.coerce.date({ message: 'Must be a valid date' });

/** Query-string boolean: "true"/"false"/"1"/"0". */
export const queryBool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const paginationQuery = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
};

export const idParams = z.object({ id: objectIdSchema });
export const slugParams = z.object({ slug: z.string().trim().min(1).max(160) });
