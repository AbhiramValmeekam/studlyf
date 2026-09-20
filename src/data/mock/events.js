// Mock organizer events + the staged management data for one event.
const IMG = '/scraped'

export const events = [
  {
    id: 'hack-loop-2026',
    name: 'LoopHacks 2026 — AI for Bharat',
    type: 'Hackathon',
    status: 'Live',
    registrations: 412,
    teams: 118,
    submissions: 74,
    prize: '₹5,00,000',
    dates: 'Oct 18–25, 2026',
  },
  {
    id: 'design-sprint-q4',
    name: 'Q4 Product Design Sprint',
    type: 'Workshop',
    status: 'Upcoming',
    registrations: 96,
    teams: 0,
    submissions: 0,
    prize: '—',
    dates: 'Nov 2, 2026',
  },
  {
    id: 'ml-cup-2026',
    name: 'Campus ML Cup',
    type: 'Competition',
    status: 'Closed',
    registrations: 640,
    teams: 210,
    submissions: 188,
    prize: '₹2,00,000',
    dates: 'Aug 2026',
  },
]

export const getEvent = (id) => events.find((e) => e.id === id) || events[0]

export const STAGES = ['Registration', 'Participants', 'Teams', 'Submissions', 'Jury Evaluation', 'Ranking', 'Results']

export const eventDetail = {
  participants: [
    { id: 'p1', name: 'Aarav Menon', college: 'IIT Hyderabad', team: 'DevSync', status: 'Confirmed' },
    { id: 'p2', name: 'Sara Quadri', college: 'BITS Pilani', team: 'Recall', status: 'Confirmed' },
    { id: 'p3', name: 'Dev Patel', college: 'MITID', team: 'Cadence', status: 'Confirmed' },
    { id: 'p4', name: 'Nikhil Rao', college: 'SRM', team: 'Gustav', status: 'Waitlist' },
    { id: 'p5', name: 'Ananya Sharma', college: 'St. Xavier’s', team: 'Pulse', status: 'Confirmed' },
    { id: 'p6', name: 'Kabir Nair', college: 'VJIT', team: 'Helmsman', status: 'Confirmed' },
  ],
  teams: [
    { id: 't1', name: 'DevSync', members: 3, project: 'Collaborative code review', status: 'Submitted' },
    { id: 't2', name: 'Recall', members: 2, project: 'RAG document search', status: 'Submitted' },
    { id: 't3', name: 'Cadence', members: 1, project: 'Motion habit tracker', status: 'Submitted' },
    { id: 't4', name: 'Gustav', members: 4, project: 'Distributed job queue', status: 'In progress' },
    { id: 't5', name: 'Pulse', members: 2, project: 'NL→SQL analytics', status: 'Submitted' },
  ],
  submissions: [
    { id: 's1', team: 'DevSync', repo: 'github.com/aaravbuilds/devsync', demo: 'devsync.demo.app', score: 92 },
    { id: 's2', team: 'Recall', repo: 'github.com/saraq/recall', demo: 'recall.demo.app', score: 95 },
    { id: 's3', team: 'Cadence', repo: 'github.com/devp/cadence', demo: 'cadence.demo.app', score: 89 },
    { id: 's4', team: 'Pulse', repo: 'github.com/ananyas/pulse', demo: 'pulse.demo.app', score: 86 },
  ],
  jury: [
    { criterion: 'Innovation', weight: 25 },
    { criterion: 'Technical execution', weight: 30 },
    { criterion: 'Design & UX', weight: 20 },
    { criterion: 'Impact', weight: 25 },
  ],
  ranking: [
    { rank: 1, team: 'Recall', score: 95 },
    { rank: 2, team: 'DevSync', score: 92 },
    { rank: 3, team: 'Cadence', score: 89 },
    { rank: 4, team: 'Pulse', score: 86 },
  ],
}
