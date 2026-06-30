-- ============================================================================
-- PRESSPAPER — ALL MIGRATIONS (0001 -> 0014), IN ORDER, IN ONE FILE.
-- Paste this ENTIRE file into Supabase -> SQL Editor -> Run. Idempotent.
-- After running, make yourself the platform admin (once):
--   update public.profiles set is_admin = true where id = '<your-user-id>';
-- Institutions are INVITE-ONLY: issue invites from the in-app Review screen.
-- ============================================================================


-- ////////////////////////////////////////////////////////////////////////
-- 0001_init.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — database schema
-- Run this in Supabase → SQL Editor (paste the whole file and Run).
-- Safe to run more than once.

-- ───────────────────────────────────────────────────────────────────────────
-- PROFILES  (one row per auth user: their role + institution)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              text not null default 'individual'
                      check (role in ('individual', 'institution')),
  full_name         text,
  institution_slug  text,
  institution_name  text,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"  on public.profiles;
drop policy if exists "profiles_insert_own"  on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;

-- A user can read and edit only their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create the profile when a user signs up, using the metadata the client
-- passed to supabase.auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, institution_slug, institution_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'individual'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institution_slug',
    new.raw_user_meta_data ->> 'institution_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────────
-- RELEASES  (every post an institution publishes — this is the data that must
-- survive across sessions and devices)
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.releases (
  id                uuid primary key default gen_random_uuid(),
  owner             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  institution_slug  text not null default 'welsh-government',
  institution_name  text,
  type              text not null default 'Announcement',
  status            text not null default 'Published'
                      check (status in ('Published', 'Draft', 'Scheduled')),
  heading           text not null,
  subheading        text,
  body              text,
  scene             text not null default 'wind-farm',
  published_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.releases enable row level security;

drop policy if exists "releases_select_published" on public.releases;
drop policy if exists "releases_insert_own"        on public.releases;
drop policy if exists "releases_update_own"        on public.releases;
drop policy if exists "releases_delete_own"        on public.releases;

-- Anyone signed in can read published releases; owners can also see their drafts.
create policy "releases_select_published" on public.releases
  for select using (status = 'Published' or auth.uid() = owner);

-- Institutions can only create/modify/remove their OWN releases.
create policy "releases_insert_own" on public.releases
  for insert with check (auth.uid() = owner);
create policy "releases_update_own" on public.releases
  for update using (auth.uid() = owner);
create policy "releases_delete_own" on public.releases
  for delete using (auth.uid() = owner);

create index if not exists releases_owner_idx   on public.releases(owner);
create index if not exists releases_status_idx  on public.releases(status);
create index if not exists releases_created_idx on public.releases(created_at desc);

-- Done. Tables: public.profiles, public.releases (both with RLS enabled).


-- ////////////////////////////////////////////////////////////////////////
-- 0002_interactivity.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — interactivity schema (run AFTER 0001_init.sql)
-- Adds: follows, saved releases, comments, view tracking, follower counts.
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to re-run.

-- ── extra columns on releases (engagement counters) ─────────────────────────
alter table public.releases add column if not exists views          integer not null default 0;
alter table public.releases add column if not exists comments_count  integer not null default 0;

-- optional org bio for the institution profile editor
alter table public.profiles add column if not exists bio text;

-- ── FOLLOWS ─────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower          uuid not null references auth.users(id) on delete cascade,
  institution_slug  text not null,
  created_at        timestamptz not null default now(),
  primary key (follower, institution_slug)
);
alter table public.follows enable row level security;

drop policy if exists "follows_select_own" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_select_own" on public.follows for select using (auth.uid() = follower);
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower);

-- Public, identity-free follower counts per institution slug.
create table if not exists public.institution_stats (
  slug             text primary key,
  followers_count  integer not null default 0
);
alter table public.institution_stats enable row level security;
drop policy if exists "stats_select_all" on public.institution_stats;
create policy "stats_select_all" on public.institution_stats for select using (true);

