-- 오전 운세 알림을 시간 슬롯별로 발송하기 위한 스키마와 원자적 claim RPC.
-- KST/JST는 모두 UTC+9이고 DST가 없으므로 별도 timezone 컬럼은 두지 않는다.

alter table public.user_devices
  add column if not exists notification_time time without time zone
    not null default time '06:00',
  add column if not exists notification_state jsonb
    not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_devices'::regclass
      and conname = 'user_devices_notification_time_check'
  ) then
    alter table public.user_devices
      add constraint user_devices_notification_time_check
      check (notification_time in (
        time '06:00', time '06:30', time '07:00', time '07:30', time '08:00',
        time '08:30', time '09:00', time '09:30', time '10:00'
      ));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_devices'::regclass
      and conname = 'user_devices_notification_state_object_check'
  ) then
    alter table public.user_devices
      add constraint user_devices_notification_state_object_check
      check (jsonb_typeof(notification_state) = 'object');
  end if;
end
$$;

create index if not exists user_devices_horoscope_notification_time_idx
  on public.user_devices (notification_time, device_id)
  where notifications_enabled = true and push_token is not null;

alter table public.notification_log
  add column if not exists notification_type text
    not null default 'daily_horoscope',
  add column if not exists scheduled_time time without time zone
    not null default time '06:00',
  add column if not exists status text
    not null default 'succeeded',
  add column if not exists attempt_count integer
    not null default 1,
  add column if not exists started_at timestamptz,
  add column if not exists finished_at timestamptz,
  add column if not exists succeeded_count integer
    not null default 0,
  add column if not exists failed_count integer
    not null default 0,
  add column if not exists metadata jsonb
    not null default '{}'::jsonb;

