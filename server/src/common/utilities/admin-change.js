import { PUBLIC_CACHE_PREFIX } from '../cache/cache.js';

const REDACT = new Set(['password', 'passwordHash', 'token']);

function redact(changes) {
  if (!changes) return null;
  return Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, REDACT.has(k) ? '[redacted]' : v]));
}

/**
 * Low-level audit write for actions that don't come through an HTTP request (system events such
 * as auto-issued achievements) or where the actor is known explicitly.
 */
export async function writeAudit(db, { actorUserId = null, action, entityType, entityId = null, changes = null, requestId = null, ip = null, userAgent = null }) {
  await db.AuditLog.create({
    actorUserId,
    action,
    entityType,
    entityId: entityId ? String(entityId) : null,
    changes: redact(changes),
    ip,
    userAgent,
    requestId,
  });
}

/** Audit an action taken by the signed-in caller (builder, evaluator or admin). */
export async function recordAudit(deps, req, change) {
  await writeAudit(deps.db, {
    actorUserId: req.auth?.user.id ?? null,
    action: change.action,
    entityType: change.entityType,
    entityId: change.entityId ?? null,
    changes: change.changes,
    ip: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
    requestId: String(req.id ?? ''),
  });
}

/**
 * Every admin mutation goes through here: it writes the audit trail and drops the
 * public read cache so the homepage reflects the change immediately.
 */
export async function recordAdminChange(deps, req, change) {
  await recordAudit(deps, req, change);
  await deps.cache.deleteByPrefix(PUBLIC_CACHE_PREFIX);
}