create or replace function public.sync_follow_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.institution_stats as s (slug, followers_count)
    values (new.institution_slug, 1)
    on conflict (slug) do update set followers_count = s.followers_count + 1;
  elsif (tg_op = 'DELETE') then
    update public.institution_stats
      set followers_count = greatest(0, followers_count - 1)
      where slug = old.institution_slug;
  end if;
  return null;
end; $$;

drop trigger if exists trg_follow_count on public.follows;
create trigger trg_follow_count
  after insert or delete on public.follows
  for each row execute function public.sync_follow_count();

-- ── SAVED RELEASES ──────────────────────────────────────────────────────────
-- release_id is TEXT so it can reference either a real release (uuid) or one of
-- the static demo releases (slug-like id) shown in the seeded feed.
create table if not exists public.saved_releases (
  user_id     uuid not null references auth.users(id) on delete cascade,
  release_id  text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, release_id)
);
alter table public.saved_releases enable row level security;

drop policy if exists "saved_select_own" on public.saved_releases;
drop policy if exists "saved_insert_own" on public.saved_releases;
drop policy if exists "saved_delete_own" on public.saved_releases;
create policy "saved_select_own" on public.saved_releases for select using (auth.uid() = user_id);
create policy "saved_insert_own" on public.saved_releases for insert with check (auth.uid() = user_id);
create policy "saved_delete_own" on public.saved_releases for delete using (auth.uid() = user_id);

-- ── COMMENTS ────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  release_id   text not null,
  author       uuid not null references auth.users(id) on delete cascade,
  author_name  text,
  body         text not null,
  created_at   timestamptz not null default now()
);
alter table public.comments enable row level security;

drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
-- Any signed-in user can read comments; you can only create/delete your own.
create policy "comments_select_all" on public.comments for select using (auth.uid() is not null);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = author);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = author);

create index if not exists comments_release_idx on public.comments(release_id, created_at);

-- Maintain releases.comments_count for real (uuid) releases.
create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if (tg_op = 'INSERT') then
    begin rid := new.release_id::uuid; exception when others then rid := null; end;
    if rid is not null then update public.releases set comments_count = comments_count + 1 where id = rid; end if;
  elsif (tg_op = 'DELETE') then
    begin rid := old.release_id::uuid; exception when others then rid := null; end;
    if rid is not null then update public.releases set comments_count = greatest(0, comments_count - 1) where id = rid; end if;
  end if;
  return null;
end; $$;

drop trigger if exists trg_comment_count on public.comments;
create trigger trg_comment_count
  after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- ── VIEW TRACKING ───────────────────────────────────────────────────────────
-- SECURITY DEFINER so any signed-in reader can bump a view count even though
-- they don't own the release (the update policy only allows owners to edit).
create or replace function public.increment_release_views(rid uuid)
returns void language sql security definer set search_path = public as $$
  update public.releases set views = views + 1 where id = rid;
$$;

grant execute on function public.increment_release_views(uuid) to anon, authenticated;

-- Done.


-- ////////////////////////////////////////////////////////////////////////
-- 0003_ai_summary.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — AI summary cache (run after 0001 + 0002)
-- Stores the generated summary on the release so it's produced once and is
-- instant on every later view. Written by the `summarize` Edge Function using
-- the service role, so no extra client RLS is required. Safe to re-run.

alter table public.releases add column if not exists ai_summary text;


-- ////////////////////////////////////////////////////////////////////////
-- 0004_analytics_events.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — analytics events (run after 0001–0003)
-- Logs individual release views so the institution dashboards can show REAL
-- view-over-time charts (not just totals). Safe to re-run.

create table if not exists public.release_views (
  id          uuid primary key default gen_random_uuid(),
  release_id  uuid not null references public.releases(id) on delete cascade,
  owner       uuid,                       -- the institution that owns the release
  viewer      uuid,                       -- who viewed (may be null)
  created_at  timestamptz not null default now()
);
alter table public.release_views enable row level security;

