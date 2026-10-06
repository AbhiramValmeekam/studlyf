import { cached } from '../../common/cache/cache.js';
import { AppError } from '../../common/errors/app-error.js';
import { loadMedia, pick } from '../../common/utilities/media.js';
import { isPublished, resolvePublishFields } from '../../common/utilities/publishing.js';
import * as opportunitiesRepo from '../opportunities/opportunities.repository.js';
import * as opportunitiesService from '../opportunities/opportunities.service.js';
import * as resourcesRepo from '../resources/resources.repository.js';
import * as resourcesService from '../resources/resources.service.js';
import { listPublicPartners } from '../partners/partners.module.js';
import { listPublicPaths } from '../paths/paths.module.js';
import { listPublicStats } from '../stats/stats.module.js';
import { listPublicTestimonials } from '../testimonials/testimonials.module.js';
import { toResponseKey } from './homepage.sections.js';

export const HOME_LIMITS = { opportunities: 6, resources: 6, testimonials: 8, partners: 24 };

async function publishedSections(db) {
  const rows = await db.HomepageContent.find(isPublished()).select({ sectionKey: 1, content: 1 }).lean();
  const heroImageIds = rows.map((r) => r.content.backgroundImageId);
  const media = await loadMedia(db, heroImageIds);

  const sections = {};
  for (const row of rows) {
    const { backgroundImageId, ...content } = row.content;
    sections[toResponseKey(row.sectionKey)] =
      row.sectionKey === 'hero' ? { ...content, backgroundImage: pick(media, backgroundImageId) } : content;
  }
  return sections;
}

/**
 * Everything the homepage needs in one round-trip. Queries run in parallel and the
 * assembled payload is cached; any admin write clears it.
 */
export function getHome({ db, cache, config }) {
  return cached(cache, 'public:home', config.cache.publicTtlSeconds, async () => {
    const [sections, paths, oppRows, stats, resRows, testimonials, partners] = await Promise.all([
      publishedSections(db),
      listPublicPaths(db),
      opportunitiesRepo.listFeatured(db, HOME_LIMITS.opportunities),
      listPublicStats(db),
      resourcesRepo.listFeatured(db, HOME_LIMITS.resources),
      listPublicTestimonials(db, { featured: true, limit: HOME_LIMITS.testimonials }),
      listPublicPartners(db, { featured: true, limit: HOME_LIMITS.partners }),
    ]);
    const [featuredOpportunities, featuredResources] = await Promise.all([
      opportunitiesService.toPublicList(db, oppRows),
      resourcesService.toPublicList(db, resRows),
    ]);
    const { hero = null, ...otherSections } = sections;
    return {
      hero,
      paths,
      featuredOpportunities,
      stats,
      featuredResources,
      testimonials,
      partners,
      sections: otherSections,
    };
  });
}

// ---- admin ------------------------------------------------------------------

/** Admin view of a section document (ids as strings). */
export function sectionView(row) {
  return {
    id: String(row._id),
    sectionKey: row.sectionKey,
    content: row.content,
    status: row.status,
    publishedAt: row.publishedAt,
    updatedBy: row.updatedBy ? String(row.updatedBy) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listSections(db) {
  const rows = await db.HomepageContent.find().sort({ sectionKey: 1 }).lean();
  return rows.map(sectionView);
}

export async function getSection(db, key) {
  const row = await db.HomepageContent.findOne({ sectionKey: key }).lean();
  if (!row) throw AppError.notFound('Homepage section');
  return sectionView(row);
}

export async function upsertSection(
  db,
  key,
  content,
  status,
  actorId,
) {
  const existing = await db.HomepageContent.findOne({ sectionKey: key }).lean();
  const publish = resolvePublishFields({ status: status ?? (existing ? undefined : 'DRAFT') }, existing);
  const row = await db.HomepageContent.findOneAndUpdate(
    { sectionKey: key },
    { $set: { content, ...publish, updatedBy: actorId }, $setOnInsert: { sectionKey: key } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  return sectionView(row);
}

export async function setSectionPublished(db, key, published, actorId) {
  const row = await db.HomepageContent.findOneAndUpdate(
    { sectionKey: key },
    { $set: published ? { status: 'PUBLISHED', publishedAt: new Date(), updatedBy: actorId } : { status: 'DRAFT', updatedBy: actorId } },
    { new: true },
  ).lean();
  if (!row) throw AppError.notFound('Homepage section');
  return sectionView(row);
}
