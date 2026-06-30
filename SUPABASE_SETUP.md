# Supabase setup — live auth & database

This prototype runs in two modes:

- **Demo mode** (no backend) — in‑memory, presenter starts pre‑logged‑in, works fully offline. This is what you get if no Supabase keys are present.
- **Live mode** (this guide) — real email/password accounts, a route guard, and releases that persist in Postgres across sessions and devices.

Follow the four steps below to turn on live mode.

---

## Step 1 — Create the database tables

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste **`supabase/migrations/0001_init.sql`** and click **Run**.
3. New query again → paste **`supabase/migrations/0002_interactivity.sql`** → **Run**.
4. New query again → paste **`supabase/migrations/0003_ai_summary.sql`** → **Run** (adds the AI-summary cache column).
5. New query again → paste **`supabase/migrations/0004_analytics_events.sql`** → **Run** (view events + real trend charts).
6. New query again → paste **`supabase/migrations/0005_verification.sql`** → **Run** (institution verification).
7. New query again → paste **`supabase/migrations/0006_comment_threads.sql`** → **Run** (replies on comments).
8. New query again → paste **`supabase/migrations/0007_watchlists.sql`** → **Run** (watchlists).
9. New query again → paste **`supabase/migrations/0008_engagement.sql`** → **Run** (real view counts on every release).

   **Tip:** instead of running these one-by-one, you can paste the single combined file **`presspaper_all_migrations.sql`** and run it once — it contains 0001→0008 in order and is safe to re-run.

This creates everything with Row Level Security enabled:

- **`profiles`** — one row per user (`role`, institution details, bio). Auto-created on signup by a trigger.
- **`releases`** — every published release, plus `views` and `comments_count` counters.
- **`follows`** + **`institution_stats`** — who follows whom, and a public, identity-free follower count per institution.
- **`saved_releases`** — each user's saved items.
- **`comments`** — real comments on releases (with a trigger maintaining the per-release count).
- **`increment_release_views()`** — a function that lets any reader bump a view count safely.

Both scripts are safe to run more than once.

---

## Step 2 — Turn off email confirmation (recommended for the demo)

By default Supabase emails a confirmation link before a new account can log in. For a smooth demo you usually want signup to log in immediately:

- Go to **Authentication → Providers → Email** and switch **Confirm email** **off**.

If you leave it **on**, the app still works — after signup it shows a "Confirm your email" screen, and the user logs in once they click the link in their inbox.

---

## Step 3 — Provide the keys (environment variables)

The app reads two build‑time variables. Get them from **Project Settings → API**:

- `VITE_SUPABASE_URL` → your Project URL
- `VITE_SUPABASE_ANON_KEY` → the **anon / public** key (safe to ship in the browser; RLS protects the data — never use the `service_role` key here)

**Local development** — they are already in **`.env`** at the project root (created for you). To run:

```bash
npm install
npm run dev
```

**On Vercel** — add the same two variables under **Project → Settings → Environment Variables**, then redeploy. (Don't commit `.env`; it's git‑ignored. `.env.example` documents the keys.)

> If both variables are absent at build time, the app automatically falls back to **demo mode** — which is exactly what you want for the fully‑offline single‑file pitch build.

---

## Step 4 — Verify end‑to‑end

1. **Sign up as an institution** (`/signup` → *As an Institution*, give an organisation name). You land in the studio.
2. **Publish** a release. It writes to `releases` and appears at the top of **Releases** and on the **Dashboard** (which now shows real counts).
3. **Refresh the page** — it's still there (it's in Postgres, not memory).
4. Open a second browser/profile and **sign up as an individual**. On **Home**, the institution's release appears. Open it:
   - the **view count** ticks up,
   - post a **comment** — it persists and the count updates,
   - **Save** it — it shows on your **Saved** tab and survives refresh,
   - **Follow** the institution — it appears in your sidebar and on your profile.
5. Back on the institution account, the **Dashboard / Analytics / Audience** reflect the real views, comments and followers you just generated.
6. Deep‑link to a protected route while logged out (e.g. `…/#/inst`) — you're redirected to **/login**. That's the auth guard.

---

## Step 5 — Enable "Summarise with AI" (optional)

Real AI summaries run through a **Supabase Edge Function** so the API key stays server-side. Without this step the app still works — the AI Summary panel just shows the built-in summary.

1. **Get a free key.** Go to **Google AI Studio** (aistudio.google.com) → **Get API key**. The free tier is enough for a demo. (Prefer Groq/another provider? Swap the `callGemini` body in the function — the contract is the same.)

