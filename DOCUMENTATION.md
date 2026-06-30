# Presspaper — Demonstration Prototype · Technical Documentation

This document explains **what was built, how, and why**. It is the companion to `README.md` (overview + quick start) and `HOW_TO_RUN.md` (one‑page run/demo guide).

---

## Table of contents

1. Purpose & what this is
2. Scope and conformance to the Statement of Work
3. Product structure: three experiences, sixteen screens
4. Routing model
5. The two core flows, in detail
6. Architecture at a glance
7. Technology choices and why
8. The offline strategy
9. Design system
10. Branding and institution emblems
11. Charts and data visualisation
12. The data layer
13. State management
14. Component library
15. Screen‑by‑screen walkthrough
16. Edge cases and the "never dead‑end" rule
17. Accessibility
18. Repository map (file by file)
19. Building and deploying
20. Scalability and the post‑funding path
21. Tooling — and why it's all free
22. Known limitations and scope boundaries

---

## 1. Purpose & what this is

Presspaper is a platform where **verified institutions publish official information directly to the public**, and **individuals read it** with modern tooling — AI summaries, an "ask anything" assistant, translation, saving and watchlists.

This repository is the **demonstration prototype**: a high‑fidelity, clickable front end intended to communicate the product vision convincingly (for example, to investors) and to act as a credible foundation for the production build that follows. It is deliberately a **front‑end‑only artifact**:

- All content is **static and hard‑coded**.
- There is **no backend, no database, no authentication**, and no network calls.
- **Nothing persists** once the browser tab closes — every interaction lives in memory for the session only.

Within those boundaries the prototype is genuinely interactive: two end‑to‑end journeys behave correctly, state stays consistent across screens, and all sixteen screens are reachable.

> **Update — optional live backend.** The prototype now also supports a **live mode** backed by **Supabase** (Postgres + Auth). With it enabled, the app has **real email/password accounts**, a **route guard**, and institution releases that **persist in the database** across sessions and devices. When no Supabase keys are configured, it falls back to the original **demo mode** described above (in‑memory, offline, presenter pre‑logged‑in). The two modes share one codebase; see **SUPABASE_SETUP.md** for setup and the "running modes" note in §13.

---

## 2. Scope and conformance to the Statement of Work

The build follows SoW v1.0. The key rules and how they are honoured:

| Requirement | How it is met |
|---|---|
| Reproduce all 16 screens, pixel‑close | All 16 are implemented as routed screens with faithful layout, spacing and content. |
| Desktop‑only, ~1440px, correct on a 13–16" laptop | Fixed desktop layout; a minimum width guard keeps the chrome intact; content is width‑constrained for readability. |
| English; dark product theme; pure‑black public pages | Single design system: dark surfaces for the logged‑in product, pure `#000` for the public marketing/auth pages. |
| Static, hard‑coded content; no backend; nothing persists | All content lives in `src/data/*`; the only state is an in‑memory Zustand store reset on logout / tab close. |
| Presenter starts "logged in" | Entering either experience is one click; there is no real auth gate. |
| Example institution = **Welsh Government**; example individual = **Pradhyumn Bhardwaj** | Used consistently across every screen. |
| Flow A (publish) and Flow B (read) must work | Both implemented end‑to‑end (see §5). |
| Golden rule: anything outside the 16 screens is out of scope; non‑wired controls are visible but inert and must never error or dead‑end | Inert controls are everywhere by design and are guaranteed no‑ops; unknown routes redirect to the landing page. |
| Charts are static visuals | Custom SVG charts driven by **seeded** generators — organic‑looking but identical on every render. |
| Free tooling; host on Vercel free tier; later a custom domain | Entire stack is free/open‑source; output is a static site that deploys to Vercel and any static host. |

**Logos.** The mockups show real institutional logos. Reproducing official trademarks pixel‑for‑pixel in a funding artifact is both legally fraught and unnecessary for the demonstration. The prototype instead renders **tasteful original emblems** — gradient monogram discs/tiles derived from each institution's initials, with a few bespoke geometric glyphs (e.g. a star‑ring, a wireframe globe). This keeps the UI polished and on‑brand while avoiding trademark reproduction. This is the single intentional deviation from pixel fidelity and is easily swapped for official assets in production.

