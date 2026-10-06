import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { loadSession } from './common/auth/middleware.js';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler.js';
import { limiter, originCheck, publicCache } from './common/middleware/security.js';
import { serveClient } from './common/middleware/client.js';
import { ok } from './common/http/respond.js';
import { LocalDiskStorage } from './common/storage/storage.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { applicationsBuilderRouter } from './modules/applications/applications.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { builderDashboardRouter } from './modules/builder-dashboard/builder-dashboard.routes.js';
import { builderProfilePublicRouter, builderProfileRouter } from './modules/builder-profiles/builder-profiles.routes.js';
import { communityRouter } from './modules/community/community.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { submissionsRouter } from './modules/submissions/submissions.routes.js';
import { builderEvaluationsRouter, evaluatorRouter } from './modules/evaluations/evaluations.routes.js';
import { achievementsRouter } from './modules/achievements/achievements.routes.js';
import { certificatesPublicRouter } from './modules/certificates/certificates.routes.js';
import { coursesPublicRouter } from './modules/courses/courses.routes.js';
import { homepagePublicRouter } from './modules/homepage/homepage.routes.js';
import { mockPublicRouter } from './modules/mock/mock.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { onboardingRouter } from './modules/onboarding/onboarding.routes.js';
import { opportunitiesPublicRouter } from './modules/opportunities/opportunities.routes.js';
import { ottPublicRouter, ottViewerRouter } from './modules/ott/ott.routes.js';
import { partnersPublicRouter } from './modules/partners/partners.module.js';
import { pathsPublicRouter } from './modules/paths/paths.module.js';
import { projectBriefsPublicRouter } from './modules/project-briefs/project-briefs.routes.js';
import { resourcesPublicRouter } from './modules/resources/resources.routes.js';
import { builderRoadmapRouter, roadmapsPublicRouter } from './modules/roadmaps/roadmaps.routes.js';
import { resumesRouter } from './modules/resumes/resumes.routes.js';
import { savedRouter } from './modules/saved/saved.routes.js';
import { searchPublicRouter } from './modules/search/search.routes.js';
import { skillsPublicRouter } from './modules/skills/skills.routes.js';
import { statsPublicRouter } from './modules/stats/stats.module.js';
import { studhubPublicRouter } from './modules/studhub/studhub.routes.js';
import { taxonomyPublicRouter } from './modules/taxonomy/taxonomy.routes.js';
import { testimonialsPublicRouter } from './modules/testimonials/testimonials.module.js';
import { meRouter } from './modules/users/users.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { ecosystemsRouter } from './modules/ecosystems/ecosystems.routes.js';
import { founderPublicRouter, founderRouter } from './modules/founder/founder.routes.js';
import { investorRouter } from './modules/investor/investor.routes.js';
import { hrRouter } from './modules/hr/hr.routes.js';
import { hrJobsRouter, jobsPublicRouter } from './modules/jobs/jobs.routes.js';
import { organizationsRouter, organizationsPublicRouter } from './modules/organizations/organizations.routes.js';
import { mediaUploadRouter } from './modules/media/media.routes.js';

/**
 * The API only ever answers JSON, so a strict CSP costs it nothing. Because the frontend is
 * served from this same process, this policy also governs the app's HTML — where it must admit
 * the two third-party stylesheets index.html links, the inline <style> that paints the
 * pre-hydration background, and the style attributes React sets throughout (animated gradients,
 * progress bars, the theme toggle).
 *
 * Scripts stay 'self'. The pre-paint theme bootstrap is an external file precisely so that no
 * inline script — and no hash to keep in sync — is needed.
 */
function cspFor(config) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://api.fontshare.com', 'https://fonts.googleapis.com'],
    // Font files are referenced from inside third-party stylesheets whose hosts we do not control
    // (Google Fonts serves from gstatic, Fontshare from its own CDN), so this stays host-agnostic.
    'font-src': ["'self'", 'data:', 'https:'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    // helmet sends this by default. Over plain http — a local run of the built app — it rewrites
    // every subresource to https:// and nothing loads, so only send it where it is actually true.
    'upgrade-insecure-requests': config.isProd ? [] : null,
  };
  return { useDefaults: true, directives };
}

