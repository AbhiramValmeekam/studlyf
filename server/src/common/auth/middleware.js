import { AppError } from '../errors/app-error.js';
import { findActiveSession } from './session-store.js';

function extractToken(req, cookieName) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  const cookie = req.cookies?.[cookieName];
  return typeof cookie === 'string' && cookie ? cookie : undefined;
}

export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/',
    domain: config.cookie.domain,
  };
}

export function setSessionCookie(res, config, token, expiresAt) {
  res.cookie(config.cookie.name, token, { ...sessionCookieOptions(config), expires: expiresAt });
}

export function clearSessionCookie(res, config) {
  res.clearCookie(config.cookie.name, sessionCookieOptions(config));
}

/** Resolves the caller's session if present. Never rejects — guards below do that. */
export function loadSession(db, config) {
  return async (req, _res, next) => {
    const token = extractToken(req, config.cookie.name);
    if (token && token.length <= 128) {
      const found = await findActiveSession(db, token);
      if (found) req.auth = { user: found.user, sessionId: found.sessionId };
    }
    next();
  };
}

export const requireAuth = (req, _res, next) => {
  if (!req.auth) return next(AppError.unauthenticated());
  if (req.auth.user.status !== 'ACTIVE') return next(new AppError('ACCOUNT_DISABLED', 'This account is not active'));
  next();
};

/**
 * Admin access is decided only by an active `admin_users` document, looked up on every
 * request. Role claims from the client are never consulted.
 */
export function requireAdmin(db) {
  return async (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthenticated());
    if (req.auth.user.status !== 'ACTIVE') return next(new AppError('ACCOUNT_DISABLED', 'This account is not active'));
    const admin = await db.AdminUser.findOne({ userId: req.auth.user.id, active: true }).select({ level: 1 }).lean();
    if (!admin) return next(AppError.forbidden('Admin access required'));
    req.auth.admin = { level: admin.level };
    next();
  };
}

export const requireSuperAdmin = (req, _res, next) => {
  if (req.auth?.admin?.level !== 'SUPER_ADMIN') return next(AppError.forbidden('Super admin access required'));
  next();
};

/**
 * Gate a route on the caller holding a given role. The session (`req.auth.user`) does not
 * carry `roles[]`, so membership is confirmed against the database on every request — role
 * claims from the client are never trusted (same principle as `requireAdmin`).
 */
export function requireRole(db, role) {
  return async (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthenticated());
    if (req.auth.user.status !== 'ACTIVE') return next(new AppError('ACCOUNT_DISABLED', 'This account is not active'));
    const has = await db.User.exists({ _id: req.auth.user.id, 'roles.role': role });
    if (!has) return next(AppError.forbidden(`${role} access required`));
    next();
  };
}

export const requireBuilder = (db) => requireRole(db, 'BUILDER');
