# Presspaper — Demonstration Prototype

> The home for verified public information. Institutions publish official releases directly to the public; individuals read them with AI summaries, translation and watchlists built in.

This repository contains the **clickable demonstration prototype** for Presspaper, built to the supplied Statement of Work (SoW v1.0). It reproduces all **16 screens** of the product across three experiences — the public marketing site, the individual reader app, and the institution publishing studio — as a single, offline‑capable React application.

It is a **front‑end demonstration**: all content is static and hard‑coded, there is no backend or database, and nothing persists once the browser tab is closed. Within those boundaries, the two core journeys are fully interactive and every screen is reachable.

---

## Quick start

**Option A — just open it (no tools required).**
Open `dist/index.html` in any modern browser (Chrome, Edge, Firefox, Safari). The entire app — code, styles and fonts — is inlined into that one file, so it runs straight from disk with no server and no internet connection.

**Option B — run the dev server.**
```bash
npm install
npm run dev        # http://localhost:5173
```

**Build it yourself.**
```bash
npm run build      # type-checks, then emits a self-contained dist/index.html
npm run preview    # serve the built output locally
```

See **HOW_TO_RUN.md** for a one‑page guide, and **DOCUMENTATION.md** for the full technical write‑up.

---

## Two modes: demo and live

The app runs in one of two modes depending on whether Supabase keys are present at build time:

- **Demo mode** (no backend) — in‑memory, the presenter starts pre‑logged‑in, and everything works fully **offline**. Ideal for the single‑file pitch build.
- **Live mode** (Supabase) — **real email/password accounts**, a **route guard**, and institution releases that **persist in Postgres** across sessions and devices.

This repository ships configured for **live mode** (`.env` contains the Supabase keys). To enable it on a fresh project — run the SQL migration, set the env vars, and verify — follow **SUPABASE_SETUP.md** (4 steps). To force demo mode instead, build without the env vars.

---

## The two journeys to demo

**Flow A — an institution publishes a release.** Start on the institution side (the *Sign in as an institution* button on the login screen, or the *As an Institution* option on sign‑up). Go to **Publish**, write a headline, pick a type and cover, and press **Review & Publish**. You land on **Releases** with your new release sitting at the top of the table, flagged *New*, and a success toast confirms it.

**Flow B — an individual reads a release.** Start on the individual side. On **Home**, open the Welsh Government release. On the full release page you can read the **AI Summary**, click **Ask Anything** suggestions to get answers, **Translate** the release to Welsh, and **Save** it — saved items appear on the **Saved** tab.

---

## What's inside

- **16 screens**, pixel‑close to the supplied mockups, organised by experience.
- **Two working flows** (publish, read) plus consistent **Save / Follow** state that persists as you move between screens within a session.
- **Premium dark UI** with a single typographic system (Inter), custom SVG charts, and tasteful original institution emblems.
- **Every control is reachable and safe** — non‑wired controls are present but inert; they never error or dead‑end.
- **Deterministic charts** — all analytics are seeded, so the demo looks identical every time you present it.
- **100% free tooling**, deployable to the Vercel free tier (and later your own domain).

## Tech stack

React 18 · TypeScript (strict) · Vite 5 · React Router 6 (HashRouter) · Zustand · Tailwind v4 · lucide‑react · custom SVG charts · self‑hosted Inter. Full rationale in **DOCUMENTATION.md**.

## Repository layout (top level)

```
presspaper-demo/
├─ index.html              # Vite entry
├─ vite.config.ts          # build config (single-file inline + @ alias)
├─ vercel.json             # static hosting config
├─ public/favicon.svg      # brand favicon
├─ dist/                   # built, self-contained output (open index.html)
└─ src/
   ├─ main.tsx             # React root
   ├─ App.tsx              # routes for all 16 screens
   ├─ index.css            # design tokens + base styles
   ├─ types/               # domain types
   ├─ data/                # static content (institutions, releases, analytics)
   ├─ store/               # Zustand session store
   ├─ lib/                 # tiny helpers
   ├─ components/          # brand, charts, shells, release cards, primitives
   └─ routes/             # screens: public / individual / institution
```

A file‑by‑file walkthrough is in **DOCUMENTATION.md**.

---

© 2026 Presspaper. Demonstration prototype. All institution names are used to illustrate the product; emblems are original placeholders, not official logos.