drop policy if exists "rv_select_owner" on public.release_views;
-- An institution can read view events for releases it owns (for its charts).
-- Inserts happen only via the SECURITY DEFINER function below, never directly.
create policy "rv_select_owner" on public.release_views for select using (auth.uid() = owner);

create index if not exists rv_owner_created_idx on public.release_views(owner, created_at);
create index if not exists rv_release_idx on public.release_views(release_id);

-- Bump the counter AND log an event (with the release's owner + the viewer).
create or replace function public.increment_release_views(rid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare own uuid;
begin
  update public.releases set views = views + 1 where id = rid returning owner into own;
  if own is not null then
    insert into public.release_views (release_id, owner, viewer) values (rid, own, auth.uid());
  end if;
end; $$;

grant execute on function public.increment_release_views(uuid) to anon, authenticated;

-- Daily view counts for the calling institution's releases over the last N days,
-- with gap-filling so the chart has a point for every day. Runs as the caller,
-- so RLS scopes release_views to rows they own.
create or replace function public.institution_view_series(days integer default 14)
returns table(day date, views bigint)
language sql stable security invoker set search_path = public as $$
  select g::date as day, count(rv.id) as views
  from generate_series((now() - make_interval(days => days - 1))::date, now()::date, interval '1 day') g
  left join public.release_views rv on rv.created_at::date = g::date
  group by g
  order by g;
$$;

grant execute on function public.institution_view_series(integer) to authenticated;


-- ////////////////////////////////////////////////////////////////////////
-- 0005_verification.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — institution verification (run after 0001–0004)
-- Adds a real verification state to profiles, proven via a DNS TXT record and
-- granted server-side by the `verify-domain` Edge Function. Safe to re-run.

alter table public.profiles add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified'));
alter table public.profiles add column if not exists verification_token  text;
alter table public.profiles add column if not exists verification_domain text;
alter table public.profiles add column if not exists verified_at         timestamptz;

-- Defence in depth: a signed-in client may move itself to 'pending' and store a
-- challenge token/domain, but may NEVER set itself to 'verified' or stamp
-- verified_at. Only the Edge Function (service role; auth.uid() is null there)
-- can grant verification after the DNS check passes.
create or replace function public.guard_profile_verification()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    if new.verification_status = 'verified' and old.verification_status is distinct from 'verified' then
      new.verification_status := old.verification_status;
    end if;
    new.verified_at := old.verified_at;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_verification on public.profiles;
create trigger trg_guard_profile_verification
  before update on public.profiles
  for each row execute function public.guard_profile_verification();


-- ////////////////////////////////////////////////////////////////////////
-- 0006_comment_threads.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — threaded comments (run after 0001–0005). Safe to re-run.
-- Adds a self-reference so comments can be replies to other comments.

alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_idx on public.comments(parent_id);


-- ////////////////////////////////////////////////////////////////////////
-- 0007_watchlists.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — watchlists (run after 0001–0006). Safe to re-run.
-- Users can group saved releases into named watchlists.

create table if not exists public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);
alter table public.watchlists enable row level security;

drop policy if exists "wl_select_own" on public.watchlists;
drop policy if exists "wl_insert_own" on public.watchlists;
drop policy if exists "wl_update_own" on public.watchlists;
drop policy if exists "wl_delete_own" on public.watchlists;
create policy "wl_select_own" on public.watchlists for select using (auth.uid() = user_id);
create policy "wl_insert_own" on public.watchlists for insert with check (auth.uid() = user_id);
create policy "wl_update_own" on public.watchlists for update using (auth.uid() = user_id);
create policy "wl_delete_own" on public.watchlists for delete using (auth.uid() = user_id);

create table if not exists public.watchlist_items (
  watchlist_id  uuid not null references public.watchlists(id) on delete cascade,
  release_id    text not null,
  created_at    timestamptz not null default now(),
  primary key (watchlist_id, release_id)
);
alter table public.watchlist_items enable row level security;

-- You can only touch items of watchlists you own.
drop policy if exists "wli_select_own" on public.watchlist_items;
drop policy if exists "wli_insert_own" on public.watchlist_items;
drop policy if exists "wli_delete_own" on public.watchlist_items;
create policy "wli_select_own" on public.watchlist_items for select
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "wli_insert_own" on public.watchlist_items for insert
  with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "wli_delete_own" on public.watchlist_items for delete
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));


