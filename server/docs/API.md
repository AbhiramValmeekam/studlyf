# STUDLYF API v1 — Reference

Base URL: `http://localhost:4000/api/v1` (dev). All bodies are JSON unless noted.

## Conventions

**Success**
```json
{ "success": true, "data": { }, "meta": { "page": 1, "pageSize": 12, "total": 40, "totalPages": 4 } }
```
`meta` is present on paginated lists (`?page=1&pageSize=12`, max 50).

**Error**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed",
  "details": [ { "field": "email", "message": "Must be a valid email address" } ] } }
```

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad input. `details[].field` names each field (nested fields are dotted, e.g. `content.primaryCta.url`). Unknown body fields are rejected. |
| `BAD_REQUEST` | 400 | Malformed JSON or a broken reference |
| `INVALID_TOKEN` | 400 | Verification/reset token invalid, expired or already used |
| `UNAUTHENTICATED` | 401 | No valid session |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password (one message for both) |
| `FORBIDDEN` | 403 | Signed in, but not allowed |
| `ACCOUNT_DISABLED` | 403 | Suspended or deactivated account |
| `ORIGIN_NOT_ALLOWED` | 403 | State-changing request from an origin not on the allow-list |
| `NOT_FOUND` | 404 | Missing, or not public |
| `EMAIL_TAKEN` / `SLUG_TAKEN` / `CONFLICT` | 409 | Uniqueness conflicts |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 1 MB or upload over `MAX_UPLOAD_MB` |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Upload is not PNG/JPEG/WEBP/GIF (checked by file bytes) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected error. Details are logged with the `X-Request-Id`, never returned. |

**Auth transport:** browsers use the `studlyf_session` cookie (HttpOnly). Call the API with `credentials: 'include'`.
Native or server clients send `X-Auth-Transport: bearer` on login/register to receive `data.session.token`, then send `Authorization: Bearer <token>`.

**Caching:** public GETs send `Cache-Control: public, max-age=60, stale-while-revalidate=300` plus an `ETag`. Account and admin endpoints send `no-store`.

**Enum query params are case-insensitive** (`?type=hackathon` works).

**Ids** are MongoDB ObjectIds as 24-character hex strings (e.g. `6ab25a8a9fe001fb2e29ccbb`). A malformed id returns `400 VALIDATION_ERROR`, not `404`.

---

## Public content

### `GET /home`
Everything the homepage renders, in one call. Only published/active content is included.
```json
{
  "hero": { "eyebrow": "…", "headline": "Build. Prove. Get Discovered.", "subheadline": "…",
            "primaryCta": { "label": "Explore Opportunities", "url": "/builder/opportunities" },
            "secondaryCta": { "label": "Create Your Profile", "url": "/join" }, "backgroundImage": null },
  "paths": [ PathCard ],
  "featuredOpportunities": [ Opportunity ],   // featured, open, soonest deadline first (max 6)
  "stats": [ Stat ],
  "featuredResources": [ Resource ],          // max 6
  "testimonials": [ Testimonial ],            // featured (max 8)
  "partners": [ Partner ],                    // featured (max 24)
  "sections": { "pathsIntro": { "title": "…", "subtitle": "…" } }   // other published CMS sections
}
```

### `GET /paths`
`PathCard = { id, key, title, description, icon, image: Media|null, cta: { label, url }, displayOrder }`

### `GET /opportunities`
| Query | Values |
|---|---|
| `q` | keyword (prefix match on title, organisation, description, location, skills) |
| `type` | `HACKATHON` `COMPETITION` `INTERNSHIP` `CHALLENGE` `FELLOWSHIP` |
| `mode` | `ONLINE` `OFFLINE` `HYBRID` |
| `location` | case-insensitive substring, e.g. `bengaluru` |
| `status` | `open` (accepting applications) · `closed` · `upcoming` (start date in the future) |
| `category` | category slug |
| `skill` | skill slug, e.g. `react` |
| `featured` | `true` / `false` |
| `sort` | `relevance` (default when `q` is set) · `newest` · `deadline` |
| `page`, `pageSize` | pagination |

```ts
Opportunity = {
  id, title, slug, type, mode, location,
  organization: { name, logo: Media|null, partner: { id, name, slug } | null },
  shortDescription, category: { id, name, slug } | null,
  applicationDeadline, startDate, endDate,           // ISO 8601
  applicationStatus: 'OPEN' | 'CLOSED',
  externalUrl, banner: Media|null, skills: [{ name, slug }], featured, publishedAt
}
Media = { id, url, mimeType, width, height, alt }
```

### `GET /opportunities/:slug`
Same shape plus `description` (sanitised HTML). Returns 404 for drafts and scheduled items.

### `GET /resources`
Query: `q`, `type` (`ARTICLE` `VIDEO` `GUIDE` `ANNOUNCEMENT` `OPPORTUNITY_RESOURCE`), `category`, `tag`, `featured`, `sort` (`relevance`|`newest`), `page`, `pageSize`.
```ts
Resource = { id, title, slug, type, description, thumbnail: Media|null, category, externalUrl,
             author: { name } | null, tags: [{ name, slug }], featured, publishedAt }
