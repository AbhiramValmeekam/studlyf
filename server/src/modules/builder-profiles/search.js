import { termsOf } from '../../common/utilities/text.js';

/**
 * Indexed search words for a builder profile. City, college and branch come from the
 * user's personal profile (their single source of truth), so this is recomputed whenever
 * either the builder profile or the personal profile changes.
 */
export function builderSearchFields(builder, user) {
  const p = user?.profile ?? {};
  return {
    searchTerms: termsOf(
      builder.username,
      builder.headline,
      builder.bio,
      p.city,
      p.college,
      p.branch,
      ...(builder.skills ?? []).map((s) => s.name),
    ),
    titleTerms: termsOf(builder.username, builder.headline),
  };
}
