import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { Horoscope, HoroscopeSource } from '@/src/types/horoscope';

export interface AllHoroscopesState {
  horoscopes: Horoscope[];
  broadcastDate: string | null; // "2026년 4월 29일 (화) 오하아사" | "2026년 5월 23일 (토) 고고별자리"
  loading: boolean;
  error: string | null;
}

export function formatBroadcastDate(dateStr: string, source: HoroscopeSource): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = weekdays[new Date(year, month - 1, day).getDay()];
  const label = source === 'gogo' ? '고고별자리' : '오하아사';
  return `${year}년 ${month}월 ${day}일 (${dow}) ${label}`;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 데이터를 불러오지 못했습니다.';
}

/**
 * 명시 컬럼. `select('*')`는 앱이 안 읽는 `id`·`created_at`까지 12행 분량을 끌고 온다.
 * 컬럼을 다시 늘리려면 `types/horoscope.ts`의 인터페이스도 같이 고쳐야 한다.
 */
const HOROSCOPE_COLUMNS = [
  'date',
  'zodiac_sign',
  'zodiac_name',
  'rank',
  'advice',
  'advice_ko',
  'source',
  'lucky_place',
  'lucky_place_ko',
  'lucky_item_ohaasa',
  'lucky_item_ohaasa_ko',
  'lucky_color',
  'lucky_item',
  'lucky_color_ko',
  'lucky_item_ko',
  'money_score',
  'love_score',
  'work_score',
  'health_score',
].join(',');

/**
 * 날짜별 조회 결과를 앱 세션 동안 캐시한다.
 *
 * 같은 날짜의 12행을 홈(`HoroscopeStrip`) · 운세 · 순위 · 별자리상세 · 데일리리뷰가
 * **각자 독립적으로** 받아 갔다. 한 번 확정된 하루치는 크롤러가 쓰고 나면 바뀌지 않으므로
 * 먼저 받은 쪽이 나머지를 먹여준다. 무료 티어 egress(5GB/월)에서 가장 큰 낭비였다.
 */
const rowCache = new Map<string, Horoscope[]>();

/** 같은 날짜를 동시에 요청하면 한 번만 나가게 한다 — 화면 전환 중 두 곳이 같이 뜨는 경우가 있다. */
const inFlight = new Map<string, Promise<Horoscope[]>>();

/**
 * 최신 방송일은 KST 05:59에 바뀐다. 세션 내내 붙들면 앱을 켜둔 채 날이 바뀔 때
 * 어제 운세에 갇히므로 짧은 TTL을 둔다.
 */
const LATEST_DATE_TTL_MS = 5 * 60 * 1000;
let latestDateCache: { date: string | null; at: number } | null = null;

async function resolveLatestDate(): Promise<string | null> {
  const now = Date.now();
  if (latestDateCache && now - latestDateCache.at < LATEST_DATE_TTL_MS) {
    return latestDateCache.date;
  }

  const { data, error } = await supabase
    .from('horoscopes')
    .select('date')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const date = (data as { date: string } | null)?.date ?? null;
  latestDateCache = { date, at: now };
  return date;
}

async function fetchRows(date: string): Promise<Horoscope[]> {
  const cached = rowCache.get(date);
  if (cached) return cached;

  const pending = inFlight.get(date);
  if (pending) return pending;

  const promise = (async () => {
    const { data, error } = await supabase
      .from('horoscopes')
      .select(HOROSCOPE_COLUMNS)
      .eq('date', date)
      .order('rank', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as Horoscope[];
    // 빈 결과는 캐시하지 않는다 — 크론이 늦은 날 "그날은 운세가 없다"가 세션 내내 눌러앉는다.
    if (rows.length > 0) rowCache.set(date, rows);
    return rows;
  })().finally(() => {
    inFlight.delete(date);
  });

  inFlight.set(date, promise);
  return promise;
}

/** 캐시만으로 즉시 답할 수 있으면 그 값을. 최신 날짜는 TTL 안일 때만 인정한다. */
function cacheHit(date: string | null): { date: string; rows: Horoscope[] } | null {
  const resolved =
    date ??
    (latestDateCache && Date.now() - latestDateCache.at < LATEST_DATE_TTL_MS
      ? latestDateCache.date
      : null);
  if (!resolved) return null;

  const rows = rowCache.get(resolved);
  return rows ? { date: resolved, rows } : null;
}

function loadedState(date: string, rows: Horoscope[]): AllHoroscopesState {
  return {
    horoscopes: rows,
    broadcastDate: rows.length ? formatBroadcastDate(date, rows[0].source) : null,
    loading: false,
    error: null,
  };
}

const EMPTY_STATE: AllHoroscopesState = {
  horoscopes: [],
  broadcastDate: null,
  loading: true,
  error: null,
};

interface UseAllHoroscopesOptions {
  date?: string | null; // 지정하면 해당 날짜 조회, null/undefined면 최신 날짜 조회
}

export function useAllHoroscopes(options?: UseAllHoroscopesOptions): AllHoroscopesState {
  const targetDate = options?.date ?? null;

  // 캐시가 있으면 첫 렌더부터 데이터를 들고 시작한다 — 홈의 운세 줄이 매번 깜빡이지 않게.
  const [state, setState] = useState<AllHoroscopesState>(() => {
    const hit = cacheHit(targetDate);
    return hit ? loadedState(hit.date, hit.rows) : EMPTY_STATE;
  });

  useEffect(() => {
    let isMounted = true;

    // 캐시에 있으면 로딩 상태를 거치지 않는다. 아래 fetchRows도 즉시 반환하지만,
    // 여기서 loading을 올려버리면 그 한 틱 동안 화면이 비어 깜빡인다.
    if (!cacheHit(targetDate)) setState(EMPTY_STATE);

    async function load() {
      try {
        const resolvedDate = targetDate ?? (await resolveLatestDate());
        if (!resolvedDate) {
          if (isMounted) setState({ ...EMPTY_STATE, loading: false });
          return;
        }

        const rows = await fetchRows(resolvedDate);
        if (isMounted) setState(loadedState(resolvedDate, rows));
      } catch (err) {
        if (isMounted) {
          setState({ ...EMPTY_STATE, loading: false, error: getErrorMessage(err) });
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [targetDate]);

  return state;
}
