import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api, ApiError } from './api'

const unwrap = (p) => p.then((r) => r.data)

export function useHome() {
  return useQuery({ queryKey: ['home'], queryFn: () => unwrap(api.home()) })
}

export function usePaths() {
  return useQuery({ queryKey: ['paths'], queryFn: () => unwrap(api.paths()) })
}

export function useOpportunities(params) {
  return useQuery({
    queryKey: ['opportunities', params],
    queryFn: async () => {
      const { data, meta } = await api.opportunities(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useOpportunity(slug) {
  return useQuery({
    queryKey: ['opportunity', slug],
    queryFn: () => unwrap(api.opportunity(slug)),
    enabled: !!slug,
  })
}

/** The public job board (spec §73). Same key/param convention as every other listing. */
export function useJobs(params) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => {
      const { data, meta } = await api.jobs(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useJob(slug) {
  return useQuery({
    queryKey: ['job', slug],
    queryFn: () => unwrap(api.job(slug)),
    enabled: !!slug,
  })
}

export function useResources(params) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: async () => {
      const { data, meta } = await api.resources(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useResource(slug) {
  return useQuery({
    queryKey: ['resource', slug],
    queryFn: () => unwrap(api.resource(slug)),
    enabled: !!slug,
  })
}

// ---- courses & company learning modules -----------------------------------

export function useCourses(params) {
  return useQuery({
    queryKey: ['courses', params],
    queryFn: async () => {
      const { data, meta } = await api.courses(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCourse(slug) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: () => unwrap(api.course(slug)),
    enabled: !!slug,
  })
}

// ---- STUDHub: scholarships, discounts & student perks ---------------------

export function useStudhub(params) {
  return useQuery({
    queryKey: ['studhub', params],
    queryFn: async () => {
      const { data, meta } = await api.studhub(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useStudhubBenefit(slug) {
  return useQuery({
    queryKey: ['studhub-benefit', slug],
    queryFn: () => unwrap(api.studhubBenefit(slug)),
    enabled: !!slug,
  })
}

// ---- STUD OTT: the streaming shelf ----------------------------------------

export function useOtt(params) {
  return useQuery({
    queryKey: ['ott', params],
    queryFn: async () => {
      const { data, meta } = await api.ott(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useOttTitle(slug) {
  return useQuery({
    queryKey: ['ott-title', slug],
    queryFn: () => unwrap(api.ottTitle(slug)),
    enabled: !!slug,
  })
}

/** The signed-in viewer's place in the shelf — null when they are not signed in. */
export function useMyOttShelf(enabled = true) {
  return useQuery({
    queryKey: ['ott-shelf'],
    queryFn: () => unwrap(api.myOttShelf()),
    enabled,
  })
}

// ---- saved items (§57) -----------------------------------------------------

export function useMySaved(params) {
  return useQuery({
    queryKey: ['saved', params],
    queryFn: async () => {
      const { data, meta } = await api.mySaved(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

/**
 * Every id the viewer has saved, as a `TYPE:id` set, so any card can render its own bookmark
 * without a request per card. Shares the `['saved']` key namespace, so saving anywhere
 * invalidates it too.
 */
export function useSavedIds(enabled = true) {
  return useQuery({
    queryKey: ['saved', 'ids'],
    queryFn: async () => {
      const { data } = await api.mySaved({ pageSize: 50 })
      return new Set((data ?? []).map((r) => `${r.entityType}:${r.entityId}`))
    },
    enabled,
    staleTime: 60 * 1000,
  })
}

// ---- mock tests & interviews ----------------------------------------------

export function useMockDrills(params) {
  return useQuery({
    queryKey: ['mock-drills', params],
    queryFn: async () => {
      const { data, meta } = await api.mockDrills(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useMockDrill(slug) {
  return useQuery({
    queryKey: ['mock-drill', slug],
    queryFn: () => unwrap(api.mockDrill(slug)),
    enabled: !!slug,
  })
}

// ---- build a project: challenge briefs ------------------------------------

export function useProjectBriefs(params) {
  return useQuery({
    queryKey: ['project-briefs', params],
    queryFn: async () => {
      const { data, meta } = await api.projectBriefs(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useProjectBrief(slug) {
  return useQuery({
    queryKey: ['project-brief', slug],
    queryFn: () => unwrap(api.projectBrief(slug)),
    enabled: !!slug,
  })
}

export function useSearch(params) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: async () => {
      const { data, meta } = await api.search(params)
      return { data, meta }
    },
    enabled: !!params?.q,
    placeholderData: keepPreviousData,
  })
}

export function useCategories(scope) {
  return useQuery({
    queryKey: ['categories', scope],
    queryFn: () => unwrap(api.categories({ scope })),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePartners(params) {
  return useQuery({ queryKey: ['partners', params], queryFn: () => unwrap(api.partners(params)) })
}

export function useTestimonials(params) {
  return useQuery({ queryKey: ['testimonials', params], queryFn: () => unwrap(api.testimonials(params)) })
}

// ---- skills ---------------------------------------------------------------

export function useSkills(q) {
  return useQuery({
    queryKey: ['skills', q || ''],
    queryFn: () => unwrap(api.skills({ q: q || undefined })),
    staleTime: 5 * 60 * 1000,
  })
}

// ---- builder journey ------------------------------------------------------

// The profile 404s until the builder creates one — treat that as "no profile
// yet" (null) rather than an error, mirroring AuthContext's 401 handling.
// Callers should pass `enabled` = whether /me reports a builderUsername. The 404 is handled
// here, but the browser still logs it as a console error on every disabled-account page load,
// so the cheapest fix is not to make a request we already know will 404.
export function useBuilderProfile(enabled = true) {
  return useQuery({
    queryKey: ['builder-profile'],
    queryFn: async () => {
      try {
        return await unwrap(api.builderProfile())
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },
    enabled,
    retry: false,
  })
}

export function useBuilderCompletion(enabled = true) {
  return useQuery({
    queryKey: ['builder-completion'],
    queryFn: () => unwrap(api.builderCompletion()),
    enabled,
  })
}

export function useBuilderDashboard(enabled = true) {
  return useQuery({
    queryKey: ['builder-dashboard'],
    queryFn: () => unwrap(api.builderDashboard()),
    enabled,
    // Live dashboard: poll every 25s and on window focus so recruiter approaches,
    // application-status changes, team invites and evaluations surface on their own.
    refetchInterval: 25000,
    refetchOnWindowFocus: true,
  })
}

export function useBuilderApplications(params, enabled = true) {
  return useQuery({
    queryKey: ['builder-applications', params],
    queryFn: async () => {
      const { data, meta } = await api.builderApplications(params)
      return { items: data ?? [], meta }
    },
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useBuilderApplication(id) {
  return useQuery({
    queryKey: ['builder-application', id],
    queryFn: () => unwrap(api.builderApplication(id)),
    enabled: !!id,
  })
}

export function usePublicBuilder(username) {
  return useQuery({
    queryKey: ['public-builder', username],
    queryFn: () => unwrap(api.publicBuilder(username)),
    enabled: !!username,
    retry: false,
  })
}

export function usePublicOrganization(slug) {
  return useQuery({
    queryKey: ['public-organization', slug],
    queryFn: () => unwrap(api.publicOrganization(slug)),
    enabled: !!slug,
    retry: false,
  })
}

export function usePublicFounder(slug) {
  return useQuery({
    queryKey: ['public-founder', slug],
    queryFn: () => unwrap(api.publicFounder(slug)),
    enabled: !!slug,
    retry: false,
  })
}

// ---- career roadmap --------------------------------------------------------

/** The published role catalog — what a roadmap can be built against. */
export function useRoadmaps(params) {
  return useQuery({
    queryKey: ['roadmaps', params],
    queryFn: async () => {
      const { data, meta } = await api.roadmaps(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

/** The builder's own goal + computed plan (null until they pick a role). */
export function useMyRoadmap(enabled = true) {
  return useQuery({
    queryKey: ['my-roadmap'],
    queryFn: () => unwrap(api.myRoadmap()),
    enabled,
  })
}

export function useNotifications(params, enabled = true) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const { data, meta } = await api.notifications(params)
      return { items: data ?? [], meta }
    },
    enabled,
    placeholderData: keepPreviousData,
    // Keep the nav bell's unread count and feed live without a manual refresh.
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })
}

// ---- resume builder (private, per-user) -----------------------------------

export function useResumes(params, enabled = true) {
  return useQuery({
    queryKey: ['resumes', params],
    queryFn: async () => {
      const { data, meta } = await api.resumes(params)
      return { items: data ?? [], meta }
    },
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useResume(id) {
  return useQuery({
    queryKey: ['resume', id],
    queryFn: () => unwrap(api.resume(id)),
    enabled: !!id,
    retry: false,
  })
}

// ---- community / project showcase -----------------------------------------

export function useCommunityProjects(params) {
  return useQuery({
    queryKey: ['community-projects', params],
    queryFn: async () => {
      const { data, meta } = await api.communityProjects(params)
      return { items: data ?? [], meta }
    },
    placeholderData: keepPreviousData,
  })
}

export function useCommunityProject(slug) {
  return useQuery({
    queryKey: ['community-project', slug],
    queryFn: () => unwrap(api.communityProject(slug)),
    enabled: !!slug,
  })
}

export function useCommunityTags() {
  return useQuery({
    queryKey: ['community-tags'],
    queryFn: () => unwrap(api.communityTags()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommunityCategories() {
  return useQuery({
    queryKey: ['community-categories'],
    queryFn: () => unwrap(api.communityCategories()),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCommunityLeaderboard() {
  return useQuery({
    queryKey: ['community-leaderboard'],
    queryFn: () => unwrap(api.communityLeaderboard()),
    staleTime: 60 * 1000,
  })
}

export function useMyProjects(enabled = true) {
  return useQuery({
    queryKey: ['community-my-projects'],
    queryFn: () => unwrap(api.communityMyProjects()),
    enabled,
  })
}

export function useAuthorProjects(username) {
  return useQuery({
    queryKey: ['community-author-projects', username],
    queryFn: () => unwrap(api.communityAuthorProjects(username)),
    enabled: !!username,
  })
}
