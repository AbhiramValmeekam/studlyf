/**
 * Ordered data migrations. Indexes are NOT listed here — they come from the schema
 * files and are synced automatically on every `npm run db:migrate`.
 *
 * Add an entry when existing documents need reshaping, e.g.
 *   {
 *     id: '0002_default_resource_reading_time',
 *     up: (db) => db.Resource.updateMany({ readingMinutes: { $exists: false } }, { $set: { readingMinutes: null } }).then(() => {}),
 *   },
 */
import { slugify, termsOf } from '../../common/utilities/text.js';

export const MIGRATIONS = [
  {
    // Marks the Phase 1 schema baseline (collections + indexes are created by the runner).
    id: '0001_phase1_baseline',
    up: async () => {},
  },
  {
    // Phase 2 builder baseline: skills, builder_profiles, applications, notifications collections
    // + extended opportunity fields. All new fields are default-safe, so no document reshaping is
    // needed — the runner's createCollection() + syncIndexes() handle the rest.
    id: '0002_phase2_builder_baseline',
    up: async () => {},
  },
  {
    // Phase 3 community showcase: projects + project_upvotes collections. Both are new and
    // default-safe (no existing documents to reshape), so createCollection() + syncIndexes()
    // cover it; this marker just records the phase.
    id: '0003_phase3_community_showcase',
    up: async () => {},
  },
  {
    // Phase 3 learning tracks: the `courses` collection (STUDENT courses + COMPANY learning
    // modules, split by `audience`). New and default-safe, so createCollection() + syncIndexes()
    // cover it; this marker just records the phase.
    id: '0004_phase3_courses',
    up: async () => {},
  },
  {
    // Phase 3 STUDHub: the `studhub_benefits` collection (verified scholarships, software
    // discounts and student perks, split by `type`). New and default-safe, so createCollection()
    // + syncIndexes() cover it; this marker just records the phase.
    id: '0005_phase3_studhub',
    up: async () => {},
  },
  {
    // Phase 3 mock tests & interviews: the `mock_drills` collection (timed TEST assessments +
    // mock INTERVIEW sets, split by `kind`). New and default-safe, so createCollection() +
    // syncIndexes() cover it; this marker just records the phase.
    id: '0006_phase3_mock_drills',
    up: async () => {},
  },
  {
    // Phase 3 build-a-project: the `project_briefs` collection (build-ready challenge briefs,
    // split by `category`/`difficulty`). New and default-safe, so createCollection() +
    // syncIndexes() cover it; this marker just records the phase.
    id: '0007_phase3_project_briefs',
    up: async () => {},
  },
  {
    // Phase 3 resume builder: the `resumes` collection (per-user, auth-owned resumes; never
    // public). New and default-safe, so createCollection() + syncIndexes() cover it; this
    // marker just records the phase.
    id: '0008_phase3_resumes',
    up: async () => {},
  },
  {
    // Personal profile + profile sync: `users.profile` becomes the single source of truth
    // for city and social links, which used to live on `builder_profiles` (`location`,
    // `links`). Copy them onto the owning user — never overwriting a value the user already
    // set on their personal profile — then remove the old fields from builder profiles.
    id: '0009_personal_profile_sync',
    up: moveBuilderLinksToUsers,
  },
  {
    // Phase 3 projects + proof-of-work: the community `projects` collection becomes the one
    // project store. Existing rows get the new fields (visibility from their old publish status,
    // technologies from their tags, a project type) and an OWNER row in `project_members`.
    // New collections (project_members, project_reports, project_submissions, evaluation_templates,
    // evaluations, achievements) are created with their indexes by the runner.
    id: '0010_phase3_projects_proof_of_work',
    up: upgradeProjectsForPhase3,
  },
  {
    // Founder strategy workspace, structured: `founder_profiles.workspace` gains the market,
    // competitorAnalysis, businessModelCanvas, gtm and pitchDeck builders, and
    // `startup.tractionHistory` a dated series. Additive by design — the original free-text
    // fields stay in place as the fallback, so nothing is reshaped and no document is touched.
    // The new fields are default-safe, so createCollection() + syncIndexes() cover it; this
    // marker records the phase.
    id: '0011_founder_workspace_structures',
    up: async () => {},
  },
  {
    // Verifiable certificates (spec §18/§68). Until now an achievement was the only record of a
    // program result; this mints the credential behind each result achievement that already
    // exists. Idempotent — anything that already has a certificate is skipped — so running the
    // same logic again by hand repairs a partial backfill.
    id: '0012_certificates',
    up: backfillCertificates,
  },
  {
    // Public startup pages (spec §68). Founder profiles had no handle and no audience setting, so
    // /founders/<slug> could not exist. This gives every existing profile a handle derived from
    // its startup name and puts it at INVESTOR_VISIBLE — the audience a founder already had,
    // since investors could see these fields before. Nothing becomes public without the founder
    // opting in; the handle is stable either way, so revealing the page never changes its URL.
    id: '0013_founder_public_handles',
    up: backfillFounderHandles,
  },
  {
    // Career roadmaps (spec §52): the `roadmap_templates` catalog and the per-user
    // `user_roadmaps` goal. Both collections are new and default-safe — a person has no goal until
    // they pick one — so createCollection() + syncIndexes() cover it; this marker records the phase.
    id: '0014_career_roadmaps',
    up: async () => {},
  },
  {
    // STUD OTT (spec §55): the `ott` shelf and the per-viewer `ott_progress` rows. Both are new
    // and default-safe — nobody has a place in a title they have not opened — so createCollection()
    // + syncIndexes() cover it; this marker records the phase.
    id: '0015_stud_ott',
    up: async () => {},
  },
  {
    // Cross-ecosystem saves (spec §57). The `saved_items` table is new, but the investor's
    // shortlist already existed as `investor_profiles.savedFounderProfileIds` — this copies those
    // rows across so the one mechanism starts out holding what the old one did. The legacy array
    // is left in place (never written again) so nothing is lost if this migration is rolled back.
    id: '0016_saved_items',
    up: migrateInvestorShortlist,
  },
  {
    // Unified search (spec §56) reaches organizations and founders, so both need indexed word
    // lists. Organizations never had them; founders had `searchTerms` but no `titleTerms`, which
    // the relevance ranking reads. Idempotent: it recomputes both from the current document.
    id: '0017_search_terms_for_orgs_and_founders',
    up: backfillSearchTerms,
  },
];

