import { z } from 'zod';
import {
  BUILDER_AVAILABILITIES,
  PROFILE_VISIBILITIES,
  SKILL_PROFICIENCIES,
} from '../../database/schema/index.js';
import { objectIdSchema, optionalText, slugSchema, text } from '../../common/validation/index.js';
import { linksBody } from '../profile/profile.schemas.js';

/**
 * Builder product routes live under /builders/<page>, next to public profiles at
 * /builders/<username> — so those page names can never be taken as usernames.
 */
export const RESERVED_USERNAMES = new Set([
  'dashboard', 'profile', 'projects', 'opportunities', 'applications', 'achievements', 'onboarding',
  'login', 'signup', 'settings', 'admin', 'new', 'edit',
]);

/** Public handle: 3–30 chars, letters/numbers with internal hyphens or underscores. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, 'Use letters, numbers, hyphens or underscores')
  .refine((u) => !RESERVED_USERNAMES.has(u), 'That username is reserved — pick another');

const educationItem = z
  .object({
    school: text(120),
    program: optionalText(120),
    year: optionalText(20),
  })
  .strict();

// `location` and `links` are still accepted here for API compatibility, but they are stored
// on the user's personal profile (their single source of truth) — see profile.service.
const profileFields = {
  headline: optionalText(160),
  bio: optionalText(4000),
  template: z.enum(['editorial', 'minimal', 'terminal', 'spotlight']).optional(),
  location: optionalText(120),
  availability: z.enum(BUILDER_AVAILABILITIES).nullish(),
  visibility: z.enum(PROFILE_VISIBILITIES).optional(),
  links: linksBody.optional(),
  education: z.array(educationItem).max(10).optional(),
  profilePhotoId: objectIdSchema.nullish(),
};

export const createBody = z.object({ username: usernameSchema, ...profileFields }).strict();
export const updateBody = z.object(profileFields).partial().strict();

const skillItem = z
  .object({ slug: slugSchema, proficiency: z.enum(SKILL_PROFICIENCIES).optional() })
  .strict();
export const setSkillsBody = z.object({ skills: z.array(skillItem).max(30) }).strict();

export const usernameParams = z.object({ username: usernameSchema });