-- 기존 UNIQUE(date)는 시간 슬롯 여러 개를 막으므로 제약 이름과 무관하게 제거한다.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.notification_log'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname::text order by key_position.ordinality)
        from unnest(con.conkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = con.conrelid and att.attnum = key_position.attnum
      ) = array['date']::text[]
  loop
    execute format(
      'alter table public.notification_log drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

-- UNIQUE가 constraint가 아니라 단독 index로 생성된 환경도 처리한다.
do $$
declare
  index_name text;
begin
  for index_name in
    select index_class.relname
    from pg_index idx
    join pg_class index_class on index_class.oid = idx.indexrelid
    where idx.indrelid = 'public.notification_log'::regclass
      and idx.indisunique
      and not idx.indisprimary
      and not exists (
        select 1 from pg_constraint con where con.conindid = idx.indexrelid
      )
      and (
        select array_agg(att.attname::text order by key_position.ordinality)
        from unnest(idx.indkey) with ordinality as key_position(attnum, ordinality)
        join pg_attribute att
          on att.attrelid = idx.indrelid and att.attnum = key_position.attnum
      ) = array['date']::text[]
  loop
    execute format('drop index public.%I', index_name);
  end loop;
end
$$;

create unique index if not exists notification_log_batch_unique_idx
  on public.notification_log (notification_type, date, scheduled_time);

-- 한 논리 배치당 한 실행만 running 상태를 선점한다.
create or replace function public.claim_notification_batch(
  p_notification_type text,
  p_date date,
  p_scheduled_time time without time zone
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  insert into public.notification_log (
    notification_type,
    date,
    scheduled_time,
    status,
    attempt_count,
    started_at,
    finished_at,
    succeeded_count,
    failed_count,
    metadata
  ) values (
    p_notification_type,
    p_date,
    p_scheduled_time,
    'running',
    1,
    now(),
    null,
    0,
    0,
    '{}'::jsonb
  )
  on conflict (notification_type, date, scheduled_time) do nothing;

  get diagnostics affected = row_count;
  if affected = 1 then
    return true;
  end if;

  update public.notification_log
  set status = 'running',
      attempt_count = attempt_count + 1,
      started_at = now(),
      finished_at = null
  where notification_type = p_notification_type
    and date = p_date
    and scheduled_time = p_scheduled_time
    and (
      status in ('failed', 'partial', 'deferred')
      or (status = 'running' and started_at < now() - interval '15 minutes')
    );

  get diagnostics affected = row_count;
  return affected = 1;
end
$$;

create or replace function public.finish_notification_batch(
  p_notification_type text,
  p_date date,
  p_scheduled_time time without time zone,
  p_status text,
  p_succeeded_count integer,
  p_failed_count integer,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_log
  set status = p_status,
      finished_at = now(),
      succeeded_count = p_succeeded_count,
      failed_count = p_failed_count,
      metadata = coalesce(p_metadata, '{}'::jsonb)
  where notification_type = p_notification_type
    and date = p_date
    and scheduled_time = p_scheduled_time;
$$;

-- 현재 슬롯 대상 중 오늘 아직 발송되지 않은 기기를 선기록하고 반환한다.
create or replace function public.claim_daily_horoscope_devices(
  p_scheduled_time time without time zone,
  p_notification_date date,
  p_claimed_at timestamptz,
  p_after_device_id text default null,
  p_limit integer default 500
)
returns table (
  device_id text,
  push_token text,
  zodiac_sign text
)
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select ud.device_id
    from public.user_devices ud
    where ud.notifications_enabled = true
      and ud.push_token is not null
      and ud.notification_time = p_scheduled_time
      and (p_after_device_id is null or ud.device_id::text > p_after_device_id)
      and (
        ud.notification_state #>> '{daily_horoscope,last_sent_at}' is null
        or (
          (ud.notification_state #>> '{daily_horoscope,last_sent_at}')::timestamptz
          at time zone 'Asia/Seoul'
        )::date <> p_notification_date
      )
    order by ud.device_id::text
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  ),
  updated as (
    update public.user_devices ud
    set notification_state =
      coalesce(ud.notification_state, '{}'::jsonb)
      || jsonb_build_object(
        'daily_horoscope',
        coalesce(ud.notification_state -> 'daily_horoscope', '{}'::jsonb)
        || jsonb_build_object('last_sent_at', p_claimed_at)
      )
    from candidates c
    where ud.device_id = c.device_id
      and (
        ud.notification_state #>> '{daily_horoscope,last_sent_at}' is null
        or (
          (ud.notification_state #>> '{daily_horoscope,last_sent_at}')::timestamptz
          at time zone 'Asia/Seoul'
        )::date <> p_notification_date
      )
    returning ud.device_id::text, ud.push_token::text, ud.zodiac_sign::text
  )
  select updated.device_id, updated.push_token, updated.zodiac_sign
  from updated
  order by updated.device_id;
$$;

-- 명시적으로 발송에 실패한 claim만 되돌린다. 다른 알림 namespace는 보존한다.
create or replace function public.rollback_daily_horoscope_devices(
  p_device_ids text[],
  p_claimed_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.user_devices
  set notification_state = jsonb_set(
    notification_state,
    '{daily_horoscope}',
    coalesce(notification_state -> 'daily_horoscope', '{}'::jsonb) - 'last_sent_at',
    true
  )
  where device_id::text = any(p_device_ids)
    and (notification_state #>> '{daily_horoscope,last_sent_at}')::timestamptz = p_claimed_at;

  get diagnostics affected = row_count;
  return affected;
end
$$;

revoke all on function public.claim_notification_batch(text, date, time without time zone)
  from public, anon, authenticated;
revoke all on function public.finish_notification_batch(text, date, time without time zone, text, integer, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.claim_daily_horoscope_devices(time without time zone, date, timestamptz, text, integer)
  from public, anon, authenticated;
revoke all on function public.rollback_daily_horoscope_devices(text[], timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_notification_batch(text, date, time without time zone)
  to service_role;
grant execute on function public.finish_notification_batch(text, date, time without time zone, text, integer, integer, jsonb)
  to service_role;
grant execute on function public.claim_daily_horoscope_devices(time without time zone, date, timestamptz, text, integer)
  to service_role;
grant execute on function public.rollback_daily_horoscope_devices(text[], timestamptz)
  to service_role;
