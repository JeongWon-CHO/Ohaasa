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

interface UseAllHoroscopesOptions {
  date?: string | null; // 지정하면 해당 날짜 조회, null/undefined면 최신 날짜 조회
}

export function useAllHoroscopes(options?: UseAllHoroscopesOptions): AllHoroscopesState {
  const targetDate = options?.date ?? null;

  const [state, setState] = useState<AllHoroscopesState>({
    horoscopes: [],
    broadcastDate: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    setState({ horoscopes: [], broadcastDate: null, loading: true, error: null });

    async function load() {
      try {
        let resolvedDate: string;

        if (targetDate) {
          // 날짜가 지정된 경우: 최신 날짜 조회 skip
          resolvedDate = targetDate;
        } else {
          // 날짜 미지정: 최신 방송일 조회
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
          resolvedDate = dateRow.date;
        }

        // 해당 날짜의 12개 별자리 조회
        const { data: rows, error: rowsError } = await supabase
          .from('horoscopes')
          .select('*')
          .eq('date', resolvedDate)
          .order('rank', { ascending: true });

        if (rowsError) throw rowsError;

        if (isMounted) {
          const source = (rows?.[0] as Horoscope | undefined)?.source ?? 'ohaasa';
          setState({
            horoscopes: (rows ?? []) as Horoscope[],
            broadcastDate: rows?.length ? formatBroadcastDate(resolvedDate, source) : null,
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
  }, [targetDate]);

  return state;
}
