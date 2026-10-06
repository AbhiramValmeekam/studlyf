import { AppError } from '../../common/errors/app-error.js';
import { createNotification } from '../notifications/notifications.service.js';
import { syncRole } from './ecosystems.service.js';

/**
 * STUDLYF-side verification of controlled ecosystems: investor access, HR access and
 * organizations. Admins review the request; ACTIVE grants the ecosystem role, anything else
 * removes it. Every change notifies the applicant (and every member, for organizations).
 */
const KINDS = {
  INVESTOR: { model: 'InvestorProfile', role: 'INVESTOR', label: 'investor access', path: '/investors/access-request/status' },
  HR: { model: 'HrProfile', role: 'HR', label: 'HR access', path: '/hr/verification' },
  ORGANIZER: { model: 'Organization', role: 'ORGANIZER', label: 'organization verification', path: '/organizations/onboarding' },
};

/** Allowed admin moves. Re-review (REJECTED → ACTIVE) and reinstatement (SUSPENDED → ACTIVE) are allowed. */
const TRANSITIONS = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED'],
  REJECTED: ['ACTIVE', 'PENDING'],
  SUSPENDED: ['ACTIVE'],
};

const kindOf = (ecosystem) => {
  const k = KINDS[ecosystem];
  if (!k) throw AppError.validation([{ field: 'ecosystem', message: 'Must be INVESTOR, HR or ORGANIZER' }]);
  return k;
};

function details(ecosystem, row) {
  if (ecosystem === 'INVESTOR') {
    return {
      firmName: row.firmName,
      title: row.title ?? null,
      investorType: row.investorType,
      website: row.website ?? null,
      linkedin: row.linkedin ?? null,
      stages: row.stages ?? [],
      sectors: row.sectors ?? [],
      geographies: row.geographies ?? [],
      checkSize: row.checkSize ?? null,
      thesis: row.thesis ?? null,
    };
  }
  if (ecosystem === 'HR') {
    return {
      companyName: row.companyName,
      designation: row.designation,
      workEmail: row.workEmail,
      companyWebsite: row.companyWebsite ?? null,
      linkedin: row.linkedin ?? null,
      companySize: row.companySize ?? null,
      hiringFor: row.hiringFor ?? null,
    };
  }
  return {
    name: row.name,
    slug: row.slug,
    type: row.type,
    website: row.website ?? null,
    city: row.city ?? null,
    contactEmail: row.contactEmail,
    description: row.description ?? null,
  };
}

async function applicantsOf(db, ecosystem, rows) {
  const userIds = ecosystem === 'ORGANIZER' ? rows.map((r) => r.createdBy) : rows.map((r) => r.userId);
  const users = await db.User.find({ _id: { $in: userIds } }).select({ name: 1, email: 1 }).lean();
  return new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, email: u.email }]));
}

function toItem(ecosystem, row, applicants) {
  const applicantId = String(ecosystem === 'ORGANIZER' ? row.createdBy : row.userId);
  return {
    id: String(row._id),
    ecosystem,
    status: row.status,
    statusNote: row.statusNote ?? null,
    submittedAt: row.submittedAt,
    reviewedAt: row.reviewedAt ?? null,
    applicant: applicants.get(applicantId) ?? null,
    details: details(ecosystem, row),
    nextStatuses: TRANSITIONS[row.status] ?? [],
  };
}

/** Admin queue across all three kinds (small, admin-only volume: capped at 500 per kind). */
export async function listRequests(db, { ecosystem, status, page, pageSize }) {
  const kinds = ecosystem ? [ecosystem] : Object.keys(KINDS);
  const filter = status ? { status } : {};
  const batches = await Promise.all(
    kinds.map(async (eco) => {
      const rows = await db[kindOf(eco).model].find(filter).sort({ submittedAt: -1 }).limit(500).lean();
      const applicants = await applicantsOf(db, eco, rows);
      return rows.map((r) => toItem(eco, r, applicants));
    }),
  );
  const all = batches.flat().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const counts = { PENDING: 0, ACTIVE: 0, REJECTED: 0, SUSPENDED: 0 };
  for (const i of all) counts[i.status] += 1;
  return { items: all.slice((page - 1) * pageSize, page * pageSize), total: all.length, counts };
}

async function notify(db, userIds, ecosystem, status, note) {
  const { label, path } = KINDS[ecosystem];
  const titles = {
    ACTIVE: `Your ${label} is approved`,
    REJECTED: `Your ${label} request was not approved`,
    SUSPENDED: `Your ${label} has been suspended`,
    PENDING: `Your ${label} request is back in review`,
  };
  for (const userId of userIds) {
    await createNotification(db, {
      userId,
      type: 'ACCESS_STATUS',
      title: titles[status],
      body: note ?? null,
      data: { ecosystem, status, path },
    });
  }
}

/** Admin decision. Returns `{ item, before }` so the route can audit the change. */
export async function setStatus(db, adminId, ecosystem, id, { status, note }) {
  const kind = kindOf(ecosystem);
  const model = db[kind.model];
  const row = await model.findById(id).lean();
  if (!row) throw AppError.notFound('Access request');
  if (!(TRANSITIONS[row.status] ?? []).includes(status)) {
    throw new AppError('CONFLICT', `Cannot move a ${row.status.toLowerCase()} request to ${status.toLowerCase()}.`);
  }
  if ((status === 'REJECTED' || status === 'SUSPENDED') && !note) {
    throw AppError.validation([{ field: 'note', message: 'Tell the applicant why — this note is shown to them.' }]);
  }
  const now = new Date();
  const { modifiedCount } = await model.updateOne(
    { _id: id, status: row.status },
    { $set: { status, statusNote: note ?? null, reviewedBy: adminId, reviewedAt: now } },
  );
  if (!modifiedCount) throw new AppError('CONFLICT', 'This request was just changed by someone else — reload and try again.');

  const granted = status === 'ACTIVE';
  let userIds;
  if (ecosystem === 'ORGANIZER') {
    const members = await db.OrganizationMember.find({ organizationId: id }).select({ userId: 1 }).lean();
    userIds = members.map((m) => m.userId);
    for (const userId of userIds) {
      // Keep ORGANIZER while the person still belongs to another active organization.
      const otherActive = granted
        ? true
        : await db.OrganizationMember.find({ userId, organizationId: { $ne: id } })
            .lean()
            .then(async (ms) => ms.length > 0 && (await db.Organization.exists({ _id: { $in: ms.map((m) => m.organizationId) }, status: 'ACTIVE' })));
      await syncRole(db, userId, 'ORGANIZER', granted || !!otherActive, adminId);
    }
  } else {
    userIds = [row.userId];
    await syncRole(db, row.userId, kind.role, granted, adminId);
  }
  await notify(db, userIds, ecosystem, status, note);

  const fresh = await model.findById(id).lean();
  const applicants = await applicantsOf(db, ecosystem, [fresh]);
  return { item: toItem(ecosystem, fresh, applicants), before: row.status };
}

/**
 * Applicant-side guard shared by the investor/HR/organization request forms: a pending or
 * rejected request can be edited (a rejected one goes back to PENDING on resubmit); a suspended
 * one is locked; an active one can update details without losing access.
 */
export function resubmission(existing) {
  if (!existing) return { status: 'PENDING', submittedAt: new Date() };
  if (existing.status === 'SUSPENDED') {
    throw AppError.forbidden('This access is suspended. Contact the STUDLYF team to have it reviewed.');
  }
  if (existing.status === 'REJECTED') return { status: 'PENDING', statusNote: null, submittedAt: new Date(), reviewedAt: null, reviewedBy: null };
  return {};
}