-- ////////////////////////////////////////////////////////////////////////
-- 0008_engagement.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — public engagement counter (run after 0001–0007). Safe to re-run.
-- A view counter keyed by TEXT release id, so it works for BOTH real (uuid)
-- releases and the static demo releases. This powers the REAL "views" number
-- shown on release pages. (The uuid-based release_views table from 0004 still
-- feeds the institution analytics charts; this is the public-facing counter.)

create table if not exists public.release_engagement (
  release_id  text primary key,
  views       integer not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.release_engagement enable row level security;

-- Counts are public (anyone signed in can read them for display).
drop policy if exists "engagement_select_all" on public.release_engagement;
create policy "engagement_select_all" on public.release_engagement
  for select using (true);

-- Increment via a SECURITY DEFINER function so readers can bump a counter they
-- don't own. One call = one view. Returns the new total.
create or replace function public.bump_release_view(rid text)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_total integer;
begin
  insert into public.release_engagement as e (release_id, views, updated_at)
  values (rid, 1, now())
  on conflict (release_id)
  do update set views = e.views + 1, updated_at = now()
  returning views into new_total;
  return new_total;
end; $$;

grant execute on function public.bump_release_view(text) to anon, authenticated;


-- ////////////////////////////////////////////////////////////////////////
-- 0009_onboarding.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — institution onboarding (run after 0001–0008). Safe to re-run.
-- Adds profile fields used by the first-login guided onboarding for institutions,
-- plus an explicit completion flag that gates the rest of the institution app.

alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists org_website text;
alter table public.profiles add column if not exists org_location text;
alter table public.profiles add column if not exists org_description text;
alter table public.profiles add column if not exists org_category text;

-- Existing rows: leave onboarding_complete = false so each institution is asked
-- to confirm/complete its details once. Individuals are never gated (the app only
-- checks this flag for role = 'institution').


-- ////////////////////////////////////////////////////////////////////////
-- 0010_org_members.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — institution team membership, roles, invites & owner approval.
-- Run after 0001–0009. Safe to re-run.
--
-- Model:
--   * org_members  — who belongs to an institution (by slug) and their role/status
--   * org_invites  — email-bound invitations with a one-time token
--   * The institution ACCOUNT CREATOR becomes the 'owner' automatically (trigger),
--     so every org always has exactly one full-access owner.
--   * Invited people sign up / log in, accept via a token (email must match — they
--     can't forward it to another account), then land in 'pending' until the OWNER
--     approves them. Approval is owner-only and enforced in the database.

-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.org_members (
  institution_slug text not null,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null default 'viewer' check (role in ('owner','admin','editor','viewer')),
  status           text not null default 'pending' check (status in ('pending','active','declined')),
  created_at       timestamptz not null default now(),
  primary key (institution_slug, user_id)
);
alter table public.org_members enable row level security;

create table if not exists public.org_invites (
  id                uuid primary key default gen_random_uuid(),
  institution_slug  text not null,
  email             text not null,
  role              text not null default 'viewer' check (role in ('admin','editor','viewer')),
  token             text not null unique default encode(gen_random_bytes(16), 'hex'),
  status            text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);
alter table public.org_invites enable row level security;

-- ── Helpers (SECURITY DEFINER so RLS policies can call them without recursion) ──
create or replace function public.is_org_member(slug text, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.org_members m
    where m.institution_slug = slug and m.user_id = uid and m.status = 'active'
  );
$$;

create or replace function public.org_role(slug text, uid uuid)
returns text language sql security definer stable set search_path = public as $$
  select role from public.org_members m
  where m.institution_slug = slug and m.user_id = uid and m.status = 'active';
$$;

-- ── RLS ──
drop policy if exists "om_select" on public.org_members;
create policy "om_select" on public.org_members for select
  using (user_id = auth.uid() or public.is_org_member(institution_slug, auth.uid()));

-- Owners/admins can manage rows (role tweaks, removals). Approval of pending
-- members is owner-only and handled by set_member_status() below.
drop policy if exists "om_manage" on public.org_members;
create policy "om_manage" on public.org_members for all
  using (public.org_role(institution_slug, auth.uid()) in ('owner','admin'))
  with check (public.org_role(institution_slug, auth.uid()) in ('owner','admin'));

drop policy if exists "oi_manage" on public.org_invites;
create policy "oi_manage" on public.org_invites for all
  using (public.org_role(institution_slug, auth.uid()) in ('owner','admin'))
  with check (public.org_role(institution_slug, auth.uid()) in ('owner','admin'));

-- ── Owner bootstrap: institution account creator becomes owner ──
create or replace function public.handle_institution_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'institution' and new.institution_slug is not null then
    insert into public.org_members(institution_slug, user_id, role, status)
    values (new.institution_slug, new.id, 'owner', 'active')
    on conflict (institution_slug, user_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists on_institution_profile_created on public.profiles;
create trigger on_institution_profile_created
  after insert on public.profiles
  for each row execute function public.handle_institution_owner();

-- ── Read an invite by token (for the join screen) ──
create or replace function public.get_invite(invite_token text)
returns table(institution_slug text, email text, role text, org_name text, status text)
language sql security definer stable set search_path = public as $$
  select i.institution_slug, i.email, i.role,
         coalesce(
           (select p.institution_name from public.profiles p
            where p.institution_slug = i.institution_slug and p.role = 'institution' limit 1),
           i.institution_slug),
         i.status
  from public.org_invites i
  where i.token = invite_token;
$$;
grant execute on function public.get_invite(text) to authenticated, anon;

-- ── Accept an invite (email-bound; lands as pending for owner approval) ──
create or replace function public.accept_org_invite(invite_token text)
returns text language plpgsql security definer set search_path = public as $$
declare inv record; caller_email text;
begin
  select * into inv from public.org_invites where token = invite_token and status = 'pending';
  if inv is null then return 'invalid'; end if;

  select email into caller_email from auth.users where id = auth.uid();
  if caller_email is null then return 'unauthenticated'; end if;
  -- Email binding: the logged-in account must match the invited address.
  if lower(caller_email) <> lower(inv.email) then return 'email_mismatch'; end if;

  insert into public.org_members(institution_slug, user_id, role, status)
  values (inv.institution_slug, auth.uid(), inv.role, 'pending')
  on conflict (institution_slug, user_id)
    do update set role = excluded.role, status = 'pending';

  -- Give them the institution workspace for this org (no org setup needed —
  -- they're joining an existing org, so onboarding is already complete).
  update public.profiles
    set role = 'institution', institution_slug = inv.institution_slug, onboarding_complete = true
    where id = auth.uid();

  update public.org_invites set status = 'accepted' where id = inv.id;
  return 'ok';
end; $$;
grant execute on function public.accept_org_invite(text) to authenticated;

-- ── Owner-only approval / decline of a pending member ──
create or replace function public.set_member_status(slug text, target uuid, new_status text)
returns text language plpgsql security definer set search_path = public as $$
begin
  -- ONLY the owner may approve/decline. Admins cannot reach this.
  if public.org_role(slug, auth.uid()) <> 'owner' then return 'forbidden'; end if;
  if new_status not in ('active','declined') then return 'bad_status'; end if;
  if target = auth.uid() then return 'cannot_self'; end if; -- owner can't decline themselves
  update public.org_members
    set status = new_status
    where institution_slug = slug and user_id = target and role <> 'owner';
  return 'ok';
end; $$;
grant execute on function public.set_member_status(text, uuid, text) to authenticated;

-- ── Roster with emails/names for a member to view (bypasses profiles RLS safely) ──
create or replace function public.org_members_detail(slug text)
returns table(user_id uuid, role text, status text, email text, full_name text, created_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_org_member(slug, auth.uid()) then
    return;
  end if;
  return query
    select m.user_id, m.role, m.status, u.email::text, p.full_name, m.created_at
    from public.org_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.institution_slug = slug
    order by (m.role = 'owner') desc, m.created_at asc;
end; $$;
grant execute on function public.org_members_detail(text) to authenticated;


-- ////////////////////////////////////////////////////////////////////////
-- 0011_org_verification_gate.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — org verification gate (run after 0001–0010). Safe to re-run.
-- Restricts institutions from publishing until they've proven domain control via
-- DNS verification. An impersonator can't add a TXT record to a domain they don't
-- own, so they can never operate as that organisation.
--
-- org_is_verified(slug) reports whether the OWNER of the org has verified the
-- domain. Members publish under the org, so the whole org's ability to publish
-- follows the owner's verification state.

create or replace function public.org_is_verified(slug text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select p.verification_status = 'verified'
    from public.org_members m
    join public.profiles p on p.id = m.user_id
    where m.institution_slug = slug and m.role = 'owner'
    limit 1
  ), false);
$$;

grant execute on function public.org_is_verified(text) to authenticated;


-- ////////////////////////////////////////////////////////////////////////
-- 0012_org_roles_seats.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — backfill owners, owner-managed roles, 5-seat limit.
-- Run after 0001–0011. Safe to re-run.

-- ── Backfill: every EXISTING institution account becomes the owner of its org.
-- (The 0010 trigger only fires for NEW signups; accounts created before it had
--  no membership row, which left their owners with no permissions.)
insert into public.org_members (institution_slug, user_id, role, status)
select p.institution_slug, p.id, 'owner', 'active'
from public.profiles p
where p.role = 'institution' and p.institution_slug is not null
on conflict (institution_slug, user_id) do nothing;

-- ── Owner-only: change a member's role (never the owner's).
create or replace function public.set_member_role(slug text, target uuid, new_role text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if public.org_role(slug, auth.uid()) <> 'owner' then return 'forbidden'; end if;
  if new_role not in ('admin','editor','viewer') then return 'bad_role'; end if;
  if target = auth.uid() then return 'cannot_self'; end if;
  update public.org_members
    set role = new_role
    where institution_slug = slug and user_id = target and role <> 'owner';
  return 'ok';
end; $$;
grant execute on function public.set_member_role(text, uuid, text) to authenticated;

-- ── Hard 5-seat limit per org (declined members don't count).
create or replace function public.enforce_org_seat_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.org_members
      where institution_slug = new.institution_slug and status <> 'declined') >= 5 then
    raise exception 'Seat limit reached: this plan includes 5 seats.';
  end if;
  return new;
end; $$;

drop trigger if exists org_seat_limit on public.org_members;
create trigger org_seat_limit before insert on public.org_members
  for each row execute function public.enforce_org_seat_limit();


-- ////////////////////////////////////////////////////////////////////////
-- 0013_email_domain_admin_approval.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — replace DNS verification with email-domain + admin approval.
-- Run after 0001–0012. Safe to re-run.
--
-- New model (simpler than DNS):
--   * Institutions must sign up with a work email on a real (non-free) domain;
--     Supabase's email confirmation proves they control that address.
--   * The org's email domain is captured automatically on signup.
--   * Every institution starts 'pending' and a PLATFORM ADMIN approves it before
--     it becomes 'verified' (official badge + able to publish).
--
-- To make yourself the platform admin after running this, once:
--   update public.profiles set is_admin = true where id = '<your-user-id>';

-- 1) Platform-admin flag.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) Allow a 'rejected' verification state.
alter table public.profiles drop constraint if exists profiles_verification_status_check;
alter table public.profiles add constraint profiles_verification_status_check
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

-- 3) Admin check helper.
create or replace function public.is_platform_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.is_platform_admin() to authenticated;

-- 4) Capture the email domain on signup and start institutions as 'pending'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare is_inst boolean; email_domain text;
begin
  is_inst := coalesce(new.raw_user_meta_data ->> 'role', 'individual') = 'institution';
  email_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  insert into public.profiles (id, role, full_name, institution_slug, institution_name, verification_domain, verification_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'individual'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'institution_slug',
    new.raw_user_meta_data ->> 'institution_name',
    case when is_inst then email_domain else null end,
    case when is_inst then 'pending' else 'unverified' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5) Verification guard: clients still can't self-verify, but PLATFORM ADMINS may
