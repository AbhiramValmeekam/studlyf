/**
 * ADDITIVE DEMO SEED — fills in the features the base dev seed never populated.
 *
 * The base seed (`dev-seed.js`) refuses to run once the database has users, so a database
 * that was seeded by an older revision stays permanently thin: 27 of the 45 collections
 * can be empty, which leaves whole product areas with nothing to render.
 *
 * This seeder is different in three ways, and all three matter:
 *
 *   1. ADDITIVE. It never truncates and never deletes. Your accounts, projects and
 *      applications are left exactly as they are (§95 — never remove an existing user).
 *   2. IDEMPOTENT. Every write is guarded by a natural key (slug, username, email, or the
 *      compound key the schema already treats as unique), so running it twice is a no-op
 *      rather than a duplicate-key crash.
 *   3. VALIDATED. Rows go in through `Model.create()`, not an upsert — the schemas here are
 *      `.strict()`, and an update would bypass the validators that catch a wrong enum.
 *
 * Data is attached BOTH to the per-ecosystem demo accounts (created here if missing) and
 * to the real accounts already in the database, so a session that is already signed in
 * sees a populated product without having to log out.
 *
 * Run with `npm run db:seed:demo`.
 */
import { slugify, termsOf } from '../../common/utilities/text.js';
import { hashPassword } from '../../common/auth/password.js';
import { builderSearchFields } from '../../modules/builder-profiles/search.js';
import { computeCompletion } from '../../modules/profile/completion.js';

/** Accounts this seeder creates if they are missing. DEV-ONLY — mirrored in DEV_CREDENTIALS. */
export const DEMO_ACCOUNTS = {
  founder: { email: 'founder@studlyf.local', password: 'StudlyfFounder#2026', name: 'Ishita Rao (dev founder)' },
  founderB: { email: 'founder2@studlyf.local', password: 'StudlyfFounder#2026', name: 'Rohan Desai (dev founder)' },
  investor: { email: 'investor@studlyf.local', password: 'StudlyfInvestor#2026', name: 'Karan Mehta (dev investor)' },
  hr: { email: 'hr@studlyf.local', password: 'StudlyfHr#2026', name: 'Deepti Nair (dev recruiter)' },
  organizer: { email: 'organizer@studlyf.local', password: 'StudlyfOrganizer#2026', name: 'Arun Prakash (dev organizer)' },
  evaluator: { email: 'evaluator@studlyf.local', password: 'StudlyfHr#2026', name: 'Meera Iyer (dev evaluator)' },
};

const DAY = 86_400_000;
const days = (n) => new Date(Date.now() + n * DAY);
const ago = (n) => days(-n);

/** Match on the same key the schema treats as unique, so a re-run finds the existing row. */
async function ensure(Model, key, doc) {
  const existing = await Model.findOne(key).select({ _id: 1 }).lean();
  if (existing) return existing._id;
  const created = await Model.create(doc);
  return created._id;
}

