import { z } from 'zod';
import { resolve } from 'node:path';

const bool = (fallback) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));

/** True for an address only reachable from this machine — the shape of every unset URL default. */
const isLoopback = (url) => {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  MONGODB_URI: z.string().optional(),
  MONGODB_DB_NAME: z.string().regex(/^[A-Za-z0-9_-]{1,63}$/).optional(),

  APP_URL: z.url().default('http://localhost:5173'),
  API_PUBLIC_URL: z.url().default('http://localhost:4000'),
  CORS_ORIGINS: csv,

  COOKIE_NAME: z.string().default('studlyf_session'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.enum(['true', 'false', '1', '0']).optional(),
  // 'lax' is correct whenever the app and the API share a registrable domain — which they do in
  // the single-service layout (one origin) and in the www./api. subdomain split. Only a genuine
  // cross-site split needs 'none', which the browser accepts only alongside Secure.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().positive().default(24),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().positive().default(60),
  PASSWORD_HASH_COST: z.coerce.number().int().min(10).max(20).optional(),

  MAIL_DRIVER: z.enum(['console', 'smtp', 'memory']).optional(),
  MAIL_FROM: z.string().default('STUDLYF <no-reply@studlyf.local>'),
  SMTP_URL: z.string().optional(),

  STORAGE_DRIVER: z.enum(['local']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MEDIA_PUBLIC_BASE_URL: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(5),
  // Non-public files (project documents) — never served statically; streamed after a permission check.
  PRIVATE_UPLOAD_DIR: z.string().default('./uploads-private'),
  FEATURED_PROJECTS_LIMIT: z.coerce.number().int().min(1).max(24).default(6),

  RATE_LIMIT_ENABLED: bool(true),
  PUBLIC_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(60),

  // Directory holding the built frontend (Vite's dist/). Served by this same process, so the SPA,
  // the API and /media share one origin — which is what makes the session cookie work without
  // CORS, a COOKIE_DOMAIN, or a build-time API URL. Unset the directory and the API runs headless.
  CLIENT_DIR: z.string().default('../dist'),
});

export function loadConfig(source = process.env) {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test';

  // Dev/test default to an embedded mongod (mongodb-memory-server) so nothing needs installing.
  const databaseUrl =
    env.MONGODB_URI ?? (isTest ? 'embedded:memory' : isProd ? undefined : 'embedded:./.data/mongo');
  if (!databaseUrl) throw new Error('MONGODB_URI is required in production');
  if (isProd && databaseUrl.startsWith('embedded:')) {
    throw new Error('The embedded MongoDB is for development/tests only; set MONGODB_URI to a real MongoDB/Atlas URI');
  }

  const corsOrigins = env.CORS_ORIGINS.length ? env.CORS_ORIGINS : isProd ? [] : [env.APP_URL];
  if (isProd && corsOrigins.length === 0) throw new Error('CORS_ORIGINS is required in production');

  const mailDriver = env.MAIL_DRIVER ?? (isTest ? 'memory' : 'console');
  if (mailDriver === 'smtp' && !env.SMTP_URL) throw new Error('SMTP_URL is required when MAIL_DRIVER=smtp');
  // The console driver prints the full message body, and for verification/reset mail that body is
  // a live single-use credential. Refuse to run an environment where that lands in the log
  // stream and no mail is actually delivered.
  if (isProd && mailDriver !== 'smtp') {
    throw new Error(
      'MAIL_DRIVER=smtp (with SMTP_URL) is required in production: the console driver writes ' +
        'verification and password-reset links, live tokens included, into the log stream and delivers nothing.',
    );
  }

  // Both URLs default to localhost, which is right in development and broken in production —
  // and broken in a way that succeeds at boot and fails in the user's inbox or browser, so it
  // has to be caught here. APP_URL is the only thing verification and reset links are built
  // from, and STORAGE's public base URL is derived from API_PUBLIC_URL and written onto every
  // uploaded asset, so a localhost default would persist unreachable image URLs.
  if (isProd && isLoopback(env.APP_URL)) {
    throw new Error(
      'APP_URL must be the public origin of the website in production (e.g. https://studlyf.com), not a ' +
        'localhost address: it is the base of every email verification and password-reset link, so the ' +
        'default would mail users a URL only reachable on the server itself.',
    );
  }
  if (isProd && !env.MEDIA_PUBLIC_BASE_URL && isLoopback(env.API_PUBLIC_URL)) {
    throw new Error(
      'API_PUBLIC_URL must be the public origin of this API in production (e.g. https://studlyf.com), not a ' +
        'localhost address: uploaded media URLs are built from it and stored on the asset, so the default ' +
        'would write unreachable links into the database. Set MEDIA_PUBLIC_BASE_URL instead if a CDN serves them.',
    );
  }

  // Rate limits key on the client IP. Behind a proxy that is the proxy's address unless trust
  // proxy is set, which silently collapses every user into one bucket. Require an explicit answer
  // rather than defaulting, because the right value depends on the deployment.
  if (isProd && source.TRUST_PROXY === undefined) {
    throw new Error(
      'TRUST_PROXY is required in production: set it to the number of proxy hops in front of this ' +
        'server (usually 1 behind a load balancer or CDN), or 0 when nothing proxies it.',
    );
  }

  return {
    env: env.NODE_ENV,
    isProd,
    isTest,
    port: env.PORT,
    logLevel: env.LOG_LEVEL ?? (isTest ? 'silent' : isProd ? 'info' : 'debug'),
    trustProxy: env.TRUST_PROXY,
    databaseUrl,
    databaseName: env.MONGODB_DB_NAME,
    appUrl: env.APP_URL.replace(/\/$/, ''),
    apiPublicUrl: env.API_PUBLIC_URL.replace(/\/$/, ''),
    corsOrigins,
    cookie: {
      name: env.COOKIE_NAME,
      domain: env.COOKIE_DOMAIN || undefined,
      // A `none` SameSite is honoured only alongside Secure, so force it rather than letting a
      // misconfiguration produce a cookie the browser stores but never sends.
      sameSite: env.COOKIE_SAMESITE,
      secure:
        env.COOKIE_SAMESITE === 'none'
          ? true
          : env.COOKIE_SECURE
            ? env.COOKIE_SECURE === 'true' || env.COOKIE_SECURE === '1'
            : isProd,
    },
    auth: {
      sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
      emailVerificationTtlMs: env.EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
      passwordResetTtlMs: env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
      // scrypt N = 2^cost. 15 is the production default; tests use 12 for speed.
      passwordHashCost: env.PASSWORD_HASH_COST ?? (isTest ? 12 : 15),
    },
    mail: { driver: mailDriver, from: env.MAIL_FROM, smtpUrl: env.SMTP_URL },
    storage: {
      driver: env.STORAGE_DRIVER,
      uploadDir: env.UPLOAD_DIR,
      publicBaseUrl: (env.MEDIA_PUBLIC_BASE_URL ?? `${env.API_PUBLIC_URL.replace(/\/$/, '')}/media`).replace(/\/$/, ''),
      maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
      privateUploadDir: env.PRIVATE_UPLOAD_DIR,
    },
    projects: { featuredLimit: env.FEATURED_PROJECTS_LIMIT },
    rateLimit: { enabled: env.RATE_LIMIT_ENABLED },
    cache: { publicTtlSeconds: env.PUBLIC_CACHE_TTL_SECONDS },
    // Resolved against the server's own working directory (server/), so the default `../dist`
    // finds the frontend build sitting beside it in the repo.
    clientDir: resolve(env.CLIENT_DIR),
  };
}
