import { z } from 'zod';
import { linkUrl, optionalText, text, objectIdSchema } from '../../common/validation/index.js';

const cta = z.object({ label: text(40), url: linkUrl }).strict();

/**
 * Each homepage section is stored as JSON and validated against its schema here.
 * Adding a section = adding an entry (no migration). Unknown keys are rejected.
 */
export const SECTION_SCHEMAS = {
  hero: z
    .object({
      eyebrow: optionalText(60),
      headline: text(120),
      subheadline: text(300),
      primaryCta: cta,
      secondaryCta: cta.nullish(),
      backgroundImageId: objectIdSchema.nullish(),
    })
    .strict(),
  paths_intro: z.object({ title: text(120), subtitle: optionalText(300) }).strict(),
  explore_intro: z.object({ title: text(120), subtitle: optionalText(300) }).strict(),
  resources_intro: z.object({ title: text(120), subtitle: optionalText(300) }).strict(),
  join_cta: z.object({ title: text(120), subtitle: optionalText(300), cta }).strict(),
};

export const SECTION_KEYS = Object.keys(SECTION_SCHEMAS);

/** snake_case section key → camelCase key in the /home response. */
export const toResponseKey = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
