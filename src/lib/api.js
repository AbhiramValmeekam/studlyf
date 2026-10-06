// Thin client for the STUDLYF Phase-1 API. In dev, requests go through the Vite
// proxy (/api → :4000) so they're same-origin and the session cookie flows.
const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || code || 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details || []
  }
}

function buildQuery(params) {
  if (!params) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue
    usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

// The backend seeds media URLs with an absolute dev origin (e.g.
// http://localhost:5173/scraped/…). Those assets actually live in this
// frontend's own /public folder, so a hardcoded port breaks every image the
// moment Vite runs somewhere else. Rewrite any localhost origin to a
// same-origin relative path; real (non-localhost) URLs are left untouched.
const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i
function normalizeUrls(node) {
  if (Array.isArray(node)) {
    for (const item of node) normalizeUrls(item)
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const v = node[key]
      if (typeof v === 'string' && LOCAL_ORIGIN.test(v)) {
        node[key] = v.replace(LOCAL_ORIGIN, '') || '/'
      } else if (v && typeof v === 'object') {
        normalizeUrls(v)
      }
    }
  }
}

export async function apiFetch(path, { method = 'GET', body, params, signal } = {}) {
  // A FormData body must go out as-is: the browser sets Content-Type itself, boundary included.
  // Setting 'application/json' (or JSON-stringifying) would corrupt a multipart upload.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const res = await fetch(`${BASE}${path}${buildQuery(params)}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
    signal,
  })

  let json = null
  try {
    json = await res.json()
  } catch {
    // no/invalid body
  }

  if (!res.ok || (json && json.success === false)) {
    const err = json?.error || {}
    throw new ApiError(res.status, err.code, err.message, err.details)
  }
  if (json) normalizeUrls(json)
  // Return both data and meta so paginated callers can read totals.
  return { data: json?.data, meta: json?.meta }
}

/** POST a File plus scalar fields as multipart/form-data. */
export function uploadFile(path, file, fields = {}) {
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== '') fd.append(k, String(v))
  }
  return apiFetch(path, { method: 'POST', body: fd })
}

