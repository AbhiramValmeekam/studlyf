# STUDLYF

One platform connecting **Builders, Founders, Investors and Organizations/HR**. The public
marketing site is the entry point; the four product surfaces live behind it as real,
authenticated flows backed by a real API and database.

```
studlyf.com ──► Node / Express
                 ├─ /            → built frontend + SPA fallback (deep links)
                 ├─ /api/v1/*    → REST API
                 └─ /media/*     → uploaded files
```

Everything is served from **one origin**. That is a deliberate choice, not a coincidence: the
session cookie is first-party, so `SameSite=Lax` is enough, no CORS rule is involved, and the
frontend needs no absolute API URL. See [Deployment](#deployment).

---

## Stack

| Half | What it is |
|---|---|
| Frontend (`/`) | Vite 5 + React 18 (JSX, no TypeScript), React Router 6, TanStack Query 5, Tailwind 3 with custom tokens, framer-motion + GSAP + Lenis, `ogl` for the WebGL backdrops |
| Backend (`/server`) | Node 20.11+, Express 5, MongoDB via Mongoose 9, Zod 4, Vitest 5, pino, helmet, multer, nodemailer. Plain ESM JavaScript — **no build step** |

The server runs an **embedded `mongod`** in development and tests (`mongodb-memory-server`), so
there is nothing to install to get started. The binary downloads once into the npm cache.

---

## Layout

```
index.html            SPA shell — pre-paint theme script, font preloads
public/theme-init.js  Resolves the theme before first paint (external, so CSP stays script-src 'self')
src/
  App.jsx             Every route for all five surfaces
  main.jsx            ErrorBoundary → QueryClient → Router → Theme/Auth → App
  pages/              One file per screen; subfolders per product surface
  components/         ui/ (atoms, fields, cards) · ecosystem/ (form kit, page chrome) ·
                      detail/ (shared detail-page sections) · layout/ · resume/ · portfolio/
  lib/api.js          The only place that talks to the API
  context/            ThemeContext, AuthContext
server/
  src/app.js          Middleware, security headers, the /api/v1 wiring, static client, error handlers
  src/config/         Zod-validated environment (fails fast, with the reason)
  src/modules/        ~44 feature modules — routes + service + repository + schemas each
  src/database/       Schemas, migrations, seeds
  tests/              25 integration suites, each against its own throwaway MongoDB
  docs/               API reference, architecture, ER diagram
```

---

## Local development

Two processes: the API on `:4000` and Vite on `:5173` (Vite moves to the next free port if it
is taken — read the URL it prints).

```bash
# terminal 1 — API
cd server
npm install
npm run db:seed      # syncs indexes + loads development data into ./.data/mongo
npm run dev          # http://localhost:4000/api/v1  (auto-reload)

# terminal 2 — frontend
npm install
npm run dev          # http://localhost:5173
```

In development the two are separate origins, so `CORS_ORIGINS` in `server/.env` must name the
Vite origin (it defaults to `http://localhost:5173`). If Vite prints a different port, update it
— a mismatch makes every write fail the origin check.

`npm run db:seed` prints the **development-only** accounts. They are seeded by a script that
refuses to run when `NODE_ENV=production`, and they exist nowhere else.

Verification and password-reset emails are **printed to the console** in development, so you can
click the links directly. In production the server requires `MAIL_DRIVER=smtp` — the console
driver would write live reset links into the log stream and deliver nothing, so it is refused at
boot rather than left as a footgun.

Useful endpoints once it is up:

```bash
curl http://localhost:4000/api/v1/health   # liveness — the process is up
curl http://localhost:4000/api/v1/ready    # readiness — the database is connected (503 until it is)
curl "http://localhost:4000/api/v1/opportunities?type=HACKATHON"
```

---

## Building and running as one service

The backend has no build step; it serves the frontend's build output.

```bash
npm install && npm run build          # frontend → dist/
cd server && npm install --omit=dev
CLIENT_DIR=../dist NODE_ENV=production node src/server.js
```

`CLIENT_DIR` defaults to `../dist` resolved from the server's working directory, so the two
commands above need no extra configuration. If `CLIENT_DIR` has no `index.html` the server
simply skips the static mount and behaves as an API-only service — a CDN can serve the frontend
instead, at the cost of the cookie becoming cross-site (see below).

---

## Configuration

Every variable is documented in [`server/.env.example`](server/.env.example); the frontend's two
are in [`.env.example`](.env.example). Copy to `.env` and adjust — the files are loaded with
`--env-file-if-exists`, so an absent `.env` is not an error.

Configuration is parsed and validated by Zod at boot. **Invalid configuration stops the process
with a message naming the variable and why**, rather than surfacing later as a mysterious 500 in
production.

### Required in production

| Variable | Why it cannot be defaulted |
|---|---|
| `MONGODB_URI` | The embedded database is development-only and is refused in production. |
| `APP_URL` | Absolute links in verification and reset emails. |
| `API_PUBLIC_URL` | The public origin written into media records. |
| `CORS_ORIGINS` | Also the allow-list for the CSRF origin check on every write. |
| `TRUST_PROXY` | **Set explicitly.** Behind a load balancer or CDN it must be the hop count (usually `1`, or `true` for an unbounded chain) so rate limits and logs see real client IPs instead of the proxy's. Use `0` when nothing proxies the server. Guessing this silently breaks rate limiting and every audit-log IP. |
| `MAIL_DRIVER=smtp` + `SMTP_URL` | See above. |

---

## Deployment

The image builds both halves and runs them as one service:

```bash
docker build -t studlyf .
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e MONGODB_URI='mongodb+srv://…' \
  -e APP_URL='https://studlyf.com' \
  -e API_PUBLIC_URL='https://studlyf.com' \
  -e CORS_ORIGINS='https://studlyf.com' \
  -e TRUST_PROXY=1 \
  -e MAIL_DRIVER=smtp -e SMTP_URL='smtps://…' \
  -v studlyf-uploads:/app/server/uploads \
  studlyf
```

Any host that runs a Node process works the same way — build the frontend, then start the server
with the variables above. The image's `HEALTHCHECK` polls `/api/v1/ready`, which reports 503
until the database connection is up, so an orchestrator will not send traffic to a cold instance.

**Before the first deploy:**

1. `npm run db:migrate` against the production database — creates indexes (including unique and
   TTL ones) and applies data migrations. It is idempotent and records what it has run, so run it
   on every deploy.
2. Create the first admin with `ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run admin:create`.
   It can also promote an existing user; no public route can grant admin access.
3. Confirm `UPLOAD_DIR` points at a **persistent volume**. Uploads are written to the local
   filesystem and nothing else is implemented — `STORAGE_DRIVER` accepts only `local`, and
   `createStorage()` ignores it. An ephemeral filesystem means every uploaded image is lost on
   redeploy, and the database rows pointing at them are left dangling. Moving to S3/R2 means
   writing that driver first, not flipping a flag.

**This is a single-instance deployment.** The rate limiter and the public read cache are
in-memory, so they are per-process: two instances behind a load balancer means two independent
rate-limit budgets and a cache that disagrees with itself. Move both to Redis before scaling out
(the `Cache` interface and express-rate-limit's store option are already shaped for it), and
write an object-storage driver before running more than one instance with uploads.

**Splitting the API onto its own host** is supported, and how much it costs depends entirely on
one thing — whether the two hosts share a registrable domain.

- **`studlyf.com` + `api.studlyf.com` (recommended):** still *same-site*, because SameSite is
  computed on the registrable domain, not the origin. `SameSite=Lax` keeps working, so you only
  need to add the site origin to `CORS_ORIGINS` and set the frontend's `VITE_API_BASE_URL` to the
  absolute API origin. Do **not** set `COOKIE_SAMESITE=none` — that is strictly weaker for no
  benefit here — and do not set `COOKIE_DOMAIN`, since the API's host-only cookie is already sent
  to the API. Then **rebuild the frontend**, because Vite inlines that URL at build time.
- **`foo.vercel.app` + `bar.onrender.com` (avoid):** different registrable domains, so genuinely
  cross-site. That forces `COOKIE_SAMESITE=none`, and third-party cookies are blocked by default
  in Safari and are being phased out in Chrome — meaning **sign-in fails outright for a large
  share of visitors**. `Cross-Origin-Resource-Policy: same-site` also starts blocking your own
  `/media` images. Put both on one domain instead.

Forget the `CORS_ORIGINS` entry or the rebuild in the first case and sign-in silently fails to
stick rather than erroring, which is why this is worth getting right up front.

---

## Tests

```bash
cd server && npm test        # 25 suites, each on its own throwaway embedded MongoDB
npm run build                # frontend production build
```

The server suite boots the real app (real middleware, real routing, real database) through
`supertest`; nothing is mocked except the mail transport. Tests are hermetic — each run gets a
fresh database and a temporary directory for `CLIENT_DIR`, so a local `dist/` cannot leak into
their results.

---

## Security notes

- **One HTML trust boundary.** Rich text from posters is sanitised server-side by
  `sanitizeRichText` (allow-list, `http(s)`/`mailto` only, no event handlers, no inline styles,
  `rel="noopener noreferrer nofollow"` on links) on the way *in*. The frontend adds no second
  sanitiser, so there is exactly one place to audit.
- **CSP is `script-src 'self'`** with no inline exemption. The pre-paint theme bootstrap is an
  external file for exactly this reason — if you inline it again, the theme flash returns *and*
  the CSP silently blocks it.
- **Session cookies** are `HttpOnly`, `SameSite=Lax` by default and `Secure` in production.
- **Uploads are content-sniffed** (magic bytes, not the declared MIME type) and size-limited.
- **Rate limits** cover login (10 failed attempts / 15 min), registration, password reset and
  uploads. Behind a proxy they depend entirely on `TRUST_PROXY` being right.
- **Writes are origin-checked.** A non-GET request from an origin outside `CORS_ORIGINS` is
  rejected — this is what stops a form on another site from driving the API with a visitor's cookie.

---

## Documentation

- [`server/README.md`](server/README.md) — backend setup, scripts, environment, schema changes
- [`server/docs/API.md`](server/docs/API.md) — endpoint reference
- [`server/docs/ARCHITECTURE.md`](server/docs/ARCHITECTURE.md) — architecture, ER diagram, auth design
