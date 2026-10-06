import { idOf } from '../../common/utilities/media.js';

/**
 * What each audience may see of an evaluation. Nothing here ever returns `internalNotes`,
 * the evaluator's id/email, or anything from an evaluation that isn't COMPLETED.
 *
 *   builder — the project team: scores when scoreVisibility ≠ INTERNAL, and each piece of
 *             feedback only when its own visibility ≠ INTERNAL. Evaluator name only if they opted in.
 *   public  — anyone: only evaluations whose scoreVisibility is PUBLIC; feedback only if PUBLIC.
 */
const BUILDER_OK = new Set(['BUILDER_VISIBLE', 'PUBLIC']);

export function builderCanSee(ev) {
  if (ev.status !== 'COMPLETED') return false;
  const scoresShared = BUILDER_OK.has(ev.scoreVisibility);
  const overallShared = BUILDER_OK.has(ev.overallFeedbackVisibility) && !!ev.overallFeedback;
  const criterionShared = (ev.scores ?? []).some((s) => BUILDER_OK.has(s.feedbackVisibility) && !!s.feedback);
  return scoresShared || overallShared || criterionShared;
}

export function toBuilderView(ev, { opportunity = null, project = null, evaluatorName = null } = {}) {
  const showScores = BUILDER_OK.has(ev.scoreVisibility);
  return {
    id: String(ev._id),
    submissionId: idOf(ev.submissionId),
    templateName: ev.templateName,
    opportunity,
    project,
    completedAt: ev.completedAt,
    scoresVisible: showScores,
    overallScore: showScores ? ev.overallScore : null,
    maxScore: ev.maxScore ?? 100,
    criteria: [...(ev.scores ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        name: s.name,
        description: s.description ?? null,
        weight: s.weight,
        maxScore: s.maxScore,
        score: showScores ? s.score : null,
        weightedScore: showScores ? s.weightedScore : null,
        feedback: BUILDER_OK.has(s.feedbackVisibility) ? (s.feedback ?? null) : null,
      })),
    overallFeedback: BUILDER_OK.has(ev.overallFeedbackVisibility) ? (ev.overallFeedback ?? null) : null,
    evaluator: ev.showEvaluatorIdentity && evaluatorName ? { name: evaluatorName } : null,
  };
}

export function toPublicView(ev, { opportunity = null } = {}) {
  return {
    templateName: ev.templateName,
    opportunity,
    completedAt: ev.completedAt,
    overallScore: ev.overallScore,
    maxScore: ev.maxScore ?? 100,
    criteria: [...(ev.scores ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        name: s.name,
        weight: s.weight,
        maxScore: s.maxScore,
        score: s.score,
        weightedScore: s.weightedScore,
        feedback: s.feedbackVisibility === 'PUBLIC' ? (s.feedback ?? null) : null,
      })),
    overallFeedback: ev.overallFeedbackVisibility === 'PUBLIC' ? (ev.overallFeedback ?? null) : null,
  };
}

async function oppMinis(db, rows) {
  const ids = [...new Set(rows.map((r) => idOf(r.opportunityId)).filter(Boolean))];
  const opps = ids.length ? await db.Opportunity.find({ _id: { $in: ids } }).select({ title: 1, slug: 1, type: 1, organizationName: 1 }).lean() : [];
  return new Map(
    opps.map((o) => [String(o._id), { id: String(o._id), slug: o.slug, title: o.title, type: o.type, organizationName: o.organizationName }]),
  );
}

async function evaluatorNames(db, rows) {
  const ids = [...new Set(rows.filter((r) => r.showEvaluatorIdentity).map((r) => idOf(r.evaluatorId)))];
  const users = ids.length ? await db.User.find({ _id: { $in: ids } }).select({ name: 1 }).lean() : [];
  return new Map(users.map((u) => [String(u._id), u.name]));
}

/**
 * Evaluations to show on a project page. The team sees builder-visible results; everyone else
 * only PUBLIC ones.
 */
export async function evaluationsForProject(db, projectId, { team }) {
  const rows = await db.Evaluation.find({ projectId, status: 'COMPLETED' }).sort({ completedAt: -1 }).lean();
  const opps = await oppMinis(db, rows);
  if (team) {
    const visible = rows.filter(builderCanSee);
    const names = await evaluatorNames(db, visible);
    return visible.map((ev) =>
      toBuilderView(ev, { opportunity: opps.get(idOf(ev.opportunityId)) ?? null, evaluatorName: names.get(idOf(ev.evaluatorId)) }),
    );
  }
  return rows
    .filter((ev) => ev.scoreVisibility === 'PUBLIC')
    .map((ev) => toPublicView(ev, { opportunity: opps.get(idOf(ev.opportunityId)) ?? null }));
}

export { oppMinis, evaluatorNames };
