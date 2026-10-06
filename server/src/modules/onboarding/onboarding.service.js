import { AppError } from '../../common/errors/app-error.js';
import { roleForIntent } from '../auth/auth.service.js';
import { getMe } from '../users/users.service.js';

export const OPTIONS = [
  { intent: 'BUILDER', label: 'I am a Builder' },
  { intent: 'FOUNDER', label: 'I am a Founder' },
  { intent: 'INVESTOR', label: 'I am an Investor' },
  { intent: 'HR', label: 'I hire talent (HR)' },
  { intent: 'ORGANIZER', label: 'I run an organization' },
  { intent: 'EXPLORING', label: 'I am exploring STUDLYF' },
];

export async function get(db, userId) {
  const user = await db.User.findById(userId).select({ onboarding: 1 }).lean();
  return user?.onboarding ? { intent: user.onboarding.intent, completedAt: user.onboarding.completedAt } : null;
}

/**
 * Stores the selection. INVESTOR/HR/ORGANIZER only record the intent — those ecosystems are
 * unlocked by verification (see modules/ecosystems), never by this endpoint.
 * BUILDER/FOUNDER also grant that ecosystem role and become the
 * primary role — but only for self-service accounts (USER/BUILDER/FOUNDER), so this
 * endpoint can never change the role of an HR, investor or organizer account.
 * Each step is a single-document atomic update (no transaction needed).
 */
export async function save(db, userId, intent) {
  const now = new Date();
  const { matchedCount } = await db.User.updateOne({ _id: userId }, { $set: { onboarding: { intent, completedAt: now } } });
  if (!matchedCount) throw AppError.notFound('User');

  const role = roleForIntent(intent);
  if (role !== 'USER') {
    // Grant the role only if not already held (keeps roles[] a set).
    await db.User.updateOne({ _id: userId, 'roles.role': { $ne: role } }, { $push: { roles: { role, grantedAt: now, grantedBy: null } } });
    await db.User.updateOne({ _id: userId, primaryRole: { $in: ['USER', 'BUILDER', 'FOUNDER'] } }, { $set: { primaryRole: role } });
  }
  return getMe(db, userId);
}
