// Content for Builder add-ons: STUD OTT, STUD Hub, Career Roadmap.
const IMG = '/scraped'

export const ottCategories = ['All', 'AI', 'Startup', 'Career', 'Industry']

export const ottContent = [
  { id: 'o1', title: 'Shipping AI features that actually work', category: 'AI', duration: '18 min', kind: 'Series', img: `${IMG}/s71_photo-1677442136019-21780ecad995.jpg` },
  { id: 'o2', title: 'From dorm room to seed round', category: 'Startup', duration: '42 min', kind: 'Documentary', img: `${IMG}/s70_photo-1517245386807-bb43f82c33c4.jpg` },
  { id: 'o3', title: 'How to read a job description', category: 'Career', duration: '9 min', kind: 'Short', img: `${IMG}/s73_photo-1485827404703-89b55fcc595e.jpg` },
  { id: 'o4', title: 'Inside a modern data platform', category: 'Industry', duration: '26 min', kind: 'Series', img: `${IMG}/s72_photo-1551288049-bebda4e38f71.jpg` },
  { id: 'o5', title: 'Agents, MCP and the new stack', category: 'AI', duration: '31 min', kind: 'Talk', img: `${IMG}/s75_photo-1531482615713-2afd69097998.jpg` },
  { id: 'o6', title: 'Negotiating your first offer', category: 'Career', duration: '14 min', kind: 'Short', img: `${IMG}/s70_photo-1517245386807-bb43f82c33c4.jpg` },
]

export const hubTools = [
  { id: 'h1', name: 'AI Resume Scanner', desc: 'Score your resume against a role in seconds.', tag: 'AI Tool' },
  { id: 'h2', name: 'Cold Email Generator', desc: 'Draft recruiter outreach that gets replies.', tag: 'AI Tool' },
  { id: 'h3', name: 'GitHub Credit Pack', desc: 'Student pack: domains, cloud credits, Copilot.', tag: 'Discount' },
  { id: 'h4', name: 'Startup India Scheme', desc: 'Recognition + tax benefits for student founders.', tag: 'Scheme' },
  { id: 'h5', name: 'System Design Roadmap', desc: 'Structured path from basics to distributed systems.', tag: 'Roadmap' },
  { id: 'h6', name: 'Interview Prep Kit', desc: 'Curated DSA sets + mock interview slots.', tag: 'Resource' },
]

export const roadmaps = {
  'Full-Stack': {
    role: 'Full-Stack Engineer',
    milestones: [
      { name: 'Web foundations', done: true, note: 'HTML, CSS, JS, HTTP' },
      { name: 'Frontend framework', done: true, note: 'React + state management' },
      { name: 'Backend & APIs', done: true, note: 'Node, REST, auth' },
      { name: 'Databases', done: false, note: 'SQL modeling, indexing, transactions' },
      { name: 'System design', done: false, note: 'Caching, queues, scaling' },
      { name: 'Ship & get discovered', done: false, note: 'Deploy, evaluate, apply' },
    ],
  },
  'Frontend': {
    role: 'Frontend Engineer',
    milestones: [
      { name: 'Web foundations', done: true, note: 'Semantic HTML, modern CSS' },
      { name: 'JavaScript deep-dive', done: true, note: 'ES2023, async, modules' },
      { name: 'React & state', done: true, note: 'Hooks, context, data fetching' },
      { name: 'Motion & polish', done: false, note: 'Transitions, GSAP, a11y' },
      { name: 'Performance', done: false, note: 'Bundle budgets, rendering' },
      { name: 'Ship & get discovered', done: false, note: 'Deploy, evaluate, apply' },
    ],
  },
  'ML Engineer': {
    role: 'ML Engineer',
    milestones: [
      { name: 'Math & Python', done: true, note: 'Linear algebra, NumPy, pandas' },
      { name: 'Classical ML', done: true, note: 'Regression, trees, evaluation' },
      { name: 'Deep learning', done: false, note: 'PyTorch, CNNs, transformers' },
      { name: 'Applied NLP / CV', done: false, note: 'Fine-tuning, RAG, embeddings' },
      { name: 'MLOps', done: false, note: 'Serving, monitoring, pipelines' },
      { name: 'Ship & get discovered', done: false, note: 'Deploy, evaluate, apply' },
    ],
  },
}

// Progress is derived from completed milestones — not a hardcoded number — so it
// reflects the builder's actual advancement through the path.
export const roadmapProgress = (r) => Math.round((r.milestones.filter((m) => m.done).length / r.milestones.length) * 100)
