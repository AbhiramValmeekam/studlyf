import { randomInt } from 'node:crypto';
import { AppError } from '../../common/errors/app-error.js';
import { idOf } from '../../common/utilities/media.js';
import { writeAudit } from '../../common/utilities/admin-change.js';
import { createNotification } from '../notifications/notifications.service.js';

// ---- codes -----------------------------------------------------------------------------

// No O/0 or I/1: these codes are read off a printed certificate and typed by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;

const newCode = () => Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** Tolerate however a human retypes it: lower case, spaces, dashes. */
const normalize = (v) => String(v ?? '').replace(/[\s-]/g, '').toUpperCase();

/**
 * The platform results that are worth a credential, and the certificate type each mints.
 * Anything else (a completed project, a self-added achievement) stays an achievement only.
 */
const MINTED = {
  WINNER: 'WINNER',
  FINALIST: 'FINALIST',
  SHORTLISTED: 'SHORTLIST',
  HACKATHON_PARTICIPATION: 'PARTICIPATION',
  PROJECT_COMPLETED: 'COMPLETION',
  CERTIFICATE: 'MERIT',
};

// ---- issuing ---------------------------------------------------------------------------

function certificateView(c) {
  return {
    id: String(c._id),
    title: c.title,
    type: c.type,
    status: c.status,
    recipient: c.recipientName,
    issuer: c.issuerName,
    date: c.issueDate,
    opportunity: c.metadata?.opportunityTitle ?? null,
    verified: c.status === 'ACTIVE',
    verificationCode: c.verificationCode,
    revokedAt: c.revokedAt ?? null,
    revokedReason: c.revokedReason ?? null,
  };
}

/**
 * Mint the credential behind a platform-issued achievement (spec §18).
 *
 * Idempotent: the unique `achievementId` index means the same achievement can never mint twice,
 * so a retried result event is a no-op. Returns the certificate, or null when there was nothing
 * to mint.
 */
export async function issueForAchievement(db, achievement) {
  const type = MINTED[achievement?.type];
  if (!type || !achievement.achievementId) return null;
  if (await db.Certificate.exists({ achievementId: achievement.achievementId })) return null;

  const opportunityId = idOf(achievement.opportunityId);
  const opportunity = opportunityId ? await db.Opportunity.findById(opportunityId).select({ title: 1, organizationId: 1, organizationName: 1 }).lean() : null;
  const user = await db.User.findById(achievement.userId).select({ name: 1 }).lean();
  if (!user) return null;

  const doc = {
    userId: achievement.userId,
    organizationId: opportunity?.organizationId ?? null,
    opportunityId,
    achievementId: achievement.achievementId,
    type,
    title: achievement.title,
    recipientName: user.name,
    issuerName: opportunity?.organizationName ?? 'STUDLYF',
    issueDate: achievement.date ?? new Date(),
    metadata: { achievementType: achievement.type, opportunityTitle: opportunity?.title ?? null },
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let created;
    try {
      created = await db.Certificate.create({ ...doc, verificationCode: newCode() });
    } catch (err) {
      // Another writer minted for this achievement first — nothing left to do.
      if (err?.code === 11000 && err?.keyPattern?.achievementId) return null;
      // A code collision is astronomically unlikely but harmless: draw another one.
      if (err?.code === 11000) continue;
      throw err;
    }
    await writeAudit(db, {
      actorUserId: null,
      action: 'certificate.issue',
      entityType: 'certificate',
      entityId: created._id,
      changes: { userId: String(doc.userId), type, achievementId: String(doc.achievementId) },
    });
    await createNotification(db, {
      userId: doc.userId,
      type: 'ACHIEVEMENT',
      title: `Certificate issued: ${doc.title}`,
      body: `Verify it any time with the code ${created.verificationCode}.`,
      data: { certificateId: String(created._id), verificationCode: created.verificationCode },
      dedupeKey: `CERTIFICATE:${created._id}`,
    });
    return created;
  }
  return null;
}

// ---- organization view -------------------------------------------------------------------

export async function listForOrg(db, org, { page, pageSize }) {
  const filter = { organizationId: org._id };
  const [rows, total] = await Promise.all([
    db.Certificate.find(filter).sort({ issueDate: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    db.Certificate.countDocuments(filter),
  ]);
  return { items: rows.map(certificateView), total };
}

/** Revoking keeps the record: the code resolves, but verification reports it as revoked. */
export async function revokeForOrg(db, org, id, reason) {
  const row = await db.Certificate.findOne({ _id: id, organizationId: org._id }).lean();
  if (!row) throw AppError.notFound('Certificate');
  if (row.status === 'REVOKED') throw new AppError('CONFLICT', 'This certificate is already revoked.');
  await db.Certificate.updateOne({ _id: id }, { $set: { status: 'REVOKED', revokedAt: new Date(), revokedReason: reason ?? null } });
  return certificateView(await db.Certificate.findById(id).lean());
}

// ---- public verification ------------------------------------------------------------------

/**
 * Resolve a verification code without a session. A revoked certificate still resolves — the
 * caller needs to be told it *was* issued and is no longer valid, which a 404 would hide.
 */
export async function verify(db, rawCode) {
  const verificationCode = normalize(rawCode);
  const row = verificationCode ? await db.Certificate.findOne({ verificationCode }).lean() : null;
  if (!row) throw AppError.notFound('Certificate');
  return {
    valid: row.status === 'ACTIVE',
    status: row.status,
    verificationCode: row.verificationCode,
    title: row.title,
    type: row.type,
    recipient: row.recipientName,
    issuer: row.issuerName,
    opportunity: row.metadata?.opportunityTitle ?? null,
    issueDate: row.issueDate,
    revokedAt: row.revokedAt ?? null,
    revokedReason: row.revokedReason ?? null,
  };
}
