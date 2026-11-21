-- A reader can page through their own activity while the admin log stays private.
create index if not exists user_activity_actor_cursor_idx
  on public.user_activity_events (actor_id, created_at desc, id desc);

create or replace function public.get_my_activity(
  p_limit integer default 31,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid, event_type text, target_type text, target_id text, created_at timestamptz,
  release_id text, watchlist_id text, page_path text, reaction text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.event_type, e.target_type, e.target_id, e.created_at,
         case when e.target_type in ('release', 'watchlist_item') then e.target_id
              when e.target_type = 'comment' then e.metadata ->> 'release_id' end,
         case when e.target_type = 'watchlist' then e.target_id
              when e.target_type = 'watchlist_item' then e.metadata ->> 'watchlist_id' end,
         case when e.event_type = 'page_viewed' then e.metadata ->> 'path' end,
         case when e.event_type in ('reaction.added', 'reaction.changed', 'reaction.removed')
              then e.metadata ->> 'reaction' end
  from public.user_activity_events e
  where e.actor_id = (select auth.uid()) and (select public.is_account_active(auth.uid()))
    and (p_before_at is null or (e.created_at, e.id) < (p_before_at, p_before_id))
    -- Comment posts also have a transactional event. Release row updates include
    -- automatic view and comment counters, so use the named publishing events.
    and e.event_type not in ('comment_posted', 'release.update')
  order by e.created_at desc, e.id desc
  limit least(greatest(coalesce(p_limit, 31), 1), 100);
$$;

revoke all on function public.get_my_activity(integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.get_my_activity(integer, timestamptz, uuid) to authenticated;

-- Record successful reaction changes together with their mutation.
create or replace function public.record_reaction_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_row public.release_reactions;
  activity_type text;
begin
  if tg_op = 'DELETE' then
    activity_row := old;
    activity_type := 'reaction.removed';
  elsif tg_op = 'INSERT' then
    activity_row := new;
    activity_type := 'reaction.added';
  else
    if new.reaction is not distinct from old.reaction then return new; end if;
    activity_row := new;
    activity_type := 'reaction.changed';
  end if;

  if activity_row.user_id = auth.uid() and public.is_account_active(auth.uid()) then
    insert into public.user_activity_events (actor_id, event_type, target_type, target_id, metadata)
    values (activity_row.user_id, activity_type, 'release', activity_row.release_id::text,
            jsonb_build_object('reaction', activity_row.reaction));
  end if;
  return null;
end;
$$;

revoke all on function public.record_reaction_activity() from public, anon, authenticated;
drop trigger if exists trg_record_reaction_activity on public.release_reactions;
create trigger trg_record_reaction_activity
  after insert or update or delete on public.release_reactions
  for each row execute function public.record_reaction_activity();

-- Recover older activity whose source rows still exist. Timestamp and target
-- matching preserves repeats while avoiding a second record for logged actions.
with retained (actor_id, event_type, target_type, target_id, metadata, created_at) as (
  select user_id, 'release.saved', 'release', release_id, '{}'::jsonb, created_at
    from public.saved_releases
  union all
  select follower, 'institution.followed', 'institution', institution_slug, '{}'::jsonb, created_at
    from public.follows
  union all
  select author, 'comment.insert', 'comment', id::text, jsonb_build_object('release_id', release_id), created_at
    from public.comments
  union all
  select user_id, 'watchlist.insert', 'watchlist', id::text, '{}'::jsonb, created_at
    from public.watchlists
  union all
  select w.user_id, 'watchlist_item.insert', 'watchlist_item', i.release_id,
         jsonb_build_object('watchlist_id', i.watchlist_id), i.created_at
    from public.watchlist_items i join public.watchlists w on w.id = i.watchlist_id
  union all
  select user_id, 'reaction.added', 'release', release_id::text, jsonb_build_object('reaction', reaction), created_at
    from public.release_reactions
  union all
  select viewer, 'release_viewed', 'release', release_id::text, '{}'::jsonb, created_at
    from public.release_views where viewer is not null
)
insert into public.user_activity_events (actor_id, event_type, target_type, target_id, metadata, created_at)
select r.actor_id, r.event_type, r.target_type, r.target_id, r.metadata, r.created_at
from retained r
where length(r.target_id) between 1 and 200
  and octet_length(r.metadata::text) <= 4096
  and not exists (
    select 1 from public.user_activity_events e
    where e.actor_id = r.actor_id and e.event_type = r.event_type and e.target_id = r.target_id
      and e.created_at between
        r.created_at - case when r.event_type = 'release_viewed' then interval '5 seconds' else interval '0' end
        and r.created_at + case when r.event_type = 'release_viewed' then interval '5 seconds' else interval '0' end
      and (e.metadata ->> 'watchlist_id') is not distinct from (r.metadata ->> 'watchlist_id')
  );
