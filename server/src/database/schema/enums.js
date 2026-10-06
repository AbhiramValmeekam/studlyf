
export const ROLES = ['USER', 'BUILDER', 'FOUNDER', 'ORGANIZER', 'HR', 'INVESTOR', 'EVALUATOR', 'ADMIN'];

/** Roles a visitor may pick for themselves through public sign-up / onboarding. */
export const SELF_SERVICE_ROLES = ['USER', 'BUILDER', 'FOUNDER'];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

export const ADMIN_LEVELS = ['SUPER_ADMIN', 'EDITOR'];

export const AUTH_TOKEN_PURPOSES = ['EMAIL_VERIFICATION', 'PASSWORD_RESET'];

/**
 * The "How will you use STUDLYF?" answer. BUILDER/FOUNDER are self-service (they grant the role);
 * INVESTOR/HR/ORGANIZER only record where the person was heading — those ecosystems are reached
 * through an access request / organization verification, never by picking an intent.
 */
export const ONBOARDING_INTENTS = ['BUILDER', 'FOUNDER', 'INVESTOR', 'HR', 'ORGANIZER', 'EXPLORING'];

export const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const OPPORTUNITY_TYPES = ['HACKATHON', 'COMPETITION', 'INTERNSHIP', 'CHALLENGE', 'FELLOWSHIP', 'JOB', 'WORKSHOP', 'PROGRAM'];

export const OPPORTUNITY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID'];

// ---- Personal profile ("Complete your profile") -----------------------------

/** Optional; collected for eligibility-gated programs (e.g. women-only hackathons). */
export const GENDERS = ['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'];

/** Current year of study; GRADUATED covers alumni and working professionals. */
export const YEARS_OF_STUDY = ['1', '2', '3', '4', '5', 'GRADUATED'];

/** "What are you looking for?" — drives recommendations and the explore feed. */
export const PROFILE_INTERESTS = [
  'INTERNSHIPS',
  'JOBS',
  'HACKATHONS',
  'COMPETITIONS',
  'PROJECTS',
  'MENTORSHIP',
  'COURSES',
  'STARTUPS',
];

// ---- Phase 2: Builder ecosystem ---------------------------------------------

/** Who can see a builder's public profile. */
export const PROFILE_VISIBILITIES = ['PUBLIC', 'PRIVATE'];

/**
 * Spec §68 — who may see a founder's startup. Broader than a builder profile because the
 * founder already has an investor-facing side: `INVESTOR_VISIBLE` is the safe default (verified
 * investors, as today) and `PUBLIC` is the founder opting into a page anyone can open.
 */
export const FOUNDER_VISIBILITIES = ['PUBLIC', 'INVESTOR_VISIBLE', 'PRIVATE'];

/**
 * Spec §52 — how much a roadmap step blocks the target role. CORE is the must-have set, and is
 * what "what should I learn next?" ranks by; OPTIONAL is polish once the rest is in place.
 */
export const ROADMAP_STEP_PRIORITIES = ['CORE', 'IMPORTANT', 'OPTIONAL'];

/** Spec §55 — the kinds of content STUD OTT carries. */
export const OTT_KINDS = ['VIDEO', 'ARTICLE', 'SERIES', 'COURSE'];

/** Self-declared proficiency for a skill on a builder profile. */
export const SKILL_PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

/** What a builder is currently open to (validated at the schema/Zod layer). */
export const BUILDER_AVAILABILITIES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'NOT_AVAILABLE'];

/**
 * Application lifecycle. Builders drive DRAFT→SUBMITTED and may WITHDRAW; admins move
 * SUBMITTED→UNDER_REVIEW→{SHORTLISTED,SELECTED,REJECTED}. SELECTED/REJECTED/WITHDRAWN are terminal.
 */
export const APPLICATION_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN'];

/** Field types for an opportunity's custom application questions. */
export const APPLICATION_QUESTION_TYPES = ['SHORT_TEXT', 'LONG_TEXT', 'URL', 'SINGLE_SELECT', 'MULTI_SELECT', 'BOOLEAN'];

/** In-app notification kinds (no email/push in this phase). */
export const NOTIFICATION_TYPES = [
  'APPLICATION_STATUS',
  'PROFILE_REMINDER',
  'SYSTEM',
  'PROJECT_UPVOTE',
  // Phase 3 — projects, submissions, evaluations, achievements
  'PROJECT_TEAM',
  'PROJECT_SUBMITTED',
  'SUBMISSION_STATUS',
  'EVALUATION_ASSIGNED',
  'EVALUATION_COMPLETED',
  'ACHIEVEMENT',
  'PROJECT_MODERATION',
  // Multi-ecosystem access + connections
  'ACCESS_STATUS',
  'INVESTOR_CONNECTION',
  'HR_INVITATION',
  'ORGANIZATION_MEMBER',
];