```
### `GET /resources/:slug`
Same shape plus `content` (sanitised HTML).

### `GET /search`
Unified search. Query: `q`, `scope` (`all`|`opportunities`|`resources`), `type`, `category`, `status`, `page`, `pageSize` (default 10).
- `type` narrows the search to the content kind that owns that type.
- `status` is the opportunity lifecycle filter, so resources are excluded when it is set.
```json
{ "opportunities": { "items": [Opportunity], "total": 3 },
  "resources":     { "items": [Resource],    "total": 2 } }
```
`meta: { query, page, pageSize }`

### `GET /partners` · `GET /testimonials` · `GET /stats` · `GET /categories`
- `/partners?category=&featured=&limit=`: `{ id, name, slug, logo, website, description, category, verified, featured, displayOrder }`
- `/testimonials?category=&featured=&limit=`: `{ id, personName, designation, organization, quote, photo, category, featured, displayOrder }`
- `/stats`: `{ id, key, label, value: number, suffix, description, displayOrder }`
- `/categories?scope=OPPORTUNITY|RESOURCE|TESTIMONIAL|PARTNER`

### `GET /health`
Returns `{ status: "ok", time }`.

---

## Auth
| Endpoint | Body | Notes |
|---|---|---|
| `POST /auth/register` | `{ name, email, password, phone?, intent? }` | `intent` ∈ `BUILDER` `FOUNDER` `EXPLORING`. Password needs 8–128 chars with at least one letter and one digit. Returns **201** `{ user: Me, session: { expiresAt } }` and sets the cookie. Sends a verification email. 5/hour per IP. |
| `POST /auth/login` | `{ email, password }` | Returns `{ user: Me, session }`. 10 failed attempts per 15 min per IP. |
| `POST /auth/logout` | – | Revokes the session and clears the cookie. |
| `POST /auth/verify-email` | `{ token }` | Token comes from the emailed link `APP_URL/verify-email?token=…`. Single use, 24 h. |
| `POST /auth/resend-verification` | `{ email }` | Always 200 (does not reveal whether the account exists). Voids the previous token. |
| `POST /auth/forgot-password` | `{ email }` | Always 200. Emails `APP_URL/reset-password?token=…` (1 h). |
| `POST /auth/reset-password` | `{ token, password }` | Sets the new password, marks the email verified, and **revokes every session** for the user. |

## Signed-in user
| Endpoint | Notes |
|---|---|
| `GET /me` | `Me = { id, name, email, phone, profilePhoto, role, roles[], status, emailVerified, createdAt, updatedAt, lastLoginAt, onboarding: { intent, completedAt } \| null, admin: { level } \| null, profile: PersonalProfile, builderUsername, completion: Completion }` |
| `PATCH /me` | `{ name?, phone? }` |
| `PATCH /me/profile` | Personal profile, any subset: `{ name, phone, gender, city, college, degree, branch, yearOfStudy, graduationYear, links: { github, linkedin, portfolio, website }, interests[] }`. `links` merges key by key; `''`/`null` clears a field. Returns `Me`. Used by the "Complete your profile" prompt (one step at a time) and the profile page. |

**Personal profile & completion.** `users.profile` is the single source of truth for college, city and social links. The builder profile reads these (`location`, `links`, `currentEducation`) instead of keeping copies, so the profile page and the builder profile always agree.

```ts
PersonalProfile = { gender: 'FEMALE'|'MALE'|'NON_BINARY'|'PREFER_NOT_TO_SAY'|null, city, college, degree, branch,
                    yearOfStudy: '1'|'2'|'3'|'4'|'5'|'GRADUATED'|null, graduationYear: number|null,
                    links: { github, linkedin, portfolio, website },
                    interests: ('INTERNSHIPS'|'JOBS'|'HACKATHONS'|'COMPETITIONS'|'PROJECTS'|'MENTORSHIP'|'COURSES'|'STARTUPS')[],
                    completedAt }   // first time every required field was present
