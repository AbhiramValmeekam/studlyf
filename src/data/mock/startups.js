// Mock startup/founder profiles for Investor Discovery + Analytics, and the
// founder's own startup workspace.
const IMG = '/scraped'

export const INDUSTRIES = ['Fintech', 'HealthTech', 'AI/ML', 'SaaS', 'ClimateTech', 'EdTech', 'Commerce']
export const STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A']
export const STARTUP_LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Remote']
export const REVENUE_BANDS = ['₹25L–1Cr', '₹1–5Cr', '₹5Cr+']
export const FUNDING_STAGES = ['Idea', 'Pre-seed', 'Seed', 'Series A']
export const TEAM_SIZES = ['1–10', '11–25', '25+']
export const TRACTION_LEVELS = ['Early', 'Growing', 'Scaling']

// Bucket a startup's team size / traction into the filter options above.
export const teamSizeBucket = (n) => (n <= 10 ? '1–10' : n <= 25 ? '11–25' : '25+')
export const tractionLevel = (s) => {
  const order = { Idea: 0, 'Pre-seed': 0, Seed: 1, 'Series A': 2 }
  return ['Early', 'Growing', 'Scaling'][order[s.fundingStage] ?? 0]
}

export const startups = [
  {
    id: 'loopwise',
    name: 'Loopwise',
    logo: `${IMG}/s23_amazon.webp`,
    tagline: 'AI copilots for field sales teams',
    industry: 'AI/ML',
    stage: 'Seed',
    location: 'Bengaluru',
    revenue: 240000, // ARR in ₹ '000s → shown as ₹2.4Cr
    revenueBand: '₹1–5Cr',
    funding: '₹6Cr raised',
    fundingStage: 'Seed',
    teamSize: 14,
    traction: '38 paying customers · 22% MoM',
    readiness: 84,
    founder: { name: 'Ishita Rao', role: 'CEO & Co-founder', avatar: `${IMG}/s08_Sundarpichai.jpg`, linkedin: 'linkedin.com/in/ishitarao' },
    problem: 'Field sales reps waste hours on manual CRM updates and lose context between visits.',
    solution: 'A mobile copilot that logs visits by voice, drafts follow-ups, and surfaces the next best action.',
    businessModel: 'Per-seat SaaS, ₹1,200/user/month',
    product: 'Live iOS + Android app, 4.6★ rating',
    website: 'loopwise.ai',
    metrics: [
      { label: 'ARR', value: '₹2.4Cr' },
      { label: 'Customers', value: '38' },
      { label: 'MoM growth', value: '22%' },
      { label: 'Net retention', value: '128%' },
    ],
  },
  {
    id: 'medera',
    name: 'Medera',
    logo: `${IMG}/s25_infosys.webp`,
    tagline: 'Care coordination for chronic patients',
    industry: 'HealthTech',
    stage: 'Pre-seed',
    location: 'Hyderabad',
    revenue: 60000,
    revenueBand: '₹25L–1Cr',
    funding: '₹1.2Cr raised',
    fundingStage: 'Pre-seed',
    teamSize: 7,
    traction: '9 clinics · 4,000 patients',
    readiness: 71,
    founder: { name: 'Dr. Rehan Ali', role: 'Founder', avatar: `${IMG}/s11_jeff-bezos-1-921922c6cdc6442397a7f0dcd8bd0370.jpg`, linkedin: 'linkedin.com/in/rehanali' },
    problem: 'Chronic-care patients fall through the cracks between appointments.',
    solution: 'A coordination layer that keeps clinics, patients and caregivers in sync with reminders and vitals.',
    businessModel: 'Per-clinic subscription + per-patient fee',
    product: 'Web dashboard + patient WhatsApp bot',
    website: 'medera.health',
    metrics: [
      { label: 'ARR', value: '₹60L' },
      { label: 'Clinics', value: '9' },
      { label: 'Patients', value: '4,000' },
      { label: 'Retention', value: '91%' },
    ],
  },
  {
    id: 'tallyfy',
    name: 'Tallyfy',
    logo: `${IMG}/s31_salesforce.webp`,
    tagline: 'Books & compliance for D2C brands',
    industry: 'Fintech',
    stage: 'Series A',
    location: 'Mumbai',
    revenue: 720000,
    revenueBand: '₹5Cr+',
    funding: '₹34Cr raised',
    fundingStage: 'Series A',
    teamSize: 46,
    traction: '400+ brands · profitable',
    readiness: 92,
    founder: { name: 'Priya Menon', role: 'CEO', avatar: `${IMG}/s14_40-facts-about-reid-hoffman-1728495269.jpg`, linkedin: 'linkedin.com/in/priyamenon' },
    problem: 'D2C founders drown in GST filings, reconciliation and investor reporting.',
    solution: 'An automated finance stack that closes books in a day and files compliance on time.',
    businessModel: 'Tiered SaaS + transaction fees',
    product: 'Web app + accountant marketplace',
    website: 'tallyfy.in',
    metrics: [
      { label: 'ARR', value: '₹7.2Cr' },
      { label: 'Brands', value: '400+' },
      { label: 'Gross margin', value: '78%' },
      { label: 'MoM growth', value: '11%' },
    ],
  },
  {
    id: 'verdant',
    name: 'Verdant',
    logo: `${IMG}/s29_meta.webp`,
    tagline: 'Carbon accounting for supply chains',
    industry: 'ClimateTech',
    stage: 'Seed',
    location: 'Delhi NCR',
    revenue: 150000,
    revenueBand: '₹1–5Cr',
    funding: '₹4.5Cr raised',
    fundingStage: 'Seed',
    teamSize: 11,
    traction: '17 enterprises piloting',
    readiness: 76,
    founder: { name: 'Arjun Bose', role: 'Co-founder', avatar: `${IMG}/s12_jensen-huang.jpg`, linkedin: 'linkedin.com/in/arjunbose' },
    problem: 'Enterprises can’t measure Scope 3 emissions across fragmented supplier data.',
    solution: 'An ingestion + modeling engine that produces audit-ready carbon reports.',
    businessModel: 'Annual enterprise contracts',
    product: 'Dashboard + supplier data connectors',
    website: 'verdant.eco',
    metrics: [
      { label: 'ARR', value: '₹1.5Cr' },
      { label: 'Pilots', value: '17' },
      { label: 'Data sources', value: '40+' },
      { label: 'Growth', value: '18% MoM' },
    ],
  },
  {
    id: 'quill',
    name: 'Quill',
    logo: `${IMG}/s17_adobe.webp`,
    tagline: 'AI tutor for competitive exams',
    industry: 'EdTech',
    stage: 'Pre-seed',
    location: 'Remote',
    revenue: 30000,
    revenueBand: '₹25L–1Cr',
    funding: 'Bootstrapped',
    fundingStage: 'Idea',
    teamSize: 4,
    traction: '12,000 free users · 3% paid',
    readiness: 64,
    founder: { name: 'Sana Kapoor', role: 'Founder', avatar: `${IMG}/s13_1683250404-5715.jpg`, linkedin: 'linkedin.com/in/sanakapoor' },
    problem: 'Exam prep is one-size-fits-all and unaffordable for most students.',
    solution: 'An adaptive AI tutor that diagnoses gaps and builds a daily plan.',
    businessModel: 'Freemium + ₹499/month premium',
    product: 'Web + Android app',
    website: 'quill.study',
    metrics: [
      { label: 'Users', value: '12,000' },
      { label: 'Paid', value: '3%' },
      { label: 'D30 retention', value: '41%' },
      { label: 'ARR', value: '₹30L' },
    ],
  },
  {
    id: 'stitch',
    name: 'Stitch',
    logo: `${IMG}/s34_flipkart.webp`,
    tagline: 'Headless checkout for Bharat commerce',
    industry: 'Commerce',
    stage: 'Seed',
    location: 'Bengaluru',
    revenue: 190000,
    revenueBand: '₹1–5Cr',
    funding: '₹5Cr raised',
    fundingStage: 'Seed',
    teamSize: 12,
    traction: '120 merchants · ₹40Cr GMV',
    readiness: 79,
    founder: { name: 'Rohit Verma', role: 'CEO', avatar: `${IMG}/s04_steve-jobs-92a047e4-7791-45f6-a8b9-d4d24a376dd2.jpg`, linkedin: 'linkedin.com/in/rohitverma' },
    problem: 'Regional merchants lose sales to clunky checkout and payment failures.',
    solution: 'A drop-in checkout optimized for low-bandwidth, UPI-first buyers.',
    businessModel: 'Take rate on GMV',
    product: 'JS SDK + merchant dashboard',
    website: 'stitch.commerce',
    metrics: [
      { label: 'GMV', value: '₹40Cr' },
      { label: 'Merchants', value: '120' },
      { label: 'Success rate', value: '+9pts' },
      { label: 'ARR', value: '₹1.9Cr' },
    ],
  },
]

export const getStartup = (id) => startups.find((s) => s.id === id)

// The founder's own startup (workspace) — Loopwise.
export const myStartup = getStartup('loopwise')
