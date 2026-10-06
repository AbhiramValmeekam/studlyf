import { Router } from 'express';
import { clearSessionCookie, setSessionCookie } from '../../common/auth/middleware.js';
import { revokeSession } from '../../common/auth/session-store.js';
import { limiter, noStore } from '../../common/middleware/security.js';
import { created, ok } from '../../common/http/respond.js';
import { parse } from '../../common/validation/index.js';
import { getMe } from '../users/users.service.js';
import { emailBody, loginBody, registerBody, resetBody, tokenBody } from './auth.schemas.js';
import * as auth from './auth.service.js';

const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

/**
 * Browsers get the session only as an HttpOnly cookie. Native/server clients that
 * send `X-Auth-Transport: bearer` also receive the token in the body for use as
 * `Authorization: Bearer <token>`.
 */
function sessionPayload(req, session) {
  return req.get('x-auth-transport') === 'bearer'
    ? { expiresAt: session.expiresAt, token: session.token }
    : { expiresAt: session.expiresAt };
}

export function authRouter(deps) {
  const { config, db } = deps;
  const r = Router();
  const on = config.rateLimit.enabled;
  const MIN = 60_000;

  r.use(noStore);

  const issue = async (req, res, result, status) => {
    setSessionCookie(res, config, result.session.token, result.session.expiresAt);
    const data = { user: await getMe(db, result.userId), session: sessionPayload(req, result.session) };
    return status === 201 ? created(res, data) : ok(res, data);
  };

  r.post('/register', limiter(on, { windowMs: 60 * MIN, limit: 5 }), async (req, res) => {
    const body = parse(registerBody, req.body);
    await issue(req, res, await auth.register(deps, body, meta(req)), 201);
  });

  r.post('/login', limiter(on, { windowMs: 15 * MIN, limit: 10, skipSuccessfulRequests: true }), async (req, res) => {
    const body = parse(loginBody, req.body);
    await issue(req, res, await auth.login(deps, body, meta(req)), 200);
  });

  r.post('/logout', async (req, res) => {
    if (req.auth) await revokeSession(db, req.auth.sessionId);
    clearSessionCookie(res, config);
    ok(res, { loggedOut: true });
  });

  r.post('/verify-email', limiter(on, { windowMs: 15 * MIN, limit: 20 }), async (req, res) => {
    const { token } = parse(tokenBody, req.body);
    await auth.verifyEmail(deps, token);
    ok(res, { emailVerified: true });
  });

  r.post('/resend-verification', limiter(on, { windowMs: 60 * MIN, limit: 5 }), async (req, res) => {
    const { email } = parse(emailBody, req.body);
    await auth.resendVerification(deps, email);
    ok(res, { message: 'If that account exists and is unverified, a new verification email has been sent.' });
  });

  r.post('/forgot-password', limiter(on, { windowMs: 60 * MIN, limit: 5 }), async (req, res) => {
    const { email } = parse(emailBody, req.body);
    await auth.forgotPassword(deps, email);
    ok(res, { message: 'If an account exists for that email, a reset link has been sent.' });
  });

  r.post('/reset-password', limiter(on, { windowMs: 15 * MIN, limit: 10 }), async (req, res) => {
    const { token, password } = parse(resetBody, req.body);
    await auth.resetPassword(deps, token, password);
    clearSessionCookie(res, config);
    ok(res, { passwordReset: true });
  });

  return r;
}