---

## 3. Product structure: three experiences, sixteen screens

The product is organised into three experiences:

**Public (pure‑black, no app chrome)**
- PUB‑01 **Landing** — marketing home.
- PUB‑02 **Sign Up** — account‑type chooser (Individual / Institution).
- PUB‑03 **Log In** — "Welcome Back".
- PUB‑04 **Explore Sources** — public directory of verified institutions.

**Individual (dark app shell: top bar + reader sidebar)**
- USER‑01 **Home** — personalised feed.
- USER‑02 **Explore** — discovery with follow.
- USER‑03 **Saved** — saved releases.
- USER‑04 **Profile** — the reader's own profile + Log Out.
- USER‑05 **Institution (public)** — an institution's public page.
- USER‑06 **Full Release** — the reading view (Flow B).

**Institution (dark app shell: top bar + studio sidebar)**
- INST‑01 **Dashboard** — performance overview.
- INST‑02 **Publish** — release composer (Flow A).
- INST‑03 **Releases** — management table.
- INST‑04 **Analytics** — reach & engagement.
- INST‑05 **Audience** — follower analytics.
- INST‑06 **Profile** — organisation settings, authorised people, verification.

---

## 4. Routing model

Routing uses **React Router v6 with `HashRouter`**. The choice is deliberate and load‑bearing: hash routes (`…/index.html#/inst/analytics`) require **no server rewrites**, which means the built file works when opened directly from disk over `file://` *and* deploys to any static host without special configuration.

Route table (`src/App.tsx`):

```
/                       PUB-01  Landing
/signup                 PUB-02  Sign Up
/login                  PUB-03  Log In
/sources                PUB-04  Explore Sources

/home                   USER-01 Home
/explore                USER-02 Explore
/saved                  USER-03 Saved
/me                     USER-04 Profile (individual)
/institution/:slug      USER-05 Institution public page
/release/:id            USER-06 Full Release

/inst                   INST-01 Dashboard
/inst/publish           INST-02 Publish
/inst/releases          INST-03 Releases
/inst/analytics         INST-04 Analytics
/inst/audience          INST-05 Audience
/inst/profile           INST-06 Profile (institution)

*                       → redirect to /   (never a dead end)
```

`:slug` and `:id` are dynamic: any institution card routes to a working public page, and any feed release opens a working reading view, so the demo can be explored freely without hitting a missing screen.

---

## 5. The two core flows, in detail

### Flow A — an institution publishes a release

Screen: **INST‑02 Publish** → **INST‑03 Releases**.

The composer is a controlled form (headline, summary, body, release type, cover media) with a **live preview card** that mirrors exactly how the release will look in a reader's feed. On **Review & Publish**:

1. The form validates that a headline exists (see edge case below).
2. A `Release` object is constructed with a unique `id` (`pub-<timestamp>`), `status: "Published"`, `isNew: true`, the chosen type/cover, and zeroed metrics.
3. It is pushed to the session store (`publishRelease`), which **prepends** it to the in‑memory list.
4. The app navigates to **Releases**, where the new release is the **top row**, badged **New**.
5. A success toast confirms publication.

**Save as draft** does the same but with `status: "Draft"`, so it appears in the table as a draft.

### Flow B — an individual reads a release

Screen: **USER‑01 Home** → **USER‑06 Full Release**.

Opening the Welsh Government release loads the full reading view, which wires up four interactions:

- **AI Summary** — always visible in the right rail (a plain‑language synopsis).
- **Ask Anything** — suggested questions render as chips; clicking one appends a canned Q&A to a chat‑style thread. Typing a question and pressing send also appends an answer, so the control never dead‑ends.
- **Translate** — a segmented English / **Cymraeg** control. For the example release, switching to Welsh swaps the title, summary, overview, key points and AI summary to their Welsh equivalents, and a banner indicates the translation; switching back restores English.
- **Save** — toggles the release in the session store and shows a toast. Saved releases appear on **USER‑03 Saved**.

**Consistency across screens.** Save and Follow are global session state. Saving on a feed card, on the release page, or unsaving on the Saved tab all reflect immediately wherever that release or institution is shown. The same applies to Follow across feed cards, suggestion lists and institution pages.