export function createApp(deps) {
  const { config, db, logger } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('etag', 'strong');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
    }),
  );
  app.use(helmet({ contentSecurityPolicy: cspFor(config), crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Auth-Transport'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Local uploads are served read-only with safe headers; S3/R2 would serve its own URLs.
  if (deps.storage instanceof LocalDiskStorage) {
    app.use(
      '/media',
      express.static(deps.storage.root, {
        fallthrough: false,
        index: false,
        dotfiles: 'deny',
        maxAge: '30d',
        immutable: true,
        setHeaders: (res) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Content-Security-Policy', "default-src 'none'");
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      }),
    );
  }

  const v1 = Router();
  v1.use(limiter(config.rateLimit.enabled, { windowMs: 60_000, limit: 300 }));
  v1.use(originCheck(config.corsOrigins));
  v1.use(loadSession(db, config));

  v1.get('/health', (_req, res) => ok(res, { status: 'ok', time: new Date().toISOString() }));

  // Liveness above, readiness here: /health answers as long as the event loop turns, but a process
  // that has lost MongoDB is not ready to take traffic and must not be routed to. Point the
  // platform's readiness probe at this, not at /health.
  v1.get('/ready', (_req, res) => {
    if (db.connection?.readyState === 1) return ok(res, { status: 'ready', db: 'connected' });
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_READY', message: 'The database connection is not available' },
    });
  });

  // Accounts + admin (all `no-store`)
  v1.use('/auth', authRouter(deps));
  v1.use(meRouter(deps));
  v1.use(profileRouter(deps));
  v1.use(onboardingRouter(deps));
  v1.use(builderProfileRouter(deps));
  v1.use(applicationsBuilderRouter(deps));
  v1.use(builderDashboardRouter(deps));
  // Career roadmap (§52) — the builder's own goal + computed plan. Authenticated, so it is mounted
  // with the account routes rather than in the cacheable public group below.
  v1.use(builderRoadmapRouter(deps));
  v1.use(notificationsRouter(deps));
  v1.use(resumesRouter(deps));
  v1.use(communityRouter(deps));
  // Phase 3 — projects + proof of work (mounted before the public-content group so public
  // project pages and discovery are never served from the shared public cache).
  v1.use(projectsRouter(deps));
  v1.use(submissionsRouter(deps));
  v1.use(evaluatorRouter(deps));
  v1.use(builderEvaluationsRouter(deps));
  v1.use(achievementsRouter(deps));
  // Public certificate verification — deliberately outside the cacheable public group below, so a
  // revocation is never served from a stale cache.
  v1.use(certificatesPublicRouter(deps));
  // STUD OTT (spec §55) — a viewer's own shelf. Per-viewer, so it must never sit in the shared
  // public cache below.
  v1.use(ottViewerRouter(deps));
  // Cross-ecosystem saves (spec §57) — one private list per user, for the whole platform.
  v1.use(savedRouter(deps));
  // Signed-in image uploads (organizer / HR / builder posters). Authenticated + rate-limited, so
  // it belongs with the account routes, never in the cacheable public group.
  v1.use(mediaUploadRouter(deps));
  // Multi-ecosystem platform — one account, five ecosystems, each gated server-side.
  v1.use(ecosystemsRouter(deps));
  v1.use(founderRouter(deps));
  v1.use(investorRouter(deps));
  v1.use(hrRouter(deps));
  // A verified HR account's own job posts (spec §73) — owner-scoped and never cached, so a draft
  // is invisible until the poster publishes it. The public board lives in the cacheable group below.
  v1.use(hrJobsRouter(deps));
  v1.use(organizationsRouter(deps));
  v1.use('/admin', adminRouter(deps));

  // Public, cacheable content
  const publicContent = Router();
  publicContent.use(publicCache(config.cache.publicTtlSeconds));
  for (const router of [
    homepagePublicRouter,
    pathsPublicRouter,
    opportunitiesPublicRouter,
    jobsPublicRouter,
    resourcesPublicRouter,
    coursesPublicRouter,
    studhubPublicRouter,
    mockPublicRouter,
    projectBriefsPublicRouter,
    partnersPublicRouter,
    testimonialsPublicRouter,
    statsPublicRouter,
    taxonomyPublicRouter,
    searchPublicRouter,
    skillsPublicRouter,
    builderProfilePublicRouter,
    organizationsPublicRouter,
    founderPublicRouter,
    roadmapsPublicRouter,
    ottPublicRouter,
  ]) {
    publicContent.use(router(deps));
  }
  v1.use(publicContent);

  app.use('/api/v1', v1);

  // The built frontend, from this same origin — see common/middleware/client.js. Mounted after the
  // API so /api/v1 always wins, and before the 404 handler so deep links reach the SPA shell.
  app.use(serveClient(config));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
