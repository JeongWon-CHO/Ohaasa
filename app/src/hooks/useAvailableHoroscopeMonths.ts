import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export interface AvailableMonth {
  month: string;    // "YYYY-MM"
  dayCount: number; // 그 달에 실제로 쌓인 방송일 수
}

export interface UseAvailableHoroscopeMonthsResult {
  months: AvailableMonth[]; // 최신 달 우선
  loading: boolean;
  error: string | null;
}

// db-max-rows(1000)보다 작아야 "요청한 만큼 왔는가"로 다음 페이지 유무를 판정할 수 있다.
const PAGE = 500;

// 12개 별자리 중 하나만 세면 날짜 목록이 나온다 — 12배를 받을 이유가 없다.
// aries는 알림 웹훅이 기준으로 삼는 row라 날짜마다 반드시 존재한다.
const PROBE_SIGN = 'aries';

// 하루에 한 번만 다시 받으면 충분하다(크론이 하루 1회 도므로). 시트를 여닫아도 재조회하지 않는다.
let cache: { day: string; months: AvailableMonth[] } | null = null;

function today(): string {
  // toISOString()은 UTC라 KST 09:00에 날짜가 바뀐다 — 기기 로컬 날짜로 센다
  return format(new Date(), 'yyyy-MM-dd');
}

async function fetchMonths(): Promise<AvailableMonth[]> {
  const counts = new Map<string, number>();

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('horoscopes')
      .select('date')
      .eq('zodiac_sign', PROBE_SIGN)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) throw error;

    const chunk = (data ?? []) as { date: string }[];
    for (const row of chunk) {
      const month = row.date.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }

    if (chunk.length < PAGE) break;
  }

  return Array.from(counts.entries())
    .map(([month, dayCount]) => ({ month, dayCount }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// enabled=false면 조회하지 않는다 — 시트가 항상 마운트돼 있어도 열기 전에는 네트워크를 쓰지 않는다.
export function useAvailableHoroscopeMonths(enabled: boolean): UseAvailableHoroscopeMonthsResult {
  const [state, setState] = useState<UseAvailableHoroscopeMonthsResult>({
    months: cache?.months ?? [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    if (cache && cache.day === today()) {
      setState({ months: cache.months, loading: false, error: null });
      return;
    }

    let isMounted = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const months = await fetchMonths();
        cache = { day: today(), months };
        if (isMounted) setState({ months, loading: false, error: null });
      } catch (err) {
        if (isMounted) {
          setState({
            months: [],
            loading: false,
            error: err instanceof Error ? err.message : '월 목록을 불러오지 못했습니다.',
          });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return state;
}
