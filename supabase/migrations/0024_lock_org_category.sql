-- Owners can set a category during initial setup. Later changes are privileged.
create or replace function public.lock_org_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if old.role = 'institution' and old.onboarding_complete is true and new.onboarding_complete is not true then
    raise exception 'Organisation setup is already complete.' using errcode = '42501';
  end if;

  if new.org_category is distinct from old.org_category and (
    old.role = 'institution'
    and old.verification_status = 'verified'
    and old.onboarding_complete is not true
    and new.onboarding_complete is true
    and nullif(btrim(old.org_category), '') is null
    and nullif(btrim(new.org_category), '') is not null
    and public.org_role(old.institution_slug, auth.uid()) = 'owner'
  ) is not true then
    raise exception 'Organisation category can only be set during initial setup.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.lock_org_category() from public, anon, authenticated;

drop trigger if exists trg_lock_org_category on public.profiles;
create trigger trg_lock_org_category
  before update of org_category, onboarding_complete on public.profiles
  for each row execute function public.lock_org_category();
