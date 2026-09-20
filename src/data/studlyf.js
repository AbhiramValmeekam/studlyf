// Real content scraped from https://studlyf.in/ via Playwright.
// Taglines and image paths pulled from the live site (see scrape-report-full.json).
const IMG = '/scraped'

export const meta = {
  title: 'The Standard | Engineering Readiness',
  brand: 'STUDLYF',
  logo: `${IMG}/logo.webp`,
  copyright: '© 2026 STUDLYF • ALL RIGHTS RESERVED',
}

export const hero = {
  eyebrow: 'SAY HELLO TO LATEST LEARNING',
  lead: 'Learn',
  // Second line is a static "by" + a rotating word, exactly like studlyf.in.
  // "by" stays put while only the last word swaps.
  by: 'by',
  rotating: ['doing', 'building', 'coding', 'solving', 'creating'],
  sub: 'Master placement preparation through structured learning modules tailored for top companies like Google, Amazon, and Microsoft.',
  nav: ['For Students', 'Post An Oppurtunity'],
}

// "Studlyf Experience" pillars from the hero rail
export const experience = [
  { n: '01', label: 'Learning Paths' },
  { n: '02', label: 'Mock Interview' },
  { n: '03', label: 'Career Dreamer' },
  { n: '04', label: 'Placement Ecosystem' },
]

// Entrepreneur quote cards — "Company-Specific Learning Paths"
export const founders = [
  { name: 'Steve Jobs', role: 'Co-founder, Apple Inc.', img: `${IMG}/s04_steve-jobs-92a047e4-7791-45f6-a8b9-d4d24a376dd2.jpg`, quote: 'The only way to do great work is to love what you do. Don’t settle. Keep looking.' },
  { name: 'Elon Musk', role: 'CEO, Tesla & SpaceX', img: `${IMG}/s05_elon-musk.jpg`, quote: 'Persistence is very important. You should not give up unless you are forced to give up.' },
  { name: 'Bill Gates', role: 'Co-founder, Microsoft', img: `${IMG}/s06_bill-gates.jpg`, quote: 'Your most unhappy customers are your greatest source of learning. Success is a lousy teacher.' },
  { name: 'Warren Buffett', role: 'CEO, Berkshire Hathaway', img: `${IMG}/s07_warren-buffett.jpg`, quote: 'The most important investment you can make is in yourself. Knowledge builds up like interest.' },
  { name: 'Sundar Pichai', role: 'CEO, Google & Alphabet', img: `${IMG}/s08_Sundarpichai.jpg`, quote: 'Wear your failure as a badge of honor. It’s the only way to truly innovate and grow.' },
  { name: 'Satya Nadella', role: 'CEO, Microsoft', img: `${IMG}/s09_Satya-Nadella-GettyImages-2256635134.jpg`, quote: 'You’ve got to be a lifelong learner. Curiosity is your greatest asset in this era.' },
  { name: 'Mark Zuckerberg', role: 'Founder & CEO, Meta', img: `${IMG}/s10_Current-Mark-Zuckerberg-Net-Worth-2024.jpg`, quote: 'The biggest risk is not taking any risk. Move fast and break things to find what works.' },
  { name: 'Jeff Bezos', role: 'Founder, Amazon', img: `${IMG}/s11_jeff-bezos-1-921922c6cdc6442397a7f0dcd8bd0370.jpg`, quote: 'I knew that if I failed I wouldn’t regret that, but I knew I might regret not trying.' },
  { name: 'Jensen Huang', role: 'Founder & CEO, NVIDIA', img: `${IMG}/s12_jensen-huang.jpg`, quote: 'Software is eating the world, but AI is going to eat software. Never stop being a student.' },
  { name: 'Tim Cook', role: 'CEO, Apple Inc.', img: `${IMG}/s13_1683250404-5715.jpg`, quote: 'The sidelines are not where you want to live your life. The world needs you in the arena.' },
  { name: 'Reid Hoffman', role: 'Co-founder, LinkedIn', img: `${IMG}/s14_40-facts-about-reid-hoffman-1728495269.jpg`, quote: 'No matter how brilliant your mind, if you’re playing a solo game, you’ll lose to a team.' },
]

// "THE ERA OF HUMAN AUTHORITY" — Old Way vs New Way
export const eraShift = {
  title: 'THE ERA OF HUMAN AUTHORITY',
  sub: 'From outdated methods to intelligent, outcome-driven learning.',
  oldWay: ['Syntax Memorization', 'Passive Watching', 'Theory Over Practice', 'One-size-fits-all', 'No Real Feedback'],
  newWay: ['Practical Problem Solving', 'Active Hands-on Learning', 'Career-Focused Paths', 'Personalized Skill Mapping', 'AI-Guided Feedback'],
}

