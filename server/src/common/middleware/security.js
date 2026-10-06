import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/app-error.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF defence-in-depth for cookie sessions: a state-changing request that carries an
 * Origin header must come from an allow-listed origin. Requests without Origin (curl,
 * server-to-server, mobile apps using Bearer tokens) are unaffected.
 */
export function originCheck(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) return next();
    const origin = req.get('origin');
    if (!origin || allowed.has(origin)) return next();
    next(new AppError('ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'));
  };
}

/** Wraps express-rate-limit so 429s use the standard error envelope. */
export function limiter(enabled, opts) {
  if (!enabled) return (_req, _res, next) => next();
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...opts,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 'Too many requests, please try again later')),
  });
}

/** Public, cacheable GET responses (browser + CDN). */
export function publicCache(maxAgeSeconds) {
  return (req, res, next) => {
    if (req.method === 'GET' && maxAgeSeconds > 0) {
      res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`);
    }
    next();
  };
}

export const noStore = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