Completion = { score: 0-100, missing: string[], isComplete: boolean, requiredMissing: string[] }
```
- **Required** for `isComplete`: name, phone, college, degree, branch, yearOfStudy, graduationYear.
- **One score everywhere** (`/me`, `/builder/profile`, `/builder/profile/completion`, `/builder/dashboard`):
  - personal checks (55): phone 10, education 20, links 10, city 5, interests 5, photo 5
  - builder checks (45), for users with the BUILDER role: headline 10, bio ≥40 chars 15, 3+ skills 15, availability 5
  - normalised to 100 over the checks that apply
- **Validation:**
  - `phone`: 10–15 digits.
  - GitHub: a username or any github.com URL, stored as `https://github.com/<user>`.
  - LinkedIn: a slug or any linkedin.com/in/ URL, stored as `https://www.linkedin.com/in/<slug>`.
  - `graduationYear` must be consistent with `yearOfStudy`: a year in the past requires `GRADUATED`.
- **Public builder page** (`GET /builders/:username`) shows name, city, links and `currentEducation { college, degree, branch, graduationYear }`. It never shows phone, email, gender, interests or year of study.
| `GET /onboarding` | `{ options: [{ intent, label }], selection }` |
| `POST /onboarding` | `{ intent: BUILDER \| FOUNDER \| EXPLORING }`. `BUILDER`/`FOUNDER` grants that role and sets it as the primary role. Returns `Me`. |

---

## Admin CMS — `/admin/*`
Requires a session whose user has an active `admin_users` document.
- **EDITOR** can manage all content.
- **SUPER_ADMIN** can also manage `/admin/users` and `/admin/audit-logs`.

Every mutation writes an audit-log entry and clears the public cache.

| Resource | Endpoints |
|---|---|
| Opportunities | `GET /admin/opportunities?q&status&type&featured&page` · `GET /:id` · `POST /` · `PATCH /:id` · `DELETE /:id` · `POST /:id/publish` (body `{ publishedAt? }`; a future date schedules it) · `POST /:id/unpublish` |
| Resources | Same as opportunities, at `/admin/resources` |
| Path cards | `/admin/path-cards`: CRUD + publish/unpublish |
| Stats | `/admin/stats`: CRUD + publish/unpublish (maps to `active`) |
| Testimonials | `/admin/testimonials`: CRUD + publish/unpublish (maps to `active`) |
| Partners | `/admin/partners`: CRUD + publish/unpublish (maps to `active`) |
| Homepage | `GET /admin/homepage` · `GET /admin/homepage/:section` · `PUT /admin/homepage/:section` `{ content, status? }` · `POST /:section/publish` · `POST /:section/unpublish`. Sections: `hero`, `paths_intro`, `explore_intro`, `resources_intro`, `join_cta`. |
| Categories / tags | `GET/POST /admin/categories` · `PATCH/DELETE /admin/categories/:id` · `GET /admin/tags?q` · `POST /admin/tags` `{ names[] }` · `DELETE /admin/tags/:id` |
| Media | `POST /admin/media` (multipart: `file`, `purpose`, `altText`) · `POST /admin/media/external` `{ url, mimeType, purpose, altText?, width?, height? }` · `GET /admin/media` · `DELETE /admin/media/:id` |
| Users (super admin) | `GET /admin/users?q&status&role&page` · `GET /admin/users/:id` · `PATCH /admin/users/:id` `{ status?, emailVerified?, name? }`. Suspending revokes the user's sessions. You cannot deactivate yourself. |
| Audit logs (super admin) | `GET /admin/audit-logs?entityType&entityId&actorUserId&page` |