--    approve (set 'verified'). Service role (auth.uid() null) is unaffected.
create or replace function public.guard_profile_verification()
returns trigger language plpgsql set search_path = public as $$
declare caller_admin boolean;
begin
  if auth.uid() is not null then
    select coalesce(is_admin, false) into caller_admin from public.profiles where id = auth.uid();
    if not coalesce(caller_admin, false) then
      if new.verification_status = 'verified' and old.verification_status is distinct from 'verified' then
        new.verification_status := old.verification_status;
      end if;
      new.verified_at := old.verified_at;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_verification on public.profiles;
create trigger trg_guard_profile_verification
  before update on public.profiles
  for each row execute function public.guard_profile_verification();

-- 6) Admin actions: approve / reject an institution (the org owner's account).
create or replace function public.approve_institution(target uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then return 'forbidden'; end if;
  update public.profiles
    set verification_status = 'verified', verified_at = now()
    where id = target and role = 'institution';
  return 'ok';
end; $$;
grant execute on function public.approve_institution(uuid) to authenticated;

create or replace function public.reject_institution(target uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then return 'forbidden'; end if;
  update public.profiles
    set verification_status = 'rejected', verified_at = null
    where id = target and role = 'institution';
  return 'ok';
end; $$;
grant execute on function public.reject_institution(uuid) to authenticated;

-- 7) Review queue for the admin: institution OWNERS (not invited teammates),
--    pending first.
create or replace function public.pending_institutions()
returns table(user_id uuid, institution_name text, institution_slug text, email text, domain text, created_at timestamptz, status text)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_platform_admin() then return; end if;
  return query
    select p.id, p.institution_name, p.institution_slug, u.email::text, p.verification_domain, p.created_at, p.verification_status
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'institution'
      and exists (
        select 1 from public.org_members m
        where m.user_id = p.id and m.institution_slug = p.institution_slug and m.role = 'owner'
      )
    order by (p.verification_status = 'pending') desc, p.created_at desc;
end; $$;
grant execute on function public.pending_institutions() to authenticated;


-- ////////////////////////////////////////////////////////////////////////
-- 0014_invite_only_institutions.sql
-- ////////////////////////////////////////////////////////////////////////

-- Presspaper — invite-only institutions (run after 0001–0013). Safe to re-run.
--
-- There is NO public "register as an institution" path. The only way to become
-- an institution is to accept a single-use, expiring, email-bound invite that a
-- PLATFORM ADMIN issued. Self-serve institution signup is blocked server-side, so
-- it can't be forged by hitting the API directly. Tokens are stored HASHED, so a
-- DB read never exposes a usable invite.

create extension if not exists pgcrypto;

create table if not exists public.platform_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  org_name    text not null,
  org_slug    text not null,
  token_hash  text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  consumed_at timestamptz,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.platform_invites enable row level security;
-- No client policies: this table is reachable ONLY through the SECURITY DEFINER
-- functions below. Direct selects/inserts from the browser are denied.

-- 1) Block self-serve institutions: every NEW signup is an individual, no matter
--    what role/metadata the client sends. Institutions are created only by
--    accept_platform_invite() (an UPDATE), never at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, verification_status)
  values (
    new.id,
    'individual',
    new.raw_user_meta_data ->> 'full_name',
    'unverified'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Admin issues an invite. Returns the PLAIN token once (for the link); only
--    its hash is stored.
create or replace function public.create_platform_invite(p_email text, p_org_name text)
returns text language plpgsql security definer set search_path = public as $$
declare plain text; base_slug text; final_slug text;
begin
  if not public.is_platform_admin() then return null; end if;
  if coalesce(trim(p_email),'') = '' or coalesce(trim(p_org_name),'') = '' then return null; end if;

  plain := encode(gen_random_bytes(18), 'hex');
  base_slug := lower(regexp_replace(trim(p_org_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  if base_slug = '' then base_slug := 'org'; end if;
  final_slug := base_slug;
  if exists (select 1 from public.profiles where institution_slug = final_slug and role = 'institution') then
    final_slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.platform_invites (email, org_name, org_slug, token_hash, created_by)
  values (lower(trim(p_email)), trim(p_org_name), final_slug, encode(digest(plain, 'sha256'), 'hex'), auth.uid());

  return plain;
end; $$;
grant execute on function public.create_platform_invite(text, text) to authenticated;

-- 3) Read an invite by token (for the acceptance screen). Never returns the token.
create or replace function public.get_platform_invite(p_token text)
returns table(email text, org_name text, valid boolean, reason text)
language plpgsql security definer stable set search_path = public as $$
declare inv record;
begin
  select * into inv from public.platform_invites
    where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  if inv is null then return query select null::text, null::text, false, 'invalid'; return; end if;
  if inv.consumed_at is not null then return query select inv.email, inv.org_name, false, 'consumed'; return; end if;
  if inv.expires_at <= now() then return query select inv.email, inv.org_name, false, 'expired'; return; end if;
  return query select inv.email, inv.org_name, true, 'ok';
end; $$;
grant execute on function public.get_platform_invite(text) to authenticated, anon;

-- 4) Accept an invite: validates token (unconsumed + unexpired) AND that the
--    caller's CONFIRMED email matches the invited address, then provisions the
--    institution + owner and burns the token. Stays 'pending' for admin approval.
create or replace function public.accept_platform_invite(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare inv record; caller_email text; confirmed_at timestamptz;
begin
  select * into inv from public.platform_invites
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    for update;
  if inv is null then return 'invalid'; end if;
  if inv.consumed_at is not null then return 'consumed'; end if;
  if inv.expires_at <= now() then return 'expired'; end if;

  select email, email_confirmed_at into caller_email, confirmed_at from auth.users where id = auth.uid();
  if caller_email is null then return 'unauthenticated'; end if;
  if confirmed_at is null then return 'email_unconfirmed'; end if;
  if lower(caller_email) <> lower(inv.email) then return 'email_mismatch'; end if;

  update public.profiles set
    role = 'institution',
    institution_slug = inv.org_slug,
    institution_name = inv.org_name,
    verification_domain = lower(split_part(caller_email, '@', 2)),
    verification_status = 'pending',
    onboarding_complete = false
    where id = auth.uid();

  insert into public.org_members (institution_slug, user_id, role, status)
  values (inv.org_slug, auth.uid(), 'owner', 'active')
  on conflict (institution_slug, user_id) do update set role = 'owner', status = 'active';

  update public.platform_invites set consumed_at = now() where id = inv.id;
  return 'ok';
end; $$;
grant execute on function public.accept_platform_invite(text) to authenticated;

-- 5) Admin: list issued platform invites (newest first) for the dashboard.
create or replace function public.platform_invites_list()
returns table(id uuid, email text, org_name text, org_slug text, expires_at timestamptz, consumed_at timestamptz, created_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_platform_admin() then return; end if;
  return query
    select i.id, i.email, i.org_name, i.org_slug, i.expires_at, i.consumed_at, i.created_at
    from public.platform_invites i
    order by i.created_at desc;
end; $$;
grant execute on function public.platform_invites_list() to authenticated;

-- 6) Admin: revoke (delete) an unconsumed invite.
create or replace function public.revoke_platform_invite(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then return 'forbidden'; end if;
  delete from public.platform_invites where id = p_id and consumed_at is null;
  return 'ok';
end; $$;
grant execute on function public.revoke_platform_invite(uuid) to authenticated;


-- SAFETY: API role grants (Supabase usually does this automatically).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;