// ---- Phase 3: Builder ecosystem — community, learning, career tools ---------

/** Community project-showcase categories (mirrors the on-site filter chips). */
export const PROJECT_CATEGORIES = [
  'WEB', 'MOBILE', 'AI_ML', 'BLOCKCHAIN', 'DEVTOOLS', 'GAMING', 'IOT', 'FINTECH', 'HEALTHTECH', 'EDUCATION', 'OTHER',
];

/** Sort modes for the community feed. */
export const PROJECT_SORTS = ['TRENDING', 'NEW', 'TOP'];

/** Learning-track audiences: student-facing Courses vs corporate Company Learning Modules. */
export const COURSE_AUDIENCES = ['STUDENT', 'COMPANY'];

/** Course difficulty / readiness level. */
export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/** STUDHub perk kinds: verified scholarships, software discounts, exclusive student leverage. */
export const STUDHUB_TYPES = ['SCHOLARSHIP', 'DISCOUNT', 'PERK'];

/** Practice-catalog kinds for mock tests & interviews. */
export const MOCK_KINDS = ['TEST', 'INTERVIEW'];

export const RESOURCE_TYPES = ['ARTICLE', 'VIDEO', 'GUIDE', 'ANNOUNCEMENT', 'OPPORTUNITY_RESOURCE'];

/** Categories live in one taxonomy, partitioned by the surface that owns them. */
export const CATEGORY_SCOPES = ['OPPORTUNITY', 'RESOURCE', 'TESTIMONIAL', 'PARTNER', 'OTT'];

export const MEDIA_DRIVERS = ['LOCAL', 'S3', 'EXTERNAL'];

export const MEDIA_PURPOSES = ['LOGO', 'THUMBNAIL', 'BANNER', 'AVATAR', 'PARTNER_LOGO', 'ICON', 'SCREENSHOT', 'DOCUMENT', 'OTHER'];

// ---- Phase 3: Builder project + proof-of-work ecosystem ----------------------

/** What kind of work a project is. */
export const PROJECT_TYPES = ['PERSONAL', 'ACADEMIC', 'HACKATHON', 'COMPETITION', 'STARTUP', 'OPEN_SOURCE', 'RESEARCH', 'OTHER'];

/**
 * Project lifecycle (spec order). DRAFT/IN_PROGRESS/COMPLETED are set by the builder;
 * PUBLISHED by the publish action; SUBMITTED/UNDER_REVIEW/EVALUATED by the submission +
 * evaluation flow (forward-only, see modules/projects/status.js); ARCHIVED by archive.
 * Public discovery is governed by `visibility` + `publishedAt` + moderation, never by status alone.
 */
export const PROJECT_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED', 'UNDER_REVIEW', 'EVALUATED', 'PUBLISHED', 'ARCHIVED'];

/** Builder-settable work states (the rest are driven by actions and the review flow). */
export const PROJECT_WORK_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED'];

/** PRIVATE: team + admins only. UNLISTED: anyone with the link. PUBLIC: link + discovery. */
export const PROJECT_VISIBILITIES = ['PRIVATE', 'PUBLIC', 'UNLISTED'];

export const PROJECT_MEMBER_ROLES = ['OWNER', 'CO_BUILDER', 'CONTRIBUTOR', 'MENTOR'];

/** Team invitations must be accepted before a member is shown publicly. */
export const PROJECT_MEMBER_STATUSES = ['INVITED', 'ACTIVE'];

export const MODERATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'];

export const PROJECT_REPORT_REASONS = ['SPAM', 'PLAGIARISM', 'INAPPROPRIATE', 'MISLEADING', 'OTHER'];

export const PROJECT_REPORT_STATUSES = ['OPEN', 'RESOLVED'];

/** Supporting assets attached to a project (the thumbnail is `coverImageId`; the demo video is `links.video`). */
export const PROJECT_MEDIA_KINDS = ['SCREENSHOT', 'DOCUMENT'];

/** Project → opportunity submission lifecycle (mirrors application statuses). */
export const SUBMISSION_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN'];

export const EVALUATION_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

/** Who may see an evaluation's scores or a piece of evaluator feedback. */
export const FEEDBACK_VISIBILITIES = ['INTERNAL', 'BUILDER_VISIBLE', 'PUBLIC'];

export const ACHIEVEMENT_TYPES = [
  'PROJECT_COMPLETED',
  'HACKATHON_PARTICIPATION',
  'SHORTLISTED',
  'FINALIST',
  'WINNER',
  'CERTIFICATE',
  'COMPETITION',
  'OPEN_SOURCE',
  'OTHER',
];

