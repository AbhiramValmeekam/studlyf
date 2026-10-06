import { z } from 'zod';
import { GENDERS, PROFILE_INTERESTS, YEARS_OF_STUDY } from '../../database/schema/index.js';
import { httpUrl, optionalText, text } from '../../common/validation/index.js';
import { phoneSchema } from '../auth/auth.schemas.js';

/** Mobile number: the shared phone format, plus 10–15 actual digits. */
export const mobileSchema = phoneSchema.refine((v) => {
  const digits = v.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
}, 'Enter a valid mobile number (10–15 digits)');

/** Parse "github.com/x", "https://www.github.com/x/", etc. Returns a URL or null. */
function asUrl(raw) {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

/** GitHub: a bare username or any github.com profile URL → https://github.com/<user>. */
export function normalizeGithub(raw) {
  const handle = /^@?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))$/.exec(raw)?.[1];
  if (handle) return `https://github.com/${handle}`;
  const url = asUrl(raw);
  if (!url || !['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) return null;
  const user = url.pathname.split('/').filter(Boolean)[0];
  return user && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(user) ? `https://github.com/${user}` : null;
}

/** LinkedIn: a bare profile slug or any linkedin.com/in/<slug> URL → https://www.linkedin.com/in/<slug>. */
export function normalizeLinkedin(raw) {
  const slugRe = /^[\p{L}\p{N}_-]{3,100}$/u;
  if (slugRe.test(raw)) return `https://www.linkedin.com/in/${raw}`;
  const url = asUrl(raw);
  const host = url?.hostname.toLowerCase() ?? '';
  if (!url || !(host === 'linkedin.com' || host.endsWith('.linkedin.com'))) return null;
  const [kind, slug] = url.pathname.split('/').filter(Boolean);
  if (kind !== 'in' || !slug) return null;
  const decoded = decodeURIComponent(slug);
  return slugRe.test(decoded) ? `https://www.linkedin.com/in/${decoded}` : null;
}

/** Optional social link: '' / null clears it; anything else must normalise. */
const social = (normalize, message) =>
  z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      if (v === null || v === '') return null;
      const out = normalize(v);
      if (!out) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return out;
    });

const optionalUrl = z
  .union([z.literal(''), httpUrl])
  .nullish()
  .transform((v) => (v === '' ? null : v));

/** Collapse internal whitespace so "  IIT   Madras " is stored as "IIT Madras". */
const tidy = (max) =>
  optionalText(max).transform((v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ') : v));

const THIS_YEAR = new Date().getFullYear();
const graduationYear = z.preprocess(
  (v) => (v === '' ? null : typeof v === 'string' ? Number(v) : v),
  z
    .number({ message: 'Enter a year' })
    .int()
    .min(1980, 'Enter a valid year')
    .max(THIS_YEAR + 8, `Must be ${THIS_YEAR + 8} or earlier`)
    .nullable(),
);

export const linksBody = z
  .object({
    github: social(normalizeGithub, 'Enter a GitHub username or github.com profile URL'),
    linkedin: social(normalizeLinkedin, 'Enter a linkedin.com/in/… profile URL'),
    portfolio: optionalUrl,
    website: optionalUrl,
  })
  .partial()
  .strict();

/**
 * PATCH /me/profile. Every field is optional so the prompt can save one step at a time;
 * `links` merges key-by-key (sending only `github` leaves `linkedin` untouched).
 * Identity fields (name, phone) are accepted here too so a step can save in one call.
 */
export const personalPatchBody = z
  .object({
    name: text(100),
    phone: mobileSchema.nullable(),
    gender: z.enum(GENDERS).nullable(),
    city: tidy(120),
    college: tidy(150),
    degree: tidy(80),
    branch: tidy(120),
    yearOfStudy: z.enum(YEARS_OF_STUDY).nullable(),
    graduationYear: graduationYear,
    links: linksBody,
    interests: z
      .array(z.enum(PROFILE_INTERESTS))
      .max(PROFILE_INTERESTS.length)
      .transform((v) => [...new Set(v)]),
  })
  .partial()
  .strict();
