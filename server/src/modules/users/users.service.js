import { AppError } from '../../common/errors/app-error.js';
import { loadMedia, pick } from '../../common/utilities/media.js';
import { escapeRegex } from '../../common/utilities/text.js';
import { computeCompletion } from '../profile/completion.js';
import { toPersonalProfile } from '../profile/profile.service.js';
import { ecosystemStates } from '../ecosystems/ecosystems.service.js';

async function serialize(db, rows) {
  const media = await loadMedia(db, rows.map((r) => r.profilePhotoId));
  return rows.map((u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt,
    profilePhoto: pick(media, u.profilePhotoId),
    role: u.primaryRole,
    roles: [...new Set((u.roles ?? []).map((r) => r.role))].sort(),
  }));
}

/**
 * The signed-in user's own view: identity + personal profile + the unified completion
 * score (which also counts the builder profile, when there is one) + onboarding + admin flag.
 */
export async function getMe(db, userId) {
  const [row, admin, builder, ecosystems] = await Promise.all([
    db.User.findById(userId).lean(),
    db.AdminUser.findOne({ userId, active: true }).select({ level: 1 }).lean(),
    db.BuilderProfile.findOne({ userId }).select({ username: 1, headline: 1, bio: 1, skills: 1, availability: 1 }).lean(),
    ecosystemStates(db, userId),
  ]);
  if (!row) throw AppError.notFound('User');
  const [user] = await serialize(db, [row]);
  return {
    ...user,
    onboarding: row.onboarding ? { intent: row.onboarding.intent, completedAt: row.onboarding.completedAt } : null,
    admin: admin ? { level: admin.level } : null,
    profile: toPersonalProfile(row),
    builderUsername: builder?.username ?? null,
    completion: computeCompletion(row, builder),
    // Server-computed access state per ecosystem — the frontend's post-login resolver only
    // chooses between these; it never decides access itself.
    ecosystems,
  };
}

export async function updateMe(db, userId, patch) {
  if (Object.keys(patch).length) await db.User.updateOne({ _id: userId }, { $set: patch }, { runValidators: true });
  return getMe(db, userId);
}

// ---- admin ------------------------------------------------------------------

export async function adminList(db, f) {
  const filter = {};
  if (f.q) {
    const re = new RegExp(escapeRegex(f.q), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  if (f.status) filter.status = f.status;
  if (f.role) filter['roles.role'] = f.role;
  const [rows, total] = await Promise.all([
    db.User.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((f.page - 1) * f.pageSize)
      .limit(f.pageSize)
      .lean(),
    db.User.countDocuments(filter),
  ]);
  return { items: await serialize(db, rows), total };
}

export async function adminGet(db, id) {
  return getMe(db, id);
}

export async function adminUpdate(db, id, patch) {
  const set = { ...patch };
  if (patch.emailVerified === true) set.emailVerifiedAt = new Date();
  if (patch.emailVerified === false) set.emailVerifiedAt = null;
  const { matchedCount } = await db.User.updateOne({ _id: id }, { $set: set }, { runValidators: true });
  if (!matchedCount) throw AppError.notFound('User');
  return getMe(db, id);
}