export async function seedDemo(db, opts = {}) {
  const cost = opts.passwordHashCost ?? 4;
  const hash = (p) => hashPassword(p, cost);
  const summary = {};

  // The embedded dev mongod can be torn down before it checkpoints, which silently drops the
  // tail of a seeding run — the run reports rows that a later process cannot see. Journaled
  // majority writes make each row durable before the process exits, so what this reports is
  // what the next process actually reads.
  const WRITE_CONCERN = { w: 'majority', j: true };
  for (const Model of Object.values(db)) {
    if (Model?.schema?.set) Model.schema.set('writeConcern', WRITE_CONCERN);
  }

  // ---------------------------------------------------------------------------
  // Reference data that already exists — reuse it rather than inventing parallel rows.
  // ---------------------------------------------------------------------------
  const admin =
    (await db.User.findOne({ email: 'admin@studlyf.local' }).select({ _id: 1 }).lean()) ??
    (await db.User.findOne({ primaryRole: 'ADMIN' }).select({ _id: 1 }).lean());
  const editor = await db.User.findOne({ email: 'editor@studlyf.local' }).select({ _id: 1 }).lean();
  const actor = admin?._id ?? editor?._id;

  const media = await db.MediaAsset.find().lean();
  const pickMedia = (purpose, i = 0) => media.filter((m) => m.purpose === purpose)[i % Math.max(1, media.filter((m) => m.purpose === purpose).length)]?._id ?? null;
  const banner = (i) => pickMedia('BANNER', i);
  const thumb = (i) => pickMedia('BANNER', i) ?? pickMedia('SCREENSHOT', i);

  const opportunities = await db.Opportunity.find().sort({ createdAt: 1 }).lean();
  const categories = await db.Category.find().lean();
  const seedCategory = categories.find((c) => c.scope === 'OTT')?._id ?? categories[0]?._id ?? null;

  // ---------------------------------------------------------------------------
  // 1. Accounts — created only if absent.
  // ---------------------------------------------------------------------------
  const mkUser = async (spec, role, extra = {}) => {
    // `onboarding.intent` is a narrower vocabulary than the role set — an EVALUATOR onboards
    // through the organizer path, since that is the ecosystem they actually work in.
    const INTENTS = new Set(['BUILDER', 'FOUNDER', 'INVESTOR', 'HR', 'ORGANIZER', 'EXPLORING']);
    const id = await ensure(
      db.User,
      { email: spec.email },
      {
        name: spec.name,
        email: spec.email,
        passwordHash: await hash(spec.password),
        primaryRole: role,
        roles: [{ role: 'USER', grantedAt: ago(90) }, { role, grantedAt: ago(60) }],
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: ago(60),
        onboarding: { intent: spec.intent ?? (INTENTS.has(role) ? role : 'ORGANIZER'), completedAt: ago(30) },
        profile: { city: 'Bengaluru', college: 'RV College of Engineering', branch: 'Computer Science', graduationYear: 2026, ...(extra.profile ?? {}) },
        ...extra.user,
      },
    );
    return db.User.findById(id).lean();
  };

  const founderUser = await mkUser(DEMO_ACCOUNTS.founder, 'FOUNDER');
  const founderBUser = await mkUser(DEMO_ACCOUNTS.founderB, 'FOUNDER');
  const investorUser = await mkUser(DEMO_ACCOUNTS.investor, 'INVESTOR');
  const hrUser = await mkUser(DEMO_ACCOUNTS.hr, 'HR');
  const organizerUser = await mkUser(DEMO_ACCOUNTS.organizer, 'ORGANIZER');
  const evaluatorUser = await mkUser(DEMO_ACCOUNTS.evaluator, 'EVALUATOR');

  // Two extra builders so teams, upvotes, evaluations and HR candidates have real people.
  const novaUser = await mkUser(
    { email: 'nova@studlyf.local', password: 'StudlyfBuilder#2026', name: 'Nova Fernandes (dev)' },
    'BUILDER',
  );
  const zephyrUser = await mkUser(
    { email: 'zephyr@studlyf.local', password: 'StudlyfBuilder#2026', name: 'Zephyr Khan (dev)' },
    'BUILDER',
  );
  summary.accounts = { founderUser, investorUser, hrUser, organizerUser, evaluatorUser, novaUser, zephyrUser }
    ? 7
    : 0;

  // ---------------------------------------------------------------------------
  // 2. Skills — the vocabulary courses, roadmaps, briefs and OTT all reference.
  // ---------------------------------------------------------------------------
  const SKILLS = [
    ['JavaScript', 'Engineering'], ['TypeScript', 'Engineering'], ['React', 'Frontend'],
    ['Node.js', 'Backend'], ['Python', 'Engineering'], ['SQL', 'Data'],
    ['MongoDB', 'Data'], ['Data Structures', 'Computer Science'], ['System Design', 'Engineering'],
    ['Machine Learning', 'AI'], ['Docker', 'DevOps'], ['AWS', 'Cloud'],
    ['Figma', 'Design'], ['Product Management', 'Product'], ['Data Analysis', 'Data'],
    ['Cybersecurity', 'Security'], ['Flutter', 'Mobile'], ['Go', 'Backend'],
  ];
  const skillIdBySlug = {};
  for (const [name, category] of SKILLS) {
    const slug = slugify(name);
    skillIdBySlug[slug] = await ensure(
      db.Skill,
      { slug },
      { name, slug, category, description: `${name} fundamentals, tooling and applied practice.`, active: true },
    );
  }
  const skillRef = (name) => ({ name, slug: slugify(name) });
  summary.skills = SKILLS.length;

  // ---------------------------------------------------------------------------
  // 3. Builder profiles — for every builder account, including the ones already signed in.
  // ---------------------------------------------------------------------------
  const BUILDER_KITS = [
    {
      user: await db.User.findOne({ email: 'builder@studlyf.local' }).lean(),
      username: 'samplebuilder',
      headline: 'Full-stack developer · hackathon regular',
      bio: 'I build web products end to end — React on the front, Node and Mongo behind. Three hackathons, one internship, a lot of shipped side projects.',
      city: 'Bengaluru',
      skills: [['React', 'ADVANCED'], ['Node.js', 'ADVANCED'], ['TypeScript', 'INTERMEDIATE'], ['MongoDB', 'INTERMEDIATE'], ['Docker', 'BEGINNER']],
      visibility: 'PUBLIC',
    },
    {
      user: await db.User.findOne({ email: 'abhiramsharma567@gmail.com' }).lean(),
      username: 'abhiram',
      headline: 'CS undergrad · building in public',
      bio: 'Final-year computer science student. I like backend systems, developer tooling and anything that removes busywork. Currently learning system design.',
      city: 'Hyderabad',
      skills: [['JavaScript', 'ADVANCED'], ['Node.js', 'INTERMEDIATE'], ['SQL', 'INTERMEDIATE'], ['System Design', 'BEGINNER'], ['Docker', 'BEGINNER']],
      visibility: 'PUBLIC',
    },
    {
      user: await db.User.findOne({ email: 'abhigamer567@gmail.com' }).lean(),
      username: 'abhi-dev',
      headline: 'Game dev turned web engineer',
      bio: 'Started in Unity, moved to the web. Interested in interactive frontends and real-time systems.',
      city: 'Pune',
      skills: [['JavaScript', 'INTERMEDIATE'], ['React', 'INTERMEDIATE'], ['Python', 'INTERMEDIATE']],
      visibility: 'PUBLIC',
    },
    {
      user: await db.User.findOne({ email: 'priya.sync.0927a@example.com' }).lean(),
      username: 'priya',
      headline: 'Data analyst · ML in progress',
      bio: 'I turn messy data into decisions. SQL and Python daily, moving into applied machine learning.',
      city: 'Chennai',
      skills: [['Python', 'ADVANCED'], ['SQL', 'ADVANCED'], ['Data Analysis', 'ADVANCED'], ['Machine Learning', 'INTERMEDIATE']],
      visibility: 'PUBLIC',
    },
    {
      user: novaUser,
      username: 'nova',
      headline: 'Frontend engineer · design systems',
      bio: 'I care about interfaces that feel inevitable. Accessibility first, animation second, never the other way round.',
      city: 'Bengaluru',
      skills: [['React', 'EXPERT'], ['TypeScript', 'ADVANCED'], ['Figma', 'ADVANCED'], ['JavaScript', 'ADVANCED']],
      visibility: 'PUBLIC',
    },
    {
      user: zephyrUser,
      username: 'zephyr',
      headline: 'Backend engineer · distributed systems',
      bio: 'Go and Node services, queues and databases. Quietly kept private while I look for a new role.',
      city: 'Mumbai',
      skills: [['Go', 'ADVANCED'], ['Node.js', 'ADVANCED'], ['MongoDB', 'ADVANCED'], ['AWS', 'INTERMEDIATE']],
      visibility: 'PRIVATE',
    },
  ];

  const profileByUser = {};
  for (const kit of BUILDER_KITS) {
    if (!kit.user) continue;
    const skills = kit.skills.map(([name, proficiency]) => ({ skillId: skillIdBySlug[slugify(name)] ?? null, slug: slugify(name), name, proficiency }));
    const doc = {
      userId: kit.user._id,
      username: kit.username,
      headline: kit.headline,
      bio: kit.bio,
      template: 'editorial',
      availability: 'Open to internships',
      visibility: kit.visibility,
      education: [{ school: kit.user.profile?.college ?? 'RV College of Engineering', program: kit.user.profile?.branch ?? 'Computer Science', year: String(kit.user.profile?.graduationYear ?? 2026) }],
      skills,
      ...builderSearchFields({ username: kit.username, headline: kit.headline, bio: kit.bio, skills }, { profile: { ...kit.user.profile, city: kit.city } }),
    };
    const id = await ensure(db.BuilderProfile, { userId: kit.user._id }, doc);

    // A builder who already had a profile keeps what they wrote — this only fills blanks and
    // refreshes the derived search index, so topping up never overwrites a real edit.
    const existing = await db.BuilderProfile.findById(id).lean();
    const topUp = { ...builderSearchFields(existing, kit.user) };
    if (!existing.headline) topUp.headline = kit.headline;
    if (!existing.bio) topUp.bio = kit.bio;
    if (!(existing.skills ?? []).length) topUp.skills = skills;
    if (!existing.availability) topUp.availability = kit.availability;
    if (!(existing.education ?? []).length) topUp.education = doc.education;

    const account = await db.User.findById(kit.user._id).lean();
    const merged = { ...existing, ...topUp };
    await db.BuilderProfile.updateOne(
      { _id: id },
      // Completion is the same scorer the dashboard and profile page read — never a second one.
      { $set: { ...topUp, completion: { ...computeCompletion(account, merged), updatedAt: new Date() } } },
    );
    profileByUser[String(kit.user._id)] = await db.BuilderProfile.findById(id).lean();
  }
  summary.builderProfiles = Object.keys(profileByUser).length;

  const primaryBuilder = profileByUser[String(BUILDER_KITS[0].user._id)];
  const abhiramProfile = BUILDER_KITS[1].user ? profileByUser[String(BUILDER_KITS[1].user._id)] : null;

  // ---------------------------------------------------------------------------
  // 4. Catalogue content — courses, perks, drills, briefs, roadmaps, OTT.
  // ---------------------------------------------------------------------------
  const COURSES = [
    ['Modern React from Scratch', 'STUDENT', 'BEGINNER', 'Build production interfaces with hooks, routing and data fetching.', ['React', 'JavaScript'], 18],
    ['Type-Safe APIs with TypeScript', 'STUDENT', 'INTERMEDIATE', 'Model your domain in TypeScript and share types between client and server.', ['TypeScript', 'Node.js'], 14],
    ['Backend Engineering with Node.js', 'STUDENT', 'INTERMEDIATE', 'HTTP, authentication, persistence and testing for real services.', ['Node.js', 'MongoDB'], 22],
    ['Distributed Systems in Practice', 'COMPANY', 'ADVANCED', 'Consistency, queues, retries and the failure modes nobody warns you about.', ['System Design', 'Go'], 26],
    ['SQL for Analysts', 'STUDENT', 'BEGINNER', 'Joins, windows and query plans — the parts that actually get used at work.', ['SQL'], 12],
    ['Applied Machine Learning', 'STUDENT', 'ADVANCED', 'From feature engineering to evaluation, without hiding the maths.', ['Machine Learning', 'Python'], 30],
    ['Docker and Containers, Properly', 'COMPANY', 'INTERMEDIATE', 'Images, layers, volumes and compose — enough to ship confidently.', ['Docker'], 10],
    ['Cloud Fundamentals on AWS', 'COMPANY', 'BEGINNER', 'Compute, storage, networking and IAM explained through one deployed app.', ['AWS'], 16],
    ['Product Thinking for Engineers', 'STUDENT', 'INTERMEDIATE', 'Scoping, prioritising and saying no, without losing the plot.', ['Product Management'], 8],
    ['Interface Design with Figma', 'STUDENT', 'BEGINNER', 'Layout, type and prototypes that survive contact with real content.', ['Figma'], 9],
    ['Practical Web Security', 'COMPANY', 'ADVANCED', 'OWASP basics, session handling and the mistakes that leak data.', ['Cybersecurity'], 15],
  ];
  const courseIds = [];
  for (const [title, audience, level, summary, skills, hours] of COURSES) {
    const slug = slugify(title);
    courseIds.push(
      await ensure(db.Course, { slug }, {
        title, slug, audience, level, summary,
        description: `<p>${summary}</p><p>A guided course with hands-on modules and a final project you can put on your profile.</p>`,
        thumbnailId: thumb(courseIds.length),
        provider: 'STUDLYF Academy',
        role: skills[0],
        durationHours: hours,
        skills: skills.map(skillRef),
        modules: [
          { title: 'Foundations', summary: 'The vocabulary and mental model.', displayOrder: 0, lessons: [
            { title: 'Orientation', kind: 'READING', durationMinutes: 20, displayOrder: 0 },
            { title: 'Core walkthrough', kind: 'VIDEO', durationMinutes: 45, displayOrder: 1 },
            { title: 'Checkpoint quiz', kind: 'QUIZ', durationMinutes: 15, displayOrder: 2 },
          ] },
          { title: 'Applied practice', summary: 'Build the thing.', displayOrder: 1, lessons: [
            { title: 'Guided build', kind: 'PROJECT', durationMinutes: 120, displayOrder: 0 },
            { title: 'Live review', kind: 'LIVE', durationMinutes: 60, displayOrder: 1 },
          ] },
        ],
        status: 'PUBLISHED',
        publishedAt: ago(courseIds.length + 2),
        featured: courseIds.length < 3,
        createdBy: actor,
        updatedBy: actor,
        searchTerms: termsOf(title, summary, skills.join(' ')),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.courses = courseIds.length;

  const BENEFITS = [
    ['GitHub Student Developer Pack', 'SCHOLARSHIP', 'Free developer tools and credits for verified students.', 'Free', ['Docker', 'AWS']],
    ['JetBrains Student Licence', 'SCHOLARSHIP', 'All JetBrains IDEs free while you study.', 'Free for 1 year', ['Python']],
    ['Cloud Credits Starter Pack', 'PERK', 'Cloud credits for your first deployed project.', '$200 in credits', ['AWS', 'Docker']],
    ['Design Tool Student Plan', 'DISCOUNT', 'The full design toolset at no cost for students.', '100% off', ['Figma']],
    ['Interview Prep Pro', 'DISCOUNT', 'Mock interview platform at a student rate.', '60% off', ['System Design']],
    ['Hackathon Travel Grant', 'SCHOLARSHIP', 'Travel reimbursement for national hackathon finalists.', 'Up to ₹5,000', ['React', 'Node.js']],
    ['Course Library Access', 'PERK', 'Unlimited access to the premium course library.', 'Free for 6 months', ['JavaScript']],
    ['Startup Cloud Programme', 'PERK', 'Infrastructure credits for student startups.', 'Up to $1,000', ['AWS', 'Go']],
  ];
  const benefitIds = [];
  for (const [title, type, summary, offer, tags] of BENEFITS) {
    const slug = slugify(title);
    benefitIds.push(
      await ensure(db.StudhubBenefit, { slug }, {
        title, slug, type, summary,
        description: `<p>${summary}</p>`,
        thumbnailId: thumb(benefitIds.length),
        provider: title.split(' ')[0],
        offer,
        eligibility: 'Verified students with an active STUDLYF profile.',
        claimUrl: `https://example.com/student-benefits/${slug}`,
        deadline: days(30 + benefitIds.length * 5),
        tags: [...new Set(tags)].map(skillRef),
        status: 'PUBLISHED',
        publishedAt: ago(benefitIds.length + 1),
        featured: benefitIds.length < 2,
        createdBy: actor,
        updatedBy: actor,
        searchTerms: termsOf(title, summary, tags.join(' ')),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.studhub = benefitIds.length;

  const DRILLS = [
    ['Frontend Engineer Screening Test', 'TEST', 'INTERMEDIATE', 'Timed screening covering JavaScript, React and CSS fundamentals.', ['JavaScript', 'React'], 60, 25],
    ['Backend Engineer Screening Test', 'TEST', 'INTERMEDIATE', 'APIs, databases and concurrency, as asked in real screens.', ['Node.js', 'MongoDB'], 75, 30],
    ['Data Structures Deep Dive Test', 'TEST', 'ADVANCED', 'Trees, graphs and complexity under time pressure.', ['Data Structures'], 90, 20],
    ['SQL Assessment', 'TEST', 'BEGINNER', 'Query writing and reading plans.', ['SQL'], 45, 18],
    ['Product Analyst Test', 'TEST', 'INTERMEDIATE', 'Metrics, funnels and experiment design.', ['Data Analysis'], 50, 22],
    ['Behavioural Mock Interview', 'INTERVIEW', 'BEGINNER', 'STAR-format practice with structured feedback.', ['Product Management'], 40, null],
    ['System Design Mock Interview', 'INTERVIEW', 'ADVANCED', 'Design a scalable service end to end, out loud.', ['System Design'], 60, null],
    ['Frontend Mock Interview', 'INTERVIEW', 'INTERMEDIATE', 'Live component building and debugging.', ['React', 'TypeScript'], 45, null],
    ['ML Concepts Mock Interview', 'INTERVIEW', 'ADVANCED', 'Bias, variance, evaluation and feature work.', ['Machine Learning'], 55, null],
    ['DevOps Screening Test', 'TEST', 'INTERMEDIATE', 'Containers, pipelines and deployment basics.', ['Docker', 'AWS'], 50, 24],
  ];
  const drillIds = [];
  for (const [title, kind, level, summary, skills, minutes, questions] of DRILLS) {
    const slug = slugify(title);
    drillIds.push(
      await ensure(db.MockDrill, { slug }, {
        title, slug, kind, level, summary,
        description: `<p>${summary}</p><p>Attempts are timed and scored; feedback is generated from your answers.</p>`,
        thumbnailId: thumb(drillIds.length),
        role: skills[0],
        provider: 'STUDLYF Prep',
        durationMinutes: minutes,
        questionCount: questions,
        startUrl: `https://example.com/drills/${slug}`,
        skills: skills.map(skillRef),
        status: 'PUBLISHED',
        publishedAt: ago(drillIds.length + 3),
        featured: drillIds.length === 0,
        createdBy: actor,
        updatedBy: actor,
        searchTerms: termsOf(title, summary, skills.join(' ')),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.mockDrills = drillIds.length;

  const BRIEFS = [
    ['Build a URL Shortener', 'WEB', 'BEGINNER', 'A service that shortens links, tracks clicks and expires old ones.', ['Node.js', 'MongoDB'], 12],
    ['Realtime Collaborative Whiteboard', 'WEB', 'INTERMEDIATE', 'Shared canvas with live cursors and conflict-free updates.', ['React', 'Node.js'], 30],
    ['Expense Tracker Mobile App', 'MOBILE', 'BEGINNER', 'Offline-first tracking with charts and categories.', ['Flutter'], 20],
    ['Semantic Search over Documents', 'AI_ML', 'ADVANCED', 'Embed, index and rank a document set with an evaluation harness.', ['Machine Learning', 'Python'], 40],
    ['Feature Flag Service', 'DEVTOOLS', 'INTERMEDIATE', 'Targeted rollouts with an audit trail and SDK.', ['Go', 'System Design'], 28],
    ['On-Chain Voting Prototype', 'BLOCKCHAIN', 'ADVANCED', 'Verifiable tallies with a simple client.', ['Go'], 35],
    ['Habit Tracking App', 'MOBILE', 'BEGINNER', 'Streaks, reminders and weekly summaries.', ['Flutter'], 18],
    ['Data Pipeline for Public Datasets', 'AI_ML', 'INTERMEDIATE', 'Ingest, clean and schedule a dataset end to end.', ['Python', 'SQL'], 24],
    ['Accessible Component Library', 'WEB', 'INTERMEDIATE', 'Ship ten components that pass keyboard and screen-reader tests.', ['React', 'TypeScript', 'Figma'], 26],
    ['IoT Air Quality Monitor', 'IOT', 'ADVANCED', 'Sensors, ingestion and a live dashboard.', ['Python', 'Data Analysis'], 32],
  ];
  const briefIds = [];
  for (const [title, category, difficulty, summary, skills, hours] of BRIEFS) {
    const slug = slugify(title);
    briefIds.push(
      await ensure(db.ProjectBrief, { slug }, {
        title, slug, category, difficulty, summary,
        description: `<p>${summary}</p><p>Submit a repository and demo; you will get a scored review against the rubric.</p>`,
        thumbnailId: thumb(briefIds.length),
        estimatedHours: hours,
        deliverables: ['Working repository with a README', 'A short demo or screenshots', 'Notes on trade-offs you made'],
        starterUrl: `https://example.com/starters/${slug}`,
        skills: skills.map(skillRef),
        status: 'PUBLISHED',
        publishedAt: ago(briefIds.length + 4),
        featured: briefIds.length < 2,
        createdBy: actor,
        updatedBy: actor,
        searchTerms: termsOf(title, summary, skills.join(' '), difficulty),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.projectBriefs = briefIds.length;

  const ROADMAPS = [
    ['Frontend Engineer', 'Engineering', 'Interfaces, state and the browser.', [['React', 'CORE'], ['JavaScript', 'CORE'], ['TypeScript', 'IMPORTANT'], ['Figma', 'OPTIONAL'], ['System Design', 'OPTIONAL']]],
    ['Backend Engineer', 'Engineering', 'Services, data and scale.', [['Node.js', 'CORE'], ['SQL', 'CORE'], ['MongoDB', 'IMPORTANT'], ['Docker', 'IMPORTANT'], ['System Design', 'IMPORTANT'], ['AWS', 'OPTIONAL']]],
    ['Data Scientist', 'Data', 'Statistics, modelling and communication.', [['Python', 'CORE'], ['SQL', 'CORE'], ['Data Analysis', 'CORE'], ['Machine Learning', 'IMPORTANT']]],
    ['Machine Learning Engineer', 'AI', 'Models that survive production.', [['Python', 'CORE'], ['Machine Learning', 'CORE'], ['Docker', 'IMPORTANT'], ['AWS', 'IMPORTANT'], ['Data Structures', 'OPTIONAL']]],
    ['Product Manager', 'Product', 'Discovery, prioritisation and delivery.', [['Product Management', 'CORE'], ['Data Analysis', 'IMPORTANT'], ['SQL', 'OPTIONAL'], ['Figma', 'OPTIONAL']]],
    ['DevOps Engineer', 'Infrastructure', 'Pipelines, containers and reliability.', [['Docker', 'CORE'], ['AWS', 'CORE'], ['Go', 'IMPORTANT'], ['System Design', 'IMPORTANT'], ['Cybersecurity', 'OPTIONAL']]],
  ];
  const roadmapIds = {};
  for (const [role, roleFamily, description, steps] of ROADMAPS) {
    const slug = slugify(role);
    roadmapIds[slug] = await ensure(db.RoadmapTemplate, { slug }, {
      role,
      slug,
      roleFamily,
      summary: description,
      description: `<p>${description}</p><p>Work through the steps in order; each maps to a skill on your builder profile.</p>`,
      demandNote: `${role} roles are consistently among the most-posted openings on the platform.`,
      steps: steps.map(([name, priority]) => ({
        skillSlug: slugify(name),
        skillName: name,
        priority,
        rationale: `${name} shows up in most ${role} job descriptions and interview loops.`,
        resourceSlug: null,
      })),
      status: 'PUBLISHED',
      publishedAt: ago(20),
      featured: role === 'Frontend Engineer',
      createdBy: actor,
      updatedBy: actor,
      searchTerms: termsOf(role, roleFamily, description, steps.map((s) => s[0]).join(' ')),
      titleTerms: termsOf(role),
    });
  }
  summary.roadmaps = Object.keys(roadmapIds).length;

  const OTT = [
    ['Designing Data-Intensive Applications, Explained', 'SERIES', 'A chapter-by-chapter walkthrough of the ideas behind reliable systems.', ['System Design'], 8],
    ['The Practical Guide to React Server Components', 'VIDEO', 'What actually runs where, and why it matters for your bundle.', ['React'], 1],
    ['SQL Window Functions in 20 Minutes', 'VIDEO', 'Ranking, running totals and gaps — the three patterns that cover most cases.', ['SQL'], 1],
    ['How Docker Images Really Work', 'ARTICLE', 'Layers, caching and why your image is 1.2 GB.', ['Docker'], 1],
    ['Interview Loops, Demystified', 'SERIES', 'What each round is testing and how to prepare without cramming.', ['Product Management'], 6],
    ['Machine Learning Evaluation that Isn\'t Wrong', 'VIDEO', 'Splits, leakage and the metrics that lie.', ['Machine Learning'], 1],
    ['Building Accessible Interfaces', 'COURSE', 'Ten modules on keyboard, screen-reader and colour-contrast practice.', ['Figma', 'React'], 10],
    ['From Student to Backend Engineer', 'SERIES', 'Six engineers on the first year of the job.', ['Node.js'], 6],
    ['TypeScript Types You Should Actually Write', 'ARTICLE', 'Narrowing, discriminated unions and when to stop.', ['TypeScript'], 1],
    ['System Design: Rate Limiting', 'VIDEO', 'Token buckets, sliding windows and where each one breaks.', ['System Design'], 1],
    ['Effective Code Review', 'ARTICLE', 'How to give feedback people can act on.', ['JavaScript'], 1],
    ['Cloud Costs Nobody Warned You About', 'VIDEO', 'Egress, idle resources and the bill that surprises teams.', ['AWS'], 1],
  ];
  const ottIds = [];
  for (const [title, kind, summary, skills, episodes] of OTT) {
    const slug = slugify(title);
    const isSeries = episodes > 1;
    ottIds.push(
      await ensure(db.Ott, { slug }, {
        title, slug, kind, summary,
        description: `<p>${summary}</p>`,
        thumbnailId: thumb(ottIds.length),
        categoryId: seedCategory,
        byline: 'STUDLYF Originals',
        level: kind === 'COURSE' ? 'INTERMEDIATE' : null,
        durationMinutes: isSeries ? episodes * 22 : 24,
        sourceUrl: `https://example.com/watch/${slug}`,
        episodes: isSeries
          ? Array.from({ length: episodes }, (_, i) => ({
              key: `ep-${i + 1}`,
              title: `Episode ${i + 1}`,
              summary: `Part ${i + 1} of the series.`,
              durationMinutes: 22,
              sourceUrl: `https://example.com/watch/${slug}/${i + 1}`,
            }))
          : [],
        skills: skills.map(skillRef),
        status: 'PUBLISHED',
        publishedAt: ago(ottIds.length + 5),
        featured: ottIds.length < 3,
        createdBy: actor,
        updatedBy: actor,
        searchTerms: termsOf(title, summary, skills.join(' ')),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.ott = ottIds.length;

  // ---------------------------------------------------------------------------
  // 5. Organizations — verified, with members, so the organizer side has a home.
  // ---------------------------------------------------------------------------
  const ORGS = [
    ['Campus Builders Collective', 'COMMUNITY', 'Bengaluru', 'A student-run community running hackathons and build nights across three campuses.'],
    ['Northwind Technologies', 'COMPANY', 'Pune', 'Product engineering company hiring interns and graduates from tier-2 colleges.'],
    ['Riverline University', 'UNIVERSITY', 'Chennai', 'Placement cell running structured evaluation programmes for final-year students.'],
    ['LaunchPad Ventures', 'INCUBATOR', 'Hyderabad', 'Early-stage incubator supporting student founders through idea to seed.'],
    ['Open Source India', 'NGO', 'Remote', 'Not-for-profit advancing open-source contribution among Indian students.'],
  ];
  const orgIds = [];
  for (const [name, type, city, description] of ORGS) {
    const slug = slugify(name);
    orgIds.push(
      await ensure(db.Organization, { slug }, {
        name, slug, type, city, description,
        website: `https://example.com/${slug}`,
        contactEmail: `hello@${slug}.example.com`,
        logoId: media.find((m) => m.purpose === 'PARTNER_LOGO' || m.purpose === 'LOGO')?._id ?? null,
        createdBy: actor,
        status: 'ACTIVE',
        submittedAt: ago(80),
        reviewedBy: admin?._id ?? null,
        reviewedAt: ago(75),
        searchTerms: termsOf(name, description, city, type),
        titleTerms: termsOf(name),
      }),
    );
  }
  // Ownership: the organizer demo account owns the first org; the university owns itself.
  const memberRows = [
    [orgIds[0], organizerUser._id, 'OWNER'],
    [orgIds[0], evaluatorUser._id, 'EVALUATOR'],
    [orgIds[2], evaluatorUser._id, 'EVALUATOR'],
    [orgIds[2], organizerUser._id, 'ADMIN'],
    [orgIds[1], hrUser._id, 'ADMIN'],
  ];
  for (const [organizationId, userId, role] of memberRows) {
    await ensure(db.OrganizationMember, { organizationId, userId }, { organizationId, userId, role, addedBy: actor });
  }
  summary.organizations = orgIds.length;

  // Give the organization platform something to organize: the base-seed opportunities were
  // created without an owning organization, which left every organizer list empty. Only
  // opportunities that have no organization yet are touched — an opportunity that is already
  // owned stays where it is.
  const programmeIndex = Math.max(
    0,
    opportunities.findIndex((o) => o.submissionSettings?.acceptsProjects),
  );
  // The programme carries the submissions and evaluations, so it goes to the organizer's own
  // organization; the rest are spread so the other orgs are not empty either.
  const ORG_CYCLE = [orgIds[0], orgIds[0], orgIds[1], orgIds[2], orgIds[3], orgIds[4], orgIds[2], orgIds[1]];
  let linked = 0;
  for (let i = 0; i < opportunities.length; i += 1) {
    if (opportunities[i].organizationId) continue;
    const orgId = i === programmeIndex ? orgIds[0] : ORG_CYCLE[i % ORG_CYCLE.length];
    if (!orgId) continue;
    await db.Opportunity.updateOne({ _id: opportunities[i]._id }, { $set: { organizationId: orgId } });
    opportunities[i].organizationId = orgId;
    linked += 1;
  }
  summary.opportunitiesLinkedToOrgs = linked;

  // The structured detail blocks (rounds / prizes / FAQ) were added to the schema after the base
  // seed first ran, so every opportunity it created predates them and the Unstop-style sections
  // have nothing to render. Backfill only rows that have none — an opportunity someone has already
  // filled in is left exactly as it is (§95), and a re-run finds nothing left to do.
  const ROUND_SHAPES = {
    HACKATHON: ['Registration closes', 'Hacking window', 'Demo and judging'],
    COMPETITION: ['Entry window', 'Shortlisting', 'Final showcase'],
    CHALLENGE: ['Registration closes', 'Build sprint', 'Judging and results'],
    FELLOWSHIP: ['Applications close', 'Interviews', 'Fellowship begins'],
    WORKSHOP: ['Registration closes', 'Session day'],
    PROGRAM: ['Applications close', 'Selection', 'Cohort begins'],
    INTERNSHIP: ['Applications close', 'Screening', 'Interviews'],
    JOB: ['Applications close', 'Screening', 'Interviews'],
  };
  const PRIZE_TYPES = new Set(['HACKATHON', 'COMPETITION', 'CHALLENGE']);
  let detailBlocked = 0;
  for (const opp of opportunities) {
    if ((opp.rounds ?? []).length || (opp.prizes ?? []).length || (opp.faqs ?? []).length) continue;
    const shapes = ROUND_SHAPES[opp.type] ?? ['Registration closes', 'Evaluation'];
    const anchor = opp.startDate ?? opp.applicationDeadline ?? days(14);
    const rounds = shapes.map((title, i) => ({
      title,
      description: null,
      startsAt: i === 0 ? (opp.applicationDeadline ?? anchor) : new Date(anchor.getTime() + i * 7 * DAY),
      endsAt: null,
      mode: opp.mode ?? null,
      location: opp.mode === 'OFFLINE' ? (opp.location ?? null) : null,
      displayOrder: i,
    }));
    const prizes = PRIZE_TYPES.has(opp.type)
      ? [
          { title: 'First place', description: 'Judged on problem clarity, execution and the demo.', rank: '1', value: 50000, currency: 'INR', quantity: 1, displayOrder: 0 },
          { title: 'Runner-up', description: null, rank: '2', value: 25000, currency: 'INR', quantity: 2, displayOrder: 1 },
        ]
      : [];
    const faqs = [
      { question: 'Who can take part?', answer: '<p>Students and early-career builders — see the eligibility section for anything specific.</p>', displayOrder: 0 },
      {
        question: opp.mode === 'ONLINE' ? 'Is it fully online?' : 'Where does it take place?',
        answer: opp.mode === 'ONLINE' ? '<p>Yes — everything happens online, including the final round.</p>' : `<p>${opp.location ?? 'On site'} — the venue is confirmed to registered participants.</p>`,
        displayOrder: 1,
      },
    ];
    // `searchTerms` is select:false, so append rather than recompute — the new prose stays findable.
    await db.Opportunity.updateOne(
      { _id: opp._id },
      {
        $set: { rounds, prizes, faqs },
        $addToSet: {
          searchTerms: {
            $each: termsOf(
              ...rounds.map((r) => r.title),
              ...prizes.map((p) => p.title),
              ...faqs.map((f) => f.question),
            ),
          },
        },
      },
      { runValidators: true },
    );
    detailBlocked += 1;
  }
  summary.opportunityDetailBlocks = detailBlocked;

  // ---------------------------------------------------------------------------
  // 6. Projects — across every status, visibility and moderation state.
  // ---------------------------------------------------------------------------
  const allProfiles = Object.values(profileByUser);
  // [title, tagline, category, projectType, status, visibility, moderationStatus]
  const PROJECTS = [
    ['Loopback Analytics', 'Self-hosted product analytics in a single binary', 'DEVTOOLS', 'OPEN_SOURCE', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['Sahayak', 'Offline-first health records for rural clinics', 'HEALTHTECH', 'HACKATHON', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['Kettle', 'A tiny job queue that survives restarts', 'DEVTOOLS', 'OPEN_SOURCE', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['Pixelforge', 'Collaborative pixel art with live cursors', 'GAMING', 'PERSONAL', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['RouteWise', 'Bus route planner using live GTFS feeds', 'MOBILE', 'ACADEMIC', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['Ledgerly', 'Plain-text accounting for freelancers', 'FINTECH', 'STARTUP', 'PUBLISHED', 'PUBLIC', 'APPROVED'],
    ['CampusQueue', 'Token-based queueing for campus services', 'EDUCATION', 'ACADEMIC', 'UNDER_REVIEW', 'PUBLIC', 'APPROVED'],
    ['SensorMesh', 'LoRa mesh for campus air-quality sensing', 'IOT', 'RESEARCH', 'SUBMITTED', 'PUBLIC', 'APPROVED'],
    ['Inkwell', 'Distraction-free markdown writing with local sync', 'DEVTOOLS', 'PERSONAL', 'IN_PROGRESS', 'PRIVATE', 'PENDING'],
    ['Theorem', 'Automated proof checking for first-year discrete maths', 'EDUCATION', 'RESEARCH', 'IN_PROGRESS', 'UNLISTED', 'PENDING'],
    ['Nightshift', 'On-call rota planning that respects sleep', 'DEVTOOLS', 'STARTUP', 'DRAFT', 'PRIVATE', 'PENDING'],
    ['Signal', 'Real-time anomaly detection on metrics streams', 'AI_ML', 'COMPETITION', 'EVALUATED', 'PUBLIC', 'APPROVED'],
    ['Harbour', 'Container registry with signed images', 'DEVTOOLS', 'PERSONAL', 'ARCHIVED', 'PRIVATE', 'APPROVED'],
    ['Spammy Test Project', 'A project that was reported and hidden', 'WEB', 'OTHER', 'PUBLISHED', 'PUBLIC', 'HIDDEN'],
  ];
  const projectIds = [];
  for (let i = 0; i < PROJECTS.length; i += 1) {
    const [title, tagline, category, projectType, status, visibility, moderationStatus] = PROJECTS[i];
    const author = allProfiles[i % allProfiles.length];
    const slug = slugify(title);
    const published = visibility === 'PUBLIC' && status !== 'DRAFT' && moderationStatus === 'APPROVED';
    projectIds.push(
      await ensure(db.Project, { slug }, {
        title, slug, tagline,
        description: `<p>${tagline}. Built as a ${projectType.toLowerCase().replace('_', ' ')} project, iterated over several weeks and documented end to end.</p>`,
        problemStatement: 'The existing options were either closed, expensive or awkward to self-host.',
        solution: 'A small, focused service with a clear boundary and an honest README.',
        impact: 'Used by a handful of real teams during the pilot.',
        category,
        projectType,
        technologies: ['React', 'Node.js', 'MongoDB'],
        tags: [category.toLowerCase(), projectType.toLowerCase()],
        skills: (allProfiles[i % allProfiles.length].skills ?? []).slice(0, 2).map((s) => ({ skillId: s.skillId ?? null, slug: s.slug, name: s.name })),
        coverImageId: banner(i),
        media: [],
        links: { repository: `https://example.com/${slug}`, demo: published ? `https://${slug}.example.com` : null },
        teamName: i % 3 === 0 ? 'Team Meridian' : null,
        startDate: ago(70 - i * 3),
        endDate: status === 'COMPLETED' || status === 'PUBLISHED' ? ago(20 - i) : null,
        authorUserId: author.userId,
        authorProfileId: author._id,
        status,
        visibility,
        publishedAt: published ? ago(15 - (i % 10)) : null,
        completedAt: status === 'COMPLETED' || status === 'PUBLISHED' ? ago(18 - i) : null,
        moderationStatus,
        moderationReason: moderationStatus === 'HIDDEN' ? 'Reported by multiple users and hidden pending review.' : null,
        moderatedBy: moderationStatus === 'APPROVED' || moderationStatus === 'HIDDEN' ? actor : null,
        moderatedAt: moderationStatus === 'PENDING' ? null : ago(12),
        reportCount: moderationStatus === 'HIDDEN' ? 4 : 0,
        upvoteCount: published ? 4 + i * 3 : 0,
        featured: i === 0,
        searchTerms: termsOf(title, tagline, category, projectType, 'React Node MongoDB'),
        titleTerms: termsOf(title),
      }),
    );
  }
  summary.projects = projectIds.length;

  // Team membership + upvotes on the published ones.
  let memberCount = 0;
  let upvoteCount = 0;
  for (let i = 0; i < projectIds.length; i += 1) {
    const projectId = projectIds[i];
    const author = allProfiles[i % allProfiles.length];
    await ensure(db.ProjectMember, { projectId, userId: author.userId }, { projectId, userId: author.userId, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: ago(60) });
    memberCount += 1;
    if (i % 3 === 0 && allProfiles[(i + 1) % allProfiles.length]) {
      const mate = allProfiles[(i + 1) % allProfiles.length];
      await ensure(db.ProjectMember, { projectId, userId: mate.userId }, { projectId, userId: mate.userId, role: 'CO_BUILDER', status: i % 2 === 0 ? 'ACTIVE' : 'INVITED', canEdit: i % 2 === 0, invitedBy: author.userId, joinedAt: i % 2 === 0 ? ago(50) : null });
      memberCount += 1;
    }
    for (const voter of allProfiles) {
      if (String(voter.userId) === String(author.userId)) continue;
      if ((i + upvoteCount) % 2 === 0) {
        await ensure(db.ProjectUpvote, { projectId, userId: voter.userId }, { projectId, userId: voter.userId });
        upvoteCount += 1;
      }
    }
  }
  summary.projectMembers = memberCount;
  summary.projectUpvotes = upvoteCount;

  // Pending team invitations addressed to the first builder, so the invitations screen shows a
  // row rather than only its empty state.
  for (const idx of [1, 4]) {
    const proj = await db.Project.findById(projectIds[idx]).lean();
    if (!proj || String(proj.authorUserId) === String(primaryBuilder.userId)) continue;
    await ensure(db.ProjectMember, { projectId: proj._id, userId: primaryBuilder.userId }, {
      projectId: proj._id,
      userId: primaryBuilder.userId,
      role: 'CONTRIBUTOR',
      status: 'INVITED',
      canEdit: false,
      invitedBy: proj.authorUserId,
    });
  }

  // A report on the hidden project, so moderation has something to resolve.
  if (projectIds[13]) {
    await ensure(db.ProjectReport, { projectId: projectIds[13], reporterUserId: abhiramProfile?.userId ?? primaryBuilder.userId }, {
      projectId: projectIds[13],
      reporterUserId: abhiramProfile?.userId ?? primaryBuilder.userId,
      reason: 'SPAM',
      details: 'This looks like an advertising listing rather than a real project.',
      status: 'OPEN',
    });
    summary.projectReports = 1;
  }

  // ---------------------------------------------------------------------------
  // 7. Applications and submissions — every status represented.
  // ---------------------------------------------------------------------------
  const appStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
  const builderList = allProfiles.filter(Boolean);
  let appCount = 0;
  for (let i = 0; i < opportunities.length; i += 1) {
    const opp = opportunities[i];
    for (let b = 0; b < builderList.length; b += 1) {
      const profile = builderList[b];
      if ((i + b) % 3 !== 0 && b !== 0) continue; // keep it plausible: not everyone applies to everything
      const status = appStatuses[(i + b) % appStatuses.length];
      const submitted = status !== 'DRAFT';
      await ensure(db.Application, { opportunityId: opp._id, builderUserId: profile.userId }, {
        opportunityId: opp._id,
        builderUserId: profile.userId,
        builderProfileId: profile._id,
        status,
        answers: [],
        statusHistory: [
          { status: 'DRAFT', at: ago(30 - i), byUserId: profile.userId },
          ...(submitted ? [{ status: 'SUBMITTED', at: ago(25 - i), byUserId: profile.userId }] : []),
          ...(status === 'SHORTLISTED' || status === 'SELECTED' || status === 'REJECTED' ? [{ status, at: ago(10), byUserId: actor, note: status === 'REJECTED' ? 'Strong profile, but the cohort was full.' : 'Moved forward to the next round.' }] : []),
        ],
        submittedAt: submitted ? ago(25 - i) : null,
        withdrawnAt: status === 'WITHDRAWN' ? ago(8) : null,
        reviewerNote: status === 'REJECTED' ? 'Keep an eye on this builder for the next cohort.' : null,
      });
      appCount += 1;
    }
  }
  summary.applications = appCount;

  // Evaluation templates + submissions + evaluations on the programme opportunity.
  const programme = opportunities.find((o) => o.submissionSettings?.acceptsProjects) ?? opportunities[0];
  const templateIds = [];
  for (const [name, criteria] of [
    ['Hackathon Rubric', [['Originality', 25], ['Technical execution', 35], ['Impact', 25], ['Presentation', 15]]],
    ['Screening Rubric', [['Problem understanding', 30], ['Engineering quality', 40], ['Communication', 30]]],
    ['Design Review Rubric', [['Concept', 25], ['Craft', 40], ['Usability', 35]]],
  ]) {
    templateIds.push(
      await ensure(db.EvaluationTemplate, { name, opportunityId: programme?._id ?? null }, {
        name,
        description: `Scoring rubric used for ${name.replace(' Rubric', '').toLowerCase()} reviews.`,
        organizationId: orgIds[0] ?? null,
        opportunityId: programme?._id ?? null,
        isActive: true,
        criteria: criteria.map(([cname, maxScore], idx) => ({ name: cname, maxScore, weight: maxScore, order: idx, required: true })),
        createdBy: actor,
        updatedBy: actor,
      }),
    );
  }
  summary.evaluationTemplates = templateIds.length;

  const submissionIds = [];
  if (programme) {
    for (let i = 0; i < Math.min(8, projectIds.length); i += 1) {
      const profile = allProfiles[i % allProfiles.length];
      const status = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED'][i % 5];
      const proj = await db.Project.findById(projectIds[i]).lean();
      submissionIds.push(
        await ensure(db.ProjectSubmission, { projectId: projectIds[i], opportunityId: programme._id }, {
          projectId: projectIds[i],
          opportunityId: programme._id,
          submittedBy: profile.userId,
          organizationId: orgIds[0] ?? null,
          status,
          note: 'Submitted before the deadline with a full README and demo link.',
          reviewerNote: status === 'SHORTLISTED' ? 'Clear problem statement, well scoped.' : null,
          statusHistory: [
            { status: 'DRAFT', at: ago(28 - i) },
            { status: 'SUBMITTED', at: ago(24 - i) },
            ...(status !== 'SUBMITTED' ? [{ status, at: ago(12) }] : []),
          ],
          projectSnapshot: { title: proj?.title ?? 'Project', category: proj?.category ?? 'OTHER', projectType: proj?.projectType ?? 'PERSONAL', capturedAt: ago(24 - i) },
          submittedAt: ago(24 - i),
        }),
      );
    }
  }
  summary.submissions = submissionIds.length;

  // Skills must exist in the vocabulary before they can be referenced.
  const skillBySlug = {};
  for (const s of await db.Skill.find().lean()) skillBySlug[s.slug] = s;

  let evalCount = 0;
  for (let i = 0; i < submissionIds.length; i += 1) {
    const submission = await db.ProjectSubmission.findById(submissionIds[i]).lean();
    if (!submission || submission.status === 'SUBMITTED') continue;
    const template = await db.EvaluationTemplate.findById(templateIds[0]).lean();
    const scores = (template?.criteria ?? []).map((c) => ({
      criterionId: c._id,
      name: c.name,
      description: null,
      maxScore: c.maxScore,
      weight: c.weight,
      required: true,
      order: c.order,
      score: Math.round(c.maxScore * (0.6 + (i % 4) * 0.1)),
      weightedScore: Math.round(c.maxScore * (0.6 + (i % 4) * 0.1)),
      feedback: 'Solid work with room to sharpen the write-up.',
      feedbackVisibility: 'BUILDER_VISIBLE',
    }));
    const overall = scores.reduce((a, s) => a + (s.weightedScore ?? 0), 0);
    await ensure(db.Evaluation, { submissionId: submission._id, evaluatorId: evaluatorUser._id }, {
      submissionId: submission._id,
      projectId: submission.projectId,
      opportunityId: submission.opportunityId,
      evaluatorId: evaluatorUser._id,
      templateId: templateIds[0],
      templateName: template?.name ?? 'Hackathon Rubric',
      status: 'COMPLETED',
      scores,
      overallScore: overall,
      maxScore: 100,
      overallFeedback: 'A considered submission. The problem is real and the scope is honest.',
      overallFeedbackVisibility: 'BUILDER_VISIBLE',
      scoreVisibility: 'BUILDER_VISIBLE',
      internalNotes: 'Track for the next cohort.',
      showEvaluatorIdentity: false,
      assignedBy: actor,
      assignedAt: ago(20),
      startedAt: ago(18),
      completedAt: ago(14),
    });
    evalCount += 1;
  }
  summary.evaluations = evalCount;

  // ---------------------------------------------------------------------------
  // 8. Achievements and certificates — including one revoked, to test that state.
  // ---------------------------------------------------------------------------
  const achTitles = [
    ['Hackathon Winner', 'WINNER', 'Won first place at Loophacks 2026 for Loopback Analytics.', 'Loophacks'],
    ['Finalist — AI for Bharat', 'FINALIST', 'Reached the final round of the AI for Bharat challenge.', 'AI for Bharat'],
    ['Hackathon Participation', 'HACKATHON_PARTICIPATION', 'Participated in the winter AI residency hackathon.', 'STUDLYF'],
    ['Project Completed', 'PROJECT_COMPLETED', 'Completed and published Loopback Analytics.', 'STUDLYF'],
    ['Open Source Contributor', 'OPEN_SOURCE', 'Merged three pull requests into a widely used library.', 'GitHub'],
    ['Course Completed', 'CERTIFICATE', 'Completed Modern React from Scratch.', 'STUDLYF Academy'],
    ['Shortlisted — SDE Intern', 'SHORTLISTED', 'Shortlisted for the platform team internship.', 'Northwind Technologies'],
    ['Competition Runner-up', 'COMPETITION', 'Second place in the inter-college data challenge.', 'Riverline University'],
  ];
  const achievementIds = [];
  for (let i = 0; i < achTitles.length; i += 1) {
    const [title, type, description, issuer] = achTitles[i];
    const profile = allProfiles[i % allProfiles.length];
    achievementIds.push(
      await ensure(db.Achievement, { userId: profile.userId, title }, {
        userId: profile.userId,
        projectId: i % 3 === 0 ? projectIds[i % projectIds.length] : null,
        opportunityId: i % 2 === 0 ? opportunities[i % opportunities.length]?._id ?? null : null,
        title,
        description,
        type,
        issuer,
        date: ago(40 - i * 4),
        source: i % 2 === 0 ? 'SYSTEM' : 'USER',
        verificationStatus: i % 3 === 0 ? 'VERIFIED' : i % 3 === 1 ? 'UNVERIFIED' : 'VERIFIED',
        visibility: i === 6 ? 'PRIVATE' : 'PUBLIC',
        verifiedBy: i % 3 !== 1 ? admin?._id ?? null : null,
        verifiedAt: i % 3 !== 1 ? ago(30 - i) : null,
        metadata: { seed: true },
      }),
    );
  }
  summary.achievements = achievementIds.length;

  // Certificate codes are 12 characters from an alphabet with no O/0 or I/1, because they are read
  // off a printed certificate and typed by hand. `verify()` normalizes the *query* but compares it
  // to the stored value verbatim, so a code containing separators can never be verified. Generating
  // it deterministically from the achievement keeps this seeder idempotent across runs.
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CONFORMING_CODE = /^[A-HJ-NP-Z2-9]{12}$/;
  const codeFrom = (seed) => {
    let h = 2166136261 >>> 0;
    for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    let out = '';
    for (let n = 0; n < 12; n += 1) {
      // Re-hash per character and take the high bits: a plain LCG's low bits cycle, which makes
      // consecutive codes share long substrings and look like a pattern rather than a credential.
      h = Math.imul(h ^ (n + 1), 16777619) >>> 0;
      out += CODE_ALPHABET[(h >>> 8) % CODE_ALPHABET.length];
    }
    return out;
  };
  // Only this seeder has ever written a non-conforming code (the platform mints them from the
  // alphabet above), so removing them repairs an earlier run without touching real credentials.
  const repaired = await db.Certificate.deleteMany({ verificationCode: { $not: CONFORMING_CODE } });
  if (repaired.deletedCount) summary.certificatesRepaired = repaired.deletedCount;

  let certCount = 0;
  for (let i = 0; i < Math.min(6, achievementIds.length); i += 1) {
    const profile = allProfiles[i % allProfiles.length];
    const account = await db.User.findById(profile.userId).lean();
    const ach = await db.Achievement.findById(achievementIds[i]).lean();
    const code = codeFrom(`${ach.title}:${i}`);
    const doc = {
      userId: profile.userId,
      organizationId: orgIds[0] ?? null,
      opportunityId: ach.opportunityId ?? null,
      achievementId: ach._id,
      type: ['WINNER', 'FINALIST', 'PARTICIPATION', 'COMPLETION', 'SHORTLIST', 'MERIT'][i % 6],
      title: ach.title,
      recipientName: account?.name ?? 'Builder',
      issuerName: ach.issuer ?? 'STUDLYF',
      issueDate: ach.date,
      verificationCode: code,
      status: i === 5 ? 'REVOKED' : 'ACTIVE',
      revokedAt: i === 5 ? ago(2) : null,
      revokedReason: i === 5 ? 'Issued in error during a test run.' : null,
      metadata: { seed: true },
    };
    // `certificates` has ONE credential per achievement (a unique index on achievementId), so the
    // achievement is the natural key — keying on the code instead collides whenever the generator
    // changes. An existing row keeps its identity and only has its code refreshed.
    const existing = await db.Certificate.findOne({ achievementId: ach._id }).lean();
    if (existing) {
      if (existing.verificationCode !== code) {
        await db.Certificate.updateOne({ _id: existing._id }, { $set: { verificationCode: code } });
      }
    } else {
      await db.Certificate.create(doc);
    }
    certCount += 1;
  }
  summary.certificates = certCount;

  // ---------------------------------------------------------------------------
  // 9. Resumes, roadmaps and OTT progress for the signed-in builders.
  // ---------------------------------------------------------------------------
  let resumeCount = 0;
  for (const profile of allProfiles.slice(0, 3)) {
    const account = await db.User.findById(profile.userId).lean();
    await ensure(db.Resume, { userId: profile.userId, title: 'Primary résumé' }, {
      userId: profile.userId,
      title: 'Primary résumé',
      template: 'classic',
      fullName: account?.name ?? 'Builder',
      headline: profile.headline,
      email: account?.email,
      phone: '+91 90000 00000',
      location: account?.profile?.city ?? 'Bengaluru',
      summary: profile.bio,
      experience: [
        { company: 'Northwind Technologies', role: 'Software Engineering Intern', location: 'Pune', startDate: '2025-06', endDate: '2025-08', current: false, description: 'Built and shipped an internal analytics pipeline used by three teams.' },
      ],
      education: [{ school: account?.profile?.college ?? 'RV College of Engineering', program: account?.profile?.branch ?? 'Computer Science', year: '2026', details: 'CGPA 8.6/10' }],
      projects: [{ name: 'Loopback Analytics', description: 'Self-hosted product analytics in a single binary.', url: 'https://example.com/loopback', skills: ['React', 'Node.js'] }],
      skills: (profile.skills ?? []).map((s) => s.name),
      certifications: [{ name: 'Modern React from Scratch', issuer: 'STUDLYF Academy', year: '2025' }],
    });
    resumeCount += 1;
  }
  summary.resumes = resumeCount;

  let roadmapCount = 0;
  const roadmapSlugs = Object.keys(roadmapIds);
  for (let i = 0; i < Math.min(allProfiles.length, 3); i += 1) {
    const profile = allProfiles[i];
    const slug = roadmapSlugs[i % roadmapSlugs.length];
    const template = await db.RoadmapTemplate.findOne({ slug }).lean();
    if (!template) continue;
    const steps = template.steps ?? [];
    await ensure(db.UserRoadmap, { userId: profile.userId }, {
      userId: profile.userId,
      templateId: template._id,
      roleSlug: slug,
      completedSkillSlugs: steps.slice(0, i + 1).map((s) => s.skillSlug),
      targetDate: days(120),
      startedAt: ago(20 - i * 3),
    });
    roadmapCount += 1;
  }
  summary.userRoadmaps = roadmapCount;

  let progressCount = 0;
  for (let i = 0; i < Math.min(6, allProfiles.length * 2); i += 1) {
    const profile = allProfiles[i % allProfiles.length];
    const contentId = ottIds[i % ottIds.length];
    const doc = await db.Ott.findById(contentId).lean();
    const episodeKey = doc?.episodes?.[0]?.key ?? null;
    const percent = [100, 45, 12, 88, 30, 100][i % 6];
    await ensure(db.OttProgress, { userId: profile.userId, contentId, episodeKey }, {
      userId: profile.userId,
      contentId,
      episodeKey,
      positionSeconds: Math.round((percent / 100) * ((doc?.durationMinutes ?? 20) * 60)),
      percent,
      completed: percent === 100,
      lastWatchedAt: ago(i + 1),
    });
    progressCount += 1;
  }
  summary.ottProgress = progressCount;

  // ---------------------------------------------------------------------------
  // 10. Saved items — every entity type the bookmark list supports (§57).
  // ---------------------------------------------------------------------------
  const savers = [primaryBuilder, abhiramProfile, ...allProfiles.slice(0, 2)].filter(Boolean);
  const saveTargets = [
    ['COURSE', courseIds], ['RESOURCE', (await db.Resource.find().limit(4).lean()).map((r) => r._id)],
    ['OPPORTUNITY', opportunities.slice(0, 3).map((o) => o._id)], ['PROJECT', projectIds.slice(0, 3)],
    ['MOCK_DRILL', drillIds.slice(0, 2)], ['PROJECT_BRIEF', briefIds.slice(0, 2)],
    ['STUDHUB', benefitIds.slice(0, 2)], ['OTT', ottIds.slice(0, 2)],
  ];
  let savedCount = 0;
  for (const saver of savers) {
    for (const [entityType, ids] of saveTargets) {
      for (const entityId of ids) {
        if (!entityId) continue;
        await ensure(db.SavedItem, { userId: saver.userId, entityType, entityId }, {
          userId: saver.userId, entityType, entityId, savedAt: ago(savedCount % 20),
        });
        savedCount += 1;
      }
    }
    if (orgIds[0]) {
      await ensure(db.SavedItem, { userId: saver.userId, entityType: 'ORGANIZATION', entityId: orgIds[0] }, { userId: saver.userId, entityType: 'ORGANIZATION', entityId: orgIds[0], savedAt: ago(3) });
      savedCount += 1;
    }
  }
  summary.savedItems = savedCount;

  // ---------------------------------------------------------------------------
  // 11. Notifications — mixed types, some unread, so the bell has content.
  // ---------------------------------------------------------------------------
  const NOTES = [
    ['APPLICATION_STATUS', 'You were shortlisted', 'Northwind Technologies moved your application to the next round.', false],
    ['APPLICATION_STATUS', 'Application received', 'Your application for the winter AI residency was received.', true],
    ['PROJECT_UPVOTE', 'Someone upvoted Loopback Analytics', 'Your project picked up a new upvote.', true],
    ['EVALUATION_COMPLETED', 'Your submission was evaluated', 'An evaluator scored your hackathon submission. 82/100.', false],
    ['ACHIEVEMENT', 'Achievement unlocked', 'You earned the Hackathon Winner badge.', false],
    ['HR_INVITATION', 'A recruiter is interested', 'Deepti Nair from Northwind Technologies would like to talk.', true],
    ['INVESTOR_CONNECTION', 'An investor reached out', 'Karan Mehta wants to connect about your startup.', true],
    ['PROJECT_TEAM', 'You were invited to a project', 'Nova invited you to collaborate on Pixelforge.', true],
    ['SUBMISSION_STATUS', 'Submission shortlisted', 'Your submission was shortlisted for evaluation.', false],
    ['PROJECT_MODERATION', 'Your project is under review', 'A project you published is being reviewed after a report.', true],
    ['SYSTEM', 'Welcome to STUDLYF', 'Complete your profile to appear in builder search.', false],
    ['PROFILE_REMINDER', 'Your profile is 60% complete', 'Add your projects to reach the next step.', true],
    ['EVALUATION_ASSIGNED', 'New evaluation assigned', 'You have a new submission to review.', true],
    ['ACCESS_STATUS', 'Your access request was approved', 'Your recruiter access is now active.', true],
  ];
  let noteCount = 0;
  for (const profile of allProfiles) {
    for (let i = 0; i < NOTES.length; i += 1) {
      const [type, title, body, unread] = NOTES[i];
      await ensure(db.Notification, { userId: profile.userId, type, title }, {
        userId: profile.userId,
        type,
        title,
        body,
        data: { seed: true },
        readAt: unread ? null : ago(i),
      });
      noteCount += 1;
    }
  }
  summary.notifications = noteCount;

  // Application-status notifications tied to the real applications seeded above. The live
  // platform emits one of these on every review transition (applications.service.review), and
  // the dashboard reads them as its "latest status changes" feed — without them the journey
  // chart has counts but the feed beneath it stays empty. Keyed on dedupeKey, so a re-run is
  // a no-op and re-reviewing the same application can never double-notify.
  const REVIEW_NOTE = {
    UNDER_REVIEW: 'is being reviewed',
    SHORTLISTED: 'was shortlisted',
    SELECTED: 'was selected',
    REJECTED: 'was not taken forward',
  };
  let appNoteCount = 0;
  for (const profile of allProfiles) {
    const apps = await db.Application
      .find({ builderUserId: profile.userId, status: { $in: Object.keys(REVIEW_NOTE) } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean();
    for (const app of apps) {
      const opp = await db.Opportunity.findById(app.opportunityId).select({ title: 1 }).lean();
      const dedupeKey = `demo:app:${app._id}:${app.status}`;
      await ensure(db.Notification, { userId: profile.userId, dedupeKey }, {
        userId: profile.userId,
        type: 'APPLICATION_STATUS',
        title: `Your application ${REVIEW_NOTE[app.status]}`,
        body: opp?.title ?? null,
        data: {
          applicationId: String(app._id),
          opportunityId: String(app.opportunityId),
          opportunityTitle: opp?.title ?? null,
          status: app.status,
        },
        dedupeKey,
        readAt: app.status === 'REJECTED' ? ago(3) : null,
      });
      appNoteCount += 1;
    }
  }
  summary.applicationNotifications = appNoteCount;

  // ---------------------------------------------------------------------------
  // 12. Founder, investor and HR ecosystem data.
  // ---------------------------------------------------------------------------
  const founderProfiles = [];
  const FOUNDER_KITS = [    {
      user: founderUser,
      slug: 'soilsense',
      headline: 'Founder at SoilSense — soil intelligence for smallholder farms',
      bio: 'Second-time founder. Previously built an agronomy advisory tool used by 4,000 farmers.',
      startup: { name: 'SoilSense', oneLiner: 'Cheap soil sensors and a mobile app that tells farmers exactly what to add, and when.', industry: 'Agritech', type: 'B2B2C', stage: 'EARLY_TRACTION', fundingStage: 'PRE_SEED', location: 'Hyderabad', foundedYear: 2024, teamSize: 6, teamDescription: 'Two agronomists, three engineers and a field operations lead.' },
      visibility: 'PUBLIC',
    },
    {
      user: founderBUser,
      slug: 'ledgerloop',
      headline: 'Founder at LedgerLoop — reconciliation for small finance teams',
      bio: 'Ex-audit. Built the tool I wished existed when closing books manually.',
      startup: { name: 'LedgerLoop', oneLiner: 'Automated ledger reconciliation for finance teams of five to fifty.', industry: 'Fintech', type: 'B2B', stage: 'MVP', fundingStage: 'BOOTSTRAPPED', location: 'Bengaluru', foundedYear: 2025, teamSize: 3, teamDescription: 'Founder plus two contract engineers.' },
      visibility: 'INVESTOR_VISIBLE',
    },
  ];
  for (const kit of FOUNDER_KITS) {
    if (!kit.user) continue;
    const id = await ensure(db.FounderProfile, { userId: kit.user._id }, {
      userId: kit.user._id,
      slug: kit.slug,
      headline: kit.headline,
      bio: kit.bio,
      linkedin: `https://linkedin.com/in/${kit.slug}`,
      location: kit.startup.location,
      // Without this the founder ecosystem guard answers 403 ONBOARDING — the dashboard,
      // connections and updates routes all sit behind it.
      onboardingCompletedAt: ago(29),
      discoverable: true,
      visibility: kit.visibility,
      startup: {
        ...kit.startup,
        website: `https://${kit.slug}.example.com`,
        traction: { users: '1,240 farms onboarded', revenue: '₹4.2L MRR', growth: '38% month over month', highlights: 'Signed two district-level distribution partners.' },
        tractionHistory: [
          { date: ago(150), users: '120', revenue: '₹0', growth: '—', note: 'Pilot with one cooperative.' },
          { date: ago(120), users: '410', revenue: '₹40,000', growth: '240%', note: 'First paying customers.' },
          { date: ago(90), users: '780', revenue: '₹1,10,000', growth: '90%', note: 'Sensor revision shipped.' },
          { date: ago(60), users: '1,020', revenue: '₹2,60,000', growth: '31%', note: 'Second state entered.' },
          { date: ago(30), users: '1,240', revenue: '₹4,20,000', growth: '38%', note: 'Distribution partnership signed.' },
        ],
      },
      workspace: {
        problem: 'Smallholder farmers over-apply fertiliser because soil testing is slow, expensive and rarely actionable.',
        targetCustomer: 'Farmer cooperatives and small agri-input retailers in South and West India.',
        marketAnalysis: 'Soil testing is a ₹2,000 crore market growing at 12% annually, dominated by slow lab-based incumbents.',
        competitors: 'State labs (cheap but slow), imported sensor kits (fast but unaffordable), and agronomy consultancies (expert but unscalable).',
        swot: { strengths: 'Sensors at a third of the import price; agronomist team.', weaknesses: 'Limited field operations capacity.', opportunities: 'Government subsidy schemes for precision agriculture.', threats: 'Hardware supply chain and monsoon variability.' },
        businessModel: 'Hardware sold at cost to seed adoption, recurring revenue from the advisory subscription.',
        gtmStrategy: 'Partner with cooperatives rather than selling direct to individual farmers.',
        marketingStrategy: 'Field demonstrations and local-language content.',
        pitchNotes: 'Lead with the unit economics of a single cooperative, not the TAM slide.',
        fundingNeeds: '₹3.5 crore pre-seed to expand field operations to two more states.',
        market: { market: 'Soil intelligence for smallholder farms in India.', customerSegment: 'Cooperatives of 200-2,000 farmers.', tam: '₹12,000 crore', sam: '₹2,000 crore', som: '₹180 crore', trends: 'Surging input costs, government push on soil health cards, falling sensor prices.', customerProblem: 'They know something is wrong with their soil but not what to add.', opportunity: 'The first credible low-cost sensing layer with an agronomist in the loop.' },
        competitorAnalysis: [
          { name: 'State Soil Labs', description: 'Government-run testing centres.', strengths: 'Free at point of use.', weaknesses: 'Two to three week turnaround.', pricing: 'Subsidised', positioning: 'The default.', differentiation: 'We return an actionable recommendation in 48 hours.' },
          { name: 'Imported Sensor Kits', description: 'Precision agriculture hardware.', strengths: 'Accurate and well documented.', weaknesses: '₹40,000+ per unit.', pricing: 'Premium', positioning: 'Enterprise agribusiness.', differentiation: 'A third of the price, built for Indian soil types.' },
        ],
        businessModelCanvas: { customerSegments: 'Cooperatives, agri-input retailers.', valueProposition: 'A soil reading and a specific recommendation, within 48 hours, at a price that works.', channels: 'Cooperative partnerships, field agents.', customerRelationships: 'Onboarding visit plus a WhatsApp support line.', revenueStreams: 'Advisory subscription plus hardware margin at scale.', keyResources: 'Calibration dataset, agronomist bench, field team.', keyActivities: 'Sensor manufacturing, calibration, advisory generation.', keyPartnerships: 'Cooperatives, agri-universities, input retailers.', costStructure: 'Hardware BOM, field operations, agronomy team.' },
        gtm: { targetCustomers: 'Cooperatives with 500+ members.', positioning: 'The affordable precision layer between free-and-slow labs and expensive imported kits.', acquisitionChannels: 'Cooperative partnerships, field demonstrations, regional agri-expos.', salesStrategy: 'Pilot with one cooperative per district, then expand on results.', pricing: '₹149 per farm per month, hardware bundled.', launchPlan: 'Two districts in the first quarter, a third in the second.', growthStrategy: 'Referrals between cooperatives and retailer-led distribution.', kpis: 'Farms onboarded, recommendation adoption rate, retention at six months, cost per acquisition.' },
      },
    });
    founderProfiles.push(await db.FounderProfile.findById(id).lean());
  }

  // Founders who were already in the database join the list too, so discovery, investor
  // connections and saved shortlists can point at real pre-existing founders as well.
  for (const f of await db.FounderProfile.find().lean()) {
    if (!founderProfiles.some((p) => String(p._id) === String(f._id))) founderProfiles.push(f);
    // A pre-existing founder whose onboarding was never marked complete is locked out of their
    // own dashboard. Marking it complete is additive — no field they filled in is touched.
    if (!f.onboardingCompletedAt) {
      await db.FounderProfile.updateOne({ _id: f._id }, { $set: { onboardingCompletedAt: ago(29) } });
    }
  }
  summary.founderProfiles = founderProfiles.length;

  const investorProfileId = await ensure(db.InvestorProfile, { userId: investorUser._id }, {
    userId: investorUser._id,
    firmName: 'LaunchPad Ventures',
    title: 'Principal',
    investorType: 'VC',
    website: 'https://launchpad.example.com',
    linkedin: 'https://linkedin.com/in/karanmehta',
    stages: ['PRE_SEED', 'SEED'],
    sectors: ['Agritech', 'Fintech', 'Devtools'],
    geographies: ['India', 'South Asia'],
    startupTypes: ['B2B', 'B2B2C'],
    checkSize: '₹50L – ₹2Cr',
    savedFounderProfileIds: founderProfiles.slice(0, 2).map((f) => f._id),
    thesis: 'Backing technical founders solving unglamorous, high-frequency problems in Indian markets.',
    status: 'ACTIVE',
    submittedAt: ago(70),
    reviewedBy: admin?._id ?? null,
    reviewedAt: ago(65),
  });
  // The shortlist was empty on a profile created before the founders existed — fill it in
  // without disturbing any founder an investor has already saved themselves.
  const investorDoc = await db.InvestorProfile.findById(investorProfileId).lean();
  if (!(investorDoc?.savedFounderProfileIds ?? []).length) {
    await db.InvestorProfile.updateOne(
      { _id: investorProfileId },
      { $set: { savedFounderProfileIds: founderProfiles.slice(0, 2).map((f) => f._id) } },
    );
  }
  summary.investorProfiles = 1;

  const hrProfileId = await ensure(db.HrProfile, { userId: hrUser._id }, {
    userId: hrUser._id,
    companyName: 'Northwind Technologies',
    designation: 'Talent Acquisition Lead',
    workEmail: 'deepti@northwind.example.com',
    companyWebsite: 'https://northwind.example.com',
    linkedin: 'https://linkedin.com/in/deeptinair',
    companySize: '201-500',
    hiringFor: 'Frontend and backend engineering internships',
    status: 'ACTIVE',
    submittedAt: ago(60),
    reviewedBy: admin?._id ?? null,
    reviewedAt: ago(55),
  });
  summary.hrProfiles = 1;

  const hrStages = ['SHORTLISTED', 'INVITED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
  let candCount = 0;
  for (let i = 0; i < allProfiles.length && i < hrStages.length; i += 1) {
    const profile = allProfiles[i];
    await ensure(db.HrCandidate, { hrUserId: hrUser._id, builderProfileId: profile._id }, {
      hrUserId: hrUser._id,
      builderProfileId: profile._id,
      builderUserId: profile.userId,
      stage: hrStages[i],
      role: ['Frontend Engineer Intern', 'Backend Engineer Intern', 'Data Analyst Intern'][i % 3],
      note: i % 2 === 0 ? 'Strong portfolio and clear communication.' : 'Good take-home, scheduling the next round.',
      interviewAt: hrStages[i] === 'INTERVIEW' ? days(3) : null,
    });
    candCount += 1;
  }
  summary.hrCandidates = candCount;

  // Job posts (spec §73) — the HR account's public front door. `companyName` is the same string
  // the verified HrProfile carries, and the search terms the service would derive are written
  // here too, because these rows go in through `create()` rather than the service.
  const oppCategory = categories.find((c) => c.scope === 'OPPORTUNITY')?._id ?? null;
  const tag = (name) => ({ name, slug: slugify(name) });
  const JOBS = [
    {
      title: 'Frontend Engineer Intern',
      summary: 'Build product surfaces in React with a small team that ships every week.',
      employmentType: 'INTERNSHIP',
      workMode: 'HYBRID',
      experienceLevel: 'ENTRY',
      location: 'Bengaluru, India',
      openings: 2,
      minExperienceYears: 0,
      maxExperienceYears: 1,
      salaryMin: 25000,
      salaryMax: 35000,
      salaryCurrency: 'INR',
      salaryPeriod: 'MONTH',
      skills: ['React', 'TypeScript', 'CSS'],
      description: '<p>You will own real surfaces from your first week — the design system, the dashboard, and the components other teams build on. We review every pull request the same day and pair on anything tricky.</p>',
      responsibilities: '<p>Build and refine React interfaces, translate design files into components, write the tests that keep them honest, and take part in the weekly product review.</p>',
      requirements: '<p>Comfortable with React and modern JavaScript, able to read a design file, and happy to ask questions early. A portfolio of things you have built matters more than a CGPA.</p>',
      perks: ['Mentorship from senior engineers', 'Hybrid — two days in the Bengaluru office', 'Stipend reviewed every six months'],
    },
    {
      title: 'Backend Engineer (Node.js)',
      summary: 'Own APIs and data models for a platform serving students across India.',
      employmentType: 'FULL_TIME',
      workMode: 'REMOTE',
      experienceLevel: 'MID',
      location: 'Remote (India)',
      openings: 1,
      minExperienceYears: 2,
      maxExperienceYears: 5,
      salaryMin: 1200000,
      salaryMax: 1800000,
      salaryCurrency: 'INR',
      salaryPeriod: 'YEAR',
      skills: ['Node.js', 'MongoDB', 'REST APIs'],
      description: '<p>You will design and ship the services behind our application and evaluation flows: schema, validation, authorization and the tests that prove them. Small team, wide ownership, no ceremony.</p>',
      responsibilities: '<p>Design REST APIs, model data in MongoDB, write integration tests, and keep the services observable in production.</p>',
      requirements: '<p>Two or more years writing Node.js in production, a working grasp of schema design and indexing, and the habit of writing the test alongside the fix.</p>',
      perks: ['Fully remote', 'Annual learning budget', 'Health cover for you and your family'],
    },
    {
      title: 'Product Design Intern',
      summary: 'Shape how thousands of students discover opportunities, in Figma and in code.',
      employmentType: 'INTERNSHIP',
      workMode: 'ONSITE',
      experienceLevel: 'ENTRY',
      location: 'Bengaluru, India',
      openings: 1,
      minExperienceYears: 0,
      maxExperienceYears: 1,
      salaryMin: 20000,
      salaryMax: 30000,
      salaryCurrency: 'INR',
      salaryPeriod: 'MONTH',
      skills: ['Figma', 'Design Systems', 'Prototyping'],
      description: '<p>You will work end to end: research the flow, sketch it, prototype it, and sit with the engineers while it ships. Your work reaches users in weeks, not quarters.</p>',
      responsibilities: '<p>Run small research sessions, design flows and components in Figma, maintain the design system, and review the built result against your spec.</p>',
      requirements: '<p>A portfolio showing how you reasoned about a problem, not only the final screens. Familiarity with Figma and a design system is expected.</p>',
      perks: ['Onsite in Bengaluru', 'Your own projects on the roadmap', 'Portfolio review with the design lead'],
    },
  ];
  const ROUNDS = [
    [
      { title: 'Portfolio review', description: 'We read your work and reply within a week.', mode: 'ONLINE', displayOrder: 0 },
      { title: 'Take-home exercise', description: 'A short, scoped build — we pay for your time.', mode: 'ONLINE', displayOrder: 1 },
      { title: 'Team conversation', description: 'Meet the engineers you would work with.', mode: 'ONLINE', displayOrder: 2 },
    ],
    [
      { title: 'Intro call', description: 'A 30-minute conversation about your experience.', mode: 'ONLINE', displayOrder: 0 },
      { title: 'System design round', description: 'Walk us through a service you have designed.', mode: 'ONLINE', displayOrder: 1 },
      { title: 'Bar raiser', description: 'A final conversation with a founder.', mode: 'ONLINE', displayOrder: 2 },
    ],
    [
      { title: 'Portfolio conversation', description: 'Talk us through two projects you are proud of.', mode: 'OFFLINE', location: 'Northwind, Bengaluru', displayOrder: 0 },
      { title: 'Design exercise', description: 'A half-day whiteboard exercise with the team.', mode: 'OFFLINE', location: 'Northwind, Bengaluru', displayOrder: 1 },
    ],
  ];
  const FAQS = [
    [
      { question: 'Is the internship paid?', answer: '<p>Yes — a monthly stipend, reviewed every six months.</p>', displayOrder: 0 },
      { question: 'Can I work part-time during term?', answer: '<p>The hybrid schedule is built for that: two days in the office, the rest around your classes.</p>', displayOrder: 1 },
    ],
    [
      { question: 'Is the role fully remote?', answer: '<p>Yes, within India. We meet in person twice a year.</p>', displayOrder: 0 },
      { question: 'What is the interview process like?', answer: '<p>Three conversations, no unpaid trial projects.</p>', displayOrder: 1 },
    ],
    [
      { question: 'Do I need a design degree?', answer: '<p>No. We look at the portfolio and how you reason about a problem.</p>', displayOrder: 0 },
    ],
  ];
  let jobCount = 0;
  for (let i = 0; i < JOBS.length; i += 1) {
    const j = JOBS[i];
    const slug = slugify(j.title);
    await ensure(db.Job, { slug }, {
      ...j,
      slug,
      companyName: 'Northwind Technologies',
      hrUserId: hrUser._id,
      hrProfileId,
      categoryId: oppCategory,
      bannerId: banner(i),
      skills: j.skills.map(tag),
      rounds: ROUNDS[i],
      faqs: FAQS[i],
      perks: j.perks,
      salaryDisclosed: true,
      applicationDeadline: days(20 + i * 6),
      startDate: days(45 + i * 10),
      contactEmail: 'deepti@northwind.example.com',
      status: 'PUBLISHED',
      publishedAt: ago(12 - i * 3),
      featured: i === 0,
      createdBy: hrUser._id,
      updatedBy: hrUser._id,
      searchTerms: termsOf(j.title, 'Northwind Technologies', j.summary, j.location, ...j.skills, ...ROUNDS[i].map((r) => r.title), ...FAQS[i].map((f) => f.question), ...j.perks),
      titleTerms: termsOf(j.title),
    });
    jobCount += 1;
  }
  summary.jobs = jobCount;

  const connections = [
    [founderProfiles[0], 'PENDING', 'Loved the traction update — would like to hear more about the cooperative model.'],
    [founderProfiles[1], 'ACCEPTED', 'Interested in the reconciliation space. Let us find time next week.'],
  ];
  let connCount = 0;
  for (const [founder, status, message] of connections) {
    if (!founder) continue;
    await ensure(db.InvestorConnection, { investorUserId: investorUser._id, founderProfileId: founder._id }, {
      investorUserId: investorUser._id,
      founderProfileId: founder._id,
      founderUserId: founder.userId,
      message,
      status,
      respondedAt: status === 'ACCEPTED' ? ago(5) : null,
    });
    connCount += 1;
  }
  summary.investorConnections = connCount;

  // Saved founders, so the investor shortlist is not empty.
  for (const founder of founderProfiles.slice(0, 2)) {
    if (!founder) continue;
    await ensure(db.SavedItem, { userId: investorUser._id, entityType: 'FOUNDER', entityId: founder._id }, {
      userId: investorUser._id, entityType: 'FOUNDER', entityId: founder._id, savedAt: ago(6),
    });
  }

  // An audit trail entry for the two new ecosystems.
  await ensure(db.AuditLog, { action: 'DEMO_SEED_APPLIED', entityType: 'SYSTEM' }, {
    actorUserId: actor,
    action: 'DEMO_SEED_APPLIED',
    entityType: 'SYSTEM',
    entityId: null,
    changes: { seed: 'demo', collections: Object.keys(summary).length },
  });

  // Fix the two builders whose skills referenced vocabulary that had to exist first.
  for (const profile of allProfiles) {
    const fixed = (profile.skills ?? []).map((s) => ({ ...s, skillId: skillBySlug[s.slug]?._id ?? s.skillId ?? null }));
    if (fixed.some((s, i) => String(s.skillId) !== String((profile.skills ?? [])[i]?.skillId))) {
      await db.BuilderProfile.updateOne({ _id: profile._id }, { $set: { skills: fixed } });
    }
  }

  return { skipped: false, summary };
}
