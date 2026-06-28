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
  comparePoints: RankPoint[];
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
  if (averageRank === null) return '며칠만 더 모이면 흐름을 보여드릴게요';

  if (averageRank <= 3.5) return '별들이 작정하고 밀어주는 중이에요 ✦';
  if (averageRank <= 4.0) return '요즘 운세가 가장 빛나는 흐름이에요';
  if (averageRank <= 4.8) return '기분 좋은 별빛이 머물고 있어요';
  if (averageRank <= 5.6) return '좋은 기운이 차분히 이어지고 있어요';
  if (averageRank <= 6.5) return '편안한 기운이 안정적으로 머물고 있어요';
  if (averageRank <= 7.3) return '무난하고 편안한 흐름이에요';
  if (averageRank <= 8.1) return '조금 기복은 있지만 괜찮아요';
  if (averageRank <= 9.0) return '잠시 숨을 고르는 시기예요';
  if (averageRank <= 9.6) return '잠깐 쉬어가는 흐름이에요';

  return '곧 더 좋은 날이 찾아올 거예요';
}

// 자정이 지나도 그날 크론(KST 05:59)이 아직 안 돌아 오늘 row가 없을 수 있으므로,
// "오늘부터 N일 전" 캘린더 날짜로 자르지 않고 여유 버퍼만큼 더 넓게 가져온 뒤
// 실제 존재하는 row 중 최근 N개를 골라 쓴다 (아래 targetCount slice).
const CUTOFF_BUFFER_DAYS = 3;

function getTargetCount(period: TrendsPeriod): number {
  return period === '7d' ? 7 : 30;
}

function getCutoffDate(period: TrendsPeriod): string {
  const daysBack = getTargetCount(period) - 1 + CUTOFF_BUFFER_DAYS;
  return format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 추이를 불러오지 못했습니다.';
}

const EMPTY_STATE: Omit<HoroscopeTrendsState, 'refetch'> = {
  points: [],
  comparePoints: [],
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
  compareSign: ZodiacSign | null = null,
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
        const targetCount = getTargetCount(period);

        const points: RankPoint[] = zodiacSign
          ? allRows
              .filter((row) => row.zodiac_sign === zodiacSign)
              .map((row) => ({ date: row.date, rank: row.rank }))
              .slice(-targetCount)
          : [];

        const comparePoints: RankPoint[] = compareSign
          ? allRows
              .filter((row) => row.zodiac_sign === compareSign)
              .map((row) => ({ date: row.date, rank: row.rank }))
              .slice(-targetCount)
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
          .map(([sign, signRanks]) => {
            const recentRanks = signRanks.slice(-targetCount);
            return {
              sign,
              averageRank: Math.round(average(recentRanks) * 10) / 10,
              trend: computeTrend(recentRanks),
            };
          })
          .sort((a, b) => a.averageRank - b.averageRank);

        if (isMounted) {
          setState({
            points,
            comparePoints,
            averageRank,
            minRank,
            maxRank,
            signAverages,
            loading: false,
            error: null,
          });
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
  }, [zodiacSign, period, compareSign, reloadToken]);

  return { ...state, refetch: () => setReloadToken((t) => t + 1) };
}
