// Content imported from the live studlyf.in site (Sept 2026), re-authored into
// our design system. Images live in /public/imported (referenced as /imported/…).

const img = (f) => `/imported/${f}`

export const brand = {
  tagline: 'Empowering the next generation of engineers with AI-driven career tools and resources.',
  email: 'support@studlyf.com',
  instagram: 'https://www.instagram.com/studlyf.in/',
  whatsapp: 'https://whatsapp.com/channel/0029VbCHsjAHVvTRqLfOau24/113',
  copyright: '© 2026 STUDLYF · All rights reserved',
}

export const heroContent = {
  eyebrow: 'One ecosystem · one account',
  headlineTop: 'One ecosystem.',
  headlinePrefix: 'Built for',
  // Rotating audience word, coloured with each ecosystem's accent.
  audiences: [
    { word: 'builders', color: 'text-acid' },
    { word: 'founders', color: 'text-violet' },
    { word: 'investors', color: 'text-flare' },
    { word: 'recruiters', color: 'text-lime-300' },
    { word: 'organizers', color: 'text-amber-300' },
  ],
  subheadline:
    'Builders prove their skills with real work. Founders shape startups investors can evaluate. Hiring teams and organizations find talent and run programs — all on one connected platform.',
  primaryCta: { label: 'Choose your path', url: '/#ecosystems' },
  secondaryCta: { label: 'Join STUDLYF', url: '/signup' },
}

// "Complete Placement Ecosystem" — the four pillars.
export const pillars = [
  { no: '01', title: 'Learning Paths', desc: 'Role-based tracks that take you from fundamentals to job-ready, one project at a time.' },
  { no: '02', title: 'Mock Interviews', desc: 'Realistic technical and HR rounds with instant AI feedback that scores and coaches you.' },
  { no: '03', title: 'Career Dreamer', desc: 'Turn your goal into a concrete plan — the skills, projects and milestones to get there.' },
  { no: '04', title: 'Placement Ecosystem', desc: 'Live opportunities, mentors and hiring partners, connected from first commit to final offer.' },
]

export const ecosystemImage = img('placement-ecosystem.png')

// Leaders carousel — short, attributed quotes.
export const leaders = [
  { name: 'Steve Jobs', title: 'Co-founder, Apple Inc.', photo: img('steve-jobs-92a047e4-7791-45f6-a8b9-d4d24a376dd2.jpg'), objectPosition: '50% 14%', quote: 'The only way to do great work is to love what you do. Don’t settle. Keep looking.' },
  { name: 'Elon Musk', title: 'CEO, Tesla & SpaceX', photo: img('elon-musk.jpg'), quote: 'Persistence is very important. You should not give up unless you are forced to give up.' },
  { name: 'Bill Gates', title: 'Co-founder, Microsoft', photo: img('bill-gates.jpg'), quote: 'Your most unhappy customers are your greatest source of learning.' },
  { name: 'Warren Buffett', title: 'CEO, Berkshire Hathaway', photo: img('warren-buffett.jpg'), quote: 'The most important investment you can make is in yourself.' },
  { name: 'Sundar Pichai', title: 'CEO, Google & Alphabet', photo: img('sundar-pichai.jpg'), objectPosition: '50% 42%', quote: 'Wear your failure as a badge of honor. It’s the only way to truly innovate and grow.' },
  { name: 'Satya Nadella', title: 'CEO, Microsoft', photo: img('Satya-Nadella-GettyImages-2256635134.jpg'), quote: 'You’ve got to be a lifelong learner. Curiosity is your greatest asset in this era.' },
  { name: 'Mark Zuckerberg', title: 'Founder & CEO, Meta', photo: img('Current-Mark-Zuckerberg-Net-Worth-2024.jpg'), quote: 'The biggest risk is not taking any risk. Move fast and find what works.' },
  { name: 'Jeff Bezos', title: 'Founder, Amazon', photo: img('jeff-bezos-1-921922c6cdc6442397a7f0dcd8bd0370.jpg'), quote: 'I knew that if I failed I wouldn’t regret it, but I might regret not trying.' },
  { name: 'Jensen Huang', title: 'Founder & CEO, NVIDIA', photo: img('jensen-huang.jpg'), quote: 'Software is eating the world, but AI is going to eat software. Never stop being a student.' },
  { name: 'Tim Cook', title: 'CEO, Apple Inc.', photo: img('1683250404-5715.jpg'), quote: 'The sidelines are not where you want to live your life. The world needs you in the arena.' },
  { name: 'Indra Nooyi', title: 'Former CEO, PepsiCo', photo: img('indra-nooyi.jpg'), quote: 'An important attribute of success is to be yourself. Never hide what makes you unique.' },
  { name: 'Reid Hoffman', title: 'Co-founder, LinkedIn', photo: img('40-facts-about-reid-hoffman-1728495269.jpg'), quote: 'No matter how brilliant your mind, if you’re playing a solo game, you’ll lose to a team.' },
]

