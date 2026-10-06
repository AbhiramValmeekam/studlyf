import { AppError } from '../../common/errors/app-error.js';
import { isDuplicateKeyError } from '../../common/middleware/error-handler.js';
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from '../../common/auth/password.js';
import { createSession, revokeAllUserSessions } from '../../common/auth/session-store.js';
import { generateToken, hashToken } from '../../common/auth/tokens.js';
import { passwordResetEmail, verificationEmail } from './auth.emails.js';

/** Only BUILDER / FOUNDER can be self-selected; everything else stays USER. */
export function roleForIntent(intent) {
  return intent === 'BUILDER' || intent === 'FOUNDER' ? intent : 'USER';
}

const emailTaken = () =>
  new AppError('EMAIL_TAKEN', 'An account with this email already exists', [{ field: 'email', message: 'Already registered' }]);

// Emails are validated + lower-cased by the schema before reaching here, so this is
// always an exact match on a plain string (never a query operator).
function findByEmail(db, email) {
  return db.User.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
}

async function issueToken(db, userId, purpose, ttlMs) {
  // A fresh token voids any outstanding one for the same purpose.
  await db.AuthToken.updateMany({ userId, purpose, consumedAt: null }, { $set: { consumedAt: new Date() } });
  const token = generateToken();
  await db.AuthToken.create({ userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

/** Atomically marks a token used (single findOneAndUpdate); returns its user or null if invalid/expired/used. */
async function consumeToken(db, token, purpose) {
  const row = await db.AuthToken.findOneAndUpdate(
    { tokenHash: hashToken(token), purpose, consumedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { consumedAt: new Date() } },
  )
    .select({ userId: 1 })
    .lean();
  return row ? String(row.userId) : null;
}

async function sendVerification(deps, user) {
  const token = await issueToken(deps.db, String(user._id), 'EMAIL_VERIFICATION', deps.config.auth.emailVerificationTtlMs);
  await deps.mailer.send(verificationEmail(deps.config, user, token));
}

export async function register(
  deps,
  input,
  meta,
) {
  const { db, config } = deps;
  if (await db.User.exists({ email: input.email })) throw emailTaken();

  const primaryRole = roleForIntent(input.intent);
  const now = new Date();
  let user;
  try {
    // One document = one atomic write: roles and the onboarding answer are embedded.
    user = await db.User.create({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash: await hashPassword(input.password, config.auth.passwordHashCost),
      primaryRole,
      roles: [...new Set(['USER', primaryRole])].map((role) => ({ role, grantedAt: now })),
      onboarding: input.intent ? { intent: input.intent, completedAt: now } : null,
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) throw emailTaken(); // lost a race with a concurrent sign-up
    throw err;
  }

  await sendVerification(deps, user);
  const session = await createSession(db, String(user._id), config.auth.sessionTtlMs, meta);
  return { userId: String(user._id), session };
}

export async function login(deps, input, meta) {
  const { db, config } = deps;
  const user = await findByEmail(db, input.email);
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyAgainstDummy(input.password, config.auth.passwordHashCost);
  if (!user || !valid) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_DISABLED', 'This account is not active');

  const updates = { lastLoginAt: new Date() };
  if (needsRehash(user.passwordHash, config.auth.passwordHashCost)) {
    updates.passwordHash = await hashPassword(input.password, config.auth.passwordHashCost);
  }
  await db.User.updateOne({ _id: user._id }, { $set: updates });
  const session = await createSession(db, String(user._id), config.auth.sessionTtlMs, meta);
  return { userId: String(user._id), session };
}

export async function verifyEmail(deps, token) {
  const userId = await consumeToken(deps.db, token, 'EMAIL_VERIFICATION');
  if (!userId) throw new AppError('INVALID_TOKEN', 'This verification link is invalid or has expired');
  await deps.db.User.updateOne({ _id: userId }, { $set: { emailVerified: true, emailVerifiedAt: new Date() } });
}

/** Always succeeds from the caller's view, so it can't be used to probe for accounts. */
export async function resendVerification(deps, email) {
  const user = await findByEmail(deps.db, email);
  if (user && user.status === 'ACTIVE' && !user.emailVerified) await sendVerification(deps, user);
}

export async function forgotPassword(deps, email) {
  const user = await findByEmail(deps.db, email);
  if (!user || user.status !== 'ACTIVE') return;
  const token = await issueToken(deps.db, String(user._id), 'PASSWORD_RESET', deps.config.auth.passwordResetTtlMs);
  await deps.mailer.send(passwordResetEmail(deps.config, user, token));
}

export async function resetPassword(deps, token, password) {
  const { db, config } = deps;
  const userId = await consumeToken(db, token, 'PASSWORD_RESET');
  if (!userId) throw new AppError('INVALID_TOKEN', 'This reset link is invalid or has expired');
  const passwordHash = await hashPassword(password, config.auth.passwordHashCost);
  // Revoke first: if the second write failed, the user is merely logged out (fail-safe).
  await revokeAllUserSessions(db, userId);
  // Receiving the reset email proves ownership of the address.
  await db.User.updateOne({ _id: userId }, { $set: { passwordHash, emailVerified: true } });
  await db.User.updateOne({ _id: userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
}
