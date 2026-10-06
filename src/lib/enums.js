// Mirrors of server enums (server/src/database/schema/enums.js) used by ecosystem forms.
export const STARTUP_STAGES = ['IDEA', 'VALIDATION', 'MVP', 'EARLY_TRACTION', 'GROWTH', 'SCALING']
export const FUNDING_STAGES = ['BOOTSTRAPPED', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B_PLUS']
/** Spec §68 — who may open a founder's public startup page at /founders/<slug>. */
export const FOUNDER_VISIBILITIES = ['INVESTOR_VISIBLE', 'PUBLIC', 'PRIVATE']
export const STARTUP_TYPES = ['B2B', 'B2C', 'B2B2C', 'D2C', 'MARKETPLACE', 'SAAS', 'DEEPTECH', 'HARDWARE', 'SOCIAL_IMPACT', 'OTHER']
export const INVESTOR_TYPES = ['ANGEL', 'VC', 'ACCELERATOR', 'FAMILY_OFFICE', 'CORPORATE', 'OTHER']
export const ORGANIZATION_TYPES = ['COMPANY', 'COLLEGE', 'UNIVERSITY', 'STARTUP', 'COMMUNITY', 'NGO', 'INCUBATOR', 'INNOVATION_ORG', 'EVENT_ORGANIZER', 'OTHER']
export const ORGANIZATION_MEMBER_ROLES = ['OWNER', 'ADMIN', 'ORGANIZER', 'EVALUATOR', 'VIEWER']
export const HIRING_STAGES = ['SHORTLISTED', 'INVITED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']
export const BUILDER_AVAILABILITIES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'NOT_AVAILABLE']
export const OPPORTUNITY_TYPES = ['HACKATHON', 'COMPETITION', 'INTERNSHIP', 'CHALLENGE', 'FELLOWSHIP', 'JOB', 'WORKSHOP', 'PROGRAM']
export const OPPORTUNITY_MODES = ['ONLINE', 'OFFLINE', 'HYBRID']
export const USER_ACHIEVEMENT_TYPES = ['HACKATHON_PARTICIPATION', 'FINALIST', 'WINNER', 'CERTIFICATE', 'COMPETITION', 'OPEN_SOURCE', 'OTHER']
/** Spec §5 — what kind of build a project is. Required before a project can be published. */
export const PROJECT_TYPES = ['PERSONAL', 'ACADEMIC', 'HACKATHON', 'COMPETITION', 'STARTUP', 'OPEN_SOURCE', 'RESEARCH', 'OTHER']
/** Spec §73 — an HR job post's own vocabulary (it is not an opportunity re-skinned). */
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'CONTRACT', 'FREELANCE']
export const WORK_MODES = ['ONSITE', 'REMOTE', 'HYBRID']
export const EXPERIENCE_LEVELS = ['ENTRY', 'MID', 'SENIOR', 'LEAD']
export const SALARY_PERIODS = ['MONTH', 'YEAR']