// "The Era of Human Authority" — old vs new.
export const humanAuthority = {
  subtitle: 'Move from passive watching to hands-on building — because readiness comes from doing.',
  oldWay: ['Syntax memorization', 'Passive watching', 'Theory over practice', 'One-size-fits-all', 'No real feedback'],
  newWay: ['Practical problem solving', 'Active hands-on building', 'Career-focused paths', 'Personalized skill mapping', 'AI-guided feedback'],
}

// "Our mentors are from 50+ MNCs" — logo wall.
export const mnc = [
  'google', 'apple', 'microsoft', 'amazon', 'meta', 'netflix', 'nvidia', 'oracle',
  'adobe', 'salesforce', 'intel', 'ibm', 'uber', 'airbnb', 'stripe', 'paypal',
  'flipkart', 'tcs', 'infosys', 'wipro', 'accenture', 'jpmorgan', 'goldman-sachs',
  'linkedin', 'tesla', 'optum', 'bajaj', 'lic', 'aol', 'angel_20one',
].map((f) => ({ name: f, logo: img(`${f}.webp`) }))

// "Who we serve"
export const whoWeServe = [
  {
    audience: 'For Students',
    points: [
      'Learn by shipping real-world projects',
      'Role-based roadmaps with mentor guidance',
      'AI mock interviews with instant feedback',
      'Live, project-based practice modules',
      'A placement-driven path from day one',
    ],
  },
  {
    audience: 'For Companies',
    points: [
      'Hire proven, job-ready engineering talent',
      'Upskill teams with hands-on tech training',
      'AI-assisted assessment and screening',
      'Industry-aligned curriculum integration',
      'Tap a pipeline of vetted builders',
    ],
  },
]

// "Master Your Path"
export const journey = {
  subtitle: 'Five stages from beginner to leader.',
  steps: [
    { key: 'Discover', desc: 'Find your path.' },
    { key: 'Learn', desc: 'Master the fundamentals.' },
    { key: 'Practice', desc: 'Build real projects.' },
    { key: 'Launch', desc: 'Land the offer.' },
    { key: 'Excel', desc: 'Lead and mentor.' },
  ],
}

// Stats + institutions
export const platformStats = [
  { label: 'Students reached', value: 12000, suffix: '+' },
  { label: 'Campus partners', value: 60, suffix: '+' },
  { label: 'Media reach', value: 1, suffix: 'M+' },
  { label: 'Hiring partners', value: 120, suffix: '+' },
]

export const institutions = ['iitm', 'iit-bombay', 'iit-delhi', 'iit_20k', 'iit_20h', 'iim_20b', 'iim_20k', 'isb', 'bits', 'stanford', 'wharton', 'srm', 'cbit', 'griet', 'vjim', 'mru', 'anuraguni', 'woxen']
  .map((f) => ({ name: f, logo: img(`${f}.webp`) }))

// Testimonials (learner voices)
export const testimonials = [
  { quote: 'I went from copying tutorials to shipping my own projects. That shift is what got me the interview.', tag: 'UI / UX Design' },
  { quote: 'The mock interviews were brutal in the best way. By the real one, nothing caught me off guard.', tag: 'Java Full Stack' },
  { quote: 'Every module ended with something I actually built. My portfolio grew without me even noticing.', tag: 'Data Analytics' },
  { quote: 'Having a roadmap meant I never wondered what to learn next — I just followed it and kept moving.', tag: 'Cloud Computing' },
  { quote: 'The feedback was specific, not generic praise. It told me exactly what to fix before the next round.', tag: 'AI / ML' },
  { quote: 'The mentors answer like people who have actually done the job — because they have.', tag: 'Web Development' },
  { quote: 'I joined for the courses and stayed for the community. The hackathons opened doors I never expected.', tag: 'ServiceNow' },
  { quote: 'Six months in, walking into a coding round feels like a completely different experience.', tag: 'Full Stack Development' },
  { quote: 'The hands-on labs made hard topics click. I finally understand the why, not just the how.', tag: 'Cyber Security' },
]

