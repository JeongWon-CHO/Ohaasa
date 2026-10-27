begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 기존 horoscopes와 resolved_horoscopes는 변경하지 않는다.
create table public.gogo_horoscopes (
  date date not null,
  zodiac_sign text not null check (zodiac_sign in (
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  )),
  zodiac_name text not null,
  rank integer not null check (rank between 1 and 12),
  advice text not null check (btrim(advice) <> ''),
  advice_ko text,
  lucky_color text not null check (btrim(lucky_color) <> ''),
  lucky_color_ko text,
  lucky_item text not null check (btrim(lucky_item) <> ''),
  lucky_item_ko text,
  money_score integer not null check (money_score between 1 and 6),
  love_score integer not null check (love_score between 1 and 6),
  work_score integer not null check (work_score between 1 and 6),
  health_score integer not null check (health_score between 1 and 6),
  primary key (date, zodiac_sign)
);

alter table public.gogo_horoscopes enable row level security;
revoke all on public.gogo_horoscopes from public, anon, authenticated;
grant select on public.gogo_horoscopes to anon, authenticated;
grant select, insert, update, delete on public.gogo_horoscopes to service_role;
create policy "Gogo horoscopes are publicly readable"
  on public.gogo_horoscopes for select to anon, authenticated using (true);

commit;
