import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { Horoscope } from '@/src/types/horoscope';

export interface AllHoroscopesState {
  horoscopes: Horoscope[];
  broadcastDate: string | null; // "2026년 4월 29일 (화) 방송분"
  loading: boolean;
  error: string | null;
}

function formatBroadcastDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dow = weekdays[new Date(year, month - 1, day).getDay()];
  return `${year}년 ${month}월 ${day}일 (${dow}) 방송분`;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 데이터를 불러오지 못했습니다.';
}

export function useAllHoroscopes(): AllHoroscopesState {
  const [state, setState] = useState<AllHoroscopesState>({
    horoscopes: [],
    broadcastDate: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        // Step 1: 최신 방송일 조회 (날짜 혼합 방지)
        const { data: dateRow, error: dateError } = await supabase
          .from('horoscopes')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dateError) throw dateError;

        if (!dateRow) {
          if (isMounted) {
            setState({ horoscopes: [], broadcastDate: null, loading: false, error: null });
          }
          return;
        }

        // Step 2: 해당 방송일의 12개 별자리 조회
        const { data: rows, error: rowsError } = await supabase
          .from('horoscopes')
          .select('*')
          .eq('date', dateRow.date)
          .order('rank', { ascending: true });

        if (rowsError) throw rowsError;

        if (isMounted) {
          setState({
            horoscopes: (rows ?? []) as Horoscope[],
            broadcastDate: formatBroadcastDate(dateRow.date),
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setState({ horoscopes: [], broadcastDate: null, loading: false, error: getErrorMessage(err) });
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
