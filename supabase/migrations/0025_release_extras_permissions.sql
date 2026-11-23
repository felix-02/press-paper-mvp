-- The release CHECK constraint runs under the role writing the release.
revoke execute on function public.valid_release_extras(jsonb, text, uuid) from public, anon;
grant execute on function public.valid_release_extras(jsonb, text, uuid) to authenticated;