// Mentor logos — "OUR MENTORS ARE FROM 50+ MNCS"
export const mentors = {
  title: 'OUR MENTORS ARE FROM 50+ MNCS',
  sub: 'Guided by professionals shaping the world’s leading organizations.',
  logos: [
    { name: 'Google', img: `${IMG}/s15_google.webp` },
    { name: 'Uber', img: `${IMG}/s16_uber.webp` },
    { name: 'Adobe', img: `${IMG}/s17_adobe.webp` },
    { name: 'Airbnb', img: `${IMG}/s18_airbnb.webp` },
    { name: 'Intel', img: `${IMG}/s19_intel.webp` },
    { name: 'Microsoft', img: `${IMG}/s20_microsoft.webp` },
    { name: 'IBM', img: `${IMG}/s21_ibm.webp` },
    { name: 'Oracle', img: `${IMG}/s22_oracle.webp` },
    { name: 'Amazon', img: `${IMG}/s23_amazon.webp` },
    { name: 'Apple', img: `${IMG}/s24_apple.webp` },
    { name: 'Infosys', img: `${IMG}/s25_infosys.webp` },
    { name: 'Tesla', img: `${IMG}/s26_tesla.webp` },
    { name: 'LinkedIn', img: `${IMG}/s27_linkedin.webp` },
    { name: 'NVIDIA', img: `${IMG}/s28_nvidia.webp` },
    { name: 'Meta', img: `${IMG}/s29_meta.webp` },
    { name: 'Wipro', img: `${IMG}/s30_wipro.webp` },
    { name: 'Salesforce', img: `${IMG}/s31_salesforce.webp` },
    { name: 'Netflix', img: `${IMG}/s32_netflix.webp` },
    { name: 'Stripe', img: `${IMG}/s33_stripe.webp` },
    { name: 'Flipkart', img: `${IMG}/s34_flipkart.webp` },
    { name: 'PayPal', img: `${IMG}/s35_paypal.webp` },
    { name: 'TCS', img: `${IMG}/s36_tcs.webp` },
    { name: 'Accenture', img: `${IMG}/s37_accenture.webp` },
    { name: 'JPMorgan', img: `${IMG}/s38_jpmorgan.webp` },
    { name: 'Goldman Sachs', img: `${IMG}/s39_goldman-sachs.webp` },
  ],
}

// "WHO WE SERVE"
export const whoWeServe = {
  title: 'WHO WE SERVE',
  groups: [
    { name: 'STARTUPS', points: ['BUILD JOB-READY ENGINEERING TALENT', 'UPSKILL TEAMS WITH HANDS-ON TECH TRAINING', 'AI-POWERED ASSESSMENT & HIRING SUPPORT'] },
    { name: 'STUDENTS', points: ['LEARN BY BUILDING REAL-WORLD PROJECTS', 'CAREER-FOCUSED ROADMAPS & MENTORSHIP', 'MOCK INTERVIEWS & AI FEEDBACK SYSTEM'] },
    { name: 'INSTITUTIONS', points: ['INDUSTRY-ALIGNED CURRICULUM INTEGRATION', 'LIVE PRACTICE & PROJECT-BASED MODULES', 'PLACEMENT-DRIVEN LEARNING ECOSYSTEM'] },
  ],
}

// "Master Your Path" journey
export const masterPath = {
  title: 'Master Your Path',
  sub: 'Your journey to career excellence, defined by standards.',
  steps: [
    { n: '01', name: 'Discover', note: 'Explore career paths.' },
    { n: '02', name: 'Learn', note: 'Structured modules.' },
    { n: '03', name: 'Practice', note: 'Hands-on projects.' },
    { n: '04', name: 'Launch', note: 'Job readiness.' },
    { n: '05', name: 'Excel', note: 'Lead and inspire.' },
  ],
}

// FAQ
export const faq = {
  title: 'FAQ',
  sub: 'Everything you need to know.',
  items: [
    { q: 'What is STUDLYF and how is it different?', a: 'STUDLYF is a student-first ecosystem built to help ambitious students learn, build, and get placed.' },
    { q: 'What kind of opportunities does STUDLYF provide?', a: 'Students get access to workshops, hackathons, mentorship, startup exposure, and collaborative projects.' },
    { q: 'Is STUDLYF only for tech students?', a: 'No. STUDLYF is built for ambitious students from different domains who want to learn and grow.' },
    { q: 'How can students grow through STUDLYF?', a: 'Students can participate in communities, collaborate on projects, attend events, and learn by doing.' },
    { q: 'How can I join the STUDLYF ecosystem?', a: 'You can join by becoming part of the community, attending events, and participating in programs.' },
  ],
}

