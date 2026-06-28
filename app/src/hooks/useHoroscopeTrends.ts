import { format, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { ZodiacSign } from '@/src/constants/zodiac';

export type TrendsPeriod = '7d' | '30d';
export type Trend = 'up' | 'down' | 'flat';

export interface RankPoint {
  date: string;
  rank: number;
}

export interface SignAverage {
  sign: ZodiacSign;
  averageRank: number;
  trend: Trend;
}

export interface HoroscopeTrendsState {
  points: RankPoint[];
  averageRank: number | null;
  minRank: number | null;
  maxRank: number | null;
  signAverages: SignAverage[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// 하루 12개 별자리가 1~12위를 한 번씩 나눠 가지므로 전체 평균은 항상 6.5(수학적 고정값)
export const OVERALL_AVERAGE_RANK = 6.5;

const TREND_THRESHOLD = 1;

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeTrend(ranks: number[]): Trend {
  if (ranks.length < 2) return 'flat';

  const mid = Math.floor(ranks.length / 2);
  const firstHalfAvg = average(ranks.slice(0, mid));
  const secondHalfAvg = average(ranks.slice(mid));
  const diff = firstHalfAvg - secondHalfAvg; // 양수면 후반에 순위 숫자가 작아짐(개선)

  if (diff > TREND_THRESHOLD) return 'up';
  if (diff < -TREND_THRESHOLD) return 'down';
  return 'flat';
}

export function getSummaryComment(averageRank: number | null): string {
  if (averageRank === null) return '아직 데이터가 부족해요';
  if (averageRank <= 3.5) return '요즘 흐름이 정말 좋아요 ✦';
  if (averageRank <= 6) return '점점 좋아지고 있어요';
  if (averageRank <= 9) return '조금씩 올라오는 중이에요';
  return '곧 더 좋은 날이 찾아올 거예요';
}

function getCutoffDate(period: TrendsPeriod): string {
  const daysBack = period === '7d' ? 6 : 29;
  return format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 추이를 불러오지 못했습니다.';
}

const EMPTY_STATE: Omit<HoroscopeTrendsState, 'refetch'> = {
  points: [],
  averageRank: null,
  minRank: null,
  maxRank: null,
  signAverages: [],
  loading: true,
  error: null,
};

export function useHoroscopeTrends(
  zodiacSign: ZodiacSign | null,
  period: TrendsPeriod,
): HoroscopeTrendsState {
  const [state, setState] = useState<Omit<HoroscopeTrendsState, 'refetch'>>(EMPTY_STATE);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    setState({ ...EMPTY_STATE, loading: true });

    async function load() {
      try {
        const { data: rows, error } = await supabase
          .from('horoscopes')
          .select('date, zodiac_sign, rank')
          .gte('date', getCutoffDate(period))
          .order('date', { ascending: true });

        if (error) throw error;

        const allRows = (rows ?? []) as { date: string; zodiac_sign: ZodiacSign; rank: number }[];

        const points: RankPoint[] = zodiacSign
          ? allRows
              .filter((row) => row.zodiac_sign === zodiacSign)
              .map((row) => ({ date: row.date, rank: row.rank }))
          : [];

        const ranks = points.map((p) => p.rank);
        const averageRank = ranks.length ? Math.round(average(ranks) * 10) / 10 : null;
        const minRank = ranks.length ? Math.min(...ranks) : null;
        const maxRank = ranks.length ? Math.max(...ranks) : null;

        const ranksBySign = new Map<ZodiacSign, number[]>();
        for (const row of allRows) {
          const list = ranksBySign.get(row.zodiac_sign) ?? [];
          list.push(row.rank);
          ranksBySign.set(row.zodiac_sign, list);
        }

        const signAverages: SignAverage[] = Array.from(ranksBySign.entries())
          .map(([sign, signRanks]) => ({
            sign,
            averageRank: Math.round(average(signRanks) * 10) / 10,
            trend: computeTrend(signRanks),
          }))
          .sort((a, b) => a.averageRank - b.averageRank);

        if (isMounted) {
          setState({ points, averageRank, minRank, maxRank, signAverages, loading: false, error: null });
        }
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
  }, [zodiacSign, period, reloadToken]);

  return { ...state, refetch: () => setReloadToken((t) => t + 1) };
}
