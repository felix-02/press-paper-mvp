-- Store editor-selected categories and ordered files on draft and published releases.
alter table public.releases add column if not exists extras jsonb;

create or replace function public.valid_release_extras(p_extras jsonb, p_slug text, p_release uuid)
returns boolean
language plpgsql immutable set search_path = ''
as $$
declare
  item jsonb;
  file_path text;
  prefix text := p_slug || '/' || p_release::text || '/';
  extension text;
  kind text;
  max_bytes integer;
  media_count integer := 0;
  audio_count integer := 0;
  document_count integer := 0;
  paths text[] := '{}';
begin
  if p_extras is null then return true; end if;
  if pg_column_size(p_extras) > 65536
    or jsonb_typeof(p_extras -> 'categories') is distinct from 'array'
    or jsonb_typeof(p_extras -> 'files') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_extras -> 'categories') > 8 or jsonb_array_length(p_extras -> 'files') > 21 then return false; end if;
  for item in select value from jsonb_array_elements(p_extras -> 'categories') loop
    if jsonb_typeof(item) <> 'string' or length(btrim(item #>> '{}')) not between 1 and 40 then return false; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_extras -> 'files') loop
    file_path := item ->> 'path';
    if left(file_path, length(prefix)) is distinct from prefix
      or substr(file_path, length(prefix) + 1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.][a-z0-9]+$'
      or file_path = any(paths)
      or jsonb_typeof(item -> 'name') is distinct from 'string'
      or length(btrim(item ->> 'name')) not between 1 and 180
      or jsonb_typeof(item -> 'bytes') is distinct from 'number' then return false; end if;
    paths := array_append(paths, file_path);
    extension := split_part(substr(file_path, length(prefix) + 1), '.', 2);
    if extension in ('jpg','jpeg','png','webp') then
      kind := 'image'; max_bytes := 10485760; media_count := media_count + 1;
    elsif extension in ('mp4','mov') then
      kind := 'video'; max_bytes := 52428800; media_count := media_count + 1;
    elsif extension in ('mp3','m4a','wav','webm','ogg') then
      kind := 'audio'; max_bytes := 20971520; audio_count := audio_count + 1;
    elsif extension in ('pdf','doc','docx','xls','xlsx','csv','odt','ods','odp') then
      kind := 'document'; max_bytes := 20971520; document_count := document_count + 1;
    else return false;
    end if;
    if item ->> 'kind' is distinct from kind
      or (item ->> 'bytes') !~ '^[0-9]+$'
      or (item ->> 'bytes')::numeric not between 1 and max_bytes
      or (item ? 'alt' and (kind <> 'image' or jsonb_typeof(item -> 'alt') <> 'string' or length(item ->> 'alt') > 250))
      or (item ? 'transcript' and (kind <> 'audio' or jsonb_typeof(item -> 'transcript') <> 'string' or length(item ->> 'transcript') > 5000))
      then return false;
    end if;
  end loop;
  return media_count <= 8 and audio_count <= 3 and document_count <= 10;
end;
$$;

alter table public.releases drop constraint if exists releases_extras_check;
alter table public.releases add constraint releases_extras_check
  check (public.valid_release_extras(extras, institution_slug, id));
grant select (extras) on public.releases to anon, authenticated;
grant insert (id, extras), update (extras) on public.releases to authenticated;

create or replace view public.release_details with (security_invoker = true) as
select r.id, r.owner, r.institution_slug, r.institution_name, r.type, r.status,
  r.heading, r.subheading, r.body, r.scene, r.published_at, r.created_at,
  r.views, r.comments_count, r.ai_summary,
  public.org_is_verified(r.institution_slug) as institution_verified,
  r.moderation_status,
  (select count(*) from public.release_revisions rr where rr.release_id = r.id) as revision_count,
  (select max(rr.created_at) from public.release_revisions rr where rr.release_id = r.id) as last_edited_at,
  r.extras
from public.releases r;

-- A private bucket keeps draft and unlinked files out of public storage.
-- Reads inherit the release's existing row security and require a linked file.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('release-files', 'release-files', false, 52428800, array[
    'image/jpeg','image/png','image/webp','video/mp4','video/quicktime',
    'audio/mpeg','audio/mp4','audio/wav','audio/webm','audio/ogg',
    'application/pdf','application/msword','application/vnd.ms-excel','text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text','application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ])
  on conflict (id) do update set public = excluded.public,
    file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "release files upload" on storage.objects;
  create policy "release files upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'release-files'
    and name ~ '^[a-z0-9-]+/[0-9a-f-]{36}/[0-9a-f-]{36}[.][a-z0-9]+$'
    and public.is_account_active(auth.uid())
    and public.org_role(split_part(name, '/', 1), auth.uid()) in ('owner','admin','editor')
  );

  drop policy if exists "release files read" on storage.objects;
  create policy "release files read" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'release-files'
    and exists (
      select 1 from public.releases r
      where r.id = case when split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then split_part(name, '/', 2)::uuid end
        and r.institution_slug = split_part(name, '/', 1)
        and (r.extras -> 'files') @> jsonb_build_array(jsonb_build_object('path', name))
    )
  );
end;
$$;
