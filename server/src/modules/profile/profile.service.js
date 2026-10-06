import { AppError } from '../../common/errors/app-error.js';
import { builderSearchFields } from '../builder-profiles/search.js';
import { computeCompletion } from './completion.js';

const ACCOUNT_FIELDS = { name: 1, phone: 1, profilePhotoId: 1, profile: 1, roles: 1 };

/** Lean user with just what the profile + completion need. */
export function loadAccount(db, userId) {
  return db.User.findById(userId).select(ACCOUNT_FIELDS).lean();
}

export const linksOut = (l) => ({
  github: l?.github ?? null,
  linkedin: l?.linkedin ?? null,
  portfolio: l?.portfolio ?? null,
  website: l?.website ?? null,
});

/** Owner view of the personal profile (older documents may not have `profile` yet). */
export function toPersonalProfile(user) {
  const p = user?.profile ?? {};
  return {
    gender: p.gender ?? null,
    city: p.city ?? null,
    college: p.college ?? null,
    degree: p.degree ?? null,
    branch: p.branch ?? null,
    yearOfStudy: p.yearOfStudy ?? null,
    graduationYear: p.graduationYear ?? null,
    links: linksOut(p.links),
    interests: p.interests ?? [],
    completedAt: p.completedAt ?? null,
  };
}

/** What the public builder page may show about a person's education — never phone/gender/interests. */
export function toPublicEducation(user) {
  const p = user?.profile ?? {};
  if (!p.college) return null;
  return { college: p.college, degree: p.degree ?? null, branch: p.branch ?? null, graduationYear: p.graduationYear ?? null };
}

const THIS_YEAR = () => new Date().getFullYear();

/** Cross-field rule on the merged (stored + incoming) values. */
function checkYears(merged) {
  const { yearOfStudy, graduationYear } = merged;
  if (!graduationYear || !yearOfStudy) return;
  if (yearOfStudy !== 'GRADUATED' && graduationYear < THIS_YEAR()) {
    throw AppError.validation([
      { field: 'graduationYear', message: 'That year has passed — choose "Graduated" as your current year' },
    ]);
  }
  if (yearOfStudy === 'GRADUATED' && graduationYear > THIS_YEAR()) {
    throw AppError.validation([{ field: 'yearOfStudy', message: 'Your graduation year is in the future' }]);
  }
}

/**
 * Keeps the builder profile's derived data in step with the personal profile: search
 * terms (city/college/branch) and the stored completion snapshot. Reads always compute
 * completion live, so this only matters for anything that sorts or filters on it.
 */
export async function refreshBuilderDerived(db, userId, user = null) {
  const builder = await db.BuilderProfile.findOne({ userId }).lean();
  if (!builder) return;
  const account = user ?? (await loadAccount(db, userId));
  const completion = computeCompletion(account, builder);
  await db.BuilderProfile.updateOne(
    { _id: builder._id },
    { $set: { completion: { score: completion.score, updatedAt: new Date() }, ...builderSearchFields(builder, account) } },
  );
}

/**
 * Applies a validated personal-profile patch (from PATCH /me/profile, or the builder
 * profile's `links`/`location` fields). Links merge key-by-key. Stamps `completedAt`
 * the first time every required field is present.
 */
export async function applyPersonalPatch(db, userId, patch) {
  const existing = await loadAccount(db, userId);
  if (!existing) throw AppError.notFound('User');

  const { name, phone, links, ...profileFields } = patch;
  const set = {};
  if (name !== undefined) set.name = name;
  if (phone !== undefined) set.phone = phone;
  for (const [k, v] of Object.entries(profileFields)) if (v !== undefined) set[`profile.${k}`] = v;
  for (const [k, v] of Object.entries(links ?? {})) if (v !== undefined) set[`profile.links.${k}`] = v;

  const merged = {
    ...existing,
    ...(name !== undefined ? { name } : {}),
    ...(phone !== undefined ? { phone } : {}),
    profile: {
      ...(existing.profile ?? {}),
      ...Object.fromEntries(Object.entries(profileFields).filter(([, v]) => v !== undefined)),
      links: { ...(existing.profile?.links ?? {}), ...Object.fromEntries(Object.entries(links ?? {}).filter(([, v]) => v !== undefined)) },
    },
  };
  checkYears(merged.profile);

  if (!existing.profile?.completedAt && computeCompletion(merged).isComplete) {
    set['profile.completedAt'] = new Date();
    merged.profile.completedAt = set['profile.completedAt'];
  }
  // Dotted $set creates `profile` on older documents that predate it.
  if (Object.keys(set).length) await db.User.updateOne({ _id: userId }, { $set: set }, { runValidators: true });

  await refreshBuilderDerived(db, userId, merged);
  return merged;
}
