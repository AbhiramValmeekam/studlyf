/**
 * DEVELOPMENT SEED DATA — never run against production.
 * All organisations, people and numbers below are fictional placeholders.
 */
import { slugify, termsOf } from '../../common/utilities/text.js';
import { hashPassword } from '../../common/auth/password.js';
import { ensureTags } from '../../modules/taxonomy/taxonomy.service.js';
import { computeCompletion } from '../../modules/profile/completion.js';
import { builderSearchFields } from '../../modules/builder-profiles/search.js';

/** DEV-ONLY credentials. Printed by `npm run db:seed`; change or remove before any shared deployment. */
export const DEV_CREDENTIALS = {
  superAdmin: { email: 'admin@studlyf.local', password: 'StudlyfAdmin#2026' },
  editor: { email: 'editor@studlyf.local', password: 'StudlyfEditor#2026' },
  builder: { email: 'builder@studlyf.local', password: 'StudlyfBuilder#2026' },
  // One account per ecosystem (DEV-ONLY). Investor/HR/organizer access is pre-approved here;
  // real accounts go through the access request -> admin verification flow.
  founder: { email: 'founder@studlyf.local', password: 'StudlyfFounder#2026' },
  investor: { email: 'investor@studlyf.local', password: 'StudlyfInvestor#2026' },
  hr: { email: 'hr@studlyf.local', password: 'StudlyfHr#2026' },
  organizer: { email: 'organizer@studlyf.local', password: 'StudlyfOrganizer#2026' },
};

const days = (n) => new Date(Date.now() + n * 86_400_000);

