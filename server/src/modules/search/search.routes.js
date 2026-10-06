import { Router } from 'express';
import { z } from 'zod';
import { OPPORTUNITY_TYPES, RESOURCE_TYPES } from '../../database/schema/index.js';
import { ok } from '../../common/http/respond.js';
import { paginationQuery, parse } from '../../common/validation/index.js';
import { enumParam, searchText } from '../../common/validation/query.js';
import * as opportunitiesRepo from '../opportunities/opportunities.repository.js';
import * as opportunitiesService from '../opportunities/opportunities.service.js';
import { OPPORTUNITY_LIFECYCLE } from '../opportunities/opportunities.schemas.js';
import * as resourcesRepo from '../resources/resources.repository.js';
import * as resourcesService from '../resources/resources.service.js';
import { SCOPES } from './scopes.js';

const ALL_TYPES = [...OPPORTUNITY_TYPES, ...RESOURCE_TYPES];
const SCOPES_QUERY = ['all', 'opportunities', 'resources', 'builders', 'founders', 'organizations', 'projects'];

const searchQuery = z.object({
  q: searchText,
  scope: z.enum(SCOPES_QUERY).default('all'),
  type: enumParam(ALL_TYPES).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase() : v), z.enum(OPPORTUNITY_LIFECYCLE)).optional(),
  page: paginationQuery.page,
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const isOpportunityType = (t) => OPPORTUNITY_TYPES.includes(t);
const isResourceType = (t) => RESOURCE_TYPES.includes(t);

/**
 * Unified public search (spec §56) across every surface a visitor can browse: opportunities,
 * resources, builders, founders, organizations and community projects.
 *  - `type` narrows to whichever content kind owns that type.
 *  - `status` (open|closed|upcoming) is an opportunity lifecycle filter, so it also
 *    narrows the search to opportunities.
 * Each entity scope carries its own visibility predicate in `scopes.js` — the response only
 * ever contains what that entity's public page would show, since this route is cached and
 * unauthenticated. The service is the only place that knows about the sources, so moving to a
 * dedicated search engine later doesn't change the API contract.
 */
export function searchPublicRouter({ db }) {
  const r = Router();

  r.get('/search', async (req, res) => {
    const f = parse(searchQuery, req.query);

    // A `type`/`status` filter only ever belongs to opportunities/resources, so it silences the
    // entity scopes rather than silently returning unrelated people and companies under "all".
    const filtered = !!f.type || !!f.status;
    const wants = (key) => {
      if (f.scope !== 'all' && f.scope !== key) return false;
      if (filtered && key !== 'opportunities' && key !== 'resources') return false;
      if (key === 'opportunities') return !f.type || isOpportunityType(f.type);
      if (key === 'resources') return (!f.type || isResourceType(f.type)) && !f.status;
      return true;
    };

    const page = { page: f.page, pageSize: f.pageSize };

    const [opp, resrc, builders, founders, organizations, projects] = await Promise.all([
      wants('opportunities')
        ? opportunitiesRepo.listPublic(db, {
            q: f.q,
            type: f.type && isOpportunityType(f.type) ? f.type : undefined,
            category: f.category,
            status: f.status,
            ...page,
          })
        : null,
      wants('resources')
        ? resourcesRepo.listPublic(db, {
            q: f.q,
            type: f.type && isResourceType(f.type) ? f.type : undefined,
            category: f.category,
            ...page,
          })
        : null,
      wants('builders') ? SCOPES.builders.list(db, { q: f.q, ...page }) : null,
      wants('founders') ? SCOPES.founders.list(db, { q: f.q, ...page }) : null,
      wants('organizations') ? SCOPES.organizations.list(db, { q: f.q, ...page }) : null,
      wants('projects') ? SCOPES.projects.list(db, { q: f.q, ...page }) : null,
    ]);

    const EMPTY = { items: [], total: 0 };
    const data = {
      opportunities: opp ? { items: await opportunitiesService.toPublicList(db, opp.rows), total: opp.total } : EMPTY,
      resources: resrc ? { items: await resourcesService.toPublicList(db, resrc.rows), total: resrc.total } : EMPTY,
      builders: builders ?? EMPTY,
      founders: founders ?? EMPTY,
      organizations: organizations ?? EMPTY,
      projects: projects ?? EMPTY,
    };

    ok(res, data, {
      query: f.q ?? '',
      scope: f.scope,
      page: f.page,
      pageSize: f.pageSize,
      // How many groups answered, so a client can tell "one kind of thing matched" from "all of them".
      scopes: Object.entries(data).filter(([, g]) => g.total > 0).map(([key]) => key),
      total: Object.values(data).reduce((n, g) => n + g.total, 0),
    });
  });

  return r;
}

