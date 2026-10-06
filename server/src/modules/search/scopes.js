import { loadMedia, pick } from '../../common/utilities/media.js';
import { pagedList } from '../../common/utilities/listing.js';
import { prefixSearchFilter } from '../../common/utilities/text.js';
import { toPublicCards } from '../builder-profiles/builder-profiles.service.js';
import { listFeed } from '../community/community.service.js';
import { foundersUsers, toCard as founderCard } from '../founder/founder.views.js';

/**
 * The entity scopes of unified search (spec §56). Each scope owns two things and nothing else:
 * the visibility predicate that decides what may be found, and the query that returns a page.
 *
 * Two rules hold for every scope here:
 *  1. **Search never widens visibility.** A scope's `match` is the same predicate the entity's own
 *     public page uses — PUBLIC profiles, verified organizations, discoverable projects — because
 *     /search is unauthenticated and cached, so anything appearing here is world-readable.
 *  2. **A card is not a document.** Scopes return the entity's own result-card shape, shared with
 *     that entity's list views, never contact details or private fields.
 */

/** Users who are not ACTIVE (suspended, deleted) never appear in public search. */
async function inactiveUserIds(db) {
  const rows = await db.User.find({ status: { $ne: 'ACTIVE' } }).select({ _id: 1 }).lean();
  return rows.map((u) => u._id);
}

export const SCOPES = {
  builders: {
    async list(db, { q, page, pageSize }) {
      const match = { visibility: 'PUBLIC', ...(prefixSearchFilter(q) ?? {}) };
      const inactive = await inactiveUserIds(db);
      if (inactive.length) match.userId = { $nin: inactive };
      const { rows, total } = await pagedList(db.BuilderProfile, {
        match,
        sort: { updatedAt: -1 },
        rankQuery: q,
        page,
        pageSize,
      });
      // `id` rides alongside the card, never inside it, so a result can be saved without the
      // card shape leaking a database id to every other consumer of that shape.
      const cards = await toPublicCards(db, rows);
      return { items: rows.map((r, i) => ({ id: String(r._id), ...cards[i] })), total };
    },
  },

  founders: {
    async list(db, { q, page, pageSize }) {
      const match = {
        discoverable: true,
        visibility: 'PUBLIC',
        slug: { $type: 'string' },
        onboardingCompletedAt: { $ne: null },
        ...(prefixSearchFilter(q) ?? {}),
      };
      const inactive = await inactiveUserIds(db);
      if (inactive.length) match.userId = { $nin: inactive };
      const { rows, total } = await pagedList(db.FounderProfile, {
        match,
        sort: { updatedAt: -1 },
        rankQuery: q,
        page,
        pageSize,
      });
      const users = await foundersUsers(db, rows);
      return {
        items: rows.map((p) => {
          const u = users.get(String(p.userId));
          return { id: String(p._id), ...founderCard(p, u, u?.photo) };
        }),
        total,
      };
    },
  },

  organizations: {
    async list(db, { q, page, pageSize }) {
      const match = { status: 'ACTIVE', ...(prefixSearchFilter(q) ?? {}) };
      const { rows, total } = await pagedList(db.Organization, {
        match,
        sort: { updatedAt: -1 },
        rankQuery: q,
        page,
        pageSize,
      });
      const media = await loadMedia(db, rows.map((r) => r.logoId));
      return {
        items: rows.map((o) => ({
          id: String(o._id),
          slug: o.slug,
          name: o.name,
          type: o.type,
          city: o.city ?? null,
          description: o.description ?? null,
          logo: pick(media, o.logoId),
        })),
        total,
      };
    },
  },

  projects: {
    // The community feed already owns discovery (visibility + published + moderation) and its
    // card shape, so the scope delegates rather than restating the rules (§96).
    list: (db, { q, page, pageSize }) => listFeed(db, null, { q, page, pageSize }),
  },
};
