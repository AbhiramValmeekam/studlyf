import { AppError } from '../../common/errors/app-error.js';
import { idOf, loadMedia, pick } from '../../common/utilities/media.js';
import * as skillsRepo from '../skills/skills.repository.js';
import { computeCompletion } from '../profile/completion.js';
import { applyPersonalPatch, linksOut, loadAccount, toPublicEducation } from '../profile/profile.service.js';
import * as repo from './builder-profiles.repository.js';
import { builderSearchFields } from './search.js';
import { publicSummary } from '../proof-of-work/proof-of-work.service.js';

/**
 * The builder profile is joined with the user's personal profile on every read:
 * location, social links and current education come from `users.profile`, so editing
 * them on the account page or here always updates the same stored values.
 */
async function account(db, userId) {
  const user = await loadAccount(db, userId);
  const media = await loadMedia(db, [user?.profilePhotoId]);
  return { user, photo: pick(media, user?.profilePhotoId) };
}

async function applyPhoto(db, userId, profilePhotoId) {
  if (profilePhotoId === undefined) return;
  if (profilePhotoId && !(await db.MediaAsset.exists({ _id: profilePhotoId }))) {
    throw AppError.validation([{ field: 'profilePhotoId', message: 'Unknown media asset' }]);
  }
  await db.User.updateOne({ _id: userId }, { $set: { profilePhotoId: profilePhotoId ?? null } });
}

/** Route the compatibility fields (`location`, `links`) to the personal profile. */
async function applySharedFields(db, userId, { location, links }) {
  const patch = {};
  if (location !== undefined) patch.city = location;
  if (links !== undefined) patch.links = links ?? { github: null, linkedin: null, portfolio: null, website: null };
  if (Object.keys(patch).length) await applyPersonalPatch(db, userId, patch);
}

const educationOut = (e) => (e ?? []).map((x) => ({ school: x.school, program: x.program ?? null, year: x.year ?? null }));
const skillsOut = (s) => (s ?? []).map((x) => ({ slug: x.slug, name: x.name, proficiency: x.proficiency }));

