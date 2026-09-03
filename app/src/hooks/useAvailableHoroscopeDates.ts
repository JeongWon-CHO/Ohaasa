import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

const FETCH_LIMIT = 120; // 12 별자리 × 7일 = 84, 여유분 포함
const MAX_DATES = 7;

export interface UseAvailableHoroscopeDatesResult {
  dates: string[];      // "YYYY-MM-DD" 형식, 최신순
  loading: boolean;
  error: string | null;
}

/**
 * 한 번 받은 날짜 목록은 세션 동안 재사용한다. 시트를 여닫을 때마다 120행을 다시 받을 이유가 없다.
 * 새 방송일이 생겨도 시트는 "지난 7일"을 보여주는 자리라 앱을 다시 켤 때 갱신되면 충분하다.
 */
let datesCache: string[] | null = null;

/**
 * `enabled`가 load-bearing이다. 이 훅을 쓰는 `HoroscopeDateSheet`는 `visible`과 무관하게
 * **항상 마운트**돼 있어서(BottomSheet가 visible로만 여닫는다), 무조건 조회하면
 * 운세·순위 화면에 들어가기만 해도 열지도 않은 시트 때문에 120행 쿼리가 한 번씩 돌았다.
 */
export function useAvailableHoroscopeDates(enabled = true): UseAvailableHoroscopeDatesResult {
  const [state, setState] = useState<UseAvailableHoroscopeDatesResult>(() =>
    datesCache
      ? { dates: datesCache, loading: false, error: null }
      : // enabled가 false여도 loading으로 시작한다 — 시트가 닫혀 있어 아무도 안 보고,
        // 열리는 순간 빈 목록 대신 스피너가 먼저 보인다.
        { dates: [], loading: true, error: null },
  );

  useEffect(() => {
    if (!enabled || datesCache) return;
    let isMounted = true;

    async function load() {
      try {
        const { data, error } = await supabase
          .from('horoscopes')
          .select('date')
          .order('date', { ascending: false })
          .limit(FETCH_LIMIT);

        if (error) throw error;

        const unique = [...new Set((data ?? []).map((r: { date: string }) => r.date))].slice(0, MAX_DATES);
        datesCache = unique;

        if (isMounted) {
          setState({ dates: unique, loading: false, error: null });
        }
      } catch (err) {
        if (isMounted) {
          setState({
            dates: [],
            loading: false,
            error: err instanceof Error ? err.message : '날짜 목록을 불러오지 못했습니다.',
          });
        }
      }
    }

    load();
    return () => { isMounted = false; };
  }, [enabled]);

  return state;
}
