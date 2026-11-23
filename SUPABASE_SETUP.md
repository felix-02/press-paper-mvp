# Supabase and Vercel setup

## 1. Apply the schema

For a new project, run [presspaper_all_migrations.sql](./presspaper_all_migrations.sql) in the Supabase SQL Editor. It contains migrations `0001` through `0025` in order.

For an existing project, apply only the individual files after its current migration version, in order. If an institute sees `permission denied for function valid_release_extras`, run [0025_release_extras_permissions.sql](./supabase/migrations/0025_release_extras_permissions.sql) by itself in the Supabase SQL Editor.

- `0015_security_hardening.sql` replaces broad legacy grants, hardens invitation and organisation authority, adds abuse limits, and requires duplicate active owners to be reconciled.
- `0016_super_admin_moderation.sql` adds account/post moderation, admin-only read and mutation RPCs, activity and audit logs, safe Realtime publication, and removes the obsolete verification token.
- [0017_invite_hardening.sql](./supabase/migrations/0017_invite_hardening.sql) adds single-use, email-locked 30-minute invitations and resolves pgcrypto in both supported schemas.
- [0018_engagement_and_catalogue.sql](./supabase/migrations/0018_engagement_and_catalogue.sql) adds release engagement, catalogue data, and organisation logo storage.
- [0019_release_files.sql](./supabase/migrations/0019_release_files.sql) adds saved categories and ordered media, audio and attachments. Apply it before deploying the publishing form. The migration creates the private `release-files` bucket and ties file reads to release visibility.
- [0020_profile_images.sql](./supabase/migrations/0020_profile_images.sql) supplies existing profile photos to release, comment, roster, and administration views.
- [0021_reader_profiles.sql](./supabase/migrations/0021_reader_profiles.sql) adds editable reader usernames and storage for reader profile photos.
- [0022_reader_activity.sql](./supabase/migrations/0022_reader_activity.sql) adds each reader's private activity timeline and restores older interactions from retained source rows.
- [0023_org_verification_details.sql](./supabase/migrations/0023_org_verification_details.sql) lets active team members read their organisation's verified domain and approval date.
- [0024_lock_org_category.sql](./supabase/migrations/0024_lock_org_category.sql) locks the organisation category after initial setup.
- [0025_release_extras_permissions.sql](./supabase/migrations/0025_release_extras_permissions.sql) lets signed-in publishers execute the release files and categories validator when saving a post.

Before applying `0015` to established data, reconcile duplicate active owners:

```sql
select institution_slug, count(*)
from public.org_members
where role = 'owner' and status = 'active'
group by institution_slug
having count(*) > 1;
```

The migration intentionally stops if this query returns rows.

## 2. Bootstrap the global super admin

The fastest path is [scripts/bootstrap_accounts.sql](./scripts/bootstrap_accounts.sql): edit the emails/password at the top if needed and run it in the SQL Editor. It idempotently creates (or repairs) a confirmed super-admin account, a normal reader account, and a verified institution owner — ready to sign in immediately. Change the bootstrap password after first login.

If old test data (follows or saves pointing at content that no longer exists) shows phantom institutions in reader sidebars, run [scripts/cleanup_orphaned_data.sql](./scripts/cleanup_orphaned_data.sql) once to purge it.

To grant admin manually instead: create and confirm a dedicated individual account first. Do not reuse an institution owner or member account: the global administrator is an independent platform identity. In the SQL Editor, using a privileged database connection, grant admin authority to that exact UUID:

```sql
update public.profiles
set is_admin = true
where id = '<confirmed-auth-user-uuid>';
```

Do not expose a browser endpoint that changes `is_admin`. Super-admin accounts are protected from browser moderation, and an admin cannot archive or ban itself.

The administrator signs in at `/admin/login`. The application keeps that session in the standalone platform console and redirects it away from organisation and reader workspaces.

## 3. Configure Auth

Keep email confirmation enabled. Institution and team invitations require the confirmed account email to match the invited address.

Add the local and deployed login/recovery URLs in Supabase Auth URL configuration, for example:

```text
http://localhost:5173/login
http://localhost:5173/reset-password
https://your-domain.example/login
https://your-domain.example/reset-password
```

## 4. Configure browser variables

Set these in local `.env` and the Vercel build environment:

```dotenv
VITE_APP_MODE=live
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is expected in the browser; RLS and checked RPCs enforce authorization. Never place a service-role key in a `VITE_` variable.

Optional analytics:

```dotenv
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

Autocapture and session recording are disabled. Application activity is also written to the bounded Supabase activity stream for admin supervision; sensitive-looking metadata keys are rejected.

## 5. Deploy Edge Functions (AI summaries + translation)

AI summaries and translation require Edge Functions in the same Supabase
project as `VITE_SUPABASE_URL`. A `404 NOT_FOUND` from the function endpoint
means it needs to be deployed to that project. Until deployment, readers can
still view the original release and its source summary.

To enable these features:

```bash
# once: npm install -g supabase && supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_API_KEY=your_key      # aistudio.google.com/apikey
supabase secrets set GEMINI_MODEL=gemini-3.5-flash
supabase functions deploy summarize
supabase functions deploy translate
```

Translation defaults to `gemini-3.5-flash-lite`. Set
`GEMINI_TRANSLATION_MODEL` in Edge Function secrets to override it.
A custom `GEMINI_MODEL` also applies to translation when that override is
unset. The shared setup value `gemini-3.5-flash` applies to summaries.

Verify from the dashboard (Edge Functions → summarize / translate → Logs)
or by opening any release while signed in: the Summary panel switches from
"Source summary" to "AI-generated", and every language in the Translate menu
(all 68 are validated against the function's allowlist) returns translated
text.

JWT verification remains enabled. Both functions revalidate the caller, enforce request/output bounds and timeouts, and use the shared Postgres quota function.

## 6. Configure Vercel runtime variables

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
PUBLIC_SITE_URL=https://your-domain.example
```

`PUBLIC_SITE_URL` controls canonical, Open Graph, and sitemap URLs. `vercel.json` supplies the SPA fallback, `/r/:id`, `/sitemap.xml`, CSP, frame, MIME, referrer, permissions, and transport headers.

## 7. Staging checklist

- Confirm a normal account cannot see an admin link, is redirected away from `/admin`, and receives permission errors from admin RPCs.
- Confirm an admin login opens `/admin` and can page through users, institutions, posts, activity, and audit entries.
- Ban and archive test accounts; verify protected reads/writes stop and recovery restores access.
- Archive/delete a published post; verify it leaves open feeds after reconciliation and disappears from public/share/sitemap reads. Recover it and verify access returns.
- Publish from a verified institution; verify the reader chip appears through Realtime or polling and loads the buffered releases on click.
- Exercise institution invitation, owner approval, team roles, drafts, publishing, comments, saves, follows, watchlists, logout, password recovery, and deep-link refresh.
- Verify both light and dark themes on desktop and mobile layouts.

Database backups, gateway rate controls, signup bot protection, and operational alerting remain deployment responsibilities.
