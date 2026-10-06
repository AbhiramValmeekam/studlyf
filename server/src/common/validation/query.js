import { z } from 'zod';

/** Case-insensitive enum for query strings (?type=hackathon → "HACKATHON"). */
export function enumParam(values) {
  return z.preprocess((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v), z.enum(values));
}

export const searchText = z.string().trim().max(120).optional();
