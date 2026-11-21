-- Reader usernames are optional handles. Authentication continues to use email.
alter table public.profiles
  add column if not exists username text check (username ~ '^[a-z0-9_]{3,30}$');

create unique index if not exists profiles_username_unique
  on public.profiles (username) where username is not null;

-- The existing profile policies restrict browser updates to the active owner.
grant select (username), update (username) on table public.profiles to authenticated;

do $$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "reader avatar upload" on storage.objects;
  create policy "reader avatar upload" on storage.objects for insert to authenticated
    with check (
      bucket_id = 'profile-avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'individual' and p.account_status = 'active'
      )
    );

  -- The public object URL can be read without granting public bucket listing.
  -- Storage needs SELECT access to find an object before its owner can delete it.
  drop policy if exists "reader avatar select own" on storage.objects;
  create policy "reader avatar select own" on storage.objects for select to authenticated
    using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "reader avatar delete own" on storage.objects;
  create policy "reader avatar delete own" on storage.objects for delete to authenticated
    using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
end;
$$;
