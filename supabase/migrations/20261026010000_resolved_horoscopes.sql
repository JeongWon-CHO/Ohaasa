begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 날짜별로 완전한 한 소스만 제공한다. 원본 테이블과 기존 앱의 조회는 유지한다.
-- security_invoker로 원본 테이블의 RLS를 그대로 적용한다.
create view public.resolved_horoscopes with (security_invoker = true) as
with candidates as (
  select h.date, h.zodiac_sign::text, h.zodiac_name, h.rank, h.advice, h.advice_ko,
    h.source::text, h.lucky_place, h.lucky_place_ko,
    h.lucky_item_ohaasa, h.lucky_item_ohaasa_ko,
    h.lucky_color, h.lucky_color_ko, h.lucky_item, h.lucky_item_ko,
    h.money_score, h.love_score, h.work_score, h.health_score,
    null::jsonb as mezamashi
  from public.horoscopes h
  where (h.date < date '2026-10-26' and h.source in ('ohaasa', 'gogo'))
     or (extract(isodow from h.date) between 1 and 5 and h.source = 'ohaasa')
     or (extract(isodow from h.date) in (6, 7) and h.source = 'gogo')
  union all
  select m.date, m.zodiac_sign, m.zodiac_name, m.rank, m.advice, m.advice_ko,
    'mezamashi'::text, null, null, null, null,
    null, null, null, null, null, null, null, null, to_jsonb(m)
  from public.mezamashi_horoscopes m
  where extract(isodow from m.date) in (6, 7)
    and nullif(btrim(m.lucky_point), '') is not null
    and nullif(btrim(m.lucky_color), '') is not null
), complete as (
  select date, source
  from candidates
  where date <= (now() at time zone 'Asia/Tokyo')::date
  group by date, source
  having count(*) = 12 and count(distinct zodiac_sign) = 12
    and count(distinct rank) = 12
    and bool_and(rank between 1 and 12 and nullif(btrim(advice), '') is not null
      and zodiac_sign in ('aries','taurus','gemini','cancer','leo','virgo',
        'libra','scorpio','sagittarius','capricorn','aquarius','pisces'))
), selected as (
  select distinct on (date) date, source
  from complete
  order by date, case source when 'ohaasa' then 0 when 'gogo' then 0 else 1 end
)
select c.* from candidates c join selected s using (date, source);

revoke all on public.resolved_horoscopes from public, anon, authenticated;
grant select on public.resolved_horoscopes to anon, authenticated, service_role;
comment on view public.resolved_horoscopes is
  '평일 오하아사, 주말 고고 우선/메자마시 대체. 12개 별자리와 순위가 완전한 날짜만 공개.';
commit;