// Institutions — "FEATURED INSTITUTIONS" (colleges/universities) and
// "TRUSTED BY PEOPLE FROM" (companies/orgs), split exactly like studlyf.in.
export const institutions = {
  featuredTitle: 'FEATURED INSTITUTIONS',
  featuredSub: 'STUDLYF learners come from strong colleges, universities, and institutions.',
  trustedTitle: 'TRUSTED BY PEOPLE FROM',
  trustedSub: 'Learners, professionals, and aspirants from leading companies, institutions, and ecosystems grow with STUDLYF.',
  featured: [
    { name: 'Woxsen', img: `${IMG}/s40_woxen.webp` },
    { name: 'VJIM', img: `${IMG}/s41_vjim.webp` },
    { name: 'Vishnu', img: `${IMG}/s42_vishnu.webp` },
    { name: 'SRM', img: `${IMG}/s43_srm.webp` },
    { name: 'MRU', img: `${IMG}/s44_mru.webp` },
    { name: 'IIT Madras', img: `${IMG}/s45_iitm.webp` },
    { name: 'IIT Kanpur', img: `${IMG}/s46_iit_20k.webp` },
    { name: 'IIT Hyderabad', img: `${IMG}/s47_iit_20h.webp` },
    { name: 'IIT Delhi', img: `${IMG}/s48_iit-delhi.webp` },
    { name: 'IIT Bombay', img: `${IMG}/s49_iit-bombay.webp` },
    { name: 'IIM Kozhikode', img: `${IMG}/s50_iim_20k.webp` },
    { name: 'GRIET', img: `${IMG}/s51_griet.webp` },
    { name: 'CMR', img: `${IMG}/s52_cmr.webp` },
    { name: 'CBIT', img: `${IMG}/s53_cbit.webp` },
    { name: 'BITS', img: `${IMG}/s54_bits.webp` },
    { name: 'Anurag University', img: `${IMG}/s55_anuraguni.webp` },
  ],
  trusted: [
    { name: 'IIM Bangalore', img: `${IMG}/s59_iim_20b.webp` },
    { name: 'ISB', img: `${IMG}/s60_isb.webp` },
    { name: 'Stanford', img: `${IMG}/s64_stanford.webp` },
    { name: 'Wharton', img: `${IMG}/s65_wharton.webp` },
    { name: 'IBM', img: `${IMG}/s21_ibm.webp` },
    { name: 'TCS', img: `${IMG}/s36_tcs.webp` },
    { name: 'Infosys', img: `${IMG}/s25_infosys.webp` },
    { name: 'Optum', img: `${IMG}/s63_optum.webp` },
    { name: 'Bajaj', img: `${IMG}/s58_bajaj.webp` },
    { name: 'Angel One', img: `${IMG}/s56_angel_20one.webp` },
    { name: 'LIC', img: `${IMG}/s62_lic.webp` },
    { name: 'Isha', img: `${IMG}/s61_isha.webp` },
    { name: 'AOL', img: `${IMG}/s57_aol.webp` },
  ],
}

// "OUR IMPACT"
export const impact = {
  title: 'OUR IMPACT',
  sub: 'Creating a global ecosystem where engineering skills meet real-world opportunities.',
  stats: [
    { label: 'STRONG COMMUNITY', img: `${IMG}/s66_hackathon.webp` },
    { label: 'STUDENTS REACHED', img: `${IMG}/s67_mentorship.webp` },
    { label: 'COLLEGES PARTNERED', img: `${IMG}/s68_certificates.webp` },
    { label: 'MEDIA REACH', suffix: 'Lakh +', img: `${IMG}/s69_online_sessions.webp` },
  ],
}