---

## 6. Architecture at a glance

```
            ┌──────────────────────────────────────────────┐
            │                  App.tsx                      │
            │      HashRouter + Routes + ToastHost          │
            └───────────────┬──────────────────────────────┘
                            │ renders one screen per route
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   public/*            individual/*        institution/*       ← screens
        │                   │                   │
        └─────────┬─────────┴─────────┬─────────┘
                  ▼                   ▼
            components/*          data/*  (static content)
       (shells, cards, charts,        │
        brand, primitives)            ▼
                  │             store/useAppStore  (session state)
                  └──────────── reads/writes ──────┘
```

- **Screens** compose **components** and read **data**.
- **Interactions** (publish, save, follow, toasts) go through a single **Zustand store**.
- **Design tokens** in `index.css` are the single source of visual truth; components reference CSS variables rather than hard‑coding colours.

---

## 7. Technology choices and why

- **React 18 + TypeScript (strict).** Component model fits a screen‑heavy UI; strict typing (with `noUnusedLocals` / `noUnusedParameters`) keeps a 6,000‑line codebase honest and refactor‑safe — important since this becomes the production foundation.
- **Vite 5.** Fast dev server and a clean production build. Its plugin ecosystem gives us first‑class Tailwind v4 and the single‑file inlining needed for offline use.
- **React Router v6 (HashRouter).** Real client‑side routing for 16 screens with zero server requirements (see §4 and §8).
- **Zustand.** Minimal global state for the handful of things that must persist across screens within a session (identity, published releases, saved/followed sets, toasts). No boilerplate, no context gymnastics.
- **Tailwind v4** for fast layout utility, alongside a **CSS‑variable design‑token layer** and a small set of reusable `.pp-*` component classes for things used everywhere (cards, buttons, inputs, badges). Most one‑off styling uses inline styles with explicit pixel values, which keeps each screen self‑describing.
- **lucide‑react** for a consistent, lightweight icon set.
- **Custom SVG charts.** No charting dependency: the visuals are bespoke SVG, which keeps the bundle smaller, the look perfectly on‑brand, and the output deterministic.
- **Self‑hosted Inter** (`@fontsource-variable/inter`) so the single typographic system renders identically offline with no external font fetch.

---

## 8. The offline strategy

The SoW requires the prototype to **run offline by opening it in a browser**. Two things make that reliable:

1. **HashRouter** — no route depends on a server; everything lives under `index.html#/…`.
2. **Single‑file build** — Chrome refuses to load *external* ES‑module scripts over `file://` (a CORS restriction). To sidestep this entirely, the production build **inlines the JavaScript, CSS and fonts into one `index.html`** via `vite-plugin-singlefile`. The result is a ~630 KB self‑contained file that opens straight from disk in Chrome, Edge, Firefox and Safari, with no server and no network.

That same single file is also the simplest possible thing to host: drop it on Vercel (or any static host) and it works. One artifact satisfies both "open it locally" and "deploy it".

`base: "./"` is also set so every path stays relative — a belt‑and‑braces measure on top of inlining.

---

## 9. Design system

All visual decisions are centralised in `src/index.css` as CSS custom properties, then exposed to Tailwind via `@theme`.

- **Surfaces.** A layered dark palette (`--bg`, `--surface-1/2/3`) for the product; pure black (`--bg-public`, `--surface-public`) for public pages.
- **Text.** A five‑step hierarchy from `--text` (primary) down to `--text-faint`, used consistently so emphasis is systematic rather than ad hoc.
- **Accent + status colours.** Blue (primary action), green (positive/verified), red (negative), purple/amber/cyan for data series and categories.
- **Borders, radii, shadows, fonts** are all tokenised (`--border*`, `--r-xs … --r-pill`, `--shadow-lg`, `--font-sans`).
- **Reusable classes.** `.pp-card`, `.pp-btn` (+ `primary` / `blue` / `ghost` / `outline`), `.pp-input`, `.pp-badge`, `.pp-tag`, `.pp-verified`, plus subtle entrance animations (`.pp-rise`, `.pp-fade`) that respect reduced‑motion.
- **One type family.** Inter throughout — no competing fonts — which is a large part of why the UI reads as "premium" rather than templated.

