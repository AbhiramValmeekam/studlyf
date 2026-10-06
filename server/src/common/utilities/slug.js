import { AppError } from '../errors/app-error.js';
import { escapeRegex, slugify } from './text.js';

/**
 * Explicit slug → must be free (409 SLUG_TAKEN otherwise).
 * Derived slug → first free of "base", "base-2", "base-3", …
 * The unique index on `slug` remains the final guard against races.
 */
export async function resolveSlug(
  model,
  opts,
) {
  const notSelf = opts.excludeId ? { _id: { $ne: opts.excludeId } } : {};

  if (opts.explicit) {
    if (await model.exists({ slug: opts.explicit, ...notSelf })) {
      throw new AppError('SLUG_TAKEN', 'This slug is already in use', [{ field: 'slug', message: 'Already in use' }]);
    }
    return opts.explicit;
  }

  const base = slugify(opts.from);
  const rows = (await model
    .find({ slug: { $regex: `^${escapeRegex(base)}(-\\d+)?$` }, ...notSelf })
    .select({ slug: 1 })
    .lean());
  const used = new Set(rows.map((r) => r.slug));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}