// Insights / blog
export const insights = {
  intro: 'Playbooks, guides and research to help you build the right skills and land the right role.',
  posts: [
    { tag: 'Careers', title: 'The 2026 placement playbook', excerpt: 'What top recruiters now screen for — and how to build a profile that clears the bar.', image: img('insight-careers.jpg') },
    { tag: 'Skills', title: 'Projects that beat a perfect GPA', excerpt: 'Why a shipped portfolio out-signals grades, and the four projects worth building first.', image: img('insight-projects.jpg') },
    { tag: 'Interviews', title: 'Cracking the technical round', excerpt: 'A repeatable framework for DSA, system design and behavioral rounds — with AI practice built in.', image: img('insight-interviews.jpg') },
    { tag: 'AI', title: 'Build with AI, not around it', excerpt: 'How to use AI tools to move faster without skipping the fundamentals that get you hired.', image: img('insight-ai.jpg') },
    { tag: 'Community', title: 'Why your network is your net worth', excerpt: 'How campus communities, hackathons and mentors compound into real opportunities.', image: img('insight-community.jpg') },
    { tag: 'Report', title: 'The state of student hiring', excerpt: 'A snapshot of demand, the skills in shortest supply and where the offers are coming from.', image: img('insight-report.jpg') },
  ],
}

// FAQ — re-authored in original phrasing.
export const faqs = [
  {
    q: 'What exactly is STUDLYF?',
    a: 'STUDLYF is one ecosystem with four connected experiences: builders (students) prove their skills through projects and opportunities, founders structure their startups, verified investors discover founders, and HR teams and organizations hire talent and run hackathons and programs.',
  },
  {
    q: 'Do I need a separate account for each ecosystem?',
    a: 'No. One STUDLYF account can be a builder and a founder, or a founder and an investor, and so on. You add ecosystems as you need them and switch between them from the top bar.',
  },
  {
    q: 'Why do investors, HR teams and organizations need verification?',
    a: 'Because they see other people’s work and data. Every investor, hiring team and organization is reviewed by the STUDLYF team before they get access — so builders and founders always know who is on the other side.',
  },
  {
    q: 'Who can post opportunities and run hackathons?',
    a: 'Verified organizations — companies, colleges, communities, incubators and event organizers. They create programs, review participants, collect project submissions, evaluate them and issue certificates from their own dashboard.',
  },
  {
    q: 'I’m a student. What do I get?',
    a: 'A builder profile backed by your work: hackathons, internships and challenges to apply to, projects you build with your team, evaluations with real feedback, achievements, and visibility to verified hiring teams — plus learning tools like courses, mock interviews and a resume builder.',
  },
  {
    q: 'How much does it cost to start?',
    a: 'Creating an account, a builder profile or a founder profile is free. Investor, HR and organization access is free to request and is granted after verification.',
  },
]

export const founder = {
  name: 'Eshwar',
  role: 'Founder',
  photo: img('Eshwar.jpg'),
  coFounder: { name: 'Vishnu', role: 'Co-founder', photo: img('vishnu.jpg') },
}

// ─────────────────────────────────────────────────────────────────────────
// Logged-in portal ("YOUR GROWTH STARTS HERE") — sections mirrored from the
// original studlyf.in member portal, re-authored into our dark system.
// A brand with no logo mark in /imported renders as a typeset name badge.
// ─────────────────────────────────────────────────────────────────────────

// Portal greeting hero.
export const portalHero = {
  eyebrow: 'Your growth starts here',
  headline: 'Building the student ecosystem for ambitious students.',
  subtitle: 'Everything you need to learn, build, connect and grow — all in one place.',
}

// "BUILT BY PEOPLE FROM" + "COLLABORATED WITH" credibility strip.
export const portalCredibility = {
  builtBy: [
    { label: 'Startup World Cup', logo: img('startup-world-cup.png') },
    { label: 'Techstars', logo: img('techstars.jpg') },
  ],
  collaborators: [
    { label: 'Google for Startups', logo: img('google.webp') },
    { label: 'Microsoft for Startups', logo: img('microsoft.webp') },
    { label: 'NVIDIA Inception', logo: img('nvidia.webp') },
    { label: 'Zoho Startups', logo: img('zoho.png') },
  ],
}

// "CURRICULUM BUILT BY PEOPLE FROM" — logo wall.
export const curriculumFrom = [
  { label: 'Meta', logo: img('meta.webp') },
  { label: 'Netflix', logo: img('netflix.webp') },
  { label: 'Apple', logo: img('apple.webp') },
  { label: 'NVIDIA', logo: img('nvidia.webp') },
  { label: 'Virtusa', logo: img('virtusa.png') },
  { label: 'Deloitte', logo: img('deloitte.png') },
  { label: 'TCS', logo: img('tcs.webp') },
]