2. **Install the Supabase CLI** (if you don't have it) and link the project:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref hagwrfshhwdlidfnlbmo
   ```

3. **Set the secret and deploy the functions** (all live in `supabase/functions/`):
   ```bash
   supabase secrets set GEMINI_API_KEY=your_key_here
   supabase functions deploy summarize
   supabase functions deploy translate
   ```
   (Optional model override: `supabase secrets set GEMINI_MODEL=gemini-1.5-flash`.) `summarize` powers AI summaries; `translate` powers the reader's "Translate" language picker (any language; English is the default and Welsh works offline).

   *No CLI?* You can also create the function from the Supabase dashboard → **Edge Functions → Create**, paste the contents of `summarize/index.ts`, deploy, then add `GEMINI_API_KEY` under the function's secrets.

4. **Verify.** Open any release as a signed-in user — the AI Summary panel shows a "Summarising…" shimmer, then a Gemini-generated summary. It's cached on the release, so the next view is instant. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function automatically (used for the cache); you don't set those.

---

## Step 6 — Institution verification (DNS TXT)

Deploy the second Edge Function — no extra secrets needed:
```bash
supabase functions deploy verify-domain
```
Then in the app: **institution → Profile → Verification**. Enter your domain; the app generates a token and asks you to add a `TXT` record (`presspaper-verification=<token>`) at your DNS provider, then click **Check verification**. The function does a real DNS-over-HTTPS lookup and, on success, grants the verified badge **server-side** (a DB trigger blocks clients from self-verifying). To demo without owning a domain, add that TXT record to any domain you control.

---

## Step 7 — Product analytics with PostHog (optional)

Real usage metrics for the founders (funnels, retention, active users):

1. Create a free project at **posthog.com** and copy the **Project API Key**.
2. Add it to the frontend env (Vercel → Settings → Environment Variables, and your local `.env`):
   ```
   VITE_POSTHOG_KEY=phc_xxx
   VITE_POSTHOG_HOST=https://us.i.posthog.com   # or eu.i.posthog.com
   ```
3. Redeploy / restart. The app captures pageviews and key events (`signed_up`, `logged_in`, `release_published`, `release_viewed`, `release_saved`, `institution_followed`, `comment_posted`) and identifies users. With no key set, analytics is a silent no-op. This is also what powers the **real "Performance Overview" trend** on the dashboard (via the `release_views` table from migration 0004).

---

## Step 8 — Server-rendered share pages & SEO (Vercel)

The `api/` folder contains serverless functions that render **real HTML pages with Open Graph/Twitter meta + JSON-LD** for each published release, so links unfurl on social/chat and are indexable:

- `/r/:id` → server-rendered release page (`api/r/[id].js`)
- `/sitemap.xml` → all published releases (`api/sitemap.js`)
- `robots.txt` + a branded `og.png` are served from `public/`.

These deploy automatically with the app on Vercel (`vercel.json` already wires the routes). The functions read `SUPABASE_URL` / `SUPABASE_ANON_KEY`, falling back to your existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, so **no extra config** is needed. The in-app **Share** button copies the `/r/:id` link for real releases. (Links use your deployment's domain — set a custom domain in Vercel for branded URLs.)

---

- **`src/lib/supabase.ts`** — creates the client from the env vars and exposes `isSupabaseConfigured`. When false, the whole app runs in demo mode.
- **`src/auth/AuthProvider.tsx`** — React context wrapping the app. Restores the session on load (`getSession`), subscribes to auth changes, loads the user's `profiles` row, and exposes `signUp` / `signIn` / `signOut`. Session persistence is handled by Supabase (localStorage).
- **`src/auth/ProtectedRoute.tsx`** — gates routes by session and (optionally) role; redirects to `/login` or the correct home. Pass‑through in demo mode.
- **`src/App.tsx`** — every individual route is wrapped `role="individual"`, every institution route `role="institution"`; reader pages (`/release/:id`, `/institution/:slug`) require any session.
- **Writes/reads** — `Publish` inserts into `releases`; the institution `Releases` table reads the owner's rows; the individual `Home` feed and the `FullRelease` reader read published rows. Rows are mapped to the app's `Release` shape in **`src/lib/releaseMap.ts`**.

### Security model
The anon key is public by design; **Row Level Security** is the real protection. Every policy is scoped to `auth.uid()`, so a signed‑in user can only ever write their own data and read what they're allowed to. Credentials are stored and hashed by Supabase Auth — the app never handles raw passwords.

### What is real vs. illustrative
With live mode on, these are **fully dynamic and persisted**: accounts, the auth guard, publishing, the feed, saves, follows, comments, view counts, and the institution **Dashboard / Analytics / Audience headline numbers** (total views, comments, releases, followers, recent & top releases) — all derived from real activity.

What stays **illustrative** are the analytics **distribution visuals** — audience‑by‑country, age/gender/device splits, and the activity heatmap. These need a per‑request geo/device pipeline that's outside this prototype's scope, so they're representative, deterministic charts (the totals around them are real). **Now real, when deployed:** the dashboard **Performance Overview** trend (real daily views from the `release_views` table), **AI Summary** (Gemini via the `summarize` function — falls back to a built-in summary if not deployed), institution **verification** (real DNS-TXT check via `verify-domain`), and **server-rendered share/SEO pages** (`/r/:id`, `/sitemap.xml`). **Ask Anything** remains canned suggestions/answers.
