import { achievementSchema } from './achievement.js';
import { auditLogSchema } from './audit.js';
import { applicationSchema } from './application.js';
import { builderProfileSchema } from './builder.js';
import { certificateSchema } from './certificate.js';
import { courseSchema } from './course.js';
import {
  homepageContentSchema,
  opportunitySchema,
  partnerSchema,
  pathCardSchema,
  platformStatSchema,
  resourceSchema,
  testimonialSchema,
} from './content.js';
import {
  founderProfileSchema,
  hrCandidateSchema,
  hrProfileSchema,
  investorConnectionSchema,
  investorProfileSchema,
  organizationMemberSchema,
  organizationSchema,
} from './ecosystem.js';
import { adminUserSchema, authTokenSchema, sessionSchema, userSchema } from './identity.js';
import { evaluationSchema, evaluationTemplateSchema } from './evaluation.js';
import { jobSchema } from './jobs.js';
import { mediaAssetSchema } from './media.js';
import { mockDrillSchema } from './mock.js';
import { notificationSchema } from './notification.js';
import { ottProgressSchema, ottSchema } from './ott.js';
import { projectMemberSchema, projectReportSchema, projectSchema, projectUpvoteSchema } from './project.js';
import { projectBriefSchema } from './project-briefs.js';
import { roadmapTemplateSchema, userRoadmapSchema } from './roadmap.js';
import { resumeSchema } from './resume.js';
import { savedItemSchema } from './saved.js';
import { skillSchema } from './skill.js';
import { studhubBenefitSchema } from './studhub.js';
import { projectSubmissionSchema } from './submission.js';
import { categorySchema, tagSchema } from './taxonomy.js';

export * from './enums.js';

/**
 * Binds every model to one connection. Models are per-connection (not the global
 * mongoose registry) so tests and scripts can run isolated databases side by side.
 * Future phases add schema files and register them here (BuilderProfile, Startup, …).
 */
export function createModels(connection) {
  return {
    connection,
    User: connection.model('User', userSchema),
    AdminUser: connection.model('AdminUser', adminUserSchema),
    Session: connection.model('Session', sessionSchema),
    AuthToken: connection.model('AuthToken', authTokenSchema),
    MediaAsset: connection.model('MediaAsset', mediaAssetSchema),
    Category: connection.model('Category', categorySchema),
    Tag: connection.model('Tag', tagSchema),
    HomepageContent: connection.model('HomepageContent', homepageContentSchema),
    PathCard: connection.model('PathCard', pathCardSchema),
    Partner: connection.model('Partner', partnerSchema),
    Opportunity: connection.model('Opportunity', opportunitySchema),
    Resource: connection.model('Resource', resourceSchema),
    PlatformStat: connection.model('PlatformStat', platformStatSchema),
    Testimonial: connection.model('Testimonial', testimonialSchema),
    AuditLog: connection.model('AuditLog', auditLogSchema),
    // Phase 2 — builder ecosystem
    Skill: connection.model('Skill', skillSchema),
    BuilderProfile: connection.model('BuilderProfile', builderProfileSchema),
    Application: connection.model('Application', applicationSchema),
    Notification: connection.model('Notification', notificationSchema),
    // Phase 3 — community showcase
    Project: connection.model('Project', projectSchema),
    ProjectUpvote: connection.model('ProjectUpvote', projectUpvoteSchema),
    // Phase 3 — learning tracks
    Course: connection.model('Course', courseSchema),
    // Phase 3 — STUDHub student-leverage catalog
    StudhubBenefit: connection.model('StudhubBenefit', studhubBenefitSchema),
    // Phase 3 — mock tests & interviews practice catalog
    MockDrill: connection.model('MockDrill', mockDrillSchema),
    // Phase 3 — build-a-project brief catalog
    ProjectBrief: connection.model('ProjectBrief', projectBriefSchema),
    // Phase 3 — career roadmaps (spec §52): authored templates + a person's chosen goal
    RoadmapTemplate: connection.model('RoadmapTemplate', roadmapTemplateSchema),
    UserRoadmap: connection.model('UserRoadmap', userRoadmapSchema),
    // Phase 3 — STUD OTT (spec §55): the streaming shelf + per-viewer progress
    Ott: connection.model('Ott', ottSchema),
    OttProgress: connection.model('OttProgress', ottProgressSchema),
    // Cross-ecosystem saves (spec §57) — one table behind every "save" in the product
    SavedItem: connection.model('SavedItem', savedItemSchema),
    // Phase 3 — user-owned resume builder
    Resume: connection.model('Resume', resumeSchema),
    // Phase 3 — project + proof-of-work ecosystem
    ProjectMember: connection.model('ProjectMember', projectMemberSchema),
    ProjectReport: connection.model('ProjectReport', projectReportSchema),
    ProjectSubmission: connection.model('ProjectSubmission', projectSubmissionSchema),
    EvaluationTemplate: connection.model('EvaluationTemplate', evaluationTemplateSchema),
    Evaluation: connection.model('Evaluation', evaluationSchema),
    Achievement: connection.model('Achievement', achievementSchema),
    // Verifiable credentials issued from results (spec §18/§68)
    Certificate: connection.model('Certificate', certificateSchema),
    // Multi-ecosystem platform — one account, several ecosystem profiles
    FounderProfile: connection.model('FounderProfile', founderProfileSchema),
    InvestorProfile: connection.model('InvestorProfile', investorProfileSchema),
    HrProfile: connection.model('HrProfile', hrProfileSchema),
    HrCandidate: connection.model('HrCandidate', hrCandidateSchema),
    // HR job posts (spec §73) — the public front door the private hiring pipeline hangs off.
    Job: connection.model('Job', jobSchema),
    Organization: connection.model('Organization', organizationSchema),
    OrganizationMember: connection.model('OrganizationMember', organizationMemberSchema),
    InvestorConnection: connection.model('InvestorConnection', investorConnectionSchema),
  };
}
