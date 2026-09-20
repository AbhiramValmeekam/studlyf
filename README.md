# STUDLYF — Ecosystem Prototype

A polished frontend prototype of the full **STUDLYF** ecosystem: one platform connecting **Builders, Founders, Investors and Organizations/HR** through separate-but-connected product experiences. The public marketing site is the entry point; the four product surfaces live behind it as navigable, functional flows built on mock data.

> This is a **frontend/MVP**. There is no backend — authentication, payments, AI and databases are simulated with local mock data and in-memory state, as scoped.

---

## Run it

```bash
npm install
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the built dist/
```

**Deploying:** it's a client-routed SPA (React Router), so the host must fall back to `index.html` for unknown paths or deep links like `/builder/opportunities` will 404. Configs are included:

- **Cloudflare Workers** — `wrangler.jsonc` deploys `dist/` as Static Assets with `not_found_handling: single-page-application`. Run `npm run build && npx wrangler deploy`.
- **Netlify** — `netlify.toml` (build `npm run build`, publish `dist`) with a `/* → /index.html 200` redirect. Connect the repo; no extra setup.
- **Vercel** — `vercel.json` (build command, output dir, SPA rewrite). Import the repo; framework preset "Vite".
- **Any static host** — build with `npm run build`, serve `dist/`, and route all unknown paths to `index.html`.

---

## Architecture

**Stack:** Vite + React 18 (JSX), React Router 6, Tailwind CSS, GSAP + Lenis (motion/scroll), matter-js (the homepage physics ball-pit). No TypeScript, no backend, no chart library (charts are hand-rolled SVG).

The prototype **extends the existing STUDLYF marketing site** rather than starting fresh, so every ecosystem screen inherits the same design language.

```
src/
  App.jsx                 Router — all routes for the 5 surfaces
  main.jsx                BrowserRouter + Auth/Session providers
  pages/
    HomePage.jsx          Public marketing site (Loader, Lenis, ball-pit hero)
    LoginHub.jsx          Role chooser / fake login
    PortalLogin.jsx       Gated login for Investor + HR
    builder/  organizer/  startup/  investor/  hr/   ← one folder per surface
  components/
    app/                  AppShell, Sidebar+Topbar, ProtectedRoute, RouteTransition, nav config
    ui/                   Reusable primitives (Button, Card, FilterBar, Stepper, charts, forms…)
    …                     Existing marketing components (AnimatedText, MagneticButton, LogoPit…)
  context/
    AuthContext.jsx       Fake auth: login(role) → persona; ProtectedRoute reads it
    SessionContext.jsx    In-memory user actions (saved, applications, connections, shortlist, pipeline)
  data/
    studlyf.js            Original marketing content (reused for logos/avatars)
    mock/                 opportunities, talent, startups, events, content
  lib/smooth.js           Shared GSAP/ScrollTrigger/Lenis (single registration point)
```

**Key decisions**

- **Marketing chrome is scoped to `HomePage` only.** The Loader intro, Lenis smooth-scroll and ScrollTrigger pinning are tied to the single-page model, so the app routes use a separate `AppShell` (sidebar + topbar, native scroll) instead of inheriting them. This keeps dashboards snappy and avoids scroll-context bugs.
- **One shell, role-scoped nav.** `AppShell` is reused by all five surfaces; `components/app/nav.js` drives the sidebar per role, and an ecosystem switcher lets you hop between products — reinforcing "one STUDLYF."
- **Fake auth, real gating.** `AuthContext` simulates sign-in. Investor and HR routes are wrapped in `ProtectedRoute`, which redirects to a verification-styled `PortalLogin` when no role is set — representing their controlled/paid access without a real backend.
- **Session state makes flows feel real.** `SessionContext` (useReducer) holds the actions a reviewer takes — saving opportunities, submitting applications, connecting with founders, shortlisting candidates and moving them through the hiring pipeline — so those actions show up across screens. It's in-memory and resets on refresh (MVP scope).
- **Bespoke, not generic.** Reused the site's tokens (ink/bone/acid/flare/violet, Anton/Space Grotesk/Instrument Serif) and motion. Charts are hand-rolled SVG so the visual language stays on-brand rather than pulling in a chart kit.

---

## Implemented features

**Public site** — updated navbar (Explore / For You / Resources / Login / Join STUDLYF) and a homepage ecosystem fan-out (Build / Start / Discover / Organizations) into the four experiences.

**Builder** — Dashboard (completion, applications+status, recommendations, activity) · Profile (education, skills, links, projects with evaluation breakdowns, hackathons, achievements, experience) · Opportunities (search + faceted filters over hackathons/competitions/internships/jobs/challenges/fellowships, save) · Opportunity detail · **Application wizard** (Team→Project→Problem→Additional→Review→Submit with per-step validation + save-draft, generated submission ID) · Submission confirmation + status timeline · STUD Hub · STUD OTT · Resume Builder (live preview) · Portfolio Builder · Career Roadmap.

**Startup/Founder** — Workspace hub · Founder Profile · Startup Profile (with live investor-card preview) · structured tools: Pitch Deck, Market Analysis (TAM/SAM/SOM + competitors), SWOT, GTM, Readiness scorecard · founder-side Investor Discovery.

**Investor** — gated login → Dashboard · Founder Discovery (filters: industry/stage/location) with startup cards + Connect · Founder/Startup profile (Connect modal) · Analytics (stage, industry, revenue bands, geography, funding — SVG charts).

**HR/Talent** — gated login → Overview · Talent Discovery (filters: role/skills/location/availability) · Candidate profile with **Project Evidence** (GitHub, demo, jury score, evaluation breakdown) · Hiring Pipeline (Shortlist→Invited→Accepted→Interview→Selected→Offer→Joining→Hired stage board).

**Organizer** — Events dashboard · staged event management (Registration→Participants→Teams→Submissions→Jury→Ranking→Results).

**Shared** — reusable UI kit (Button, Card, Chip/Tag/Badge, Avatar, StatCard, FilterBar, Stepper, form fields with validation, ProgressRing/Bar, SVG BarChart/DonutChart/DistributionBar, Modal, EmptyState) and GSAP route transitions. Responsive down to mobile (sidebar collapses to a drawer); honors `prefers-reduced-motion`.

---

## Product decisions & UX notes

- **Minimal public navbar.** Rather than exposing every ecosystem in the nav (crowded), the homepage uses four clear "doors." Investor/HR doors are marked *Verified access* to set the right expectation before the gate.
- **Evidence over claims.** HR discovery and candidate profiles lead with *evaluated* project evidence (jury scores + breakdowns), matching STUDLYF's "get discovered by what you built" thesis — not just a skills list.
- **Founder tools are structured workflows, not a chat box.** Each tool (deck, market, SWOT, GTM, readiness) is a purpose-built layout, per the spec's explicit guidance.
- **Connected flows.** Actions carry across surfaces (apply → dashboard status; shortlist → hiring pipeline; connect → dashboard count), so the prototype demonstrates the *system*, not isolated screens.
- **Depth over breadth.** Per the brief, this is a smaller set of polished, functional, connected screens rather than dozens of static ones.

## Known prototype limitations

Auth/session are in-memory (reset on refresh); "download", "publish", "send" and "create event" actions are mocked; data is local and static.
