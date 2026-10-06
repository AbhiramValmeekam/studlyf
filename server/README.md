# STUDLYF API

The backend for the whole STUDLYF platform. It powers:

- the public site: homepage CMS, opportunities, resources, courses, STUD Hub, community
  projects, mock drills, job posts, certificates and public profiles
- accounts: sign-up, login, email verification, password reset, one-question onboarding
- all four product surfaces — **Builder, Founder, Investor and HR/Organizer** — including
  applications, project submissions and evaluation, the founder workspace, investor discovery,
  the hiring pipeline and organizer programme management
- an admin CMS with an audit log

In the standard deployment this process also serves the built frontend, so the site and the API
share one origin. See [Production notes](#production-notes).

- **Architecture, ER diagram, tables and auth design:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API reference:** [docs/API.md](docs/API.md)

Stack: Node 20+ (JavaScript, ESM), Express 5, **MongoDB via Mongoose**, Zod, Vitest. Locally it runs on an **embedded `mongod`** (`mongodb-memory-server`), so there is nothing to install. The MongoDB binary (~100 MB) is downloaded once, on first run, into the npm cache.

## Local setup

```bash
cd server
npm install
npm run db:seed      # syncs indexes + loads development data into ./.data/mongo
npm run dev          # http://localhost:4000/api/v1  (auto-reload)
```

`npm run db:seed` prints the **development-only** accounts:

| Account | Email | Password | Access |
|---|---|---|---|
| Super admin | `admin@studlyf.local` | `StudlyfAdmin#2026` | Content, users, audit logs |
| Editor | `editor@studlyf.local` | `StudlyfEditor#2026` | Content |
| Builder | `builder@studlyf.local` | `StudlyfBuilder#2026` | None (normal user) |

> ⚠️ These credentials exist only in the dev seed. `db:seed` refuses to run when `NODE_ENV=production`.

Verification and reset emails are **printed to the console** in development (`MAIL_DRIVER=console`), so you can click the links directly. In production the server requires a deliberate choice: `smtp` (with `SMTP_URL`) to actually send, or the explicit `none` to accept that mail is off. The other two drivers are refused at boot — `console` would write live reset links into the log stream and deliver nothing, and `memory` would hold them in RAM — neither of which is a decision anyone makes on purpose.

Try it:
```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/ready
curl "http://localhost:4000/api/v1/opportunities?type=HACKATHON"
curl "http://localhost:4000/api/v1/search?q=ai"
```

### Demo data for a walkthrough

`npm run db:seed:demo` adds the demo accounts and the content behind them (founder, HR,
organizer, investor) on top of whatever is already there. It is additive and re-runnable — it
only inserts what is missing, so it will not disturb accounts you have created by hand.

### Using a real MongoDB (local or Atlas)
```bash
MONGODB_URI=mongodb://localhost:27017/studlyf npm run db:migrate
MONGODB_URI=mongodb://localhost:27017/studlyf npm run db:seed
```
A standalone `mongod` works. The app never needs multi-document transactions, so a replica set is not required.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Watch mode. With the embedded database, migrations run on boot. |
| `npm start` | Run the server. There is no build step — this is plain ESM JavaScript. |
| `npm test` | 25 integration suites, each file on its own embedded MongoDB |
| `npm run db:migrate` | Syncs indexes from the schemas and runs pending data migrations (explicit deploy step) |
| `npm run db:seed` | Development data + the dev accounts below. Refuses to run when `NODE_ENV=production`. |
| `npm run db:seed:demo` | The **additive** demo seed. Only inserts what is missing, so it is safe to re-run and safe against a database that already holds real accounts. |
| `npm run db:reset` | `db:seed --reset` — **empties every collection.** Destructive: it deletes real users, not just seed data. Never point it at a database you care about. |
| `npm run admin:create` | Create or promote an admin (`ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`, `ADMIN_LEVEL`) |

Both seed scripts refuse to run when `NODE_ENV=production`. Stop the API before running either —
the embedded dev database's data directory can only be opened by one process at a time.

## Environment variables

All of them are optional in development; the server validates them at boot and exits with a
message naming the variable if something required is missing or still pointing at localhost. See
[.env.example](.env.example).

**Required in production:** `MONGODB_URI`, `CORS_ORIGINS`, `APP_URL` (non-localhost),
`API_PUBLIC_URL` (non-localhost, unless `MEDIA_PUBLIC_BASE_URL` is set), `TRUST_PROXY` (explicit,
even if `0`), and `MAIL_DRIVER` — either `smtp` with `SMTP_URL`, or the explicit `none`.

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | HTTP port |
| `MONGODB_URI` | dev: `embedded:./.data/mongo`, test: `embedded:memory` | `mongodb://…` or `mongodb+srv://…` in production (**required**). The embedded server is refused in production. |
| `MONGODB_DB_NAME` | from the URI (`studlyf` when embedded) | Overrides the database name |
| `APP_URL` | `http://localhost:5173` | Public origin of the **website**. It is the base of every verification and password-reset link, so a localhost value is refused in production. |
| `API_PUBLIC_URL` | `http://localhost:4000` | Public origin of this API. Media URLs are built from it (see `MEDIA_PUBLIC_BASE_URL`) and stored on the asset. |
| `CLIENT_DIR` | `../dist` | Directory holding the built frontend. Served with a SPA fallback when it contains an `index.html`; skipped when it does not. Resolved from the server's working directory. |
| `CORS_ORIGINS` | dev: `APP_URL` | Comma-separated allow-list, also used for the CSRF origin check. **Required** in production. |
| `COOKIE_NAME` | `studlyf_session` | Session cookie name |
| `COOKIE_SAMESITE` | `lax` | `lax` \| `strict` \| `none`. `none` is only for a frontend on a different site than the API — it forces `Secure`, so it needs HTTPS. |
| `COOKIE_DOMAIN` | unset | e.g. `.studlyf.com` to share between `www.` and `api.` |
| `COOKIE_SECURE` | `true` in production | `Secure` cookie flag |
| `SESSION_TTL_DAYS` | `30` | Session lifetime |
| `EMAIL_VERIFICATION_TTL_HOURS` | `24` | Verification link lifetime |
| `PASSWORD_RESET_TTL_MINUTES` | `60` | Reset link lifetime |
| `PASSWORD_HASH_COST` | `15` (tests `12`) | scrypt N = 2^cost. Existing hashes upgrade on next login. |
| `MAIL_DRIVER` | `console` (tests `memory`) | `console` \| `smtp` \| `none` \| `memory`. In production only `smtp` and `none` are accepted: `none` delivers nothing and says so at boot (sign-in still works — login does not require a verified address — but password reset does not), while `console` and `memory` are refused because both keep the token out of the user's hands without anyone having chosen that. |
| `MAIL_FROM` | `STUDLYF <no-reply@studlyf.local>` | Sender address |
| `SMTP_URL` | – | Required when `MAIL_DRIVER=smtp`, e.g. `smtps://user:pass@host:465` |
| `STORAGE_DRIVER` | `local` | Only `local` is accepted — the S3/R2 driver the interface is shaped for is **not implemented**, and `createStorage()` ignores this value. Uploads always go to `UPLOAD_DIR`. |
| `UPLOAD_DIR` | `./uploads` | Local upload directory |
| `MEDIA_PUBLIC_BASE_URL` | `API_PUBLIC_URL/media` | Base URL written into media records |
| `MAX_UPLOAD_MB` | `5` | Upload size limit |
| `RATE_LIMIT_ENABLED` | `true` | Rate limits on/off |
| `PUBLIC_CACHE_TTL_SECONDS` | `60` | Server read-cache TTL and `Cache-Control` max-age for public GETs |
| `TRUST_PROXY` | `0` | Proxy hop count. Set it behind a load balancer so rate limits see client IPs. |
| `LOG_LEVEL` | dev `debug`, prod `info`, test `silent` | pino log level |

## Schema changes

1. Edit or add a schema in `src/database/schema/` and register new models in `createModels()`.
2. Index changes need nothing else: `db:migrate` syncs them.
3. If existing documents must be reshaped, add an entry to `src/database/migrations/index.js`. Each entry runs exactly once per database.

## Production notes

**One origin.** This server serves the built frontend from `CLIENT_DIR`, the API under `/api/v1`
and uploaded media under `/media`. That is what keeps the session cookie first-party: `SameSite=Lax`
is then correct, no CORS rule is involved on the happy path, and `COOKIE_DOMAIN` /
`COOKIE_SAMESITE=none` are not needed. The root [README](../README.md) covers the deployment, and
the [Dockerfile](../Dockerfile) builds both halves into one image.

Sequence:

```bash
cd server
npm ci --omit=dev
npm run db:migrate        # idempotent — run on every deploy
NODE_ENV=production node --env-file-if-exists=.env src/server.js
```

There is no build step and no compiled-migrator variant: the server is plain ESM JavaScript, and
`db:migrate` uses the same dependency set the server does, so `--omit=dev` is enough everywhere.

`db:migrate` creates indexes (including unique and TTL ones) and applies pending data migrations,
recording each in `_migrations`. It is idempotent, and it does **not** touch existing documents
unless a migration says so.

**Splitting the API onto its own host** is supported, and what it costs depends on whether the two
hosts share a registrable domain.

- **`studlyf.com` + `api.studlyf.com` (recommended):** same-site, because SameSite is computed on
  the registrable domain rather than the origin, so `SameSite=Lax` keeps working. Add the site
  origin to `CORS_ORIGINS` and point the frontend's `VITE_API_BASE_URL` at the absolute API origin,
  then rebuild the frontend — Vite inlines that at build time. `COOKIE_SAMESITE=none` is **not**
  needed (and is weaker for no benefit), and neither is `COOKIE_DOMAIN`, since the API's host-only
  cookie is already sent to the API.
- **Different registrable domains** (`foo.vercel.app` + `bar.onrender.com`): genuinely cross-site,
  so it needs `COOKIE_SAMESITE=none`, which forces `Secure`, and browsers block third-party cookies
  by default in Safari — sign-in breaks for a large share of visitors. `Cross-Origin-Resource-Policy:
  same-site` will also block the app's own `/media` images. Keep both on one domain.

**Things to change when scaling out:**
- Rate limiting and the read cache are in-memory, so they are per instance. Switch both to Redis when running more than one instance (the `Cache` interface and express-rate-limit's store option are ready for it).
- Local media storage should move to object storage, but that driver does not exist yet: write one implementing `LocalDiskStorage`'s three methods and branch on `STORAGE_DRIVER` in `createStorage()`. Until then `UPLOAD_DIR` must be a persistent volume, and the server must run as a **single instance** — the rate limiter and read cache are per-process.
- For larger catalogues or fuzzy matching, move search to Atlas Search. Only the repository filters in `modules/opportunities` and `modules/resources` change.

Create the first production admin with `ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run admin:create`.
It can also promote an existing user. No public API can grant admin access.
