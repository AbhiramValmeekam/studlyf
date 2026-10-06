import { Router } from 'express';
import { z } from 'zod';
import { PUBLISH_STATUSES } from '../../database/schema/index.js';
import { AppError } from '../../common/errors/app-error.js';
import { ok } from '../../common/http/respond.js';
import { parse, toFieldErrors } from '../../common/validation/index.js';
import { recordAdminChange } from '../../common/utilities/admin-change.js';
import { SECTION_KEYS, SECTION_SCHEMAS } from './homepage.sections.js';
import * as service from './homepage.service.js';

const sectionParams = z.object({ section: z.enum(SECTION_KEYS) });
const putBody = z.object({ content: z.unknown(), status: z.enum(PUBLISH_STATUSES).optional() }).strict();

export function homepagePublicRouter(deps) {
  const r = Router();
  r.get('/home', async (_req, res) => {
    ok(res, await service.getHome(deps));
  });
  return r;
}

export function homepageAdminRouter(deps) {
  const { db } = deps;
  const r = Router();

  r.get('/', async (_req, res) => {
    ok(res, { sections: await service.listSections(db), availableSections: SECTION_KEYS });
  });

  r.get('/:section', async (req, res) => {
    const { section } = parse(sectionParams, req.params);
    ok(res, await service.getSection(db, section));
  });

  r.put('/:section', async (req, res) => {
    const { section } = parse(sectionParams, req.params);
    const body = parse(putBody, req.body);
    const result = SECTION_SCHEMAS[section].safeParse(body.content);
    if (!result.success) {
      throw AppError.validation(toFieldErrors(result.error).map((e) => ({ ...e, field: `content.${e.field}` })));
    }
    const row = await service.upsertSection(db, section, result.data, body.status, req.auth.user.id);
    await recordAdminChange(deps, req, { action: 'homepage.update', entityType: 'homepage_section', entityId: section, changes: body });
    ok(res, row);
  });

  for (const [verb, published] of [['publish', true], ['unpublish', false]]) {
    r.post(`/:section/${verb}`, async (req, res) => {
      const { section } = parse(sectionParams, req.params);
      const row = await service.setSectionPublished(db, section, published, req.auth.user.id);
      await recordAdminChange(deps, req, { action: `homepage.${verb}`, entityType: 'homepage_section', entityId: section });
      ok(res, row);
    });
  }

  return r;
}
