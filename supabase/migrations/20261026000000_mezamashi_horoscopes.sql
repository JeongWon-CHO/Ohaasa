begin;

-- 기존 horoscopes의 PK/운세 소스/알림 경로에 영향을 주지 않는 별도 데이터셋.
create table public.mezamashi_horoscopes (
  date date not null,
  zodiac_sign text not null check (zodiac_sign in (
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  )),
  zodiac_name text not null,
  rank integer not null check (rank between 1 and 12),
  advice text not null,
  lucky_point text not null,
  lucky_color text not null,
  extra_advice text,
  lucky_person text,
  lucky_menu text,
  advice_ko text,
  lucky_point_ko text,
  lucky_color_ko text,
  extra_advice_ko text,
  lucky_person_ko text,
  lucky_menu_ko text,
  primary key (date, zodiac_sign)
);

alter table public.mezamashi_horoscopes enable row level security;
revoke all on public.mezamashi_horoscopes from public, anon, authenticated;
grant select on public.mezamashi_horoscopes to anon, authenticated;
grant select, insert, update, delete on public.mezamashi_horoscopes to service_role;
create policy "Mezamashi horoscopes are publicly readable"
  on public.mezamashi_horoscopes for select to anon, authenticated using (true);

commit;