**Opportunity body** (create; every field is optional on PATCH):
```jsonc
{ "title": "…", "slug": "optional-custom-slug", "organizationName": "…", "type": "HACKATHON", "mode": "HYBRID",
  "shortDescription": "…", "description": "<p>HTML, sanitised on save</p>", "location": "Bengaluru",
  "applicationDeadline": "2026-10-12T18:30:00Z", "startDate": "…", "endDate": "…",
  "externalUrl": "https://…", "partnerId": "<ObjectId>", "organizationLogoId": "<ObjectId>", "bannerId": "<ObjectId>",
  "categoryId": "<ObjectId> (OPPORTUNITY scope)", "skills": ["React", "Node.js"],
  "status": "DRAFT|PUBLISHED|ARCHIVED", "featured": true, "publishedAt": "…" }
```
**Resource body:** `title, slug?, type, description, content?, externalUrl? (required for VIDEO), thumbnailId?, categoryId?, authorName?, tags?, status?, featured?, publishedAt?`

Link fields (CTAs, path cards) accept an in-site path (`/join`) or an `http(s)` URL. `javascript:`, `data:` and protocol-relative URLs are rejected.

## Multi-ecosystem endpoints

All require a session. Controlled routes return `403` with a state-specific message until access is ACTIVE.

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/me/ecosystems` | signed in | Per-ecosystem `{status, active, destination, statusNote}` (also in `GET /me` as `ecosystems`) |
| GET/POST/PATCH | `/founder/profile` | POST: any account (onboarding, grants FOUNDER); PATCH: founder | Startup, workspace (incl. SWOT, marketing, pitch), traction; returns 8-area readiness |
| GET | `/founder/dashboard` | founder | |
| POST/DELETE | `/founder/updates`, `/founder/updates/:id` | founder | Startup updates |
| GET, PATCH | `/founder/connections`, `/founder/connections/:id` | founder | Accept/decline investor requests |
| GET/PUT | `/investor/access-request` | any account | Create / edit / resubmit (REJECTED → PENDING; SUSPENDED is locked) |
| GET | `/investor/dashboard`, `/investor/facets`, `/investor/intelligence` | verified investor | |
| GET | `/investor/founders?q&industry&stage&fundingStage&startupType&location&saved&sort` | verified investor | Discoverable founders only |
| GET | `/investor/founders/:id` | verified investor | Workspace + email only after the founder accepts |
| PUT/DELETE | `/investor/saved/:founderProfileId` | verified investor | Private shortlist |
| GET/POST | `/investor/connections`; POST `/investor/connections/:id/withdraw` | verified investor | |
| GET/PUT | `/hr/access-request` | any account | HR verification request |
| GET | `/hr/dashboard`, `/hr/talent?q&skill&college&location&availability` | verified HR | PUBLIC builder profiles only; evidence counts, no composite score |
| GET/POST/PATCH/DELETE | `/hr/candidates[/:id]` | verified HR | Private pipeline; INVITED and OFFER notify the builder |
| POST | `/organizations` | any account | Create organization (PENDING, caller = OWNER) |
| GET/PATCH | `/organization` | member | PATCH: OWNER/ADMIN (REJECTED → PENDING on resubmit) |
| GET | `/organization/dashboard`, `/analytics`, `/participants`, `/teams`, `/submissions`, `/evaluations`, `/evaluators`, `/rankings`, `/winners`, `/certificates`, `/members` | verified org member | |
| POST/PATCH | `/organization/opportunities[/:id]`, `/:id/publish`, `/:id/unpublish` | OWNER/ADMIN/ORGANIZER | Org name forced from the verified organization; curation fields rejected |
| POST | `/organization/participants/:id/status` | OWNER/ADMIN/ORGANIZER | Same transitions + notifications as admin review |
| POST | `/organization/submissions/:id/evaluators` | OWNER/ADMIN/ORGANIZER | Only the org's EVALUATOR members |
| POST/PATCH/DELETE | `/organization/members[/:id]` | OWNER/ADMIN (any member may leave) | Roles OWNER/ADMIN/ORGANIZER/EVALUATOR/VIEWER |
| GET | `/admin/access-requests?ecosystem&status` | admin | Verification queue |
| POST | `/admin/access-requests/:ecosystem/:id/status` | SUPER_ADMIN | `{status, note}`; note required for REJECTED/SUSPENDED |