export async function seedDevelopment(db, opts) {
  // countDocuments (not estimatedDocumentCount): the estimate reads cached collection
  // metadata, which can report 0 after an unclean mongod shutdown and let the seed
  // re-run into a duplicate-key error. An exact count is correct on every start.
  if ((await db.User.countDocuments()) > 0) return { skipped: true };

  const img = (file) => `${opts.assetBaseUrl.replace(/\/$/, '')}/scraped/${file}`;

  {
    // ---- accounts ------------------------------------------------------------
    const hash = (p) => hashPassword(p, opts.passwordHashCost);
    const [admin, editor, builder] = await db.User.create([
        { name: 'STUDLYF Admin (dev)', email: DEV_CREDENTIALS.superAdmin.email, passwordHash: await hash(DEV_CREDENTIALS.superAdmin.password), primaryRole: 'ADMIN', roles: [{ role: 'ADMIN' }], emailVerified: true, emailVerifiedAt: new Date() },
        { name: 'Content Editor (dev)', email: DEV_CREDENTIALS.editor.email, passwordHash: await hash(DEV_CREDENTIALS.editor.password), primaryRole: 'ADMIN', roles: [{ role: 'ADMIN' }], emailVerified: true, emailVerifiedAt: new Date() },
        { name: 'Sample Builder (dev)', email: DEV_CREDENTIALS.builder.email, passwordHash: await hash(DEV_CREDENTIALS.builder.password), primaryRole: 'BUILDER', roles: [{ role: 'USER' }, { role: 'BUILDER' }], onboarding: { intent: 'BUILDER' }, emailVerified: true, emailVerifiedAt: new Date() },
    ]);
    // Two extra builders exercise completion scoring (sparse) and the PRIVATE visibility gate.
    const [builder2, builder3] = await db.User.create([
        { name: 'Nova Builder (dev)', email: 'nova@studlyf.local', passwordHash: await hash(DEV_CREDENTIALS.builder.password), primaryRole: 'BUILDER', roles: [{ role: 'USER' }, { role: 'BUILDER' }], onboarding: { intent: 'BUILDER' }, emailVerified: true, emailVerifiedAt: new Date() },
        { name: 'Zephyr Builder (dev)', email: 'zephyr@studlyf.local', passwordHash: await hash(DEV_CREDENTIALS.builder.password), primaryRole: 'BUILDER', roles: [{ role: 'USER' }, { role: 'BUILDER' }], onboarding: { intent: 'BUILDER' }, emailVerified: true, emailVerifiedAt: new Date() },
    ]);
    await db.AdminUser.create([
      { userId: admin._id, level: 'SUPER_ADMIN' },
      { userId: editor._id, level: 'EDITOR', createdBy: admin._id },
    ]);

    // ---- media (existing frontend assets registered as EXTERNAL) ----------------
    const media = async (file, purpose, mimeType, altText) =>
(await db.MediaAsset.create({ driver: 'EXTERNAL', url: img(file), mimeType, purpose, altText, uploadedBy: admin._id }))._id;
    const logo = await media('logo.webp', 'LOGO', 'image/webp', 'STUDLYF logo');
    const banners = [
      await media('img_01.webp', 'BANNER', 'image/webp', 'Students collaborating at a hackathon'),
      await media('img_02.webp', 'BANNER', 'image/webp', 'Team presenting a project'),
      await media('img_03.webp', 'BANNER', 'image/webp', 'Workshop session'),
      await media('img_04.png', 'BANNER', 'image/png', 'Builders at work'),
    ];

    // ---- categories --------------------------------------------------------------
    const cat = async (scope, entries) => {
      const rows = await db.Category.create(entries.map(([slug, name], i) => ({ scope, slug, name, displayOrder: i })));
      return Object.fromEntries(rows.map((r) => [r.slug, r._id]));
    };
    const oppCat = await cat('OPPORTUNITY', [['engineering', 'Engineering'], ['ai-ml', 'AI & ML'], ['design', 'Design'], ['product', 'Product'], ['social-impact', 'Social Impact']]);
    const resCat = await cat('RESOURCE', [['career', 'Career'], ['startups', 'Startups'], ['ai', 'AI'], ['announcements', 'Announcements']]);
    const tesCat = await cat('TESTIMONIAL', [['student', 'Student stories'], ['founder', 'Founder stories'], ['organization', 'Organization stories']]);
    const parCat = await cat('PARTNER', [['university', 'Universities'], ['company', 'Companies'], ['community', 'Communities']]);
    const ottCat = await cat('OTT', [['career', 'Career'], ['engineering', 'Engineering'], ['founder-stories', 'Founder stories'], ['ai', 'AI'], ['design', 'Design']]);

    // ---- homepage ------------------------------------------------------------------
    await db.HomepageContent.create([
      {
        sectionKey: 'hero',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        updatedBy: admin._id,
        content: {
          eyebrow: 'The STUDLYF ecosystem',
          headline: 'Build. Prove. Get Discovered.',
          subheadline: 'One ecosystem for builders, founders, opportunities and the people looking for what they can build.',
          primaryCta: { label: 'Explore Opportunities', url: '/builders' },
          secondaryCta: { label: 'Create Your Profile', url: '/signup' },
        },
      },
      { sectionKey: 'paths_intro', status: 'PUBLISHED', publishedAt: new Date(), content: { title: 'Choose your path', subtitle: 'Four ways into one ecosystem.' } },
      { sectionKey: 'join_cta', status: 'DRAFT', content: { title: 'Ready to build?', subtitle: null, cta: { label: 'Join STUDLYF', url: '/signup' } } },
    ]);

    await db.PathCard.create(
      [
        { key: 'builders', title: 'Builders', description: 'Find opportunities, build projects, prove your skills.', icon: 'hammer', ctaLabel: 'Start building', ctaUrl: '/builders' },
        { key: 'founders', title: 'Founders', description: 'Build your startup, sharpen your strategy, get investor-ready.', icon: 'rocket', ctaLabel: 'Start your venture', ctaUrl: '/founders' },
        { key: 'organizations', title: 'Organizations', description: 'Run hackathons, challenges and innovation programs.', icon: 'building', ctaLabel: 'Host a program', ctaUrl: '/organizations' },
        { key: 'hr_talent', title: 'HR & Talent', description: 'Discover talent through projects, skills and evaluations.', icon: 'users', ctaLabel: 'Discover talent', ctaUrl: '/hr' },
      ].map((p, i) => ({ ...p, displayOrder: i, status: 'PUBLISHED', publishedAt: new Date() })),
    );

    // ---- partners ------------------------------------------------------------------
    const partnerRows = await db.Partner.create([
        { name: 'Northwind Labs', slug: 'northwind-labs', website: 'https://example.com/northwind', description: 'Developer tooling company (sample).', categoryId: parCat.company, verified: true, featured: true, active: true, displayOrder: 1 },
        { name: 'Loopwise', slug: 'loopwise', website: 'https://example.com/loopwise', description: 'AI products for the next billion users (sample).', categoryId: parCat.company, verified: true, featured: true, active: true, displayOrder: 2 },
        { name: 'Vertex Institute of Technology', slug: 'vertex-institute', website: 'https://example.edu/vertex', description: 'Engineering university (sample).', categoryId: parCat.university, verified: true, featured: true, active: true, displayOrder: 3 },
        { name: 'Campus Builders Collective', slug: 'campus-builders', description: 'Student maker community (sample).', categoryId: parCat.community, featured: false, active: true, displayOrder: 4 },
        { name: 'Hidden Partner Co', slug: 'hidden-partner', description: 'Inactive sample partner — must never appear publicly.', categoryId: parCat.company, featured: true, active: false, displayOrder: 5 },
    ]);
    const partner = Object.fromEntries(partnerRows.map((p) => [p.slug, p._id]));

    // ---- opportunities ---------------------------------------------------------------
    const opps = [
      { title: 'LoopHacks 2026 — AI for Bharat', type: 'HACKATHON', mode: 'HYBRID', location: 'Bengaluru', organizationName: 'Loopwise', partnerId: partner.loopwise, categoryId: oppCat['ai-ml'], shortDescription: 'Build AI-first products for the next billion users in a 48-hour hybrid hackathon.', description: '<p>Build AI-first products that solve real problems. Mentorship from startup engineers and a fast-track interview for top teams.</p>', eligibility: '<p>Open to students and recent graduates. Teams of up to four.</p>', prizeInformation: '<p>₹5,00,000 prize pool and fast-track interviews.</p>', deadline: 20, start: 26, end: 28, featured: true, skills: ['React', 'Machine Learning', 'Node.js'], questions: [
        { label: 'Why do you want to join LoopHacks?', type: 'LONG_TEXT', required: true },
        { label: 'Link to your best project', type: 'URL', required: false },
        { label: 'Preferred track', type: 'SINGLE_SELECT', required: true, options: ['AI/ML', 'Web', 'Mobile'] },
      ] },
      { title: 'SDE Intern — Platform Team', type: 'INTERNSHIP', mode: 'ONLINE', location: 'Remote (India)', organizationName: 'Northwind Labs', partnerId: partner['northwind-labs'], categoryId: oppCat.engineering, shortDescription: 'Six-month remote internship shipping developer tooling with real ownership from week one.', deadline: 14, start: 45, end: 225, featured: true, skills: ['Go', 'Cloud', 'Node.js'] },
      { title: 'Design Sprint Challenge: Campus Commute', type: 'CHALLENGE', mode: 'ONLINE', location: null, organizationName: 'Campus Builders Collective', partnerId: partner['campus-builders'], categoryId: oppCat.design, shortDescription: 'Redesign the daily campus commute experience in a one-week design sprint.', deadline: 9, start: 10, end: 17, featured: true, skills: ['UI/UX', 'Figma'] },
      { title: 'Vertex Innovation Fellowship', type: 'FELLOWSHIP', mode: 'OFFLINE', location: 'Hyderabad', organizationName: 'Vertex Institute of Technology', partnerId: partner['vertex-institute'], categoryId: oppCat.product, shortDescription: 'A 12-week fellowship for student founders with mentorship and seed grants.', deadline: 30, start: 60, end: 144, featured: true, skills: ['Product', 'Entrepreneurship'] },
      { title: 'Open Data for Good Competition', type: 'COMPETITION', mode: 'ONLINE', location: null, organizationName: 'Campus Builders Collective', categoryId: oppCat['social-impact'], shortDescription: 'Use open civic datasets to build tools that help local communities.', deadline: 40, start: 41, end: 70, featured: false, skills: ['Python', 'Data'] },
      { title: 'Spring Build Sprint 2026', type: 'HACKATHON', mode: 'OFFLINE', location: 'Pune', organizationName: 'Northwind Labs', categoryId: oppCat.engineering, shortDescription: 'A past hackathon kept for the archive (applications closed).', deadline: -30, start: -25, end: -23, featured: true, skills: ['React'] },
      { title: 'Unannounced Quantum Challenge', type: 'CHALLENGE', mode: 'ONLINE', location: null, organizationName: 'Loopwise', categoryId: oppCat.engineering, shortDescription: 'DRAFT — must never appear publicly.', deadline: 50, start: 55, end: 60, featured: true, skills: ['Quantum'], status: 'DRAFT' },
      { title: 'Winter AI Residency (scheduled)', type: 'FELLOWSHIP', mode: 'HYBRID', location: 'Chennai', organizationName: 'Loopwise', categoryId: oppCat['ai-ml'], shortDescription: 'Scheduled for future publication — hidden until its publish date.', deadline: 90, start: 100, end: 160, featured: true, skills: ['Machine Learning'], publishedAt: days(7) },
      { title: 'Frontend Engineer — Early Careers', type: 'JOB', mode: 'ONLINE', location: 'Remote (India)', organizationName: 'Loopwise', partnerId: partner.loopwise, categoryId: oppCat.engineering, shortDescription: 'A full-time early-careers frontend role building the STUDLYF-style product surface.', description: '<p>Own features end to end with a senior mentor.</p>', eligibility: '<p>0–2 years experience. Strong React fundamentals.</p>', deadline: 25, start: 40, end: null, featured: true, skills: ['React', 'TypeScript'], questions: [
        { label: 'Tell us about a frontend project you shipped', type: 'LONG_TEXT', required: true },
        { label: 'Portfolio or GitHub URL', type: 'URL', required: true },
        { label: 'Are you available to start within 60 days?', type: 'BOOLEAN', required: true },
      ] },
      { title: 'Intro to Machine Learning Workshop', type: 'WORKSHOP', mode: 'ONLINE', location: null, organizationName: 'Campus Builders Collective', categoryId: oppCat['ai-ml'], shortDescription: 'A hands-on weekend workshop covering the ML workflow from data to deployment.', description: '<p>Bring a laptop; we build a model together.</p>', deadline: 12, start: 15, end: 16, featured: false, skills: ['Python', 'Machine Learning'], questions: [
        { label: 'What is your current experience level?', type: 'SINGLE_SELECT', required: true, options: ['Beginner', 'Intermediate', 'Advanced'] },
      ] },
      { title: 'Vertex Founders Program 2026', type: 'PROGRAM', mode: 'OFFLINE', location: 'Hyderabad', organizationName: 'Vertex Institute of Technology', partnerId: partner['vertex-institute'], categoryId: oppCat.product, shortDescription: 'A 16-week cohort program taking student teams from idea to demo day.', description: '<p>Mentorship, workspace and a demo day in front of investors.</p>', eligibility: '<p>Student-founded teams only.</p>', prizeInformation: '<p>Top teams receive follow-on grants.</p>', deadline: 35, start: 70, end: 182, featured: true, skills: ['Product', 'Entrepreneurship'] },
    ];

    const oppBySlug = {};
    for (const [i, o] of opps.entries()) {
      const skills = await ensureTags(db, [...o.skills]);
      const doc = await db.Opportunity.create({
          title: o.title,
          slug: o.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          type: o.type,
          mode: o.mode,
          location: o.location,
          organizationName: o.organizationName,
          organizationLogoId: logo,
          partnerId: 'partnerId' in o ? o.partnerId : null,
          categoryId: o.categoryId,
          shortDescription: o.shortDescription,
          description: 'description' in o ? o.description : null,
          eligibility: 'eligibility' in o ? o.eligibility : null,
          prizeInformation: 'prizeInformation' in o ? o.prizeInformation : null,
          applicationQuestions: (o.questions ?? []).map((q, qi) => ({ ...q, displayOrder: qi })),
          applicationDeadline: o.deadline == null ? null : days(o.deadline),
          startDate: o.start == null ? null : days(o.start),
          endDate: o.end == null ? null : days(o.end),
          externalUrl: 'https://example.com/apply',
          bannerId: banners[i % banners.length],
          featured: o.featured,
          status: 'status' in o ? o.status : 'PUBLISHED',
          publishedAt: 'publishedAt' in o ? o.publishedAt : 'status' in o ? null : days(-i - 1),
          skills,
          searchTerms: termsOf(o.title, o.organizationName, o.shortDescription, o.location, ...skills.map((k) => k.name)),
          titleTerms: termsOf(o.title),
          createdBy: admin._id,
          updatedBy: admin._id,
        });
      oppBySlug[doc.slug] = doc;
    }

    // ---- resources ------------------------------------------------------------------
    const res = [
      { title: 'How to Win Your First Hackathon', type: 'GUIDE', categoryId: resCat.career, description: 'A practical playbook: forming a team, scoping in 48 hours, and demoing well.', content: '<h2>Pick a problem, not a technology</h2><p>Judges reward clear problems and working demos.</p>', featured: true, tags: ['Hackathons', 'Teamwork'] },
      { title: 'Building a Portfolio That Gets You Noticed', type: 'ARTICLE', categoryId: resCat.career, description: 'Show proof of work: projects, write-ups and measurable outcomes.', content: '<p>Recruiters skim. Lead with what you built and why it mattered.</p>', featured: true, tags: ['Portfolio', 'Career'] },
      { title: 'From Idea to MVP in 30 Days', type: 'GUIDE', categoryId: resCat.startups, description: 'A week-by-week plan for student founders validating a startup idea.', content: '<p>Week one is about customers, not code.</p>', featured: true, tags: ['Startups', 'MVP'] },
      { title: 'What AI Agents Can and Cannot Do', type: 'VIDEO', categoryId: resCat.ai, description: 'A grounded walkthrough of agentic workflows and their limits.', externalUrl: 'https://example.com/videos/ai-agents', featured: true, tags: ['AI', 'Agents'] },
      { title: 'STUDLYF Builder Ecosystem Is Coming', type: 'ANNOUNCEMENT', categoryId: resCat.announcements, description: 'A first look at profiles, projects and evaluations for builders.', content: '<p>Phase 2 brings builder profiles and project submissions.</p>', featured: false, tags: ['STUDLYF'] },
      { title: 'Preparing a Strong Fellowship Application', type: 'OPPORTUNITY_RESOURCE', categoryId: resCat.career, description: 'What selection panels look for and how to present your work.', content: '<p>Tell a story with evidence.</p>', featured: false, tags: ['Fellowships', 'Applications'] },
      { title: 'Internal Draft: Q4 Content Plan', type: 'ARTICLE', categoryId: resCat.announcements, description: 'DRAFT — must never appear publicly.', content: '<p>Internal.</p>', featured: true, tags: ['Internal'], status: 'DRAFT' },
    ];

    for (const [i, r] of res.entries()) {
      const tags = await ensureTags(db, [...r.tags]);
      const content = 'content' in r ? r.content : null;
      await db.Resource.create({
          title: r.title,
          slug: r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          type: r.type,
          categoryId: r.categoryId,
          description: r.description,
          content,
          externalUrl: 'externalUrl' in r ? r.externalUrl : null,
          thumbnailId: banners[(i + 1) % banners.length],
          authorName: 'STUDLYF Team',
          featured: r.featured,
          status: 'status' in r ? r.status : 'PUBLISHED',
          publishedAt: 'status' in r ? null : days(-i - 1),
          tags,
          searchTerms: termsOf(r.title, r.description, 'STUDLYF Team', ...tags.map((t) => t.name), content),
          titleTerms: termsOf(r.title),
          createdBy: admin._id,
          updatedBy: admin._id,
        });
    }

    // ---- stats (sample values — replace via admin) -------------------------------------
    await db.PlatformStat.create([
      { key: 'student_reach', label: 'Student Reach', value: 100000, suffix: '+', description: 'Students reached through programs and events', displayOrder: 1, active: true },
      { key: 'community_members', label: 'Community Members', value: 25000, suffix: '+', description: 'Active members across our communities', displayOrder: 2, active: true },
      { key: 'startups_supported', label: 'Startups Supported', value: 120, suffix: '+', description: 'Student startups mentored or incubated', displayOrder: 3, active: true },
      { key: 'institutional_collaborations', label: 'Institutional Collaborations', value: 80, suffix: '+', description: 'Colleges and organisations we work with', displayOrder: 4, active: true },
      { key: 'internal_metric', label: 'Internal Metric', value: 42, suffix: null, description: 'Inactive — must never appear publicly', displayOrder: 5, active: false },
    ]);

    // ---- testimonials (fictional) --------------------------------------------------------
    await db.Testimonial.create([
      { personName: 'Aarav Mehta', designation: 'Final-year CSE student', organization: 'Vertex Institute of Technology', quote: 'Shipping a real project at a STUDLYF hackathon got me my first internship interview.', categoryId: tesCat.student, featured: true, active: true, displayOrder: 1 },
      { personName: 'Diya Raman', designation: 'Co-founder', organization: 'Sample Startup Pvt Ltd', quote: 'The founder track helped us sharpen our pitch before we spoke to investors.', categoryId: tesCat.founder, featured: true, active: true, displayOrder: 2 },
      { personName: 'Kabir Nair', designation: 'Program Lead', organization: 'Northwind Labs', quote: 'Running our challenge on STUDLYF brought us builders we would never have found otherwise.', categoryId: tesCat.organization, featured: true, active: true, displayOrder: 3 },
      { personName: 'Hidden Person', designation: null, organization: null, quote: 'Inactive — must never appear publicly.', categoryId: tesCat.student, featured: true, active: false, displayOrder: 4 },
    ]);

    // ---- BUILDER-SEED-BLOCK ----
    // ---- skills (master vocabulary; slugs aligned to opportunity skill tags) --------------
    const skillDefs = [
      ['React', 'Frontend'], ['TypeScript', 'Frontend'], ['Node.js', 'Backend'], ['Go', 'Backend'],
      ['Python', 'Backend'], ['Django', 'Backend'], ['Machine Learning', 'AI & ML'], ['Data', 'AI & ML'],
      ['Cloud', 'Infrastructure'], ['SQL', 'Data'], ['UI/UX', 'Design'], ['Figma', 'Design'],
      ['Product', 'Product'], ['Entrepreneurship', 'Product'],
    ];
    const skillRows = await db.Skill.create(skillDefs.map(([name, category]) => ({ name, slug: slugify(name), category, active: true })));
    const skill = Object.fromEntries(skillRows.map((s) => [s.slug, s]));
    const bs = (slug, proficiency) => ({ skillId: skill[slug]._id, slug: skill[slug].slug, name: skill[slug].name, proficiency });

    // <<APPEND2>>
    // ---- builder profiles ---------------------------------------------------------------
    await db.User.updateOne({ _id: builder._id }, { $set: { profilePhotoId: banners[0] } });
    // Personal fields (phone, college, city, links, …) live on the user; the builder
    // profile only holds builder-specific data. See modules/profile.
    const makeProfile = async (user, data, photoId = null) => {
      const personal = { ...(data.personal ?? {}) };
      const phone = personal.phone ?? null;
      delete personal.phone;
      await db.User.updateOne({ _id: user._id }, { $set: { phone, profile: personal } });
      const account = { name: user.name, phone, profilePhotoId: photoId, profile: personal };
      const p = {
        userId: user._id,
        username: data.username,
        headline: data.headline ?? null,
        bio: data.bio ?? null,
        availability: data.availability ?? null,
        visibility: data.visibility,
        education: data.education ?? [],
        skills: data.skills ?? [],
      };
      const c = computeCompletion(account, p);
      p.completion = { score: c.score, updatedAt: new Date() };
      Object.assign(p, builderSearchFields(p, account));
      return db.BuilderProfile.create(p);
    };
    const gradYear = new Date().getFullYear() + 1;

    const builderProfile = await makeProfile(builder, {
      username: 'sample-builder',
      headline: 'Full-stack builder & AI tinkerer',
      bio: 'Final-year CSE student who ships side projects every month. I care about clean UX and fast feedback loops, and I am looking for hackathons and internships.',
      availability: 'INTERNSHIP',
      visibility: 'PUBLIC',
      // A fully completed personal profile — the "Complete your profile" prompt never shows.
      personal: {
        phone: '+91 98765 43210',
        city: 'Bengaluru, India',
        college: 'Vertex Institute of Technology',
        degree: 'B.Tech',
        branch: 'Computer Science & Engineering',
        yearOfStudy: '4',
        graduationYear: gradYear,
        links: { github: 'https://github.com/example', linkedin: 'https://www.linkedin.com/in/example', portfolio: 'https://example.com', website: null },
        interests: ['HACKATHONS', 'INTERNSHIPS', 'PROJECTS'],
        completedAt: new Date(),
      },
      skills: [bs('react', 'ADVANCED'), bs('node-js', 'ADVANCED'), bs('machine-learning', 'INTERMEDIATE'), bs('ui-ux', 'INTERMEDIATE')],
    }, banners[0]);

    // Sparse PUBLIC profile — exercises completion scoring (low score, several missing items).
    const builder2Profile = await makeProfile(builder2, {
      username: 'nova',
      headline: 'Aspiring data scientist',
      visibility: 'PUBLIC',
      skills: [bs('python', 'BEGINNER')],
    });

    // PRIVATE profile — must never be served on the public /builders/:username route.
    await makeProfile(builder3, {
      username: 'zephyr',
      headline: 'Product-minded designer',
      bio: 'I design and prototype delightful product experiences and validate them with real users before writing code.',
      availability: 'FREELANCE',
      visibility: 'PRIVATE',
      // Partial personal profile (no college yet) — still sees the prompt.
      personal: { city: 'Pune, India', links: { portfolio: 'https://example.com/zephyr' } },
      education: [{ school: 'Campus Builders Collective', program: 'Design Fellowship', year: '2025' }],
      skills: [bs('ui-ux', 'ADVANCED'), bs('figma', 'EXPERT'), bs('product', 'INTERMEDIATE')],
    });

    // <<APPEND3>>
    // ---- applications (across the status machine) ----------------------------------------
    const loop = oppBySlug['loophacks-2026-ai-for-bharat'];
    const sde = oppBySlug['sde-intern-platform-team'];
    const design = oppBySlug['design-sprint-challenge-campus-commute'];
    const openData = oppBySlug['open-data-for-good-competition'];
    const job = oppBySlug['frontend-engineer-early-careers'];

    // ---- saved items (spec §57) ------------------------------------------------------------
    // The builder's own list, spanning two surfaces — one mechanism behind both.
    await db.SavedItem.create([
      { userId: builder._id, entityType: 'OPPORTUNITY', entityId: job._id, savedAt: days(-3) },
      { userId: builder._id, entityType: 'OPPORTUNITY', entityId: loop._id, savedAt: days(-6) },
    ]);

    const answersFor = (opp, values) =>
      opp.applicationQuestions.map((q, i) => {
        const v = values[i];
        const isChoice = q.type === 'SINGLE_SELECT' || q.type === 'MULTI_SELECT';
        return { questionId: q._id, type: q.type, text: isChoice ? null : (v ?? null), choices: isChoice ? [].concat(v ?? []) : [] };
      });

    const makeApp = async ({ opp, user, profile, status, answers = [], reviewerNote = null }) => {
      const history = [{ status: 'DRAFT', at: days(-5), byUserId: user._id, note: null }];
      if (status !== 'DRAFT') history.push({ status: 'SUBMITTED', at: days(-4), byUserId: user._id, note: null });
      if (!['DRAFT', 'SUBMITTED'].includes(status)) history.push({ status, at: days(-2), byUserId: admin._id, note: reviewerNote });
      return db.Application.create({
        opportunityId: opp._id,
        builderUserId: user._id,
        builderProfileId: profile._id,
        status,
        answers,
        statusHistory: history,
        submittedAt: status === 'DRAFT' ? null : days(-4),
        reviewerNote,
      });
    };

    await makeApp({ opp: loop, user: builder, profile: builderProfile, status: 'SUBMITTED', answers: answersFor(loop, ['I want to build AI tools that help students learn faster.', 'https://example.com/my-project', 'AI/ML']) });
    await makeApp({ opp: sde, user: builder, profile: builderProfile, status: 'UNDER_REVIEW' });
    await makeApp({ opp: design, user: builder, profile: builderProfile, status: 'SELECTED', reviewerNote: 'Strong portfolio — selected for the sprint.' });
    await makeApp({ opp: openData, user: builder, profile: builderProfile, status: 'DRAFT' });
    await makeApp({ opp: loop, user: builder2, profile: builder2Profile, status: 'REJECTED', answers: answersFor(loop, ['Excited to learn.', '', 'Web']), reviewerNote: 'Thanks for applying — not a fit this round.' });
    await makeApp({ opp: job, user: builder2, profile: builder2Profile, status: 'SUBMITTED', answers: answersFor(job, ['Built a small React dashboard for a class project.', 'https://github.com/example/dashboard', 'true']) });

    // ---- notifications (in-app only) -----------------------------------------------------
    await db.Notification.create([
      { userId: builder._id, type: 'APPLICATION_STATUS', title: 'Your application is now selected', body: 'Strong portfolio — selected for the sprint.', data: { opportunityTitle: design.title, status: 'SELECTED' }, readAt: null },
      { userId: builder._id, type: 'PROFILE_REMINDER', title: 'Complete your builder profile', body: 'Add more skills and links to get better recommendations.', data: {}, readAt: new Date() },
      { userId: builder2._id, type: 'APPLICATION_STATUS', title: 'Your application is now rejected', body: 'Thanks for applying — not a fit this round.', data: { opportunityTitle: loop.title, status: 'REJECTED' }, readAt: null },
    ]);

    // ---- ecosystems: founders, investors, HR, organizations -------------------------------
    await seedEcosystems(db, { hash, admin, builder2, oppBySlug });

    // ---- community projects (showcase feed) ----------------------------------------------
    const projectDefs = [
      { author: builder, profile: builderProfile, title: 'PitchLoop — AI pitch-deck coach', tagline: 'Real-time feedback on your startup pitch, slide by slide.', category: 'AI_ML', tags: ['ai', 'react', 'node-js'], description: '<p>PitchLoop listens to a founder rehearse and returns structured feedback on clarity, pacing and story. Built with a React front end and a Node.js scoring service.</p>', links: { repo: 'https://github.com/example/pitchloop', demo: 'https://example.com/pitchloop', video: null, website: null }, cover: banners[0], featured: true, upvotes: 42, published: -20 },
      { author: builder, profile: builderProfile, title: 'CommuteMesh — campus ride matching', tagline: 'Match students heading the same way, cut the daily commute cost.', category: 'MOBILE', tags: ['react-native', 'maps', 'product'], description: '<p>A mobile app that clusters students by route and time so they can share rides safely across campus.</p>', links: { repo: 'https://github.com/example/commutemesh', demo: null, video: 'https://example.com/commutemesh-demo', website: null }, cover: banners[1], featured: false, upvotes: 17, published: -12 },
      { author: builder, profile: builderProfile, title: 'DocDraft — markdown-first docs engine', tagline: 'Turn a folder of markdown into a fast, searchable docs site.', category: 'DEVTOOLS', tags: ['typescript', 'devtools', 'static-site'], description: '<p>A zero-config static docs generator with instant search and dark mode, shipped as a single binary.</p>', links: { repo: 'https://github.com/example/docdraft', demo: 'https://example.com/docdraft', video: null, website: 'https://docdraft.example.com' }, cover: banners[2], featured: false, upvotes: 8, published: -6 },
      { author: builder2, profile: builder2Profile, title: 'LeafSense — plant disease classifier', tagline: 'Snap a leaf, get a diagnosis and a treatment plan.', category: 'AI_ML', tags: ['python', 'machine-learning', 'mobile'], description: '<p>A lightweight CNN trained on open agricultural datasets, packaged behind a simple mobile capture flow for small farmers.</p>', links: { repo: 'https://github.com/example/leafsense', demo: null, video: null, website: null }, cover: banners[3], featured: false, upvotes: 5, published: -3 },
    ];

    const searchFieldsOf = (p) => ({
      searchTerms: termsOf(p.title, p.tagline, p.description, p.category, ...(p.tags ?? [])),
      titleTerms: termsOf(p.title, p.tagline),
    });

    const projectBySlug = {};
    for (const p of projectDefs) {
      const base = {
        title: p.title,
        slug: slugify(p.title),
        tagline: p.tagline,
        description: p.description,
        category: p.category,
        tags: p.tags,
        coverImageId: p.cover,
        links: p.links,
        authorUserId: p.author._id,
        authorProfileId: p.profile._id,
        upvoteCount: p.upvotes,
        status: 'PUBLISHED',
        // Phase 3 project fields: published showcase projects are PUBLIC, with an OWNER team row.
        visibility: 'PUBLIC',
        projectType: 'PERSONAL',
        technologies: p.tags,
        publishedAt: days(p.published),
        featured: p.featured,
      };
      const doc = await db.Project.create({ ...base, ...searchFieldsOf(base) });
      await db.ProjectMember.create({ projectId: doc._id, userId: p.author._id, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: days(p.published) });
      projectBySlug[doc.slug] = doc;
    }

    // A handful of upvotes so the leaderboard and `upvoted` flags have real data.
    // (The denormalised upvoteCount above already reflects these plus anonymous votes.)
    await db.ProjectUpvote.create([
      { projectId: projectBySlug['pitchloop-ai-pitch-deck-coach']._id, userId: builder2._id },
      { projectId: projectBySlug['commutemesh-campus-ride-matching']._id, userId: builder2._id },
      { projectId: projectBySlug['leafsense-plant-disease-classifier']._id, userId: builder._id },
    ]);

    // ---- courses & company learning modules ----------------------------------------------
    // One `courses` collection, split by `audience`: STUDENT = engineering-readiness tracks,
    // COMPANY = institutional learning modules (carry a `provider`). Skill slugs align to the
    // master Skill vocabulary so the same tags power course discovery and opportunity matching.
    const lesson = (title, kind, durationMinutes, url = null) => ({ title, kind, durationMinutes, url });
    const courseDefs = [
      {
        title: 'Frontend Engineering Readiness', audience: 'STUDENT', level: 'INTERMEDIATE', role: 'Frontend Engineer',
        summary: 'Go from building components to shipping accessible, production-grade React interfaces.',
        description: '<p>A role-focused track that takes you through modern React, TypeScript and interface design, ending with a portfolio-ready capstone.</p>',
        durationHours: 40, featured: true, skills: ['React', 'TypeScript', 'UI/UX'], published: -30,
        modules: [
          { title: 'Modern React foundations', summary: 'Hooks, state and rendering models.', lessons: [lesson('Thinking in components', 'READING', 25), lesson('State and effects in depth', 'VIDEO', 40, 'https://example.com/react-state'), lesson('Component design quiz', 'QUIZ', 15)] },
          { title: 'TypeScript for UI engineers', summary: 'Type-safe props, generics and patterns.', lessons: [lesson('Typing props and hooks', 'READING', 30), lesson('Generics you actually need', 'VIDEO', 35, 'https://example.com/ts-generics')] },
          { title: 'Capstone: ship an interface', summary: 'Build and deploy a real feature.', lessons: [lesson('Capstone brief', 'PROJECT', 120)] },
        ],
      },
      {
        title: 'Backend Foundations with Node.js', audience: 'STUDENT', level: 'BEGINNER', role: 'Backend Engineer',
        summary: 'Learn to design and build reliable HTTP APIs with Node.js, data modelling and deployment.',
        description: '<p>Start from an empty folder and finish with a tested, deployed REST API backed by a real database.</p>',
        durationHours: 32, featured: false, skills: ['Node.js', 'SQL', 'Cloud'], published: -22,
        modules: [
          { title: 'HTTP and Express basics', lessons: [lesson('Requests, responses, routing', 'READING', 30), lesson('Building your first API', 'VIDEO', 45, 'https://example.com/node-api')] },
          { title: 'Data modelling', lessons: [lesson('Relational vs document data', 'READING', 25), lesson('Modelling exercise', 'QUIZ', 20)] },
        ],
      },
      {
        title: 'Applied Machine Learning', audience: 'STUDENT', level: 'ADVANCED', role: 'ML Engineer',
        summary: 'Take models from notebook to production: data pipelines, evaluation and deployment.',
        description: '<p>An advanced, project-driven track covering the full applied ML workflow with Python.</p>',
        durationHours: 48, featured: true, skills: ['Python', 'Machine Learning', 'Data'], published: -14,
        modules: [
          { title: 'From data to features', lessons: [lesson('Feature engineering', 'READING', 35), lesson('Building a training pipeline', 'PROJECT', 90)] },
          { title: 'Evaluation & deployment', lessons: [lesson('Metrics that matter', 'VIDEO', 30, 'https://example.com/ml-metrics'), lesson('Serving a model', 'READING', 40)] },
        ],
      },
      {
        title: 'Internal Draft: ML Ops Deep Dive', audience: 'STUDENT', level: 'ADVANCED', role: 'ML Engineer',
        summary: 'DRAFT — must never appear publicly.',
        durationHours: 20, featured: true, skills: ['Machine Learning'], status: 'DRAFT',
        modules: [{ title: 'Internal outline', lessons: [lesson('TBD', 'READING', 10)] }],
      },
      {
        title: 'Cloud Security Essentials', audience: 'COMPANY', level: 'INTERMEDIATE', provider: 'Northwind Labs',
        summary: 'A corporate learning module covering cloud security fundamentals for engineering teams.',
        description: '<p>Institutional training on identity, network boundaries and secure defaults across cloud environments.</p>',
        durationHours: 12, featured: true, skills: ['Cloud'], enrollUrl: 'https://example.com/enroll/cloud-security', published: -18,
        modules: [
          { title: 'Identity & access', lessons: [lesson('Least privilege in practice', 'READING', 30), lesson('Reviewing IAM policies', 'VIDEO', 25, 'https://example.com/iam')] },
          { title: 'Secure defaults', lessons: [lesson('Hardening checklist', 'READING', 20)] },
        ],
      },
      {
        title: 'Product Analytics for Teams', audience: 'COMPANY', level: 'BEGINNER', provider: 'Loopwise',
        summary: 'Help product and engineering teams measure what matters and act on the data.',
        description: '<p>A learning module on instrumentation, funnels and decision-making for cross-functional teams.</p>',
        durationHours: 8, featured: false, skills: ['Product', 'Data'], enrollUrl: 'https://example.com/enroll/product-analytics', published: -9,
        modules: [
          { title: 'Instrumentation basics', lessons: [lesson('What to track and why', 'READING', 20), lesson('Defining events', 'QUIZ', 15)] },
        ],
      },
    ];

    for (const [i, c] of courseDefs.entries()) {
      const skills = await ensureTags(db, [...c.skills]);
      const modules = (c.modules ?? []).map((m, mi) => ({
        title: m.title,
        summary: m.summary ?? null,
        displayOrder: mi,
        lessons: (m.lessons ?? []).map((l, li) => ({ ...l, displayOrder: li })),
      }));
      const description = 'description' in c ? c.description : null;
      await db.Course.create({
        title: c.title,
        slug: slugify(c.title),
        audience: c.audience,
        level: c.level,
        summary: c.summary,
        description,
        thumbnailId: banners[i % banners.length],
        provider: 'provider' in c ? c.provider : null,
        role: 'role' in c ? c.role : null,
        durationHours: c.durationHours ?? null,
        enrollUrl: 'enrollUrl' in c ? c.enrollUrl : null,
        skills,
        modules,
        featured: c.featured,
        status: 'status' in c ? c.status : 'PUBLISHED',
        publishedAt: 'status' in c ? null : days(c.published),
        searchTerms: termsOf(c.title, c.summary, description, c.provider, c.role, ...skills.map((s) => s.name), ...modules.map((m) => m.title)),
        titleTerms: termsOf(c.title),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
    }

    // ---- STUDHub — verified scholarships, software discounts & student perks --------------
    // One `studhub_benefits` collection, split by `type`. SCHOLARSHIP carries a deadline,
    // DISCOUNT/PERK carry an `offer` headline. Tags reuse the shared vocabulary.
    const studhubDefs = [
      {
        title: 'STUDLYF Merit Scholarship', type: 'SCHOLARSHIP', provider: 'STUDLYF Foundation',
        summary: 'Need-and-merit funding for standout student builders shipping real projects.',
        description: '<p>Covers up to a full year of tuition for students demonstrating exceptional building ability and financial need. Reviewed on a rolling basis.</p>',
        offer: 'Up to ₹1,00,000', eligibility: 'Enrolled undergraduates with a shipped project.',
        claimUrl: 'https://example.com/studlyf-scholarship', deadline: 45, tags: ['scholarship', 'funding'], featured: true, published: -18,
      },
      {
        title: 'Global Women in Tech Grant', type: 'SCHOLARSHIP', provider: 'Northwind Labs',
        summary: 'Grants supporting women pursuing computer science and engineering degrees.',
        description: '<p>A merit grant for women in undergraduate technical programs, with optional mentorship from Northwind engineers.</p>',
        offer: '$2,500 grant', eligibility: 'Women enrolled in a technical undergraduate program.',
        claimUrl: 'https://example.com/women-in-tech-grant', deadline: 60, tags: ['scholarship', 'diversity'], featured: false, published: -10,
      },
      {
        title: 'Notion Pro — Free for Students', type: 'PERK', provider: 'Notion',
        summary: 'The full Notion Plus plan, free while you study — notes, docs and databases.',
        description: '<p>Verify with your student email to unlock Notion Plus at no cost, including unlimited blocks and file uploads.</p>',
        offer: 'Free Plus plan', eligibility: 'Any student with a verified academic email.',
        claimUrl: 'https://example.com/notion-students', tags: ['productivity', 'tools'], featured: true, published: -14,
      },
      {
        title: 'JetBrains All Products Pack', type: 'PERK', provider: 'JetBrains',
        summary: 'Free access to the entire JetBrains IDE suite for enrolled students.',
        description: '<p>Get IntelliJ IDEA Ultimate, PyCharm, WebStorm and every other JetBrains IDE free for a year, renewable while you study.</p>',
        offer: 'Free for 1 year', eligibility: 'Students at accredited institutions.',
        claimUrl: 'https://example.com/jetbrains-students', tags: ['tools', 'devtools'], featured: false, published: -8,
      },
      {
        title: 'Figma Education — Pro Features', type: 'DISCOUNT', provider: 'Figma',
        summary: 'Professional Figma features at no cost for students and educators.',
        description: '<p>Unlock unlimited Figma projects, version history and dev mode with an education plan.</p>',
        offer: '100% off Pro', eligibility: 'Verified students and educators.',
        claimUrl: 'https://example.com/figma-education', tags: ['design', 'ui-ux'], featured: false, published: -6,
      },
      {
        title: 'Internal Draft: Cloud Credits Bundle', type: 'DISCOUNT', provider: 'Loopwise Cloud',
        summary: 'Draft benefit — should never appear in the public catalog.',
        offer: '$300 credit', tags: ['cloud'], status: 'DRAFT',
      },
    ];
    for (const [i, b] of studhubDefs.entries()) {
      const tags = await ensureTags(db, [...(b.tags ?? [])]);
      const description = 'description' in b ? b.description : null;
      await db.StudhubBenefit.create({
        title: b.title,
        slug: slugify(b.title),
        type: b.type,
        summary: b.summary,
        description,
        thumbnailId: banners[i % banners.length],
        provider: b.provider ?? null,
        offer: b.offer ?? null,
        eligibility: b.eligibility ?? null,
        claimUrl: b.claimUrl ?? null,
        deadline: 'deadline' in b ? days(b.deadline) : null,
        tags,
        featured: b.featured ?? false,
        status: 'status' in b ? b.status : 'PUBLISHED',
        publishedAt: 'status' in b ? null : days(b.published),
        searchTerms: termsOf(b.title, b.summary, b.provider, b.offer, b.eligibility, ...tags.map((t) => t.name), description),
        titleTerms: termsOf(b.title, b.provider),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
    }

    // ---- mock tests & interviews -----------------------------------------------------------
    // One `mock_drills` collection, split by `kind`: TEST = timed assessments (carry a
    // questionCount), INTERVIEW = mock interview sets. `level` reuses the course scale.
    const mockDefs = [
      {
        title: 'JavaScript Fundamentals Assessment', kind: 'TEST', level: 'BEGINNER', role: 'Frontend Engineer',
        summary: 'A timed 30-question test covering core JavaScript: types, scope, async and the DOM.',
        description: '<p>Benchmark your JavaScript fundamentals against role expectations, with instant scoring and topic breakdowns.</p>',
        durationMinutes: 45, questionCount: 30, provider: 'STUDLYF Labs', featured: true,
        skills: ['JavaScript', 'React'], startUrl: 'https://example.com/js-assessment', published: -16,
      },
      {
        title: 'Data Structures & Algorithms Drill', kind: 'TEST', level: 'INTERMEDIATE', role: 'Backend Engineer',
        summary: 'Practice arrays, trees, graphs and dynamic programming under timed conditions.',
        description: '<p>A curated set of DSA problems that mirror what top companies ask, with reference solutions.</p>',
        durationMinutes: 90, questionCount: 20, provider: 'STUDLYF Labs', featured: false,
        skills: ['Python', 'SQL'], startUrl: 'https://example.com/dsa-drill', published: -11,
      },
      {
        title: 'Behavioural Interview Simulator', kind: 'INTERVIEW', level: 'BEGINNER', role: 'Any',
        summary: 'Rehearse the STAR method across the most common behavioural interview prompts.',
        description: '<p>Twelve recorded behavioural prompts with rubric-based self-evaluation and model answers.</p>',
        durationMinutes: 40, provider: 'Northwind Labs', featured: true,
        skills: ['Product'], startUrl: 'https://example.com/behavioural-mock', published: -9,
      },
      {
        title: 'System Design Mock Interview', kind: 'INTERVIEW', level: 'ADVANCED', role: 'Backend Engineer',
        summary: 'A senior-level mock interview: design a scalable system end-to-end with a rubric.',
        description: '<p>Walk through designing a real-world system with prompts on scaling, trade-offs and data modelling.</p>',
        durationMinutes: 60, provider: 'Loopwise', featured: false,
        skills: ['Cloud', 'Node.js'], startUrl: 'https://example.com/system-design-mock', published: -5,
      },
      {
        title: 'Internal Draft: Frontend Take-home Review', kind: 'INTERVIEW', level: 'INTERMEDIATE',
        summary: 'Draft drill — should never appear in the public catalog.',
        skills: ['React'], status: 'DRAFT',
      },
    ];
    for (const [i, m] of mockDefs.entries()) {
      const skills = await ensureTags(db, [...(m.skills ?? [])]);
      const description = 'description' in m ? m.description : null;
      await db.MockDrill.create({
        title: m.title,
        slug: slugify(m.title),
        kind: m.kind,
        level: m.level,
        summary: m.summary,
        description,
        thumbnailId: banners[i % banners.length],
        role: 'role' in m ? m.role : null,
        provider: m.provider ?? null,
        durationMinutes: m.durationMinutes ?? null,
        questionCount: m.questionCount ?? null,
        startUrl: m.startUrl ?? null,
        skills,
        featured: m.featured ?? false,
        status: 'status' in m ? m.status : 'PUBLISHED',
        publishedAt: 'status' in m ? null : days(m.published),
        searchTerms: termsOf(m.title, m.summary, m.role, m.provider, ...skills.map((s) => s.name), description),
        titleTerms: termsOf(m.title, m.role),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
    }

    // ---- build a project: challenge briefs -------------------------------------------------
    // Build-ready briefs a builder can pick up. `category` reuses the community project taxonomy
    // so a finished build slots straight into the showcase; `difficulty` reuses the course scale.
    const briefDefs = [
      {
        title: 'Real-time Chat App', category: 'WEB', difficulty: 'INTERMEDIATE', estimatedHours: 20, featured: true,
        summary: 'Build a real-time chat with rooms, presence and typing indicators using WebSockets.',
        description: '<p>Design and build a multi-room chat application with live presence, typing indicators and message history.</p>',
        deliverables: ['WebSocket server with room support', 'Presence + typing indicators', 'Persisted message history', 'Deployed demo link'],
        skills: ['Node.js', 'React'], starterUrl: 'https://example.com/starters/realtime-chat', published: -14,
      },
      {
        title: 'Personal Finance Dashboard', category: 'FINTECH', difficulty: 'BEGINNER', estimatedHours: 12, featured: false,
        summary: 'Track income and expenses with categorised charts and a monthly budget view.',
        description: '<p>A single-page app that ingests transactions and renders spending insights with charts and budgets.</p>',
        deliverables: ['Transaction CRUD', 'Category breakdown chart', 'Monthly budget tracker'],
        skills: ['React', 'JavaScript'], starterUrl: 'https://example.com/starters/finance-dashboard', published: -10,
      },
      {
        title: 'AI Study Notes Summarizer', category: 'AI_ML', difficulty: 'ADVANCED', estimatedHours: 30, featured: true,
        summary: 'Summarize long lecture notes into flashcards using an LLM and a vector store.',
        description: '<p>Ingest documents, chunk and embed them, then generate flashcards and answer questions with retrieval.</p>',
        deliverables: ['Document ingestion + chunking', 'Vector search over embeddings', 'LLM-generated flashcards', 'Q&A over notes'],
        skills: ['Python', 'ML'], starterUrl: 'https://example.com/starters/notes-summarizer', published: -6,
      },
      {
        title: 'Habit Tracker Mobile App', category: 'MOBILE', difficulty: 'INTERMEDIATE', estimatedHours: 18, featured: false,
        summary: 'A cross-platform habit tracker with streaks, reminders and offline sync.',
        description: '<p>Build a mobile habit tracker with local persistence, streak logic and scheduled reminders.</p>',
        deliverables: ['Habit CRUD with streaks', 'Local offline storage', 'Scheduled reminders'],
        skills: ['React'], starterUrl: 'https://example.com/starters/habit-tracker', published: -3,
      },
      {
        title: 'Internal Draft: DevOps Pipeline Kata', category: 'DEVTOOLS', difficulty: 'ADVANCED',
        summary: 'Draft brief — should never appear in the public catalog.',
        deliverables: ['CI pipeline'], skills: ['Cloud'], status: 'DRAFT',
      },
    ];
    for (const [i, p] of briefDefs.entries()) {
      const skills = await ensureTags(db, [...(p.skills ?? [])]);
      const description = 'description' in p ? p.description : null;
      await db.ProjectBrief.create({
        title: p.title,
        slug: slugify(p.title),
        category: p.category,
        difficulty: p.difficulty,
        summary: p.summary,
        description,
        thumbnailId: banners[i % banners.length],
        estimatedHours: p.estimatedHours ?? null,
        deliverables: p.deliverables ?? [],
        starterUrl: p.starterUrl ?? null,
        skills,
        featured: p.featured ?? false,
        status: 'status' in p ? p.status : 'PUBLISHED',
        publishedAt: 'status' in p ? null : days(p.published),
        searchTerms: termsOf(p.title, p.summary, p.category, ...(p.deliverables ?? []), ...skills.map((s) => s.name), description),
        titleTerms: termsOf(p.title),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
    }

    // ---- career roadmap: authored role templates -------------------------------------------
    // Each template is the skill set a target role needs, ranked CORE → IMPORTANT → OPTIONAL.
    // A builder's plan is then a diff of these steps against their own profile skills, so the
    // sample builder (who already lists React, Node.js, ML and UI/UX) sees a partly-filled plan.
    const roadmapDefs = [
      {
        role: 'Full-Stack Engineer', roleFamily: 'Engineering', featured: true, published: -21,
        summary: 'Ship complete product features — a typed frontend, a real API, a database and a deploy.',
        demandNote: 'The most common entry-level engineering hire: teams want one person who can carry a feature end to end.',
        description: '<p>Full-stack work is less about knowing two stacks than about owning a slice of the product. This roadmap builds the frontend, backend, data and delivery skills that let you take a feature from idea to production without handing it off.</p>',
        steps: [
          ['react', 'React', 'CORE', 'Every product surface you will be asked to build starts here.', null],
          ['javascript', 'JavaScript', 'CORE', 'The language the browser runs — and what React is.', null],
          ['node-js', 'Node.js', 'CORE', 'One language across the stack, and the runtime behind most APIs.', null],
          ['sql', 'SQL', 'CORE', 'Schema design and the queries that sit behind every feature.', null],
          ['git', 'Git', 'IMPORTANT', 'Branching, reviews and rebases — how teams actually share code.', null],
          ['cloud', 'Cloud', 'IMPORTANT', 'Deploying and reading logs is the last mile of every feature.', null],
          ['ui-ux', 'UI/UX', 'IMPORTANT', 'Taste is the difference between "works" and "shipped".', null],
          ['typescript', 'TypeScript', 'OPTIONAL', 'Worth adding once JavaScript stops surprising you.', null],
        ],
      },
      {
        role: 'Data Scientist', roleFamily: 'Data', featured: true, published: -18,
        summary: 'Turn messy data into a decision — clean it, model it, and explain the result.',
        demandNote: 'Hiring skews toward candidates who can show a finished analysis, not a notebook of experiments.',
        description: '<p>Data science is a communication job with a maths core. This roadmap covers the statistics and tooling, then the storytelling that makes an analysis land with people who will act on it.</p>',
        steps: [
          ['python', 'Python', 'CORE', 'The working language of the field.', null],
          ['sql', 'SQL', 'CORE', 'Most real data lives in a warehouse, not a CSV.', null],
          ['machine-learning', 'Machine Learning', 'CORE', 'The models, and — more importantly — when not to use them.', null],
          ['statistics', 'Statistics', 'IMPORTANT', 'Sampling, significance and why your A/B test is lying.', null],
          ['data-visualization', 'Data Visualization', 'IMPORTANT', 'A chart is the argument; make it honest and legible.', null],
          ['cloud', 'Cloud', 'OPTIONAL', 'Where the pipelines run once the notebook has to be scheduled.', null],
        ],
      },
      {
        role: 'Product Designer', roleFamily: 'Design', featured: false, published: -12,
        summary: 'Take a fuzzy problem to a tested interface — research, structure, prototype, refine.',
        demandNote: 'Product designers who can run their own research and hand over a real spec are hired fastest.',
        description: '<p>Design here means deciding what to build as much as how it looks. The roadmap moves from understanding users, to structuring the flow, to prototyping something you can put in front of them.</p>',
        steps: [
          ['ui-ux', 'UI/UX', 'CORE', 'Layout, hierarchy and the craft of a clear screen.', null],
          ['figma', 'Figma', 'CORE', 'The tool every design team shares files in.', null],
          ['product', 'Product', 'CORE', 'Scoping the smallest thing that answers the question.', null],
          ['user-research', 'User Research', 'IMPORTANT', 'Talking to five users beats guessing at fifty.', null],
          ['prototyping', 'Prototyping', 'IMPORTANT', 'Something clickable is the fastest way to be wrong early.', null],
        ],
      },
      {
        role: 'Internal Draft: Platform Engineer', roleFamily: 'Engineering',
        summary: 'Draft roadmap — should never appear in the public catalog.',
        status: 'DRAFT',
        steps: [['cloud', 'Cloud', 'CORE', 'Draft step.', null]],
      },
    ];
    for (const [i, r] of roadmapDefs.entries()) {
      const steps = (r.steps ?? []).map(([slug, name, priority, rationale, resourceSlug]) => ({
        skillSlug: slug, skillName: name, priority, rationale, resourceSlug,
      }));
      await db.RoadmapTemplate.create({
        role: r.role,
        slug: slugify(r.role),
        roleFamily: r.roleFamily ?? null,
        summary: r.summary,
        description: r.description ?? null,
        demandNote: r.demandNote ?? null,
        steps,
        featured: r.featured ?? false,
        status: r.status ?? 'PUBLISHED',
        publishedAt: r.status ? null : days(r.published),
        searchTerms: termsOf(r.role, r.roleFamily, r.summary, r.description, ...steps.map((s) => s.skillName)),
        titleTerms: termsOf(r.role),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
    }

    // The sample builder is aiming at full-stack, with two skills marked by hand that their profile
    // does not list — the case `completedSkillSlugs` exists for.
    await db.UserRoadmap.create({
      userId: builder._id,
      templateId: (await db.RoadmapTemplate.findOne({ slug: 'full-stack-engineer' }).select({ _id: 1 }).lean())._id,
      roleSlug: 'full-stack-engineer',
      completedSkillSlugs: ['git', 'sql'],
      startedAt: days(-9),
    });

    // ---- STUD OTT: the streaming shelf ------------------------------------------------------
    // Four kinds on one collection, differing in how they are consumed: a single VIDEO, an
    // ARTICLE with no time axis, and two episodic runs (SERIES / COURSE) whose progress is tracked
    // per instalment. `published` is days-ago; the draft proves the public shelf filters it out.
    const ottDefs = [
      {
        title: 'System Design, From Nothing', kind: 'VIDEO', published: -20, featured: true, durationMinutes: 48,
        byline: 'STUDLYF Sessions', category: 'engineering', level: 'INTERMEDIATE',
        summary: 'A full walkthrough of designing a URL shortener — from back-of-envelope numbers to a working sketch.',
        description: '<p>One whiteboard, no slides. We size the problem, pick a data store, then break it on purpose and fix what breaks.</p>',
        sourceUrl: 'https://example.com/ott/system-design-from-nothing',
        skills: ['Node.js', 'SQL', 'Cloud'],
      },
      {
        title: 'How To Read a Research Paper', kind: 'ARTICLE', published: -14, featured: true, durationMinutes: 9, category: 'career',
        byline: 'Dr. Meera Iyer',
        summary: 'A repeatable method for getting the point of an ML paper in fifteen minutes — and knowing whether to keep reading.',
        description: '<p>Read the abstract, then the figures, then the conclusion, and only then the method. Most papers are decided well before the maths.</p>',
        sourceUrl: 'https://example.com/ott/reading-research-papers',
        skills: ['Machine Learning'],
      },
      {
        title: 'Founders Who Shipped It', kind: 'SERIES', published: -9, featured: false, category: 'founder-stories',
        byline: 'STUDLYF Originals',
        summary: 'Three student founders talk through the first version they put in front of a stranger — and what it cost them.',
        description: '<p>No pitch decks, no growth charts. Just the week they launched, told by the people who did it.</p>',
        skills: ['Entrepreneurship', 'Product'],
        episodes: [
          { key: 'the-first-user', title: 'The first user', durationMinutes: 22, summary: 'Getting one stranger to try it.', sourceUrl: 'https://example.com/ott/founders/ep-1' },
          { key: 'the-first-no', title: 'The first no', durationMinutes: 26, summary: 'What a rejection actually told them.', sourceUrl: 'https://example.com/ott/founders/ep-2' },
          { key: 'the-first-hire', title: 'The first hire', durationMinutes: 31, summary: 'Handing work to somebody else.', sourceUrl: 'https://example.com/ott/founders/ep-3' },
        ],
      },
      {
        title: 'Ship Your First Full-Stack App', kind: 'COURSE', published: -5, featured: true, category: 'engineering', level: 'BEGINNER',
        byline: 'STUDLYF Academy',
        summary: 'Four lessons that take you from an empty folder to a deployed app with a database behind it.',
        description: '<p>Each lesson ends with something running. Nothing is scaffolded for you that you could not have written yourself.</p>',
        skills: ['React', 'Node.js', 'SQL'],
        episodes: [
          { key: 'the-skeleton', title: 'The skeleton', durationMinutes: 34, sourceUrl: 'https://example.com/ott/fullstack/1' },
          { key: 'data-that-persists', title: 'Data that persists', durationMinutes: 41, sourceUrl: 'https://example.com/ott/fullstack/2' },
          { key: 'an-api-worth-calling', title: 'An API worth calling', durationMinutes: 38, sourceUrl: 'https://example.com/ott/fullstack/3' },
          { key: 'put-it-on-the-internet', title: 'Put it on the internet', durationMinutes: 29, sourceUrl: 'https://example.com/ott/fullstack/4' },
        ],
      },
      {
        title: 'Internal Draft: Design Critiques', kind: 'SERIES', category: 'design',
        summary: 'Draft series — should never appear on the public shelf.',
        status: 'DRAFT',
        episodes: [{ key: 'pilot', title: 'Pilot' }],
      },
    ];
    const ottIds = {};
    for (const [i, o] of ottDefs.entries()) {
      const skills = await ensureTags(db, [...(o.skills ?? [])]);
      const categoryId = o.category ? ottCat[o.category] : null;
      const doc = await db.Ott.create({
        title: o.title,
        slug: slugify(o.title),
        kind: o.kind,
        summary: o.summary,
        description: o.description ?? null,
        thumbnailId: banners[i % banners.length],
        categoryId: categoryId ?? null,
        byline: o.byline ?? null,
        level: o.level ?? null,
        durationMinutes: o.durationMinutes ?? null,
        sourceUrl: o.sourceUrl ?? null,
        episodes: o.episodes ?? [],
        skills,
        featured: o.featured ?? false,
        status: o.status ?? 'PUBLISHED',
        publishedAt: o.status ? null : days(o.published),
        searchTerms: termsOf(o.title, o.summary, o.byline, ...(o.episodes ?? []).map((e) => e.title), ...skills.map((s) => s.name), o.description),
        titleTerms: termsOf(o.title),
        createdBy: admin._id,
        updatedBy: admin._id,
      });
      ottIds[doc.slug] = doc._id;
    }

    // A partly-watched shelf for the sample builder: one title finished, a course underway, and a
    // series stopped mid-episode — the three states the shelf has to render.
    await db.OttProgress.create([
      { userId: builder._id, contentId: ottIds['system-design-from-nothing'], percent: 100, positionSeconds: 2880, completed: true, lastWatchedAt: days(-6) },
      { userId: builder._id, contentId: ottIds['ship-your-first-full-stack-app'], episodeKey: 'the-skeleton', percent: 100, positionSeconds: 2040, completed: true, lastWatchedAt: days(-2) },
      { userId: builder._id, contentId: ottIds['ship-your-first-full-stack-app'], episodeKey: 'data-that-persists', percent: 40, positionSeconds: 984, completed: false, lastWatchedAt: days(-1) },
      { userId: builder2._id, contentId: ottIds['founders-who-shipped-it'], episodeKey: 'the-first-user', percent: 62, positionSeconds: 818, completed: false, lastWatchedAt: days(-3) },
    ]);

    // A sample resume for the seeded builder, so the Resume Builder has content to show.
    await db.Resume.create({
      userId: builder._id,
      title: 'Full-stack Engineer',
      fullName: 'Sample Builder',
      headline: 'Full-stack builder & AI tinkerer',
      email: 'builder@studlyf.local',
      phone: '+91 90000 00000',
      location: 'Bengaluru, India',
      links: { github: 'https://github.com/example', linkedin: 'https://linkedin.com/in/example', portfolio: 'https://example.com', website: null },
      summary: 'Final-year CSE student who ships side projects every month. I care about clean UX and fast feedback loops.',
      experience: [
        {
          company: 'Vertex Labs',
          role: 'Software Engineering Intern',
          location: 'Remote',
          startDate: 'Jun 2025',
          endDate: 'Aug 2025',
          current: false,
          description: 'Built internal tooling in Node.js and React; cut a nightly report job from 40m to 4m.',
        },
      ],
      education: [
        { school: 'Vertex Institute of Technology', program: 'B.Tech Computer Science', year: '2026', details: null },
      ],
      projects: [
        { name: 'Real-time Chat App', description: 'WebSocket chat with presence and typing indicators.', url: 'https://github.com/example/chat', skills: ['Node.js', 'React'] },
      ],
      skills: ['React', 'Node.js', 'Machine Learning', 'UI/UX'],
      certifications: [
        { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2025' },
      ],
    });
  }

  return { skipped: false };
}

/**
 * One account per ecosystem plus a multi-role account (nova = Builder + Founder) and a pending
 * investor, so every post-login route, access state and switcher path has data. DEV-ONLY.
 */
async function seedEcosystems(db, { hash, admin, builder2, oppBySlug }) {
  const account = async (key, name) =>
    (
      await db.User.create({
        name,
        email: DEV_CREDENTIALS[key].email,
        passwordHash: await hash(DEV_CREDENTIALS[key].password),
        primaryRole: 'USER',
        roles: [{ role: 'USER' }],
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
    ).toObject();
  const grant = (userId, role) =>
    db.User.updateOne({ _id: userId }, { $push: { roles: { role, grantedAt: new Date(), grantedBy: admin._id } } });

  // Founders: the dev founder, plus nova, who is also a builder (multi-role).
  const founder = await account('founder', 'Riya Kapoor (dev founder)');
  const founderDefs = [
    {
      user: founder,
      headline: 'Second-time founder building climate tools for farmers',
      bio: 'Previously built a farm-to-retail logistics startup. Now working on soil-health intelligence for smallholder farmers.',
      location: 'Pune, India',
      startup: {
        name: 'SoilSense',
        oneLiner: 'Soil-health scores from a ₹500 sensor and a phone camera.',
        industry: 'AgriTech',
        type: 'B2B',
        stage: 'EARLY_TRACTION',
        fundingStage: 'PRE_SEED',
        location: 'Pune, India',
        foundedYear: 2025,
        teamSize: 4,
        teamDescription: 'Riya (CEO, ex-logistics founder), an agronomy PhD, a hardware engineer and a field-operations lead from Nashik.',
        website: 'https://example.com/soilsense',
        description:
          'SoilSense combines a low-cost probe with phone-camera analysis to give smallholder farmers a soil-health score and fertiliser plan in under five minutes.',
        traction: {
          users: '1,800 farmers across 3 districts',
          revenue: '₹2.1L MRR from FPO subscriptions',
          growth: '32% month-on-month since March',
          highlights: 'Pilots with two farmer-producer organisations.',
        },
      },
      workspace: {
        problem: 'Smallholder farmers overuse fertiliser because soil testing labs are far away and results take weeks to arrive.',
        targetCustomer: 'Farmer-producer organisations (FPOs) serving 500–5,000 smallholder farmers.',
        marketAnalysis:
          'India has 10,000+ FPOs and a government push for soil-health cards; lab testing capacity covers under 20% of demand in our pilot districts.',
        competitors: 'Government soil labs (slow, free), private labs (accurate, ₹800+ per test), and sensor startups focused on large farms.',
        swot: {
          strengths: 'Low-cost hardware, FPO distribution, agronomy expertise in the team.',
          weaknesses: 'Small field team; sensor calibration still manual.',
          opportunities: 'State soil-health programmes and input dealers looking for advisory products.',
          threats: 'Subsidised government testing drives expanding in 2027.',
        },
        marketingStrategy: 'Village demo days with FPOs, WhatsApp result cards farmers share, and agri-input dealer co-marketing.',
        pitchDeckUrl: 'https://example.com/soilsense-deck',
        businessModel: 'Per-farmer annual subscription sold to FPOs; sensor kits leased at cost.',
        gtmStrategy: 'Land with FPOs through agricultural universities, then expand via district-level agri-input dealers.',
      },
    },
    {
      user: builder2,
      headline: 'Student founder exploring edtech',
      bio: 'Building study tools while at university.',
      location: 'Bengaluru, India',
      startup: {
        name: 'StudySync',
        oneLiner: 'Spaced repetition planned backwards from your exam date.',
        industry: 'EdTech',
        stage: 'MVP',
        fundingStage: 'BOOTSTRAPPED',
        location: 'Bengaluru, India',
        traction: { users: '300 students in beta' },
      },
      workspace: { problem: 'Students cram before exams and forget most of it within a week; flashcard apps ignore exam timelines.' },
    },
  ];
  const updates = {
    SoilSense: [
      { title: 'Second FPO signed', body: 'Nashik Grape Growers FPO signed a 12-month pilot covering 900 farmers.', createdAt: new Date(Date.now() - 12 * 86_400_000) },
      { title: 'Sensor v2 in the field', body: 'Calibration time dropped from 20 to 6 minutes per kit with the new probe.', createdAt: new Date(Date.now() - 3 * 86_400_000) },
    ],
  };
  for (const f of founderDefs) {
    const doc = {
      userId: f.user._id,
      headline: f.headline,
      bio: f.bio,
      location: f.location,
      discoverable: true,
      // Sample founders publish their page so /founders/<slug> is browsable in development.
      // Real founders start at INVESTOR_VISIBLE (the schema default) until they opt in.
      slug: slugify(f.startup.name),
      visibility: 'PUBLIC',
      startup: f.startup,
      workspace: f.workspace,
      updates: updates[f.startup.name] ?? [],
      onboardingCompletedAt: new Date(),
    };
    await db.FounderProfile.create({
      ...doc,
      searchTerms: termsOf(f.user.name, doc.headline, doc.location, f.startup.name, f.startup.oneLiner, f.startup.industry, f.startup.description),
    });
    await grant(f.user._id, 'FOUNDER');
  }

  // Investors: one verified, one still waiting for verification.
  const investor = await account('investor', 'Vikram Shah (dev investor)');
  await db.InvestorProfile.create({
    userId: investor._id,
    firmName: 'Northstar Seed Fund (sample)',
    title: 'Partner',
    investorType: 'VC',
    website: 'https://example.com/northstar',
    stages: ['PRE_SEED', 'SEED'],
    sectors: ['AgriTech', 'EdTech', 'Climate'],
    geographies: ['India'],
    startupTypes: ['B2B', 'DEEPTECH'],
    checkSize: '₹25L – ₹1.5Cr',
    thesis: 'Backing technical founders building for Bharat.',
    status: 'ACTIVE',
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  await grant(investor._id, 'INVESTOR');
  const [pendingInvestor] = await db.User.create([
    {
      name: 'Meher Anand (pending investor)',
      email: 'investor.pending@studlyf.local',
      passwordHash: await hash(DEV_CREDENTIALS.investor.password),
      roles: [{ role: 'USER' }],
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  ]);
  await db.InvestorProfile.create({
    userId: pendingInvestor._id,
    firmName: 'Independent angel',
    investorType: 'ANGEL',
    stages: ['PRE_SEED'],
    sectors: ['FinTech'],
    status: 'PENDING',
  });
  const soilsense = await db.FounderProfile.findOne({ userId: founder._id }).lean();
  await db.InvestorConnection.create({
    investorUserId: investor._id,
    founderProfileId: soilsense._id,
    founderUserId: founder._id,
    message: 'Loved the FPO pilots. Would like to learn more about your unit economics.',
    status: 'PENDING',
  });
  // The shortlist lives in the platform-wide saved_items table (spec §57), not on the profile.
  await db.SavedItem.create({ userId: investor._id, entityType: 'FOUNDER', entityId: soilsense._id, savedAt: days(-4) });

  // HR: verified, with a small private pipeline.
  const hr = await account('hr', 'Ananya Rao (dev HR)');
  await db.HrProfile.create({
    userId: hr._id,
    companyName: 'Loopwise',
    designation: 'Talent Partner',
    workEmail: 'talent@loopwise.example',
    companyWebsite: 'https://example.com/loopwise',
    companySize: '51-200',
    hiringFor: 'Frontend and ML interns for the Bengaluru team.',
    status: 'ACTIVE',
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  await grant(hr._id, 'HR');
  const sample = await db.BuilderProfile.findOne({ username: 'sample-builder' }).lean();
  if (sample) {
    await db.HrCandidate.create({
      hrUserId: hr._id,
      builderProfileId: sample._id,
      builderUserId: sample.userId,
      stage: 'INTERVIEW',
      role: 'Frontend Intern',
      note: 'Strong React portfolio. Ask about the PitchLoop architecture.',
      interviewAt: new Date(Date.now() + 3 * 86_400_000),
    });
  }

  // Organization: verified, and owns the two Campus Builders Collective opportunities.
  const organizer = await account('organizer', 'Karthik Menon (dev organizer)');
  const orgName = 'Campus Builders Collective';
  const orgDescription = 'A student maker community running design sprints and civic-tech competitions.';
  const org = await db.Organization.create({
    name: orgName,
    slug: 'campus-builders-collective',
    type: 'COMMUNITY',
    website: 'https://example.com/campus-builders',
    city: 'Bengaluru',
    contactEmail: 'hello@campusbuilders.example',
    description: orgDescription,
    // Indexed words, so the organization surfaces in unified search (spec §56).
    searchTerms: termsOf(orgName, orgDescription, 'Bengaluru', 'COMMUNITY'),
    titleTerms: termsOf(orgName),
    createdBy: organizer._id,
    status: 'ACTIVE',
    reviewedBy: admin._id,
    reviewedAt: new Date(),
  });
  await db.OrganizationMember.create({ organizationId: org._id, userId: organizer._id, role: 'OWNER' });
  await grant(organizer._id, 'ORGANIZER');
  // An evaluator on the organization's own panel (also gets the platform EVALUATOR role).
  const [orgEvaluator] = await db.User.create([
    {
      name: 'Nisha Pillai (dev org evaluator)',
      email: 'org.evaluator@studlyf.local',
      passwordHash: await hash(DEV_CREDENTIALS.organizer.password),
      roles: [{ role: 'USER' }, { role: 'ORGANIZER' }, { role: 'EVALUATOR' }],
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  ]);
  await db.OrganizationMember.create({ organizationId: org._id, userId: orgEvaluator._id, role: 'EVALUATOR', addedBy: organizer._id });
  const owned = ['design-sprint-challenge-campus-commute', 'open-data-for-good-competition'].map((slug) => oppBySlug[slug]?._id).filter(Boolean);
  await db.Opportunity.updateMany({ _id: { $in: owned } }, { $set: { organizationId: org._id } });
}

/** Empties every collection (development/test only). Indexes are kept. */
export async function truncateAll(db) {
  const collections = await db.connection.db.collections();
  await Promise.all(collections.filter((c) => !c.collectionName.startsWith('_')).map((c) => c.deleteMany({})));
}
