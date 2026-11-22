-- Read the verified owner's organisation details from the workspace.
create or replace function public.org_verification_details(p_slug text)
returns table(verification_domain text, verified_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.verification_domain, p.verified_at
  from public.org_members m
  join public.profiles p on p.id = m.user_id
  where m.institution_slug = p_slug
    and m.role = 'owner'
    and m.status = 'active'
    and p.role = 'institution'
    and p.institution_slug = p_slug
    and p.account_status = 'active'
    and p.verification_status = 'verified'
    and public.is_org_member(p_slug, auth.uid())
  limit 1;
$$;

revoke all on function public.org_verification_details(text) from public, anon, authenticated;
grant execute on function public.org_verification_details(text) to authenticated;
