create or replace function public.institution_avatar_url(p_slug text)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.avatar_url
  from public.org_members m
  join public.profiles p on p.id = m.user_id
  where m.institution_slug = p_slug
    and m.role = 'owner' and m.status = 'active'
    and p.role = 'institution' and p.institution_slug = p_slug
    and p.account_status = 'active'
    and (p.verification_status = 'verified' or public.is_org_member(p_slug, auth.uid()))
  limit 1;
$$;

revoke all on function public.institution_avatar_url(text) from public, anon, authenticated;
grant execute on function public.institution_avatar_url(text) to anon, authenticated;

create or replace view public.release_details with (security_invoker = true) as
select r.id, r.owner, r.institution_slug, r.institution_name, r.type, r.status,
  r.heading, r.subheading, r.body, r.scene, r.published_at, r.created_at,
  r.views, r.comments_count, r.ai_summary,
  public.org_is_verified(r.institution_slug) as institution_verified,
  r.moderation_status,
  (select count(*) from public.release_revisions rr where rr.release_id = r.id) as revision_count,
  (select max(rr.created_at) from public.release_revisions rr where rr.release_id = r.id) as last_edited_at,
  r.extras,
  public.institution_avatar_url(r.institution_slug) as institution_avatar_url
from public.releases r;

-- Return only photos of active authors in a thread the caller can read.
create or replace function public.release_comment_avatars(p_release_id text)
returns table(author uuid, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select distinct c.author, p.avatar_url
  from public.comments c
  join public.profiles p on p.id = c.author
  where c.release_id = p_release_id
    and public.is_public_release_id(p_release_id)
    and public.is_account_active(auth.uid())
    and p.account_status = 'active'
    and p.avatar_url is not null;
$$;

revoke all on function public.release_comment_avatars(text) from public, anon, authenticated;
grant execute on function public.release_comment_avatars(text) to authenticated;

-- Retain the roster's membership checks and email masking when adding photos.
drop function if exists public.org_members_detail(text);
create function public.org_members_detail(slug text)
returns table(user_id uuid, role text, status text, email text, full_name text,
  created_at timestamptz, avatar_url text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_role text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.org_members own_membership
    where own_membership.institution_slug = slug and own_membership.user_id = auth.uid()
  ) then
    return;
  end if;

  caller_role := public.org_role(slug, auth.uid());
  return query
    select m.user_id, m.role, m.status,
      case
        when caller_role in ('owner', 'admin') or m.user_id = auth.uid() then u.email::text
        else left(u.email::text, 1) || '***@' || split_part(u.email::text, '@', 2)
      end,
      p.full_name, m.created_at,
      case when p.account_status = 'active' then p.avatar_url end
    from public.org_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.institution_slug = slug and (caller_role is not null or m.user_id = auth.uid())
    order by (m.role = 'owner') desc, m.created_at asc;
end;
$$;

revoke all on function public.org_members_detail(text) from public, anon, authenticated;
grant execute on function public.org_members_detail(text) to authenticated;

drop function if exists public.admin_list_users(integer, integer);
create function public.admin_list_users(p_limit integer default 200, p_offset integer default 0)
returns table(user_id uuid, email text, full_name text, role text, institution_slug text,
  institution_name text, verification_status text, is_admin boolean, account_status text,
  status_reason text, status_changed_at timestamptz, created_at timestamptz, last_sign_in_at timestamptz,
  avatar_url text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_platform_admin();
  return query
    select p.id, u.email::text, p.full_name, p.role, p.institution_slug, p.institution_name,
      p.verification_status, p.is_admin, p.account_status, p.status_reason, p.status_changed_at,
      p.created_at, u.last_sign_in_at, p.avatar_url
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

drop function if exists public.admin_list_institutions(integer, integer);
create function public.admin_list_institutions(p_limit integer default 200, p_offset integer default 0)
returns table(owner_id uuid, owner_email text, institution_slug text, institution_name text,
  verification_status text, account_status text, status_reason text, member_count bigint,
  release_count bigint, published_count bigint, created_at timestamptz, avatar_url text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_platform_admin();
  return query
    select p.id, u.email::text, p.institution_slug, p.institution_name, p.verification_status,
      p.account_status, p.status_reason,
      (select count(*) from public.org_members m
        where m.institution_slug = p.institution_slug and m.status = 'active'),
      (select count(*) from public.releases r where r.institution_slug = p.institution_slug),
      (select count(*) from public.releases r where r.institution_slug = p.institution_slug
        and r.status = 'Published' and r.moderation_status = 'active'),
      p.created_at, p.avatar_url
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'institution'
      and exists (
        select 1 from public.org_members owner_membership
        where owner_membership.user_id = p.id and owner_membership.institution_slug = p.institution_slug
          and owner_membership.role = 'owner'
      )
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

drop function if exists public.admin_list_releases(integer, integer);
create function public.admin_list_releases(p_limit integer default 200, p_offset integer default 0)
returns table(release_id uuid, heading text, release_type text, publication_status text, moderation_status text,
  moderation_reason text, moderation_changed_at timestamptz, institution_slug text, institution_name text,
  author_id uuid, author_email text, views integer, comments_count integer, published_at timestamptz,
  created_at timestamptz, scene text, extras jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_platform_admin();
  return query
    select r.id, r.heading, r.type, r.status, r.moderation_status, r.moderation_reason, r.moderation_changed_at,
      r.institution_slug, r.institution_name, r.owner, u.email::text, coalesce(r.views, 0),
      coalesce(r.comments_count, 0), r.published_at, r.created_at, r.scene, r.extras
    from public.releases r
    left join auth.users u on u.id = r.owner
    order by r.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_list_users(integer, integer) from public, anon, authenticated;
revoke all on function public.admin_list_institutions(integer, integer) from public, anon, authenticated;
revoke all on function public.admin_list_releases(integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_users(integer, integer) to authenticated;
grant execute on function public.admin_list_institutions(integer, integer) to authenticated;
grant execute on function public.admin_list_releases(integer, integer) to authenticated;