/** Owner view — private fields + live completion. */
function toOwn(row, { user, photo }) {
  const completion = computeCompletion(user, row);
  return {
    id: String(row._id),
    userId: idOf(row.userId),
    username: row.username,
    headline: row.headline ?? null,
    bio: row.bio ?? null,
    template: row.template ?? 'editorial',
    location: user?.profile?.city ?? null,
    availability: row.availability ?? null,
    visibility: row.visibility,
    links: linksOut(user?.profile?.links),
    currentEducation: toPublicEducation(user),
    education: educationOut(row.education),
    skills: skillsOut(row.skills),
    profilePhoto: photo,
    completion: { score: completion.score, updatedAt: row.completion?.updatedAt ?? null },
    featuredProjectIds: (row.featuredProjectIds ?? []).map(String),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Public view — explicit allow-list; no userId, phone, gender, email, interests or visibility. */
function toPublic(row, { user, photo }) {
  return {
    username: row.username,
    name: user?.name ?? null,
    headline: row.headline ?? null,
    bio: row.bio ?? null,
    template: row.template ?? 'editorial',
    location: user?.profile?.city ?? null,
    availability: row.availability ?? null,
    links: linksOut(user?.profile?.links),
    currentEducation: toPublicEducation(user),
    education: educationOut(row.education),
    skills: skillsOut(row.skills),
    profilePhoto: photo,
    joinedAt: row.createdAt,
  };
}

/**
 * Result cards for a known set of profile rows (unified search, the saved list). One batched
 * user lookup, no proof-of-work join — enough to render a result and link to the profile.
 */
export async function toPublicCards(db, rows) {
  const users = await db.User.find({ _id: { $in: rows.map((r) => r.userId) } })
    .select({ name: 1, profile: 1, profilePhotoId: 1 })
    .lean();
  const media = await loadMedia(db, users.map((u) => u.profilePhotoId));
  const byId = new Map(users.map((u) => [String(u._id), { ...u, photo: pick(media, u.profilePhotoId) }]));
  return rows.map((row) => {
    const user = byId.get(String(row.userId));
    return {
      username: row.username,
      name: user?.name ?? null,
      headline: row.headline ?? null,
      location: user?.profile?.city ?? null,
      skills: skillsOut(row.skills).slice(0, 6),
      profilePhoto: user?.photo ?? null,
    };
  });
}

export async function getOwn(db, userId) {  const row = await repo.findByUserId(db, userId);
  if (!row) throw AppError.notFound('Builder profile');
  return toOwn(row, await account(db, userId));
}

export async function getPublicByUsername(db, username) {
  const row = await repo.findPublicByUsername(db, username);
  if (!row) throw AppError.notFound('Builder profile');
  const [acct, proofOfWork] = await Promise.all([account(db, row.userId), publicSummary(db, row.userId, row.featuredProjectIds ?? [])]);
  return { ...toPublic(row, acct), proofOfWork };
}

export async function getCompletion(db, userId) {
  const row = await repo.findByUserId(db, userId);
  if (!row) throw AppError.notFound('Builder profile');
  return computeCompletion(await loadAccount(db, userId), row);
}

/** Store the completion snapshot + search words after any builder write. */
async function persistDerived(db, row, user) {
  const completion = computeCompletion(user, row);
  await db.BuilderProfile.updateOne(
    { _id: row._id },
    { $set: { completion: { score: completion.score, updatedAt: new Date() }, ...builderSearchFields(row, user) } },
  );
}

const usernameConflict = () =>
  new AppError('CONFLICT', 'This username is already taken', [{ field: 'username', message: 'Already in use' }]);

export async function create(db, userId, input) {
  if (await repo.findByUserId(db, userId)) throw new AppError('CONFLICT', 'You already have a builder profile');
  const { username, profilePhotoId, links, location, education, ...rest } = input;
  if (await repo.usernameTaken(db, username)) throw usernameConflict();

  await applyPhoto(db, userId, profilePhotoId);
  await applySharedFields(db, userId, { location, links });
  try {
    await db.BuilderProfile.create({
      userId,
      username,
      headline: rest.headline ?? null,
      bio: rest.bio ?? null,
      template: rest.template ?? 'editorial',
      availability: rest.availability ?? null,
      visibility: rest.visibility ?? 'PRIVATE',
      education: education ?? [],
      skills: [],
    });
  } catch (err) {
    if (err?.code === 11000) throw usernameConflict();
    throw err;
  }
  const row = await repo.findByUserId(db, userId);
  await persistDerived(db, row, await loadAccount(db, userId));
  return getOwn(db, userId);
}

export async function update(db, userId, patch) {
  const existing = await repo.findByUserId(db, userId);
  if (!existing) throw AppError.notFound('Builder profile');

  const { profilePhotoId, links, location, education, ...rest } = patch;
  await applyPhoto(db, userId, profilePhotoId);
  await applySharedFields(db, userId, { location, links });

  const set = {};
  for (const k of ['headline', 'bio', 'template', 'availability', 'visibility']) {
    if (rest[k] !== undefined) set[k] = rest[k];
  }
  if (education !== undefined) set.education = education ?? [];
  if (Object.keys(set).length) {
    await db.BuilderProfile.updateOne({ _id: existing._id }, { $set: set }, { runValidators: true });
  }
  await persistDerived(db, { ...existing, ...set }, await loadAccount(db, userId));
  return getOwn(db, userId);
}

/** Replace the profile's skill set, validated against the active Skill vocabulary. */
export async function setSkills(db, userId, skills) {
  const existing = await repo.findByUserId(db, userId);
  if (!existing) throw AppError.notFound('Builder profile');

  const slugs = skills.map((s) => s.slug.toLowerCase());
  const found = await skillsRepo.findActiveBySlugs(db, slugs);
  const bySlug = new Map(found.map((s) => [s.slug, s]));
  const unknown = [...new Set(slugs)].filter((s) => !bySlug.has(s));
  if (unknown.length) throw AppError.validation(unknown.map((s) => ({ field: 'skills', message: `Unknown skill: ${s}` })));

  // De-dupe by slug (last wins), preserving first-seen order.
  const seen = new Map();
  for (const s of skills) {
    const ref = bySlug.get(s.slug.toLowerCase());
    seen.set(ref.slug, { skillId: ref._id, slug: ref.slug, name: ref.name, proficiency: s.proficiency ?? 'INTERMEDIATE' });
  }
  const embedded = [...seen.values()];
  await db.BuilderProfile.updateOne({ _id: existing._id }, { $set: { skills: embedded } }, { runValidators: true });
  await persistDerived(db, { ...existing, skills: embedded }, await loadAccount(db, userId));
  return getOwn(db, userId);
}
