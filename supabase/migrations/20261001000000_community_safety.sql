-- Additive migration: existing Android payloads and report reason constraints stay unchanged.
-- No consent requirement is added to the shared database.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.community_bans (
  device_id text primary key,
  reason text not null,
  banned_at timestamptz not null default now()
);
create table public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('report', 'block')),
  target_kind text not null check (target_kind in ('answer', 'reply')),
  target_id uuid not null,
  reporter_device_id text not null,
  author_device_id text not null,
  author_hash text not null,
  body_snapshot text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'removed')),
  resolved_at timestamptz,
  resolution_note text,
  notified_at timestamptz,
  unique (source, target_kind, target_id, reporter_device_id)
);
create index community_moderation_pending on public.community_moderation_events(created_at) where status = 'pending';

alter table public.community_bans enable row level security;
alter table public.community_moderation_events enable row level security;
revoke all on public.community_bans, public.community_moderation_events from public, anon, authenticated;
grant select, insert, update, delete on public.community_bans, public.community_moderation_events to service_role;

create function public.community_content_is_objectionable(p_body text)
returns boolean language sql immutable strict set search_path = pg_catalog as $$
  select exists (
    select 1 from unnest(array[
      '씨발', '씨팔', '씹새', '개새끼', '병신', '좆', '보지년', '창녀',
      '죽여버', '죽여줄', '자살해', '강간', '아동포르노', '몰카판매',
      'fuck', 'motherfucker', 'nigger'
    ]) term
    where strpos(regexp_replace(lower(normalize(p_body, NFKC)), '[^가-힣a-z0-9]', '', 'g'), term) > 0
  );
$$;
revoke all on function public.community_content_is_objectionable(text) from public, anon, authenticated;
grant execute on function public.community_content_is_objectionable(text) to service_role;

create function public.guard_community_content()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  -- Metadata-only report counters/hiding updates must work even on existing offensive content.
  if tg_op = 'INSERT' or new.body is distinct from old.body or new.device_id is distinct from old.device_id then
    if exists (select 1 from public.community_bans where device_id = new.device_id::text) then
      raise exception using errcode = 'P0001', message = 'COMMUNITY_USER_BANNED';
    end if;
    if public.community_content_is_objectionable(new.body) then
      raise exception using errcode = 'P0001', message = 'COMMUNITY_CONTENT_REJECTED';
    end if;
  end if;
  -- A client must never unhide content removed by moderation.
  if exists (select 1 from public.community_bans where device_id = new.device_id::text) then
    new.hidden_at := coalesce(new.hidden_at, now());
  end if;
  return new;
end;
$$;
revoke all on function public.guard_community_content() from public, anon, authenticated;
create trigger community_answer_guard before insert or update on public.question_answers
for each row execute function public.guard_community_content();
create trigger community_reply_guard before insert or update on public.question_answer_replies
for each row execute function public.guard_community_content();

-- Snapshots survive author deletion and parent cascade, allowing reports to be reviewed later.
create function public.capture_community_report()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_table_name = 'question_answer_reports' then
    insert into public.community_moderation_events
      (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason)
    select 'report', 'answer', a.id, new.device_id::text, a.device_id::text, a.author_hash, a.body, new.reason
    from public.question_answers a where a.id = new.answer_id
    on conflict do nothing;
  else
    insert into public.community_moderation_events
      (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason)
    select 'report', 'reply', a.id, new.device_id::text, a.device_id::text, a.author_hash, a.body, new.reason
    from public.question_answer_replies a where a.id = new.reply_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_community_report() from public, anon, authenticated;
create trigger community_answer_report_capture after insert on public.question_answer_reports
for each row execute function public.capture_community_report();
create trigger community_reply_report_capture after insert on public.question_answer_reply_reports
for each row execute function public.capture_community_report();

-- Existing reports remain pending for operator review; snapshot the currently stored content.
insert into public.community_moderation_events
  (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason, created_at)
select 'report', 'answer', a.id, r.device_id::text, a.device_id::text, a.author_hash, a.body, r.reason, r.created_at
from public.question_answer_reports r join public.question_answers a on a.id = r.answer_id
on conflict do nothing;
insert into public.community_moderation_events
  (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason, created_at)
select 'report', 'reply', a.id, r.device_id::text, a.device_id::text, a.author_hash, a.body, r.reason, r.created_at
from public.question_answer_reply_reports r join public.question_answer_replies a on a.id = r.reply_id
on conflict do nothing;

-- iOS-only additional endpoint. No device IDs or content snapshots are returned to clients.
create function public.submit_community_block(p_target_kind text, p_target_id uuid, p_reporter_device_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_reporter_device_id is null then raise exception 'REPORTER_REQUIRED'; end if;
  if p_target_kind = 'answer' then
    insert into public.community_moderation_events
      (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason)
    select 'block', 'answer', a.id, p_reporter_device_id::text, a.device_id::text, a.author_hash, a.body, 'user_block'
    from public.question_answers a where a.id = p_target_id and a.device_id::text <> p_reporter_device_id::text
    on conflict do nothing;
  elsif p_target_kind = 'reply' then
    insert into public.community_moderation_events
      (source, target_kind, target_id, reporter_device_id, author_device_id, author_hash, body_snapshot, reason)
    select 'block', 'reply', a.id, p_reporter_device_id::text, a.device_id::text, a.author_hash, a.body, 'user_block'
    from public.question_answer_replies a where a.id = p_target_id and a.device_id::text <> p_reporter_device_id::text
    on conflict do nothing;
  else
    raise exception 'INVALID_TARGET_KIND';
  end if;
end;
$$;
revoke all on function public.submit_community_block(text, uuid, uuid) from public;
grant execute on function public.submit_community_block(text, uuid, uuid) to anon, authenticated, service_role;

-- Operator only. Hide all existing content and ban the author atomically; never auto-ban on reports.
create function public.resolve_community_event(p_event_id uuid, p_action text, p_note text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare item public.community_moderation_events%rowtype;
begin
  if p_action is null or p_action not in ('dismiss', 'remove_and_ban') or nullif(trim(p_note), '') is null then
    raise exception 'VALID_ACTION_AND_NOTE_REQUIRED';
  end if;
  select * into item from public.community_moderation_events where id = p_event_id for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if item.status <> 'pending' then raise exception 'EVENT_ALREADY_RESOLVED'; end if;
  if p_action = 'remove_and_ban' then
    insert into public.community_bans(device_id, reason) values (item.author_device_id, p_note)
    on conflict (device_id) do update set reason = excluded.reason;
    update public.question_answers set hidden_at = coalesce(hidden_at, now()) where device_id::text = item.author_device_id;
    update public.question_answer_replies set hidden_at = coalesce(hidden_at, now()) where device_id::text = item.author_device_id;
    -- All pending reports for this author are covered by the same action.
    update public.community_moderation_events set status = 'removed', resolved_at = now(), resolution_note = p_note
      where author_device_id = item.author_device_id and status = 'pending';
  else
    update public.community_moderation_events set status = 'dismissed', resolved_at = now(), resolution_note = p_note where id = item.id;
  end if;
end;
$$;
revoke all on function public.resolve_community_event(uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_community_event(uuid, text, text) to service_role;
commit;
