import { AppError } from '../../common/errors/app-error.js';

/**
 * Project status pipeline.
 *
 * Builders move their own work between DRAFT / IN_PROGRESS / COMPLETED. Everything past that is
 * driven by actions: the publish action (PUBLISHED), the submission flow (SUBMITTED →
 * UNDER_REVIEW) and evaluation (EVALUATED). System transitions are FORWARD-ONLY — a project
 * that is already UNDER_REVIEW is never pushed back to SUBMITTED by a second submission, and an
 * ARCHIVED project is never revived by an event.
 *
 * Status is the work/review stage only. Who can see a project is decided by visibility +
 * publishedAt + moderation (see access.js), so an evaluated project stays public.
 * `completedAt` records that the builder declared the work finished, independently of the stage.
 */
export const PIPELINE_RANK = {
  DRAFT: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  PUBLISHED: 3,
  SUBMITTED: 4,
  UNDER_REVIEW: 5,
  EVALUATED: 6,
};

const WORK_STATES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'];
const IN_REVIEW = ['SUBMITTED', 'UNDER_REVIEW', 'EVALUATED'];

/** The status a project should have after an event targeting `target` (never regresses). */
export function advancedStatus(current, target) {
  if (current === 'ARCHIVED') return current;
  return (PIPELINE_RANK[target] ?? -1) > (PIPELINE_RANK[current] ?? -1) ? target : current;
}

/** Atomically advance a project's status, only if it is currently at a lower stage. */
export async function advanceProjectStatus(db, projectId, target) {
  const lower = Object.entries(PIPELINE_RANK)
    .filter(([, rank]) => rank < PIPELINE_RANK[target])
    .map(([status]) => status);
  await db.Project.updateOne({ _id: projectId, status: { $in: lower } }, { $set: { status: target } });
}

/**
 * The $set produced by a builder choosing a work state (DRAFT / IN_PROGRESS / COMPLETED).
 *   - Before publishing (or when archived) the status simply changes; un-archiving is allowed.
 *   - Once published or in review, the stage is owned by the platform: marking the work
 *     COMPLETED just records `completedAt`; going back to DRAFT/IN_PROGRESS is refused.
 */
export function builderStatusChange(project, target) {
  const set = {};
  const markCompleted = target === 'COMPLETED' && !project.completedAt;
  if (WORK_STATES.includes(project.status) || project.status === 'ARCHIVED') {
    set.status = target;
    if (project.status === 'ARCHIVED') set.archivedAt = null;
    if (markCompleted) set.completedAt = new Date();
    return set;
  }
  if (target === 'COMPLETED') {
    if (markCompleted) set.completedAt = new Date();
    return set;
  }
  if (project.status === 'PUBLISHED') {
    throw new AppError('CONFLICT', 'Published projects can’t go back to draft — make the project private first.');
  }
  if (IN_REVIEW.includes(project.status)) {
    throw new AppError('CONFLICT', 'This project is in review, so its status is managed by the review process.');
  }
  return set;
}

/** Making a project PRIVATE takes it out of the "Published" stage (back to its work state). */
export function unpublishStatus(project) {
  return project.status === 'PUBLISHED' ? (project.completedAt ? 'COMPLETED' : 'IN_PROGRESS') : project.status;
}

/** Publishing moves pre-publication work states (and archived projects) into PUBLISHED. */
export function publishStatus(project) {
  return WORK_STATES.includes(project.status) || project.status === 'ARCHIVED' ? 'PUBLISHED' : project.status;
}