// Testimonials — "See how learners like you landed jobs, built skills, and changed their lives."
export const testimonials = {
  title: 'See how learners like you landed jobs, built skills, and changed their lives.',
  items: [
    { name: 'Pantham Bhavya', track: 'UI / UX DESIGN', quote: 'The sessions felt practical and easy to follow, and I could see my confidence grow with every project.' },
    { name: 'Vadla Sudhasri', track: 'JAVA FULL STACK', quote: 'The guidance was consistent and the doubt-clearing support made the learning experience very smooth.' },
    { name: 'Ginuguntla Likhitha', track: 'DATA ANALYTICS', quote: 'I liked how the classes mixed concepts with hands-on work. It made every topic easy to understand.' },
    { name: 'Sajja Dhruwallika', track: 'CLOUD COMPUTING', quote: 'The platform and mentor support helped me stay consistent and finish projects with confidence.' },
    { name: 'Modaboina Tejaswi', track: 'AI / ML', quote: 'The training style was simple, effective, and very motivating. I could actually apply what I learned.' },
    { name: 'Vishnu Vardhan', track: 'WEB DEVELOPMENT', quote: 'The training and project exposure here are top-notch. Trainer is really helpful and clearing the doubts till course end!' },
    { name: 'Vivek Goud Adula', track: 'AI ENGINEER', quote: 'Training and doubt clarification were excellent. Mic access during class would help clear doubts more effectively.' },
    { name: 'Purushotham', track: 'SERVICENOW', quote: 'Rakesh is teaching very well, patiently clearing every doubt. I also learned communication skills from him.' },
    { name: 'Anusha Goud', track: 'FULL STACK DEVELOPMENT', quote: 'The curriculum is very industry-aligned. I feel much more confident in my coding skills now.' },
    { name: 'Kiran Kumar', track: 'CYBER SECURITY', quote: 'Excellent hands-on labs. The mentors really know their stuff and guide us through complex scenarios.' },
  ],
}

// Resource centre — "Stay ahead of what's Next."
export const resources = {
  title: 'Stay ahead of what’s Next.',
  eyebrow: 'RESOURCE CENTRE',
  sub: 'Research and insights from tech experts and thought leaders so you’re always on top of tech’s latest trends',
  items: [
    { kind: 'CASE STUDY', title: 'Elm Partners with Studlyf to Build a Graduate Development Program', note: 'How modern graduate development programs are redesigned using rapid feedback systems and experiential learning.', img: `${IMG}/s70_photo-1517245386807-bb43f82c33c4.jpg` },
    { kind: 'REPORT', title: 'Generative AI Leadership Playbook', note: 'Strategic frameworks and tactical steps for product teams adopting AI-powered workflows.', img: `${IMG}/s71_photo-1677442136019-21780ecad995.jpg` },
    { kind: 'CASE STUDY', title: 'Studlyf’s Data Empowerment Initiative at Siemens', note: 'Transforming how engineering teams make data-driven decisions through contextual collaboration.', img: `${IMG}/s72_photo-1551288049-bebda4e38f71.jpg` },
    { kind: 'WEBINAR', title: 'What AI Agents can and can not do', note: 'A definitive guide cutting through the noise surrounding agentic workflows and capabilities.', img: `${IMG}/s73_photo-1485827404703-89b55fcc595e.jpg` },
    { kind: 'WEBINAR', title: 'How Agentic AI works: MCP explained', note: 'A deep dive into the underlying architecture of modern agent orchestration.', img: `${IMG}/s75_photo-1531482615713-2afd69097998.jpg` },
    { kind: 'MEDIA', title: '2025 State of AI at work report', note: 'A comprehensive snapshot covering AI adoption, skills demand, and workplace transformation.', img: `${IMG}/s70_photo-1517245386807-bb43f82c33c4.jpg` },
  ],
}

// Contact — "Let's Get To Know Each Other"
export const contact = {
  title: 'Let’s Get To Know Each Other',
  heading: 'CONTACT US',
  sub: 'Elevate your vision with our AI-driven expertise.',
  secured: 'Secured by Human Verification',
  cta: 'Submit Inquiry',
  founderLabel: 'CONNECT WITH FOUNDER',
  founderImg: `${IMG}/s78_Eshwar.webp`,
  founderName: 'Eshwar',
  channels: ['EMAIL', 'WHATSAPP', 'INSTAGRAM'],
  note: 'CONTACT US ANYTIME, WE ARE HERE TO HELP.',
}

export const footer = {
  logo: `${IMG}/s02_studlyf.webp`,
  blurb: 'Empowering the next generation of engineers with AI-driven career tools and resources.',
  links: ['COURSES', 'COMPANY MODULES', 'BLOGS', 'PORTFOLIO', 'RESUME', 'SKILLS ASSIGNMENT', 'INTERVIEWS', 'PROJECT', 'AI TOOLS', 'ABOUT APPLICATION', 'RESOURCES'],
  copyright: '© 2026 STUDLYF • ALL RIGHTS RESERVED',
}