// "What STUDLYF provides you" — 4-step journey with dashed connector.
export const providesIntro =
  'STUDLYF brings every essential tool, roadmap and opportunity into one premium ecosystem — so your whole career journey lives in a single place.'
export const providesSteps = [
  { title: 'Create your free account', desc: 'Join the fastest-growing ecosystem for ambitious students in seconds — completely free.' },
  { title: 'Discover your roadmap', desc: 'Follow highly structured, step-by-step career paths designed to take you from beginner to pro.' },
  { title: 'Unlock the StudHub', desc: 'Access verified scholarships, premium software discounts and exclusive student leverage.' },
  { title: 'Execute and grow', desc: 'Build your portfolio, learn new skills and connect with a driven community.' },
]

// "EXPLORE STUDLYF ECOSYSTEM" — product cards.
export const exploreEcosystem = [
  {
    eyebrow: 'Career',
    title: 'Opportunities',
    desc: 'Hackathons, internships and programs — open for applications and matched to your skills.',
    to: '/opportunities',
    cta: 'Explore opportunities',
    tags: ['Hackathons', 'Internships', 'Programs'],
  },
  {
    eyebrow: 'AI Productivity',
    title: 'AI Tools Ecosystem',
    desc: 'A curated discovery hub of the AI tools that move your work forward — the AI Discovery Hub.',
    soon: true,
    cta: 'AI Discovery Hub',
    tags: ['ChatGPT', 'Midjourney', 'GitHub Copilot'],
  },
]

// "GET HIRED! IN STARTUP'S" — MNC vs Startups.
export const getHired = {
  tags: ['Tech', 'Business', 'Creative'],
  columns: [
    { label: 'MNC', points: ['Structured growth', 'Global exposure', 'Tiered authority'] },
    { label: 'Startups', points: ['Rapid execution', 'Dynamic roles', 'High ownership'], highlight: true },
  ],
}

// "OUR INDUSTRY PARTNERS" + "WHY US?" stats.
export const industryPartners = ['S-Hatch', 'Risk Guard', 'GWD', 'Centle', 'Hackprix', 'StudOTT'].map((label) => ({ label }))
export const whyUsStats = [
  { value: '1 Lakh+', label: 'Media reach' },
  { value: '40+', label: 'Sessions' },
  { value: '3+', label: 'Startups supported' },
  { value: '15+', label: 'Hiring partners' },
]

// "COMMUNITY SPOTLIGHT" — feature card + scrollable list.
export const communitySpotlight = {
  feature: {
    tag: 'Campus Innovation',
    title: 'Inside the STUDLYF community',
    desc: 'Building the future of student innovation across campuses — workshops, hackathons and exclusive events.',
    stats: [{ value: '25+', label: 'Institutions' }, { value: '5+', label: 'Hackathons' }],
    cta: 'Join us',
  },
  items: [
    { tag: 'Campus Workshop', title: "Hyderabad's first Claude community campus session" },
    { tag: 'Community Partner', title: 'STUDLYF × Hackprix community partnership' },
    { tag: '25+ Institutions', title: 'Building the future of student innovation' },
    { tag: 'Campus Innovation', title: 'Inside the STUDLYF community' },
  ],
}

// "INSTITUTIONAL OUTREACH / CEO CAMPUS VISITS"
export const institutionalOutreach = [
  { org: 'MVSR Engineering College', kind: 'CEO Campus Visit' },
  { org: 'Matrusri Engineering College', kind: 'Leadership Session' },
  { org: 'CBIT', kind: 'CEO Campus Visit' },
  { org: 'GRIET', kind: 'Leadership Session' },
]

// "Streamline Your Career in AI Era" — career synergy CTA + marquee.
export const careerSynergy = {
  eyebrow: 'Career Synergy',
  title: 'Streamline your career in the AI era',
  desc: 'Map your ambition to a concrete plan — skills, projects and milestones — with STUDLYF as your co-pilot.',
  cta: 'I am a career dreamer',
}

// "COURSES FOR EVERY ambition" — protocols for mastery, launching soon.
export const coursesComingSoon = [
  { track: 'Full-Stack Engineering' },
  { track: 'AI / ML Foundations' },
  { track: 'Product & Design' },
  { track: 'Data Analytics' },
  { track: 'Cloud & DevOps' },
]
