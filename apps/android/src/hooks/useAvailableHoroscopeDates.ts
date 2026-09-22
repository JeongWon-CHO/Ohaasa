import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

const FETCH_LIMIT = 120; // 12 별자리 × 7일 = 84, 여유분 포함
const MAX_DATES = 7;

export interface UseAvailableHoroscopeDatesResult {
  dates: string[];      // "YYYY-MM-DD" 형식, 최신순
  loading: boolean;
  error: string | null;
}

export function useAvailableHoroscopeDates(): UseAvailableHoroscopeDatesResult {
  const [state, setState] = useState<UseAvailableHoroscopeDatesResult>({
    dates: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
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
  }, []);

  return state;
}