/**
 * Gives organizations and founder profiles the indexed word lists unified search matches on.
 * Founders carry a user's name in `searchTerms`, so the users are fetched in one query rather
 * than per profile.
 */
async function backfillSearchTerms(db) {
  const orgs = await db.Organization.find({}).select({ name: 1, description: 1, city: 1, type: 1 }).lean();
  for (const o of orgs) {
    await db.Organization.updateOne(
      { _id: o._id },
      { $set: { searchTerms: termsOf(o.name, o.description, o.city, o.type), titleTerms: termsOf(o.name) } },
    );
  }

  const founders = await db.FounderProfile.find({}).select({ userId: 1, headline: 1, location: 1, startup: 1 }).lean();
  const users = await db.User.find({ _id: { $in: founders.map((p) => p.userId) } })
    .select({ name: 1 })
    .lean();
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));
  for (const p of founders) {
    const name = nameById.get(String(p.userId));
    const s = p.startup ?? {};
    await db.FounderProfile.updateOne(
      { _id: p._id },
      {
        $set: {
          searchTerms: termsOf(name, p.headline, p.location, s.name, s.oneLiner, s.industry, s.location, s.description),
          titleTerms: termsOf(name, p.headline, s.name),
        },
      },
    );
  }
}

/**
 * Copies every investor's saved founders into `saved_items`. Idempotent: the unique
 * (user, type, entity) index makes a re-run a no-op rather than a duplicate.
 */
async function migrateInvestorShortlist(db) {
  const rows = await db.InvestorProfile.find({ savedFounderProfileIds: { $exists: true, $ne: [] } })
    .select({ userId: 1, savedFounderProfileIds: 1 })
    .lean();
  for (const p of rows) {
    for (const founderProfileId of p.savedFounderProfileIds) {
      await db.SavedItem.updateOne(
        { userId: p.userId, entityType: 'FOUNDER', entityId: founderProfileId },
        { $setOnInsert: { userId: p.userId, entityType: 'FOUNDER', entityId: founderProfileId, savedAt: new Date() } },
        { upsert: true },
      );
    }
  }
}

/** The achievement types that are results, and the certificate type each mints. */
const MINTED_TYPES = {
  WINNER: 'WINNER',
  FINALIST: 'FINALIST',
  SHORTLISTED: 'SHORTLIST',
  HACKATHON_PARTICIPATION: 'PARTICIPATION',
  PROJECT_COMPLETED: 'COMPLETION',
  CERTIFICATE: 'MERIT',
};
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 12 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

