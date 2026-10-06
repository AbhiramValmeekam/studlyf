/**
 * Weighted scoring (spec §14), kept pure so it can be unit-tested in isolation.
 *
 *   weightedScore = score / maxScore × weight        (weight is a percentage)
 *   overallScore  = Σ weightedScore                   (0–100 when weights total 100)
 *
 * Unscored criteria contribute nothing; completion is refused while a REQUIRED one is unscored,
 * so a completed evaluation's total only ever omits optional criteria the evaluator skipped.
 * Values are rounded to 2 decimals so stored numbers are stable and display cleanly.
 */
export const round2 = (n) => Math.round(n * 100) / 100;

export function computeScores(scores) {
  let total = 0;
  const out = scores.map((s) => {
    const weightedScore = s.score === null || s.score === undefined ? null : round2((s.score / s.maxScore) * s.weight);
    if (weightedScore !== null) total += weightedScore;
    return { ...s, weightedScore };
  });
  return { scores: out, overallScore: round2(total) };
}

/** Criteria still blocking completion (required and unscored). */
export function missingRequired(scores) {
  return scores.filter((s) => s.required && (s.score === null || s.score === undefined));
}

/** A template is usable (activatable) only when its weights total exactly 100%. */
export function weightTotal(criteria) {
  return round2(criteria.reduce((sum, c) => sum + Number(c.weight || 0), 0));
}