---

## 10. Branding and institution emblems

Rather than reproduce official logos, the prototype ships an original `InstitutionMark` component. For each institution it renders a **gradient monogram** — a disc or rounded tile in the institution's brand colour(s) with its initials — and for a few it draws a **bespoke geometric glyph** (for example a star‑ring or a dotted wireframe globe). A small set of supporting illustrations (`GlobeArt`, `TempleArt`) anchor the public pages.

This is a conscious trade‑off: it keeps the interface clean, distinctive and legally safe for a funding artifact, and the marks are trivially replaceable with official assets when the product is real. It is the only place the prototype intentionally departs from the mockups' exact imagery.

---

## 11. Charts and data visualisation

Every chart is **custom SVG** and **deterministic**. Two seeded generators (`seededSeries`, `risingSeries`) produce organic‑looking but perfectly repeatable data, so the analytics look alive yet render **identically on every presentation** — no flicker, no random spikes between demos.

Components:
- `LineChart` — multi‑series smoothed line with y‑grid and axis labels (Dashboard / Analytics / Audience).
- `Sparkline` — compact trend line with gradient fill (metric cards).
- `Donut` — ring chart with centre labels (engagement / device / gender breakdowns).
- `WorldMap` — a stylised dotted world with highlighted markers (geographic reach / follower locations). It is an on‑brand abstraction, not a survey‑grade projection — which is all a static analytics visual needs.
- `Heatmap` — a seeded weekly activity grid (follower activity).

Treating charts as **visuals** (not live data tools) matches the SoW and keeps the demo bulletproof.

---

## 12. The data layer

All content is static, under `src/data/`:

- **`institutions.ts`** — a record of institutions keyed by slug (name, optional Welsh sub‑name, category, brand colours, emblem style, location, website). Helpers: `inst(slug)` (always returns something sensible, defaulting to Welsh Government), the set of followed slugs and counts, and the public directory list. Welsh Government is the canonical example.
- **`releases.ts`** — every release shown anywhere: the hero feed, explore feed, saved set, an institution's releases, the dashboard's recent/top lists, and the management table (with statuses, dates and times). It also holds the **full reading‑view content** for the example release — overview, key points, AI summary, suggested Q&A, comments — and the **Welsh translations** of each. `findRelease(id)` resolves any release id used by the reading view.
- **`analytics.ts`** — the seeded generators plus all dashboard/analytics/audience datasets (metric cards, top countries, topics, content‑type performance, engagement/geographic/device breakdowns, age/gender splits, follower engagement) and the authorised‑people list for the institution profile.

Keeping content in typed modules (rather than scattered through components) means the screens stay declarative and the data can later be swapped for API responses with minimal change to the views.

---

## 13. State management

A single Zustand store (`src/store/useAppStore.ts`) holds everything that must survive navigation **within a session**:

- **identity** — which experience the presenter entered as (`enterAs`), and `reset` for logout.
- **publishedReleases** — releases created during the session via Flow A (`publishRelease` prepends them).
- **savedIds** — a `Set` of saved release ids, **seeded** so the Saved tab starts populated; `toggleSaved` returns the new state for instant toast feedback.
- **followedSlugs** — a seeded `Set` of followed institutions; `toggleFollow` mirrors the same pattern.
- **toasts** — a queue with `pushToast` / auto‑dismiss, rendered by `ToastHost`.

Everything is in memory only. `reset` (on logout) restores the seeded sets, and closing the tab clears it all — exactly as specified. Components subscribe with narrow selectors (e.g. `s.savedIds.has(id)`) so only the affected card re‑renders on a toggle.

**Running modes (demo vs live).** A second, optional layer sits alongside this store when Supabase is configured:

- **`src/lib/supabase.ts`** exposes `isSupabaseConfigured`. If the `VITE_SUPABASE_*` env vars are absent, the app stays in **demo mode** and behaves exactly as documented above.
- **`src/auth/AuthProvider.tsx`** (a React context) owns real auth in **live mode**: it restores the Supabase session on load, subscribes to auth changes, loads the user's `profiles` row (role + institution), and exposes `signUp` / `signIn` / `signOut`. Session persistence is handled by Supabase via localStorage.
- **`src/auth/ProtectedRoute.tsx`** guards routes by session and role, redirecting to `/login` or the correct home. It is a **pass‑through in demo mode**, preserving the "presenter starts logged in" behaviour.
- **Persistence.** In live mode, `Publish` inserts into a `releases` table; the institution **Releases** screen reads the owner's rows, and the individual **Home** feed and **FullRelease** reader read published rows (mapped via `src/lib/releaseMap.ts`). Saves and follows remain session‑only for now. Full backend details, the SQL schema, and the RLS model are in **SUPABASE_SETUP.md**.

---

## 14. Component library

Organised by concern under `src/components/`:

- **brand/** — `Logo`, `InstitutionMark` (the emblem system), `Avatar` (user monogram), `Illustrations` (`GlobeArt`, `TempleArt`).
- **charts/** — `LineChart` + `Sparkline`, `Donut`, `WorldMap`, `Heatmap`.
- **media/** — `MediaTile`: offline "photography" rendered as gradient + silhouette scene presets (wind farm, parliament, coast, Cardiff Bay, city, town…), with an optional play button. No image files, so it works offline and never shows a broken image.
- **shells/** — `AppShell` (top bar + sidebar + scroll area), `TopBar`, `SidebarIndividual`, `SidebarInstitution`, `NavItem` (active‑aware + inert variants), and `PublicChrome` (`PublicHeader` / `PublicFooter`).
- **release/** — `ReleaseTypeBadge` (coloured by type) and `ReleaseCard` (a feed variant and a compact saved variant, both wiring Save/Follow and opening the reading view).
- **dashboard/** — `Panels` (`PageHeader`, `Panel`, `MetricCard`, `BarRow`, `LegendRow`, `StatTile`) and `ReleaseBits` (`StatusPill`, `MediaThumb`) — the institution screens are largely assembled from these, which keeps each screen short and consistent.
- **primitives/** — `Bits` (`Verified`, `Delta`, `ProgressBar`, `Tag`, `SectionLink`, `Inert`, `MetaStat`) and `ToastHost`.

The `Inert` primitive deserves a mention: it wraps any visible‑but‑non‑functional control so a click is a guaranteed no‑op. It is how the prototype satisfies "every control is present but inert controls never error or dead‑end".

---

## 15. Screen‑by‑screen walkthrough

**PUB‑01 Landing** — hero with headline, CTAs and an illustration; a feature row (verified sources, AI summaries, translation, watchlists); two split sections targeting institutions and individuals; a closing call to action; full footer. All CTAs route into sign‑up / login / sources.

**PUB‑02 Sign Up** — split layout: a brand panel and an account‑type chooser (Individual / Institution) plus presentational fields. Choosing a type and continuing enters that experience.

**PUB‑03 Log In** — "Welcome Back" card flanked by faded globes; email/password fields; **Log In** enters the individual app, and a secondary action enters the institution studio (so both are reachable).

**PUB‑04 Explore Sources** — public directory of verified institutions as cards (emblem, name, category, blurb, follower count). Cards open the institution's public page; a presentational search and category filter sit on top.

**USER‑01 Home** — the reader's feed (full release cards) with a right rail of trending topics and suggested institutions to follow. Cards wire Save and open the reading view.

**USER‑02 Explore** — category chips, a horizontal strip of institutions to follow, and a trending‑releases feed whose cards expose an inline Follow.

**USER‑03 Saved** — resolves the saved‑ids set to the compact saved card layout, with a graceful empty state and presentational tabs.

**USER‑04 Profile (individual)** — banner + avatar, name/handle/bio/stats, a grid of followed institutions, recently‑saved releases, and a working **Log Out** that resets the session and returns to the landing page.

**USER‑05 Institution (public)** — works for any institution slug: cover, square emblem, name + verification, category/location/website, follower stats, a working **Follow**, and the institution's releases.

**USER‑06 Full Release** — the reading view and the home of Flow B: institution header with inline Follow, title/summary, a media gallery, an overview and key points, a comments section, and a right rail with **Translate**, **AI Summary** and **Ask Anything**. Save/Share sit in the header. (See §5.)

**INST‑01 Dashboard** — a row of metric cards; a performance line chart; "recent releases" and "top performing" lists; audience‑by‑country and content‑by‑topic breakdowns. A **New Release** action routes to Publish.

**INST‑02 Publish** — the composer with live preview and edge‑case handling (see §5 and §16).

**INST‑03 Releases** — the management table. Session‑published releases are **prepended** above the seeded rows; columns cover release, type, status, date, views and engagement; presentational search/filter and row actions.

**INST‑04 Analytics** — metric cards, a multi‑series performance chart, and panels for content‑type performance, engagement breakdown (donut), geographic reach (world map), device breakdown (donut) and top content themes.

**INST‑05 Audience** — follower metric cards, a follower‑growth chart, followers by location (world map), a follower‑activity heatmap, age/gender/device demographics, and follower‑engagement and activity strips.

**INST‑06 Profile (institution)** — organisation header; an organisation‑details form (with a Save that toasts confirmation); an **Authorised People** table with role badges; and a verification panel.

---

## 16. Edge cases and the "never dead‑end" rule

The SoW is explicit that the prototype must handle edge cases and that no control may error or dead‑end. Concretely:

- **Empty publish.** Pressing Review & Publish (or Save as draft) with no headline does **not** error. The headline field is highlighted, focus moves to it, and a non‑blocking toast asks for a headline. The moment a headline is typed the error clears and publishing proceeds.
- **Inert controls.** Search fields, filters, notification bells, "show all", watchlist creation, edit buttons, secondary tabs and row menus are all present (for fidelity) but are guaranteed no‑ops. They give visual feedback on hover but never throw and never navigate to nowhere.
- **Unknown routes.** Any unrecognised path redirects to the landing page.
- **Dynamic pages always resolve.** Every institution slug yields a working public page; every feed release yields a working reading view; releases without Welsh content simply show English with the Welsh option disabled rather than rendering empty.
- **Empty states.** The Saved tab shows a friendly empty state if everything is unsaved; releases with no comments show a "be the first to comment" line.
- **No broken media.** Media is generated (SVG/gradient), so there are no missing images, even offline.
- **Repeatable demo.** Seeded charts mean the analytics never change between runs.

---

## 17. Accessibility

Within the scope of a visual prototype: a visible keyboard focus ring is defined globally; motion is reduced for users who prefer it; icons that convey meaning carry labels; the verified mark and similar glyphs have accessible labels; toasts announce politely. Colour choices aim for strong contrast against the dark surfaces. (A production build would extend this with fuller keyboard semantics and audited contrast.)

---

## 18. Repository map (file by file)

```
presspaper-demo/
├─ index.html                 Vite HTML entry (references src/main.tsx; favicon)
├─ package.json               scripts: dev / build / preview / typecheck
├─ vite.config.ts             base "./", @ alias, Tailwind, single-file inlining
├─ tsconfig*.json             strict TypeScript + @/* path mapping
├─ vercel.json                static hosting (SPA-safe rewrites)
├─ public/
│  └─ favicon.svg             brand favicon (gradient tile + P)
├─ dist/                      built output — open index.html (self-contained)
└─ src/
   ├─ main.tsx                React root; imports global CSS
   ├─ App.tsx                 all 16 routes + catch-all + ToastHost
   ├─ index.css               design tokens, base styles, .pp-* classes
   ├─ lib/
   │  └─ cn.ts                className joiner
   ├─ types/
   │  └─ index.ts             domain types (Release, Institution, …)
   ├─ data/
   │  ├─ institutions.ts      institutions + helpers
   │  ├─ releases.ts          all releases + reading-view content + Welsh
   │  └─ analytics.ts         seeded generators + all analytics datasets
   ├─ store/
   │  └─ useAppStore.ts       Zustand session store
   ├─ components/
   │  ├─ brand/               Logo, InstitutionMark, Avatar, Illustrations
   │  ├─ charts/              LineChart(+Sparkline), Donut, WorldMap, Heatmap
   │  ├─ media/               MediaTile (offline scene presets)
   │  ├─ shells/              AppShell, TopBar, sidebars, NavItem, PublicChrome
   │  ├─ release/             ReleaseTypeBadge, ReleaseCard
   │  ├─ dashboard/           Panels, ReleaseBits
   │  └─ primitives/          Bits, ToastHost
   └─ routes/
      ├─ public/              Landing, SignUp, Login, ExploreSources
      ├─ individual/          Home, Explore, Saved, Profile,
      │                       InstitutionPublic, FullRelease
      └─ institution/         Dashboard, Publish, Releases,
                              Analytics, Audience, Profile
```

Totals: ~6,500 lines of TypeScript/TSX across ~45 modules, plus the token stylesheet.

---

## 19. Building and deploying

**Scripts**
```bash
npm run dev        # Vite dev server (HMR)
npm run typecheck  # tsc -b, no emit
npm run build      # type-check then build a self-contained dist/index.html
npm run preview    # serve the built output locally
```

**Deploy to Vercel (free tier)**
1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **New Project → import the repo**. Vercel detects Vite automatically (build `npm run build`, output `dist`).
3. Deploy. `vercel.json` routes everything to `index.html`, which is safe for both hash routing and any future history routing.

Alternatively, because the build is a single self‑contained file, you can drag `dist/` onto Vercel (or any static host / CDN) directly.

**Custom domain.** In the Vercel project, **Settings → Domains → Add**, then point your domain's DNS at Vercel (CNAME for a subdomain, or the provided A/ALIAS records for an apex). HTTPS is provisioned automatically.

---

## 20. Scalability and the post‑funding path

The prototype is structured so the production build is an extension, not a rewrite:

- **Typed data modules → API.** Content already flows through typed modules (`data/*`) consumed declaratively by screens. Replacing those with fetches/React Query against a real API changes the data source, not the views.
- **Single store → real session.** The Zustand store is the natural seam for real auth, persistence and optimistic updates.
- **Component library.** Shells, cards, charts, panels and primitives are reusable building blocks; new screens are assembled from them quickly.
- **Design tokens.** One stylesheet of CSS variables means global restyles (or theming/light mode) are a token change, not a sweep through components.
- **Real assets drop in.** `InstitutionMark` and `MediaTile` are the two seams where official logos and real imagery replace the placeholders, with no structural change.
- **Routing.** Moving from hash to history routing is a one‑line swap (`HashRouter` → `BrowserRouter`); `vercel.json` already supports it.

A pragmatic production roadmap: stand up the backend and auth; wire institutions/releases/analytics to live endpoints; make publishing, saving, following and translation real (with an LLM behind AI Summary / Ask Anything); add search; layer in accessibility and test coverage.

---

## 21. Tooling — and why it's all free

Everything used is free and open‑source: **Vite**, **React**, **TypeScript**, **React Router**, **Zustand**, **Tailwind CSS**, **lucide‑react**, **@fontsource Inter**, and **vite‑plugin‑singlefile**. There are no paid services, no API keys, and no runtime dependencies on third‑party platforms. Hosting targets the **Vercel free tier**; the output is also plain static files that any free static host can serve.

---

## 22. Known limitations and scope boundaries

These are intentional, per the SoW:

- **Demo mode is front end only** — no backend, database, or network calls; **live mode** (Supabase) adds real accounts and persistence (see §13 and SUPABASE_SETUP.md). Saves/follows and the analytics dashboards remain demo data in both modes.
- **Persistence applies to releases and accounts in live mode**; in demo mode all state is in memory and resets when the tab closes (and on logout).
- **Static content** — releases, analytics and audiences are illustrative, not live; charts are visuals, not data tools.
- **Desktop / English only** — designed for a laptop at ~1440px; not responsive to mobile, and localized only where Flow B demonstrates Welsh translation.
- **Placeholder emblems and media** — original marks and generated scenes stand in for official logos and photography.
- **Out‑of‑scope controls are inert** — anything beyond the 16 screens and the two flows is deliberately non‑functional (but safe).

Everything inside the defined scope — all sixteen screens, both flows, and consistent cross‑screen state — is implemented and works.

---

*Presspaper — demonstration prototype. © 2026.*