async function backfillCertificates(db) {
  const achievements = await db.Achievement.find({ source: 'SYSTEM', type: { $in: Object.keys(MINTED_TYPES) } }).lean();
  if (!achievements.length) return;
  const already = await db.Certificate.find({ achievementId: { $in: achievements.map((a) => a._id) } })
    .select({ achievementId: 1 })
    .lean();
  const have = new Set(already.map((c) => String(c.achievementId)));

  for (const a of achievements) {
    if (have.has(String(a._id))) continue;
    const [user, opportunity] = await Promise.all([
      db.User.findById(a.userId).select({ name: 1 }).lean(),
      a.opportunityId ? db.Opportunity.findById(a.opportunityId).select({ title: 1, organizationId: 1, organizationName: 1 }).lean() : null,
    ]);
    if (!user) continue;
    const doc = {
      userId: a.userId,
      organizationId: opportunity?.organizationId ?? null,
      opportunityId: a.opportunityId ?? null,
      achievementId: a._id,
      type: MINTED_TYPES[a.type],
      title: a.title,
      recipientName: user.name,
      issuerName: opportunity?.organizationName ?? 'STUDLYF',
      issueDate: a.date ?? a.createdAt ?? new Date(),
      metadata: { achievementType: a.type, opportunityTitle: opportunity?.title ?? null },
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await db.Certificate.create({ ...doc, verificationCode: newCode() });
        break;
      } catch (err) {
        if (err?.code === 11000 && err?.keyPattern?.achievementId) break;
        if (err?.code === 11000) continue;
        throw err;
      }
    }
  }
}

async function moveBuilderLinksToUsers(db) {
  const builders = db.connection.collection('builder_profiles');
  const users = db.connection.collection('users');
  const legacy = builders.find(
    { $or: [{ location: { $exists: true } }, { links: { $exists: true } }] },
    { projection: { userId: 1, location: 1, links: 1 } },
  );
  for await (const b of legacy) {
    const user = await users.findOne({ _id: b.userId }, { projection: { profile: 1 } });
    if (!user) continue;
    const p = user.profile ?? {};
    const set = {};
    if (b.location && !p.city) set['profile.city'] = b.location;
    for (const key of ['github', 'linkedin', 'portfolio', 'website']) {
      if (b.links?.[key] && !p.links?.[key]) set[`profile.links.${key}`] = b.links[key];
    }
    if (Object.keys(set).length) await users.updateOne({ _id: b.userId }, { $set: set });
  }
  await builders.updateMany({}, { $unset: { location: '', links: '' } });
}

async function upgradeProjectsForPhase3(db) {
  const projects = db.connection.collection('projects');
  const members = db.connection.collection('project_members');
  const legacy = projects.find({ visibility: { $exists: false } });
  for await (const p of legacy) {
    await projects.updateOne(
      { _id: p._id },
      {
        $set: {
          visibility: p.status === 'PUBLISHED' ? 'PUBLIC' : 'PRIVATE',
          technologies: p.technologies ?? p.tags ?? [],
          projectType: p.projectType ?? 'PERSONAL',
          skills: p.skills ?? [],
          media: p.media ?? [],
          tagline: p.tagline ?? null,
          problemStatement: p.problemStatement ?? null,
          solution: p.solution ?? null,
          impact: p.impact ?? null,
          teamName: p.teamName ?? null,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          completedAt: p.completedAt ?? null,
          archivedAt: p.status === 'ARCHIVED' ? (p.updatedAt ?? new Date()) : null,
          moderationStatus: p.moderationStatus ?? 'PENDING',
          moderationReason: null,
          moderatedBy: null,
          moderatedAt: null,
          reportCount: p.reportCount ?? 0,
        },
      },
    );
    await members.updateOne(
      { projectId: p._id, userId: p.authorUserId },
      {
        $setOnInsert: {
          projectId: p._id,
          userId: p.authorUserId,
          role: 'OWNER',
          status: 'ACTIVE',
          canEdit: true,
          invitedBy: null,
          joinedAt: p.createdAt ?? new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

/**
 * Gives every founder profile a public handle and an audience. Idempotent: a profile that already
 * has a slug keeps it, so a re-run never invalidates a link somebody already shared.
 */
async function backfillFounderHandles(db) {
  const rows = await db.FounderProfile.find({ $or: [{ slug: { $exists: false } }, { slug: null }] })
    .select({ userId: 1, startup: 1 })
    .lean();
  const used = new Set(
    (await db.FounderProfile.find({ slug: { $type: 'string' } }).select({ slug: 1 }).lean()).map((r) => r.slug),
  );
  for (const p of rows) {
    const base = slugify(p.startup?.name ?? '') || 'founder';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    await db.FounderProfile.updateOne({ _id: p._id }, { $set: { slug } });
  }
  // Nobody becomes publicly readable by migrating: INVESTOR_VISIBLE is the audience founders
  // already had (verified investors), and going PUBLIC stays an explicit choice.
  await db.FounderProfile.updateMany({ visibility: { $exists: false } }, { $set: { visibility: 'INVESTOR_VISIBLE' } });
}