/** Types a builder may add themselves (the rest are issued by the platform or an admin). */
export const USER_ACHIEVEMENT_TYPES = ['HACKATHON_PARTICIPATION', 'FINALIST', 'WINNER', 'CERTIFICATE', 'COMPETITION', 'OPEN_SOURCE', 'OTHER'];

/** SYSTEM = issued by STUDLYF (platform events or an admin award); USER = added by the builder. */
export const ACHIEVEMENT_SOURCES = ['SYSTEM', 'USER'];

/** Users can never set this — only the platform (system achievements) or an admin. */
export const ACHIEVEMENT_VERIFICATION_STATUSES = ['UNVERIFIED', 'VERIFIED', 'REJECTED'];

export const ACHIEVEMENT_VISIBILITIES = ['PUBLIC', 'PRIVATE'];

/**
 * Verifiable credentials (spec §18/§68). A certificate is the issued document behind a
 * result — it carries a public verification code, so it is a separate record from the
 * achievement it was minted from, and can be revoked without rewriting history.
 */
export const CERTIFICATE_TYPES = ['PARTICIPATION', 'COMPLETION', 'SHORTLIST', 'FINALIST', 'WINNER', 'MERIT'];
export const CERTIFICATE_STATUSES = ['ACTIVE', 'REVOKED'];

// ---- Multi-ecosystem platform ------------------------------------------------

/** The five STUDLYF ecosystems. One account can belong to several. */
export const ECOSYSTEMS = ['BUILDER', 'FOUNDER', 'INVESTOR', 'HR', 'ORGANIZER'];

/** Verification state of a controlled ecosystem (investor / HR access, organizations). */
export const ACCESS_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];

export const STARTUP_STAGES = ['IDEA', 'VALIDATION', 'MVP', 'EARLY_TRACTION', 'GROWTH', 'SCALING'];
export const FUNDING_STAGES = ['BOOTSTRAPPED', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B_PLUS'];
export const INVESTOR_TYPES = ['ANGEL', 'VC', 'ACCELERATOR', 'FAMILY_OFFICE', 'CORPORATE', 'OTHER'];
export const ORGANIZATION_TYPES = [
  'COMPANY',
  'COLLEGE',
  'UNIVERSITY',
  'STARTUP',
  'COMMUNITY',
  'NGO',
  'INCUBATOR',
  'INNOVATION_ORG',
  'EVENT_ORGANIZER',
  'OTHER',
];
/**
 * OWNER/ADMIN manage members and everything else; ORGANIZER runs programs and reviews participants;
 * EVALUATOR scores submissions assigned to them; VIEWER is read-only.
 */
export const ORGANIZATION_MEMBER_ROLES = ['OWNER', 'ADMIN', 'ORGANIZER', 'EVALUATOR', 'VIEWER'];
export const STARTUP_TYPES = ['B2B', 'B2C', 'B2B2C', 'D2C', 'MARKETPLACE', 'SAAS', 'DEEPTECH', 'HARDWARE', 'SOCIAL_IMPACT', 'OTHER'];
export const CONNECTION_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'];
/** An HR user's private hiring pipeline for a builder. */
/** SHORTLISTED → INVITED (the builder is notified) → INTERVIEW → OFFER → HIRED (joining). */
export const HIRING_STAGES = ['SHORTLISTED', 'INVITED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

// ---- Job posts (spec §73) ----------------------------------------------------

/**
 * An HR job post is its own entity, not an opportunity re-skinned: the two carry different
 * questions (compensation and seniority rather than deadlines and prizes), and the HR pipeline
 * hangs off the job. These four enums are the parts an opportunity genuinely has no equivalent for.
 */
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'FREELANCE'];
export const WORK_MODES = ['ONSITE', 'REMOTE', 'HYBRID'];
export const EXPERIENCE_LEVELS = ['ENTRY', 'MID', 'SENIOR', 'LEAD'];
export const SALARY_PERIODS = ['MONTH', 'YEAR'];

/**
 * What a user can save (spec §57). One mechanism for the whole platform — the investor's
 * shortlist is the same table as a builder's bookmarked opportunity, so "saved" means the
 * same thing wherever a user meets it.
 */
export const SAVEABLE_TYPES = [
  'OPPORTUNITY',
  'RESOURCE',
  'COURSE',
  'STUDHUB',
  'OTT',
  'MOCK_DRILL',
  'PROJECT_BRIEF',
  'ROADMAP',
  'PROJECT',
  'FOUNDER',
  'BUILDER',
  'ORGANIZATION',
  'JOB',
];
