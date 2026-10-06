/**
 * The ONE profile-completion score shown everywhere: the "Complete your profile" prompt,
 * the profile page, the builder dashboard and the welcome page. It spans both halves of
 * a person's profile — personal/academic fields on `User` and builder fields on
 * `BuilderProfile` — so there is never a second, disagreeing percentage.
 *
 * Personal checks apply to everyone (55 points). Builder checks apply to anyone with the
 * BUILDER role (45 points). Scores are normalised over the checks that apply, so a
 * founder or explorer with a full personal profile is at 100%, not 55%.
 */

const has = (v) => v !== null && v !== undefined && String(v).trim() !== '';
const personal = (user) => user?.profile ?? {};

/** Fields the prompt insists on before a profile counts as complete. */
export const REQUIRED_FIELDS = ['name', 'phone', 'college', 'degree', 'branch', 'yearOfStudy', 'graduationYear'];

const PERSONAL_CHECKS = [
  { key: 'phone', weight: 10, done: (u) => has(u?.phone) },
  {
    key: 'education',
    weight: 20,
    done: (u) => ['college', 'degree', 'branch', 'yearOfStudy', 'graduationYear'].every((k) => has(personal(u)[k])),
  },
  { key: 'links', weight: 10, done: (u) => Object.values(personal(u).links ?? {}).some(has) },
  { key: 'location', weight: 5, done: (u) => has(personal(u).city) },
  { key: 'interests', weight: 5, done: (u) => (personal(u).interests?.length ?? 0) > 0 },
  { key: 'photo', weight: 5, done: (u) => has(u?.profilePhotoId) },
];

const BUILDER_CHECKS = [
  { key: 'headline', weight: 10, done: (b) => has(b.headline) },
  { key: 'bio', weight: 15, done: (b) => has(b.bio) && b.bio.trim().length >= 40 },
  { key: 'skills', weight: 15, done: (b) => (b.skills?.length ?? 0) >= 3 },
  { key: 'availability', weight: 5, done: (b) => has(b.availability) },
];

export function requiredMissing(user) {
  const p = personal(user);
  return REQUIRED_FIELDS.filter((k) => !has(k === 'name' || k === 'phone' ? user?.[k] : p[k]));
}

/**
 * @param user     lean User doc (needs name, phone, profilePhotoId, profile)
 * @param builder  lean BuilderProfile doc, or null when the user has none
 * @returns {{ score: number, missing: string[], isComplete: boolean, requiredMissing: string[] }}
 */
export function computeCompletion(user, builder = null) {
  // A BUILDER who hasn't created their builder profile yet is scored against an empty
  // one — otherwise their score would *drop* the moment they create it.
  const isBuilder = (user?.roles ?? []).some((r) => r.role === 'BUILDER');
  const b = builder ?? (isBuilder ? {} : null);
  const checks = [
    ...PERSONAL_CHECKS.map((c) => ({ ...c, ok: c.done(user) })),
    ...(b ? BUILDER_CHECKS.map((c) => ({ ...c, ok: c.done(b) })) : []),
  ];
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const reqMissing = requiredMissing(user);
  return {
    score: total ? Math.round((earned / total) * 100) : 0,
    missing: checks.filter((c) => !c.ok).map((c) => c.key),
    isComplete: reqMissing.length === 0,
    requiredMissing: reqMissing,
  };
}
