import { generateToken, hashToken } from './tokens.js';

const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function createSession(
  db,
  userId,
  ttlMs,
  meta,
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt, // TTL index removes the document after this moment
    ip: meta.ip ?? null,
    userAgent: meta.userAgent?.slice(0, 512) ?? null,
  });
  return { token, expiresAt };
}

export async function findActiveSession(db, token) {
  const session = await db.Session.findOne({
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() }, // TTL deletion is lazy (~60s), so check explicitly
  })
    .select({ userId: 1, lastSeenAt: 1 })
    .lean();
  if (!session) return null;

  const user = await db.User.findById(session.userId)
    .select({ name: 1, email: 1, status: 1, primaryRole: 1, emailVerified: 1 })
    .lean();
  if (!user) return null;

  if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    await db.Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }
  return {
    sessionId: String(session._id),
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      status: user.status,
      primaryRole: user.primaryRole,
      emailVerified: user.emailVerified,
    },
  };
}

export async function revokeSession(db, sessionId) {
  await db.Session.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } });
}

export async function revokeAllUserSessions(db, userId) {
  await db.Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
