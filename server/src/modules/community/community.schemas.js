import { z } from 'zod';
import {
  httpUrl,
  isoDate,
  objectIdSchema,
  optionalText,
  paginationQuery,
  slugSchema,
  text,
} from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import { PROJECT_CATEGORIES, PROJECT_MEDIA_KINDS, PROJECT_SORTS, PROJECT_TYPES } from '../../database/schema/enums.js';

// A free-form project tag: lower-cased, letters/numbers and a few code-friendly symbols.
const tagSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.string().min(1).max(24).regex(/^[a-z0-9][a-z0-9+#.-]*$/, 'Use lowercase letters, numbers and dashes'),
);

const tagsField = z
  .array(tagSchema)
  .max(8)
  .default([])
  .transform((arr) => [...new Set(arr)]);

const linksField = z
  .object({
    repo: httpUrl.nullish(),
    demo: httpUrl.nullish(),
    video: httpUrl.nullish(),
    website: httpUrl.nullish(),
  })
  .partial()
  .strict();

export const feedQuery = z.object({
  sort: enumParam(PROJECT_SORTS).default('TRENDING'),
  category: enumParam(PROJECT_CATEGORIES).optional(),
  tag: tagSchema.optional(),
  q: searchText,
  ...paginationQuery,
});

/** Display names for the stack ("React", "Node.js"); the lower-case facet list is derived. */
const technologiesField = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .transform((arr) => [...new Set(arr)]);

const projectMediaField = z
  .array(
    z
      .object({
        assetId: objectIdSchema,
        kind: z.enum(PROJECT_MEDIA_KINDS).default('SCREENSHOT'),
        caption: optionalText(200),
      })
      .strict(),
  )
  .max(12);

const bodyFields = {
  title: text(120),
  tagline: text(160),
  description: optionalText(8000),
  problemStatement: optionalText(5000),
  solution: optionalText(5000),
  impact: optionalText(5000),
  category: enumParam(PROJECT_CATEGORIES),
  projectType: z.enum(PROJECT_TYPES).optional(),
  technologies: technologiesField.optional(),
  tags: tagsField,
  teamName: optionalText(120),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
  media: projectMediaField.optional(),
  coverImageId: objectIdSchema.nullish(),
  links: linksField.optional(),
  slug: slugSchema.optional(),
};

export const createBody = z.object(bodyFields).strict();
// Tags must NOT default on update: `.default([])` still applies inside `.partial()`, which used
// to wipe a project's tags whenever any other field was edited.
export const updateBody = z
  .object({
    ...bodyFields,
    tags: z
      .array(tagSchema)
      .max(8)
      .transform((arr) => [...new Set(arr)]),
  })
  .partial()
  .strict();
