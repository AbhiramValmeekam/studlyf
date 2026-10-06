import * as repo from '../opportunities/opportunities.repository.js';

/**
 * Rule-based opportunity score for a builder. Deterministic and cheap — no ML (spec §34).
 * Weighted by skill-slug overlap, then featured flag, then recency of publication.
 */
export function scoreOpportunity(opp, { skillSlugs }, now = Date.now()) {
  let score = 0;
  const overlap = (opp.skills ?? []).filter((s) => skillSlugs.has(s.slug)).length;
  score += overlap * 10;
  if (opp.featured) score += 3;
  if (opp.publishedAt) {
    const ageDays = (now - new Date(opp.publishedAt).getTime()) / 86_400_000;
    score += Math.max(0, 2 - ageDays / 30); // fresh listings edge out stale ones
  }
  return score;
}

/** Returns up to `limit` open, published opportunities ranked for the given profile. */
export async function recommend(db, profile, { limit = 5 } = {}) {
  const skillSlugs = new Set((profile?.skills ?? []).map((s) => s.slug));
  const { rows } = await repo.listPublic(db, { page: 1, pageSize: 50, status: 'open' });
  const now = Date.now();
  return rows
    .map((opp) => ({ opp, score: scoreOpportunity(opp, { skillSlugs }, now) }))
    .sort((a, b) => b.score - a.score || new Date(b.opp.publishedAt ?? 0) - new Date(a.opp.publishedAt ?? 0))
    .slice(0, limit)
    .map((r) => r.opp);
}
