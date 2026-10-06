/**
 * DEVELOPMENT SEED — Phase 3 projects + proof-of-work ecosystem.
 * Every person, organisation, project and score below is fictional sample data.
 *
 * Produces: 10 builders (3 existing + 7 new), 2 evaluators, 15 projects with skills and teams,
 * 5 opportunities accepting project submissions, 3 evaluation templates, submissions across the
 * status machine, evaluations in every state (with visibility variations), system + user
 * achievements, a moderation report and featured projects.
 */
import { slugify } from '../../common/utilities/text.js';
import { issueProjectCompleted, issueSystemAchievement } from '../../modules/achievements/achievements.service.js';
import { computeScores } from '../../modules/evaluations/scoring.js';
import { projectSearchFields, tagsFromTechnologies } from '../../modules/projects/projects.service.js';
import { buildSnapshot } from '../../modules/submissions/submissions.service.js';

export async function seedProofOfWork(db, ctx) {
  const { admin, builder, builder2, builder3, builderProfile, builder2Profile, makeProfile, bs, oppBySlug, banners, hash, days, evaluatorCredentials, builderPassword } =
    ctx;
  const skillRef = (slug) => {
    const { skillId, name } = bs(slug, 'INTERMEDIATE');
    return { skillId, slug, name };
  };
  const zephyrProfile = await db.BuilderProfile.findOne({ userId: builder3._id }).lean();

  // ---- more builders (10 in total) -------------------------------------------------------
  const newBuilderDefs = [
    { name: 'Aanya Iyer', email: 'aanya@studlyf.local', username: 'aanya', headline: 'ML engineer building accessibility tools', bio: 'Third-year CSE student working on computer vision for accessibility. I love hackathons and turning research into usable products.', city: 'Chennai, India', college: 'SRM Institute of Science and Technology', degree: 'B.Tech', branch: 'Computer Science & Engineering', year: '3', skills: [bs('python', 'ADVANCED'), bs('machine-learning', 'ADVANCED'), bs('react', 'INTERMEDIATE')] },
    { name: 'Rohan Verma', email: 'rohan@studlyf.local', username: 'rohan-v', headline: 'Backend builder for rural tech', bio: 'Final-year IT student building SMS-first services for farmers. Go, Node.js and a lot of field interviews.', city: 'Pune, India', college: 'College of Engineering Pune', degree: 'B.E.', branch: 'Information Technology', year: '4', skills: [bs('go', 'ADVANCED'), bs('node-js', 'ADVANCED'), bs('cloud', 'INTERMEDIATE')] },
    { name: 'Meera Nair', email: 'meera@studlyf.local', username: 'meera', headline: 'Product-minded frontend developer', bio: 'Second-year ECE student who fell in love with interface design. I build accessible, fast web apps.', city: 'Kochi, India', college: 'NIT Calicut', degree: 'B.Tech', branch: 'Electronics & Communication', year: '2', skills: [bs('react', 'ADVANCED'), bs('ui-ux', 'INTERMEDIATE'), bs('typescript', 'INTERMEDIATE')] },
    { name: 'Kabir Singh', email: 'kabir@studlyf.local', username: 'kabir-builds', headline: 'Open-source maintainer and data engineer', bio: 'Graduated CSE, now shipping open data tools. Maintainer of a small Tamil NLP toolkit and civic-tech dashboards.', city: 'Delhi, India', college: 'IIIT Delhi', degree: 'B.Tech', branch: 'Computer Science', year: 'GRADUATED', grad: -1, skills: [bs('python', 'EXPERT'), bs('sql', 'ADVANCED'), bs('data', 'ADVANCED')] },
    { name: 'Ishaan Gupta', email: 'ishaan@studlyf.local', username: 'ishaan', headline: 'Full-stack builder, early-stage founder', bio: 'Third-year CSE student running a tiny SaaS for neighbourhood clinics. I like shipping things people pay for.', city: 'Hyderabad, India', college: 'IIIT Hyderabad', degree: 'B.Tech', branch: 'Computer Science & Engineering', year: '3', skills: [bs('node-js', 'ADVANCED'), bs('react', 'ADVANCED'), bs('product', 'INTERMEDIATE')] },
    { name: 'Sara Khan', email: 'sara@studlyf.local', username: 'sara-codes', headline: 'Research-curious developer', bio: 'BCA student exploring NLP. I build tools that make academic papers easier to read.', city: 'Bengaluru, India', college: 'Christ University', degree: 'BCA', branch: 'Computer Applications', year: '2', skills: [bs('python', 'INTERMEDIATE'), bs('machine-learning', 'BEGINNER'), bs('figma', 'INTERMEDIATE')] },
    { name: 'Dev Patel', email: 'dev@studlyf.local', username: 'devp', headline: 'Embedded systems and IoT', bio: 'Final-year computer engineering student building low-power sensors for hostels and labs.', city: 'Ahmedabad, India', college: 'Nirma University', degree: 'B.Tech', branch: 'Computer Engineering', year: '4', private: true, skills: [bs('python', 'INTERMEDIATE'), bs('cloud', 'BEGINNER'), bs('data', 'INTERMEDIATE')] },
  ];
  const thisYear = new Date().getFullYear();
  const people = {};
  for (const d of newBuilderDefs) {
    const [user] = await db.User.create([
      {
        name: d.name,
        email: d.email,
        passwordHash: await hash(builderPassword),
        primaryRole: 'BUILDER',
        roles: [{ role: 'USER' }, { role: 'BUILDER' }],
        onboarding: { intent: 'BUILDER' },
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    ]);
    const graduationYear = d.year === 'GRADUATED' ? thisYear + (d.grad ?? -1) : thisYear + (5 - Number(d.year));
    const profile = await makeProfile(user, {
      username: d.username,
      headline: d.headline,
      bio: d.bio,
      availability: 'INTERNSHIP',
      visibility: d.private ? 'PRIVATE' : 'PUBLIC',
      personal: {
        phone: '+91 90000 0' + String(Object.keys(people).length + 1).padStart(4, '0'),
        city: d.city,
        college: d.college,
        degree: d.degree,
        branch: d.branch,
        yearOfStudy: d.year,
        graduationYear,
        links: { github: `https://github.com/${d.username}-sample`, linkedin: `https://www.linkedin.com/in/${d.username}-sample` },
        interests: ['HACKATHONS', 'PROJECTS', 'INTERNSHIPS'],
        completedAt: new Date(),
      },
      skills: d.skills,
    });
    people[d.username] = { user, profile };
  }
  people['sample-builder'] = { user: builder, profile: builderProfile };
  people.nova = { user: builder2, profile: builder2Profile };
  people.zephyr = { user: builder3, profile: zephyrProfile };

  // ---- evaluators ---------------------------------------------------------------------------
  const [evaluator1, evaluator2] = await db.User.create([
    { name: 'Priya Raman (Evaluator)', email: evaluatorCredentials.email, passwordHash: await hash(evaluatorCredentials.password), primaryRole: 'USER', roles: [{ role: 'USER' }, { role: 'EVALUATOR' }], emailVerified: true, emailVerifiedAt: new Date() },
    { name: 'Arjun Rao (Evaluator)', email: 'arjun.eval@studlyf.local', passwordHash: await hash(evaluatorCredentials.password), primaryRole: 'USER', roles: [{ role: 'USER' }, { role: 'EVALUATOR' }], emailVerified: true, emailVerifiedAt: new Date() },
  ]);

  // ---- evaluation templates (admin-built rubrics; nothing is hard-coded in the engine) ------------
  const criteria = (rows) => rows.map(([name, description, weight, maxScore, required = true], order) => ({ name, description, weight, maxScore, order, required }));
  const [tplHack, tplDesign, tplData] = await db.EvaluationTemplate.create([
    {
      name: 'Hackathon Standard',
      description: 'General-purpose rubric for 24–48 hour hackathons.',
      isActive: true,
      createdBy: admin._id,
      criteria: criteria([
        ['Problem Understanding', 'How well the team framed a real problem and its users.', 20, 10],
        ['Innovation', 'Novelty of the approach compared with existing solutions.', 20, 10],
        ['Technical Execution', 'Working build, code quality and technical depth.', 25, 10],
        ['Impact', 'Potential reach and measurable benefit.', 20, 10],
        ['Presentation', 'Clarity of the demo, write-up and pitch.', 15, 10],
      ]),
    },
    {
      name: 'Design Challenge Rubric',
      description: 'For product and UX design sprints.',
      isActive: true,
      createdBy: admin._id,
      criteria: criteria([
        ['User Research', 'Evidence of talking to real users and synthesising findings.', 25, 10],
        ['Interaction Design', 'Flows, information architecture and usability.', 30, 10],
        ['Visual Craft', 'Typography, layout and polish.', 25, 10],
        ['Accessibility', 'Contrast, keyboard support, screen-reader friendliness.', 20, 10],
      ]),
    },
    {
      name: 'Open Data Impact Rubric',
      description: 'For civic-tech and open-data competitions.',
      isActive: true,
      createdBy: admin._id,
      criteria: criteria([
        ['Data Use', 'Sound use of open datasets, with sources cited.', 30, 20],
        ['Civic Impact', 'Usefulness to residents or local government.', 30, 20],
        ['Technical Quality', 'Reliability, performance and code quality.', 25, 20],
        ['Documentation', 'README, setup guide and data dictionary (optional).', 15, 20, false],
      ]),
    },
  ]);

  // ---- 5 opportunities accept project submissions -------------------------------------------------
  const loop = oppBySlug['loophacks-2026-ai-for-bharat'];
  const spring = oppBySlug['spring-build-sprint-2026'];
  const design = oppBySlug['design-sprint-challenge-campus-commute'];
  const openData = oppBySlug['open-data-for-good-competition'];
  const fellowship = oppBySlug['vertex-innovation-fellowship'];
  const settings = [
    [loop, { guidelines: 'Submit a working prototype with a public repository. Teams of up to four.', requireRepository: true, minTeamSize: 1, maxTeamSize: 4, evaluationTemplateId: tplHack._id }],
    [spring, { guidelines: 'Archive of the Spring Build Sprint — submissions are closed.', requireRepository: true, maxTeamSize: 4, evaluationTemplateId: tplHack._id }],
    [design, { guidelines: 'Share a clickable prototype or live demo and your research notes.', requireDemo: true, maxTeamSize: 3, evaluationTemplateId: tplDesign._id }],
    [openData, { guidelines: 'Use at least one open civic dataset and document your sources.', requireRepository: true, maxTeamSize: 4, evaluationTemplateId: tplData._id }],
    [fellowship, { guidelines: 'Only published projects are considered. Individuals or teams of up to three.', requirePublished: true, maxTeamSize: 3, evaluationTemplateId: null }],
  ];
  for (const [opp, s] of settings) {
    await db.Opportunity.updateOne({ _id: opp._id }, { $set: { submissionSettings: { acceptsProjects: true, ...s } } });
  }

  // ---- 15 projects -------------------------------------------------------------------------
  const projectDefs = [
    // The four original community showcase projects, now full proof-of-work projects.
    {
      owner: 'sample-builder', title: 'PitchLoop — AI pitch-deck coach', tagline: 'Real-time feedback on your startup pitch, slide by slide.', category: 'AI_ML', projectType: 'HACKATHON',
      description: '<p>PitchLoop listens to a founder rehearse and returns structured feedback on clarity, pacing and story. Built with a React front end and a Node.js scoring service.</p>',
      problemStatement: 'First-time founders rarely get honest, specific feedback on their pitch before it matters.', solution: 'A rehearsal tool that scores each slide on clarity, pacing and narrative and suggests concrete rewrites.', impact: 'Used by 40+ student founders ahead of demo days.',
      technologies: ['React', 'Node.js', 'OpenAI API', 'PostgreSQL'], skills: ['react', 'node-js', 'machine-learning'], links: { repo: 'https://github.com/example/pitchloop', demo: 'https://example.com/pitchloop' },
      cover: banners[0], upvotes: 42, featured: true, published: -20, completed: -22, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'sample-builder', title: 'CommuteMesh — campus ride matching', tagline: 'Match students heading the same way, cut the daily commute cost.', category: 'MOBILE', projectType: 'PERSONAL',
      description: '<p>A mobile app that clusters students by route and time so they can share rides safely across campus.</p>',
      problemStatement: 'Students on the same routes pay for separate autos every day.', solution: 'Route clustering plus verified college emails to form safe carpools.',
      technologies: ['React Native', 'Maps', 'Product'], skills: ['react', 'product'], links: { repo: 'https://github.com/example/commutemesh', video: 'https://example.com/commutemesh-demo' },
      cover: banners[1], upvotes: 17, published: -12, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'sample-builder', title: 'DocDraft — markdown-first docs engine', tagline: 'Turn a folder of markdown into a fast, searchable docs site.', category: 'DEVTOOLS', projectType: 'OPEN_SOURCE',
      description: '<p>A zero-config static docs generator with instant search and dark mode, shipped as a single binary.</p>',
      problemStatement: 'Small open-source projects avoid writing docs because the tooling is heavy.', solution: 'Point DocDraft at a folder of markdown and get a searchable site in one command.',
      technologies: ['TypeScript', 'DevTools', 'Static site'], skills: ['typescript'], links: { repo: 'https://github.com/example/docdraft', demo: 'https://example.com/docdraft', website: 'https://docdraft.example.com' },
      cover: banners[2], upvotes: 8, published: -6, completed: -7, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'nova', title: 'LeafSense — plant disease classifier', tagline: 'Snap a leaf, get a diagnosis and a treatment plan.', category: 'AI_ML', projectType: 'ACADEMIC',
      description: '<p>A lightweight CNN trained on open agricultural datasets, packaged behind a simple mobile capture flow for small farmers.</p>',
      problemStatement: 'Small farmers lose crops to diseases that are easy to treat if caught early.', solution: 'An on-device classifier that works offline in the field.',
      technologies: ['Python', 'Machine Learning', 'Mobile'], skills: ['python', 'machine-learning'], links: { repo: 'https://github.com/example/leafsense' },
      cover: banners[3], upvotes: 5, published: -3, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    // New Phase 3 projects.
    {
      owner: 'aanya', team: [['meera', 'CO_BUILDER'], ['sample-builder', 'CONTRIBUTOR']], teamName: 'Team Handshake', title: 'SignBridge — real-time sign language captions', tagline: 'Live captions for Indian Sign Language in video calls.', category: 'AI_ML', projectType: 'HACKATHON',
      description: '<p>SignBridge runs a pose-estimation model in the browser and turns Indian Sign Language into live captions inside any video call, so deaf students can join group study sessions without an interpreter.</p>',
      problemStatement: 'Deaf and hard-of-hearing students are excluded from most online group study sessions.', solution: 'In-browser pose estimation + a sequence model that captions ISL in real time, with no uploads.', impact: 'Pilot with a Chennai school for the deaf: 30 students, 4 classrooms.',
      technologies: ['Python', 'TensorFlow.js', 'React', 'WebRTC'], skills: ['python', 'machine-learning', 'react'], links: { repo: 'https://github.com/example/signbridge', demo: 'https://example.com/signbridge', video: 'https://example.com/signbridge-video' },
      cover: banners[0], upvotes: 23, published: -9, completed: -10, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'rohan-v', team: [['ishaan', 'CO_BUILDER']], teamName: 'Mandi Makers', title: 'KrishiLink — mandi price alerts over SMS', tagline: 'Daily crop prices from the nearest mandis, by SMS, in the farmer’s language.', category: 'FINTECH', projectType: 'HACKATHON',
      description: '<p>KrishiLink scrapes public mandi price feeds, finds the best nearby market for each crop and sends a daily SMS in Marathi, Hindi or English. No smartphone needed.</p>',
      problemStatement: 'Farmers sell to the first trader they meet because they can’t compare prices across mandis.', solution: 'A daily SMS digest of the three best nearby mandi prices for the crops a farmer grows.', impact: '1,200 farmers subscribed in two districts during the pilot.',
      technologies: ['Go', 'Node.js', 'SMS gateway', 'PostgreSQL'], skills: ['go', 'node-js', 'cloud'], links: { repo: 'https://github.com/example/krishilink', demo: 'https://example.com/krishilink', video: 'https://example.com/krishilink-video' },
      cover: banners[1], upvotes: 31, published: -40, completed: -41, start: -60, end: -41, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'meera', team: [['sara-codes', 'CONTRIBUTOR'], ['zephyr', 'CO_BUILDER']], teamName: 'Wayfinders', title: 'CampusWay — accessible campus navigation', tagline: 'Step-free routes between every building on campus.', category: 'WEB', projectType: 'COMPETITION',
      description: '<p>CampusWay maps ramps, lifts and step-free paths across campus and gives turn-by-turn routes for wheelchair users, with crowd-sourced updates when a lift is out of order.</p>',
      problemStatement: 'Wheelchair users waste time discovering that a building’s lift or ramp is unavailable.', solution: 'A step-free routing map with live, crowd-sourced accessibility reports.', impact: 'Adopted by the campus disability support office.',
      technologies: ['React', 'Mapbox', 'Figma'], skills: ['react', 'ui-ux', 'figma'], links: { repo: 'https://github.com/example/campusway', demo: 'https://example.com/campusway' },
      cover: banners[2], upvotes: 12, published: -8, completed: -8, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'kabir-builds', team: [['devp', 'CO_BUILDER']], title: 'OpenBudget Explorer — city budget visualiser', tagline: 'See where your city’s money goes, ward by ward.', category: 'WEB', projectType: 'COMPETITION',
      description: '<p>OpenBudget Explorer turns municipal budget PDFs into an interactive ward-level dashboard, so residents can compare what was promised with what was spent.</p>',
      problemStatement: 'City budgets are published as long PDFs that residents can’t realistically read.', solution: 'Parse the published budgets into structured data and visualise spending per ward.',
      technologies: ['Python', 'Pandas', 'D3.js', 'SQL'], skills: ['python', 'sql', 'data'], links: { repo: 'https://github.com/example/openbudget', demo: 'https://example.com/openbudget' },
      cover: banners[3], upvotes: 9, published: -5, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'ishaan', title: 'Clinic Queue — WhatsApp token system for small clinics', tagline: 'Patients get a token on WhatsApp and wait at home, not in the corridor.', category: 'HEALTHTECH', projectType: 'STARTUP',
      description: '<p>Clinic Queue gives small clinics a digital token queue over WhatsApp. Patients see live wait times and get a message when they’re three patients away.</p>',
      problemStatement: 'Neighbourhood clinics have crowded waiting rooms and no appointment system.', solution: 'A WhatsApp-first token queue that clinics can set up in ten minutes.', impact: 'Running in 6 clinics; average waiting-room time down from 55 to 15 minutes.',
      technologies: ['Node.js', 'React', 'WhatsApp Business API'], skills: ['node-js', 'react', 'product'], links: { website: 'https://clinicqueue.example.com' },
      cover: banners[0], upvotes: 14, published: -15, completed: -16, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'sara-codes', title: 'PaperTrail — research paper summariser', tagline: 'Plain-language summaries of dense research papers.', category: 'EDUCATION', projectType: 'RESEARCH',
      description: '<p>PaperTrail extracts the key claims, methods and limitations from a PDF paper and explains them in plain language for first-year students.</p>',
      problemStatement: 'Students skip primary research because papers are hard to read.', solution: 'Structured summaries with claims, methods and limitations, linked back to the source text.',
      technologies: ['Python', 'NLP', 'FastAPI'], skills: ['python', 'machine-learning'], links: { repo: 'https://github.com/example/papertrail' },
      cover: banners[1], published: -4, status: 'PUBLISHED', visibility: 'UNLISTED',
    },
    {
      owner: 'devp', title: 'GreenGrid — hostel energy monitor', tagline: 'Room-level electricity dashboards for college hostels.', category: 'IOT', projectType: 'ACADEMIC',
      description: '<p>Low-cost current sensors on each hostel floor feed a dashboard that shows which rooms and appliances waste the most power.</p>',
      technologies: ['ESP32', 'MQTT', 'Grafana'], skills: ['data'], links: {},
      cover: banners[2], status: 'IN_PROGRESS', visibility: 'PRIVATE',
    },
    {
      owner: 'kabir-builds', title: 'Tamil NLP Toolkit', tagline: 'Tokenisation, stemming and transliteration for Tamil text.', category: 'DEVTOOLS', projectType: 'OPEN_SOURCE',
      description: '<p>An open-source Python library with tokenisation, stemming and transliteration for Tamil, used by two university research groups.</p>',
      problemStatement: 'Most NLP libraries ignore Tamil morphology.', solution: 'Rule-based stemming plus a small transliteration model, packaged as a pip library.',
      technologies: ['Python', 'NLP'], skills: ['python'], links: { repo: 'https://github.com/example/tamil-nlp' },
      cover: banners[3], upvotes: 19, published: -30, completed: -31, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'nova', title: 'StudySync — spaced repetition for engineering exams', tagline: 'Flashcards that know when you’re about to forget.', category: 'EDUCATION', projectType: 'PERSONAL',
      description: '<p>StudySync schedules flashcard reviews with a spaced-repetition algorithm tuned for semester exam timelines.</p>',
      problemStatement: 'Students cram before exams and forget everything within a week.', solution: 'Spaced repetition scheduled backwards from the exam date.',
      technologies: ['Python', 'Django'], skills: ['python', 'django'], links: { repo: 'https://github.com/example/studysync' },
      cover: banners[0], published: -14, status: 'PUBLISHED', visibility: 'PUBLIC',
    },
    {
      owner: 'sample-builder', title: 'Campus Carpool Analytics', tagline: 'Which routes would benefit most from shared rides?', category: 'AI_ML', projectType: 'PERSONAL',
      description: '<p>Early exploration of commute survey data to find the routes where carpooling saves the most.</p>',
      technologies: ['Python', 'Pandas'], skills: ['python', 'data'], links: {},
      status: 'DRAFT', visibility: 'PRIVATE',
    },
    {
      owner: 'aanya', title: 'Hackathon Judge Helper', tagline: null, category: 'DEVTOOLS', projectType: 'OTHER',
      description: null, technologies: [], skills: [], links: {},
      status: 'DRAFT', visibility: 'PRIVATE',
    },
  ];

  const P = {};
  for (const d of projectDefs) {
    const owner = people[d.owner];
    const base = {
      title: d.title,
      tagline: d.tagline,
      description: d.description,
      problemStatement: d.problemStatement ?? null,
      solution: d.solution ?? null,
      impact: d.impact ?? null,
      category: d.category,
      projectType: d.projectType,
      technologies: d.technologies,
      tags: tagsFromTechnologies(d.technologies),
      skills: d.skills.map(skillRef),
      coverImageId: d.cover ?? null,
      media: [],
      links: { repo: null, demo: null, video: null, website: null, ...d.links },
      teamName: d.teamName ?? null,
      startDate: d.start ? days(d.start) : null,
      endDate: d.end ? days(d.end) : null,
      authorUserId: owner.user._id,
      authorProfileId: owner.profile._id,
      status: d.status,
      visibility: d.visibility,
      publishedAt: d.published ? days(d.published) : null,
      completedAt: d.completed ? days(d.completed) : null,
      upvoteCount: d.upvotes ?? 0,
      featured: !!d.featured,
    };
    const doc = await db.Project.create({ ...base, slug: slugify(d.title), ...projectSearchFields(base, { username: owner.profile.username, name: owner.user.name }) });
    await db.ProjectMember.create({ projectId: doc._id, userId: owner.user._id, role: 'OWNER', status: 'ACTIVE', canEdit: true, joinedAt: doc.createdAt });
    for (const [who, role] of d.team ?? []) {
      await db.ProjectMember.create({
        projectId: doc._id,
        userId: people[who].user._id,
        role,
        status: 'ACTIVE',
        canEdit: role === 'CO_BUILDER',
        invitedBy: owner.user._id,
        joinedAt: days((d.published ?? -2) - 1),
      });
    }
    P[d.title.split(' — ')[0]] = doc.toObject();
  }
  // A pending invitation so the invite → accept flow has data.
  await db.ProjectMember.create({ projectId: P.OpenBudget._id ?? P['OpenBudget Explorer']._id, userId: builder._id, role: 'CONTRIBUTOR', status: 'INVITED', canEdit: false, invitedBy: people['kabir-builds'].user._id });

  // Community upvote rows (the denormalised counts above include anonymous votes too).
  await db.ProjectUpvote.create([
    { projectId: P.PitchLoop._id, userId: builder2._id },
    { projectId: P.CommuteMesh._id, userId: builder2._id },
    { projectId: P.LeafSense._id, userId: builder._id },
    { projectId: P.SignBridge._id, userId: builder._id },
  ]);

  // ---- submissions + evaluations ---------------------------------------------------------------
  const makeSubmission = async ({ project, opp, by, history, note = null, reviewerNote = null }) => {
    const statusHistory = history.map(([status, d, n = null]) => ({
      status,
      at: days(d),
      byUserId: ['DRAFT', 'SUBMITTED', 'WITHDRAWN'].includes(status) ? by._id : admin._id,
      note: n,
    }));
    const final = history[history.length - 1][0];
    const submitted = history.find(([s]) => s === 'SUBMITTED');
    const doc = await db.ProjectSubmission.create({
      projectId: project._id,
      opportunityId: opp._id,
      submittedBy: by._id,
      status: final,
      note,
      reviewerNote,
      statusHistory,
      projectSnapshot: submitted ? await buildSnapshot(db, project) : null,
      submittedAt: submitted ? days(submitted[1]) : null,
    });
    return doc.toObject();
  };

  const makeEvaluation = async ({ submission, template, evaluator, status, scores = [], feedback = [], overallFeedback = null, scoreVisibility = 'BUILDER_VISIBLE', overallFeedbackVisibility = 'BUILDER_VISIBLE', feedbackVisibility = 'BUILDER_VISIBLE', internalNotes = null, showIdentity = false, assigned = -6, completed = null }) => {
    const rows = template.criteria.map((c, i) => ({
      criterionId: c._id,
      name: c.name,
      description: c.description,
      maxScore: c.maxScore,
      weight: c.weight,
      required: c.required,
      order: c.order,
      score: scores[i] ?? null,
      feedback: feedback[i] ?? null,
      feedbackVisibility,
    }));
    const computed = computeScores(rows);
    return db.Evaluation.create({
      submissionId: submission._id,
      projectId: submission.projectId,
      opportunityId: submission.opportunityId,
      evaluatorId: evaluator._id,
      templateId: template._id,
      templateName: template.name,
      status,
      scores: computed.scores,
      overallScore: status === 'ASSIGNED' ? null : computed.overallScore,
      overallFeedback,
      overallFeedbackVisibility,
      scoreVisibility,
      internalNotes,
      showEvaluatorIdentity: showIdentity,
      assignedBy: admin._id,
      assignedAt: days(assigned),
      startedAt: status === 'ASSIGNED' ? null : days(assigned + 1),
      completedAt: completed ? days(completed) : null,
    });
  };

  const sSignBridge = await makeSubmission({ project: P.SignBridge, opp: loop, by: people.aanya.user, history: [['SUBMITTED', -8], ['UNDER_REVIEW', -6]], note: 'Live demo works in Chrome; please allow camera access.' });
  const sKrishi = await makeSubmission({ project: P.KrishiLink, opp: spring, by: people['rohan-v'].user, history: [['SUBMITTED', -40], ['UNDER_REVIEW', -38], ['SHORTLISTED', -35, 'Strong field validation.'], ['SELECTED', -32, 'Overall winner — congratulations!']], reviewerNote: 'Overall winner — congratulations!' });
  const sCampusWay = await makeSubmission({ project: P.CampusWay, opp: design, by: people.meera.user, history: [['SUBMITTED', -7], ['UNDER_REVIEW', -5], ['SHORTLISTED', -3, 'Excellent accessibility research.']], reviewerNote: 'Excellent accessibility research.' });
  await makeSubmission({ project: P.OpenBudget, opp: openData, by: people['kabir-builds'].user, history: [['SUBMITTED', -2]], note: 'Data sources are listed in the README.' });
  const sStudySync = await makeSubmission({ project: P.StudySync, opp: fellowship, by: builder2, history: [['SUBMITTED', -12], ['UNDER_REVIEW', -10], ['REJECTED', -8, 'Promising, but the fellowship needs a clearer path to users. Please apply again next cycle.']], reviewerNote: 'Promising, but the fellowship needs a clearer path to users. Please apply again next cycle.' });
  const sPitch = await makeSubmission({ project: P.PitchLoop, opp: loop, by: builder, history: [['SUBMITTED', -4], ['UNDER_REVIEW', -3]] });
  await makeSubmission({ project: P.DocDraft, opp: openData, by: builder, history: [['DRAFT', -1]], note: 'Draft — adding the civic dataset integration first.' });

  const evaluator1 = evaluators()[0];
  const evaluator2 = evaluators()[1];
  function evaluators() {
    return [evaluatorsRef.e1, evaluatorsRef.e2];
  }

  await makeEvaluation({ submission: sSignBridge, template: tplHack, evaluator: evaluator1, status: 'COMPLETED', scores: [9, 8, 8, 9, 7], feedback: ['Clear, well-researched problem.', 'Novel use of in-browser inference.', 'Solid demo; latency spikes on low-end laptops.', 'Real pilot with measurable outcomes.', 'Good demo video; README could be tighter.'], overallFeedback: 'An impressive, genuinely useful build. Focus next on performance for low-end devices.', showIdentity: true, assigned: -6, completed: -4 });
  await makeEvaluation({ submission: sSignBridge, template: tplHack, evaluator: evaluator2, status: 'IN_PROGRESS', scores: [8, 9, null, null, null], feedback: ['Well framed.', 'Creative.'], assigned: -6 });
  await makeEvaluation({ submission: sKrishi, template: tplHack, evaluator: evaluator1, status: 'COMPLETED', scores: [10, 8, 9, 10, 8], feedback: ['Grounded in real farmer interviews.', 'Simple idea executed very well.', 'Reliable scraping pipeline with retries.', 'Clear, measurable impact.', 'Crisp pitch.'], overallFeedback: 'The strongest submission of the sprint — simple, reliable and clearly useful.', scoreVisibility: 'PUBLIC', overallFeedbackVisibility: 'PUBLIC', feedbackVisibility: 'PUBLIC', assigned: -38, completed: -36 });
  await makeEvaluation({ submission: sKrishi, template: tplHack, evaluator: evaluator2, status: 'COMPLETED', scores: [9, 8, 9, 9, 9], overallFeedback: 'Excellent execution and presentation.', scoreVisibility: 'PUBLIC', overallFeedbackVisibility: 'PUBLIC', assigned: -38, completed: -35 });
  await makeEvaluation({ submission: sCampusWay, template: tplDesign, evaluator: evaluator2, status: 'COMPLETED', scores: [9, 8, 7, 10], feedback: ['Interviews with 12 wheelchair users — outstanding.', 'Routing flow is clear.', 'Visuals need a consistent type scale.', 'Best accessibility work in the challenge.'], overallFeedback: 'Shortlisted. Tighten the visual system for the final round.', internalNotes: 'Consider for the accessibility special mention.', assigned: -5, completed: -3 });
  await makeEvaluation({ submission: sCampusWay, template: tplDesign, evaluator: evaluator1, status: 'IN_PROGRESS', scores: [8, null, null, null], assigned: -4 });
  await makeEvaluation({ submission: sStudySync, template: tplHack, evaluator: evaluator1, status: 'COMPLETED', scores: [6, 5, 7, 5, 6], overallFeedback: 'Internal fellowship review.', scoreVisibility: 'INTERNAL', overallFeedbackVisibility: 'INTERNAL', feedbackVisibility: 'INTERNAL', internalNotes: 'Not enough user evidence for the fellowship stage.', assigned: -10, completed: -9 });
  await makeEvaluation({ submission: sPitch, template: tplHack, evaluator: evaluator1, status: 'ASSIGNED', assigned: -3 });

  // Project stages mirror what the review flow would have produced.
  for (const [p, status] of [[P.SignBridge, 'EVALUATED'], [P.KrishiLink, 'EVALUATED'], [P.CampusWay, 'EVALUATED'], [P.StudySync, 'EVALUATED'], [P.OpenBudget, 'SUBMITTED'], [P.PitchLoop, 'UNDER_REVIEW']]) {
    await db.Project.updateOne({ _id: p._id }, { $set: { status } });
  }

  // ---- achievements --------------------------------------------------------------------------------
  const team = async (project) =>
    (await db.ProjectMember.find({ projectId: project._id, status: 'ACTIVE', role: { $ne: 'MENTOR' } }).lean()).map((m) => m.userId);
  const award = async (project, submission, opp, type, title, description, date, key) => {
    for (const userId of await team(project)) {
      await issueSystemAchievement(db, { userId, projectId: project._id, opportunityId: opp._id, submissionId: submission._id, type, title, description, issuer: opp.organizationName, date: days(date), sourceKey: `${key}:${submission._id}` });
    }
  };
  await award(P.SignBridge, sSignBridge, loop, 'HACKATHON_PARTICIPATION', `Participated in ${loop.title}`, `Entered a project into ${loop.title}.`, -8, 'PARTICIPATION');
  await award(P.KrishiLink, sKrishi, spring, 'HACKATHON_PARTICIPATION', `Participated in ${spring.title}`, `Entered a project into ${spring.title}.`, -40, 'PARTICIPATION');
  await award(P.KrishiLink, sKrishi, spring, 'SHORTLISTED', `Shortlisted — ${spring.title}`, `Shortlisted by ${spring.organizationName}.`, -35, 'SHORTLISTED');
  await award(P.KrishiLink, sKrishi, spring, 'WINNER', `Winner — ${spring.title}`, `Selected by ${spring.organizationName}.`, -32, 'SELECTED');
  await award(P.CampusWay, sCampusWay, design, 'COMPETITION', `Competed in ${design.title}`, `Entered a project into ${design.title}.`, -7, 'PARTICIPATION');
  await award(P.CampusWay, sCampusWay, design, 'SHORTLISTED', `Shortlisted — ${design.title}`, `Shortlisted by ${design.organizationName}.`, -3, 'SHORTLISTED');
  await award(P.PitchLoop, sPitch, loop, 'HACKATHON_PARTICIPATION', `Participated in ${loop.title}`, `Entered a project into ${loop.title}.`, -4, 'PARTICIPATION');
  for (const p of Object.values(P)) await issueProjectCompleted(db, p);

  // Builder-added achievements: always UNVERIFIED unless an admin verifies them.
  await db.Achievement.create([
    { userId: people.aanya.user._id, title: 'Finalist — CodeSprint Chennai 2025 (sample)', description: 'Top 10 of 180 teams at a city-wide student hackathon.', type: 'FINALIST', issuer: 'CodeSprint Chennai (sample)', date: days(-200), source: 'USER', verificationStatus: 'UNVERIFIED', visibility: 'PUBLIC', metadata: { url: 'https://example.com/codesprint-finalists' } },
    { userId: people['kabir-builds'].user._id, projectId: P['Tamil NLP Toolkit']._id, title: '100 merged pull requests to open-source NLP projects', description: 'Maintainer of the Tamil NLP Toolkit.', type: 'OPEN_SOURCE', issuer: 'GitHub', date: days(-60), source: 'USER', verificationStatus: 'VERIFIED', verifiedBy: admin._id, verifiedAt: days(-50), visibility: 'PUBLIC', metadata: { url: 'https://github.com/example/tamil-nlp' } },
    { userId: people['sara-codes'].user._id, title: 'Cloud Practitioner Certificate (sample)', description: 'Foundational cloud certification.', type: 'CERTIFICATE', issuer: 'Sample Cloud Academy', date: days(-90), source: 'USER', verificationStatus: 'UNVERIFIED', visibility: 'PUBLIC' },
  ]);

  // ---- moderation + featured projects ------------------------------------------------------------------
  await db.ProjectReport.create({ projectId: P['Clinic Queue']._id, reporterUserId: builder3._id, reason: 'MISLEADING', details: 'The impact numbers are not backed by any source.' });
  await db.Project.updateOne({ _id: P['Clinic Queue']._id }, { $set: { reportCount: 1 } });

  await db.BuilderProfile.updateOne({ _id: builderProfile._id }, { $set: { featuredProjectIds: [P.PitchLoop._id, P.DocDraft._id] } });
  await db.BuilderProfile.updateOne({ _id: people.aanya.profile._id }, { $set: { featuredProjectIds: [P.SignBridge._id] } });
  await db.BuilderProfile.updateOne({ _id: people['rohan-v'].profile._id }, { $set: { featuredProjectIds: [P.KrishiLink._id] } });

  return { projects: P, evaluators: [evaluator1, evaluator2], templates: [tplHack, tplDesign, tplData] };

  // (hoisted helper for readable evaluator references above)
  // eslint-disable-next-line no-unreachable
}
const evaluatorsRef = {};
