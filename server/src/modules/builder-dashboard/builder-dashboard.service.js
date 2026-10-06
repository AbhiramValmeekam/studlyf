import { APPLICATION_STATUSES } from '../../database/schema/index.js';
import * as appsRepo from '../applications/applications.repository.js';
import { toPublicList } from '../opportunities/opportunities.service.js';
import * as notifService from '../notifications/notifications.service.js';
import { computeCompletion } from '../profile/completion.js';
import { loadAccount } from '../profile/profile.service.js';
import { recommend } from './recommendations.js';
import { builderSummary } from '../proof-of-work/proof-of-work.service.js';

/** Aggregated builder home: profile completion, application counts, recommendations, recent notifications. */
export async function getDashboard(db, userId) {
  const profile = await db.BuilderProfile.findOne({ userId }).lean();
  const account = await loadAccount(db, userId);

  const [counts, funnel, recommended, notifications, proofOfWork] = await Promise.all([
    appsRepo.countsByStatus(db, userId),
    appsRepo.funnelByStage(db, userId),
    recommend(db, profile, { limit: 5 }),
    notifService.list(db, userId, { unread: false, page: 1, pageSize: 5 }),
    builderSummary(db, userId),
  ]);

  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, counts[s] ?? 0]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  // Same unified score as /me and the profile page (counts personal fields even before a builder profile exists).
  const completion = computeCompletion(account, profile);

  return {
    profile: {
      exists: !!profile,
      username: profile?.username ?? null,
      visibility: profile?.visibility ?? null,
      completion,
    },
    applications: { total, byStatus, funnel },
    recommendations: await toPublicList(db, recommended),
    notifications: { unreadCount: notifications.unreadCount, recent: notifications.items },
    // Phase 3 — projects, submissions, achievements and evaluations (no single "talent score").
    proofOfWork,
  };
}
