import { AppError } from '../../common/errors/app-error.js';
import { loadMedia, pick } from '../../common/utilities/media.js';
import { isPublished } from '../../common/utilities/publishing.js';
import { toPublicCards } from '../builder-profiles/builder-profiles.service.js';
import { toCards } from '../community/community.service.js';
import { toCard as founderCard, foundersUsers } from '../founder/founder.views.js';
import { discoverableFilter } from '../projects/access.js';
import * as courses from '../courses/courses.service.js';
import * as jobs from '../jobs/jobs.service.js';
import * as mock from '../mock/mock.service.js';
import * as opportunities from '../opportunities/opportunities.service.js';
import * as ott from '../ott/ott.service.js';
import * as projectBriefs from '../project-briefs/project-briefs.service.js';
import * as resources from '../resources/resources.service.js';
import * as roadmaps from '../roadmaps/roadmaps.service.js';
import * as studhub from '../studhub/studhub.service.js';

/**
 * What can be saved (spec §57), and how each one is resolved.
 *
 * Every entry answers two questions and nothing more:
 *   `match()` — may this entity be saved at all? The predicate is the entity's own public one, so
 *               saving can never make something reachable that browsing cannot.
 *   `cards()` — how a batch of already-fetched documents becomes the same cards the entity's own
 *               list renders, so a saved opportunity looks like an opportunity everywhere (§96).
 *
 * `href` builds the link from the card, never from a raw id, so a slug rename cannot leave a
 * saved row pointing at a dead page.
 */
const contentScope = (model, service, href) => ({
  model,
  match: () => isPublished(),
  cards: (db, rows) => service.toPublicList(db, rows),
  href,
});

export const SAVE_TARGETS = {
  OPPORTUNITY: contentScope('Opportunity', opportunities, (c) => `/opportunities/${c.slug}`),
  RESOURCE: contentScope('Resource', resources, (c) => `/resources/${c.slug}`),
  COURSE: contentScope('Course', courses, (c) => `/courses/${c.slug}`),
  STUDHUB: contentScope('StudhubBenefit', studhub, (c) => `/studhub/${c.slug}`),
  OTT: contentScope('Ott', ott, (c) => `/ott/${c.slug}`),
  MOCK_DRILL: contentScope('MockDrill', mock, (c) => `/mock-drills/${c.slug}`),
  PROJECT_BRIEF: contentScope('ProjectBrief', projectBriefs, (c) => `/project-briefs/${c.slug}`),
  ROADMAP: contentScope('RoadmapTemplate', roadmaps, (c) => `/builders/roadmap?role=${c.slug}`),
  // A job post is its own entity (spec §73) but resolves through the same card contract.
  JOB: contentScope('Job', jobs, (c) => `/jobs/${c.slug}`),

  // A project is saveable when it is discoverable — the same rules as the community feed.
  PROJECT: {
    model: 'Project',
    match: () => discoverableFilter(),
    cards: (db, rows) => toCards(db, rows),
    href: (c) => `/projects/${c.slug}`,
  },

  // A founder is saveable when an investor could have found them in the first place.
  FOUNDER: {
    model: 'FounderProfile',
    match: () => ({ discoverable: true, onboardingCompletedAt: { $ne: null } }),
    async cards(db, rows) {
      const users = await foundersUsers(db, rows);
      return rows.map((p) => {
        const u = users.get(String(p.userId));
        return founderCard(p, u, u?.photo);
      });
    },
    href: (c) => `/founders/${c.slug}`,
  },

  BUILDER: {
    model: 'BuilderProfile',
    match: () => ({ visibility: 'PUBLIC' }),
    cards: (db, rows) => toPublicCards(db, rows),
    href: (c) => `/builders/${c.username}`,
  },

  ORGANIZATION: {
    model: 'Organization',
    match: () => ({ status: 'ACTIVE' }),
    async cards(db, rows) {
      const media = await loadMedia(db, rows.map((r) => r.logoId));
      return rows.map((o) => ({
        slug: o.slug,
        name: o.name,
        type: o.type,
        city: o.city ?? null,
        description: o.description ?? null,
        logo: pick(media, o.logoId),
      }));
    },
    href: (c) => `/organizations/${c.slug}`,
  },
};

export const entityTypes = () => Object.keys(SAVE_TARGETS);

/** The target for an entity type, or a 400 naming the field when there is no such target. */
export function targetOf(entityType) {
  const target = SAVE_TARGETS[entityType];
  if (!target) {
    throw AppError.validation([{ field: 'entityType', message: 'That kind of thing cannot be saved.' }]);
  }
  return target;
}

/** The ids among `ids` that the target's visibility predicate actually allows. */
export async function visibleIds(db, entityType, ids) {
  const target = targetOf(entityType);
  const rows = await db[target.model]
    .find({ _id: { $in: ids }, ...target.match() })
    .select({ _id: 1 })
    .lean();
  return new Set(rows.map((r) => String(r._id)));
}