// Convenience wrappers ------------------------------------------------------
export const api = {
  home: (opts) => apiFetch('/home', opts),
  paths: (opts) => apiFetch('/paths', opts),
  opportunities: (params, opts) => apiFetch('/opportunities', { ...opts, params }),
  opportunity: (slug, opts) => apiFetch(`/opportunities/${encodeURIComponent(slug)}`, opts),
  resources: (params, opts) => apiFetch('/resources', { ...opts, params }),
  resource: (slug, opts) => apiFetch(`/resources/${encodeURIComponent(slug)}`, opts),
  courses: (params, opts) => apiFetch('/courses', { ...opts, params }),
  course: (slug, opts) => apiFetch(`/courses/${encodeURIComponent(slug)}`, opts),
  studhub: (params, opts) => apiFetch('/studhub', { ...opts, params }),
  studhubBenefit: (slug, opts) => apiFetch(`/studhub/${encodeURIComponent(slug)}`, opts),
  ott: (params, opts) => apiFetch('/ott', { ...opts, params }),
  ottTitle: (slug, opts) => apiFetch(`/ott/${encodeURIComponent(slug)}`, opts),
  // The viewer's own place on the shelf. Per-account, so it never rides the public cache.
  myOttShelf: (opts) => apiFetch('/me/ott', opts),
  setOttProgress: (id, body) => apiFetch(`/me/ott/${enc(id)}/progress`, { method: 'PUT', body }),
  clearOttProgress: (id, episodeKey) =>
    apiFetch(`/me/ott/${enc(id)}/progress`, { method: 'DELETE', params: episodeKey ? { episodeKey } : undefined }),
  // Saved items (spec §57) — one bookmark list for the whole platform, whatever the entity.
  mySaved: (params, opts) => apiFetch('/me/saved', { ...opts, params }),
  saveItem: (body) => apiFetch('/me/saved', { method: 'POST', body }),
  unsaveItem: (entityType, entityId) => apiFetch('/me/saved', { method: 'DELETE', params: { entityType, entityId } }),
  mockDrills: (params, opts) => apiFetch('/mock-drills', { ...opts, params }),
  mockDrill: (slug, opts) => apiFetch(`/mock-drills/${encodeURIComponent(slug)}`, opts),
  projectBriefs: (params, opts) => apiFetch('/project-briefs', { ...opts, params }),
  projectBrief: (slug, opts) => apiFetch(`/project-briefs/${encodeURIComponent(slug)}`, opts),
  search: (params, opts) => apiFetch('/search', { ...opts, params }),
  partners: (params, opts) => apiFetch('/partners', { ...opts, params }),
  testimonials: (params, opts) => apiFetch('/testimonials', { ...opts, params }),
  stats: (opts) => apiFetch('/stats', opts),
  categories: (params, opts) => apiFetch('/categories', { ...opts, params }),

  // auth / account
  register: (body) => apiFetch('/auth/register', { method: 'POST', body }),
  login: (body) => apiFetch('/auth/login', { method: 'POST', body }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  verifyEmail: (body) => apiFetch('/auth/verify-email', { method: 'POST', body }),
  resendVerification: (body) => apiFetch('/auth/resend-verification', { method: 'POST', body }),
  forgotPassword: (body) => apiFetch('/auth/forgot-password', { method: 'POST', body }),
  resetPassword: (body) => apiFetch('/auth/reset-password', { method: 'POST', body }),
  me: (opts) => apiFetch('/me', opts),
  updateMe: (body) => apiFetch('/me', { method: 'PATCH', body }),
  // personal profile (college, links, interests…) — shared by the prompt and the profile page
  updateMyProfile: (body) => apiFetch('/me/profile', { method: 'PATCH', body }),
  getOnboarding: (opts) => apiFetch('/onboarding', opts),
  setOnboarding: (body) => apiFetch('/onboarding', { method: 'POST', body }),

  // skills vocabulary (public)
  skills: (params, opts) => apiFetch('/skills', { ...opts, params }),

  // builder — own profile. NB: builder-OWNED routes are /builder/... (singular). The plural
  // /builders/... namespace is the PUBLIC profile route (/builders/:username), so a request to
  // /builders/profile is matched by it and rejected as a reserved username.
  builderProfile: (opts) => apiFetch('/builder/profile', opts),
  createBuilderProfile: (body) => apiFetch('/builder/profile', { method: 'POST', body }),
  updateBuilderProfile: (body) => apiFetch('/builder/profile', { method: 'PATCH', body }),
  setBuilderSkills: (body) => apiFetch('/builder/profile/skills', { method: 'PUT', body }),
  builderCompletion: (opts) => apiFetch('/builder/profile/completion', opts),
  builderDashboard: (opts) => apiFetch('/builder/dashboard', opts),

  // builder — applications
  builderApplications: (params, opts) => apiFetch('/builder/applications', { ...opts, params }),
  builderApplication: (id, opts) => apiFetch(`/builder/applications/${encodeURIComponent(id)}`, opts),
  createApplication: (body) => apiFetch('/builder/applications', { method: 'POST', body }),
  updateApplication: (id, body) => apiFetch(`/builder/applications/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  submitApplication: (id) => apiFetch(`/builder/applications/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
  withdrawApplication: (id) => apiFetch(`/builder/applications/${encodeURIComponent(id)}/withdraw`, { method: 'POST' }),

  // public builder profile
  publicBuilder: (username, opts) => apiFetch(`/builders/${encodeURIComponent(username)}`, opts),

  // notifications
  notifications: (params, opts) => apiFetch('/me/notifications', { ...opts, params }),
  readNotification: (id) => apiFetch(`/me/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  readAllNotifications: () => apiFetch('/me/notifications/read-all', { method: 'POST' }),

  // resume builder (private, per-user)
  resumes: (params, opts) => apiFetch('/me/resumes', { ...opts, params }),
  resume: (id, opts) => apiFetch(`/me/resumes/${encodeURIComponent(id)}`, opts),
  createResume: (body) => apiFetch('/me/resumes', { method: 'POST', body }),
  updateResume: (id, body) => apiFetch(`/me/resumes/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  deleteResume: (id) => apiFetch(`/me/resumes/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // career roadmap — the published role catalog plus the builder's own computed plan
  roadmaps: (params, opts) => apiFetch('/roadmaps', { ...opts, params }),
  roadmap: (slug, opts) => apiFetch(`/roadmaps/${encodeURIComponent(slug)}`, opts),
  myRoadmap: (opts) => apiFetch('/builder/roadmap', opts),
  setRoadmapGoal: (body) => apiFetch('/builder/roadmap', { method: 'PUT', body }),
  clearRoadmapGoal: () => apiFetch('/builder/roadmap', { method: 'DELETE' }),
  setRoadmapStep: (skillSlug, done) =>
    apiFetch(`/builder/roadmap/steps/${encodeURIComponent(skillSlug)}`, { method: 'PATCH', body: { done } }),

  // community / project showcase
  communityProjects: (params, opts) => apiFetch('/community/projects', { ...opts, params }),
  communityProject: (slug, opts) => apiFetch(`/community/projects/${encodeURIComponent(slug)}`, opts),
  communityTags: (opts) => apiFetch('/community/tags', opts),
  communityCategories: (opts) => apiFetch('/community/categories', opts),
  communityLeaderboard: (opts) => apiFetch('/community/leaderboard', opts),
  communityMyProjects: (opts) => apiFetch('/community/my/projects', opts),
  communityAuthorProjects: (username, opts) =>
    apiFetch(`/community/authors/${encodeURIComponent(username)}/projects`, opts),
  createProject: (body) => apiFetch('/community/projects', { method: 'POST', body }),
  updateProject: (id, body) =>
    apiFetch(`/community/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  deleteProject: (id) => apiFetch(`/community/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  upvoteProject: (id) => apiFetch(`/community/projects/${encodeURIComponent(id)}/upvote`, { method: 'POST' }),

  // signed-in image uploads (organizer / HR / builder) — one route for every poster
  uploadImage: (file, { purpose = 'OTHER', altText } = {}) =>
    uploadFile('/media/upload', file, { purpose, altText }),

  // achievements (builder-owned list; system ones are issued by the platform)  myAchievements: (params, opts) => apiFetch('/achievements', { ...opts, params }),
  createAchievement: (body) => apiFetch('/achievements', { method: 'POST', body }),
  updateAchievement: (id, body) => apiFetch(`/achievements/${enc(id)}`, { method: 'PATCH', body }),
  deleteAchievement: (id) => apiFetch(`/achievements/${enc(id)}`, { method: 'DELETE' }),

  // ecosystems — the server-computed access state (also embedded in /me)
  myEcosystems: (opts) => apiFetch('/me/ecosystems', opts),

  // founder
  founderProfile: (opts) => apiFetch('/founder/profile', opts),
  publicFounder: (slug, opts) => apiFetch(`/founders/${encodeURIComponent(slug)}`, opts),
  createFounderProfile: (body) => apiFetch('/founder/profile', { method: 'POST', body }),
  updateFounderProfile: (body) => apiFetch('/founder/profile', { method: 'PATCH', body }),
  founderDashboard: (opts) => apiFetch('/founder/dashboard', opts),
  founderConnections: (params, opts) => apiFetch('/founder/connections', { ...opts, params }),
  addStartupUpdate: (body) => apiFetch('/founder/updates', { method: 'POST', body }),
  deleteStartupUpdate: (id) => apiFetch(`/founder/updates/${enc(id)}`, { method: 'DELETE' }),
  respondConnection: (id, status) => apiFetch(`/founder/connections/${enc(id)}`, { method: 'PATCH', body: { status } }),

  // investor
  investorRequest: (opts) => apiFetch('/investor/access-request', opts),
  submitInvestorRequest: (body) => apiFetch('/investor/access-request', { method: 'PUT', body }),
  investorDashboard: (opts) => apiFetch('/investor/dashboard', opts),
  investorFacets: (opts) => apiFetch('/investor/facets', opts),
  investorFounders: (params, opts) => apiFetch('/investor/founders', { ...opts, params }),
  investorFounder: (id, opts) => apiFetch(`/investor/founders/${enc(id)}`, opts),
  investorIntelligence: (opts) => apiFetch('/investor/intelligence', opts),
  saveFounder: (id, saved) => apiFetch(`/investor/saved/${enc(id)}`, { method: saved ? 'PUT' : 'DELETE' }),
  investorConnections: (params, opts) => apiFetch('/investor/connections', { ...opts, params }),
  requestConnection: (body) => apiFetch('/investor/connections', { method: 'POST', body }),
  withdrawConnection: (id) => apiFetch(`/investor/connections/${enc(id)}/withdraw`, { method: 'POST' }),

  // HR & talent
  hrRequest: (opts) => apiFetch('/hr/access-request', opts),
  submitHrRequest: (body) => apiFetch('/hr/access-request', { method: 'PUT', body }),
  hrDashboard: (opts) => apiFetch('/hr/dashboard', opts),
  hrTalent: (params, opts) => apiFetch('/hr/talent', { ...opts, params }),
  hrCandidates: (params, opts) => apiFetch('/hr/candidates', { ...opts, params }),
  addCandidate: (body) => apiFetch('/hr/candidates', { method: 'POST', body }),
  updateCandidate: (id, body) => apiFetch(`/hr/candidates/${enc(id)}`, { method: 'PATCH', body }),
  removeCandidate: (id) => apiFetch(`/hr/candidates/${enc(id)}`, { method: 'DELETE' }),

  // jobs — the public board plus the HR poster's own listings
  jobs: (params, opts) => apiFetch('/jobs', { ...opts, params }),
  job: (slug, opts) => apiFetch(`/jobs/${encodeURIComponent(slug)}`, opts),
  hrJobs: (params, opts) => apiFetch('/hr/jobs', { ...opts, params }),
  hrJob: (id, opts) => apiFetch(`/hr/jobs/${enc(id)}`, opts),
  createHrJob: (body) => apiFetch('/hr/jobs', { method: 'POST', body }),
  updateHrJob: (id, body) => apiFetch(`/hr/jobs/${enc(id)}`, { method: 'PATCH', body }),
  publishHrJob: (id, publish) => apiFetch(`/hr/jobs/${enc(id)}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
  // "Close" is the same action as unpublishing — one mechanism, not two (§96).
  closeHrJob: (id) => apiFetch(`/hr/jobs/${enc(id)}/unpublish`, { method: 'POST' }),
  deleteHrJob: (id) => apiFetch(`/hr/jobs/${enc(id)}`, { method: 'DELETE' }),

  // organizations
  createOrganization: (body) => apiFetch('/organizations', { method: 'POST', body }),
  publicOrganization: (slug, opts) => apiFetch(`/organizations/${encodeURIComponent(slug)}`, opts),
  myOrganization: (opts) => apiFetch('/organization', opts),
  updateOrganization: (body) => apiFetch('/organization', { method: 'PATCH', body }),
  orgDashboard: (opts) => apiFetch('/organization/dashboard', opts),
  orgOpportunities: (params, opts) => apiFetch('/organization/opportunities', { ...opts, params }),
  orgOpportunity: (id, opts) => apiFetch(`/organization/opportunities/${enc(id)}`, opts),
  createOrgOpportunity: (body) => apiFetch('/organization/opportunities', { method: 'POST', body }),
  updateOrgOpportunity: (id, body) => apiFetch(`/organization/opportunities/${enc(id)}`, { method: 'PATCH', body }),
  publishOrgOpportunity: (id, publish) => apiFetch(`/organization/opportunities/${enc(id)}/${publish ? 'publish' : 'unpublish'}`, { method: 'POST' }),
  orgParticipants: (params, opts) => apiFetch('/organization/participants', { ...opts, params }),
  reviewParticipant: (id, body) => apiFetch(`/organization/participants/${enc(id)}/status`, { method: 'POST', body }),
  orgSubmissions: (params, opts) => apiFetch('/organization/submissions', { ...opts, params }),
  orgEvaluations: (params, opts) => apiFetch('/organization/evaluations', { ...opts, params }),
  orgRankings: (params, opts) => apiFetch('/organization/rankings', { ...opts, params }),
  orgMembers: (opts) => apiFetch('/organization/members', opts),
  addOrgMember: (body) => apiFetch('/organization/members', { method: 'POST', body }),
  updateOrgMember: (id, body) => apiFetch(`/organization/members/${enc(id)}`, { method: 'PATCH', body }),
  removeOrgMember: (id) => apiFetch(`/organization/members/${enc(id)}`, { method: 'DELETE' }),
  orgTeams: (params, opts) => apiFetch('/organization/teams', { ...opts, params }),
  orgWinners: (opts) => apiFetch('/organization/winners', opts),
  orgEvaluators: (opts) => apiFetch('/organization/evaluators', opts),
  assignOrgEvaluator: (submissionId, body) => apiFetch(`/organization/submissions/${enc(submissionId)}/evaluators`, { method: 'POST', body }),
  orgAnalytics: (opts) => apiFetch('/organization/analytics', opts),
  orgCertificates: (params, opts) => apiFetch('/organization/certificates', { ...opts, params }),
  revokeOrgCertificate: (id, body) => apiFetch(`/organization/certificates/${enc(id)}/revoke`, { method: 'POST', body }),

  // certificates — public verification needs no session
  verifyCertificate: (code, opts) => apiFetch(`/certificates/verify/${enc(code)}`, opts),

  // admin — ecosystem verification queue
  accessRequests: (params, opts) => apiFetch('/admin/access-requests', { ...opts, params }),
  setAccessStatus: (ecosystem, id, body) => apiFetch(`/admin/access-requests/${enc(ecosystem)}/${enc(id)}/status`, { method: 'POST', body }),
}

function enc(v) {
  return encodeURIComponent(v)
}
