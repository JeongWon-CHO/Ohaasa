import { format, parseISO, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { ZodiacSign } from '@/src/constants/zodiac';

export type TrendsPeriod = '7d' | '30d';

export interface RankPoint {
  date: string;
  rank: number;
}

export interface SignAverage {
  sign: ZodiacSign;
  averageRank: number;
}

export interface HoroscopeTrendsState {
  points: RankPoint[];
  averageRank: number | null;
  minRank: number | null;
  maxRank: number | null;
  signAverages: SignAverage[];
  loading: boolean;
  error: string | null;
}

const TREND_SENTENCE_THRESHOLD = 1;

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function getTrendSentence(points: RankPoint[]): string {
  if (points.length < 2) return '아직 데이터가 부족해요';

  const mid = Math.floor(points.length / 2);
  const firstHalfAvg = average(points.slice(0, mid).map((p) => p.rank));
  const secondHalfAvg = average(points.slice(mid).map((p) => p.rank));
  const diff = firstHalfAvg - secondHalfAvg; // 양수면 후반에 순위 숫자가 작아짐(개선)

  if (diff > TREND_SENTENCE_THRESHOLD) return '이번 주는 갈수록 좋은 흐름이에요';
  if (diff < -TREND_SENTENCE_THRESHOLD) return '이번 주는 후반에 다소 주춤했어요';
  return '이번 주는 전체적으로 평이한 흐름이에요';
}

function getCutoffDate(period: TrendsPeriod): string {
  const daysBack = period === '7d' ? 6 : 29;
  return format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 추이를 불러오지 못했습니다.';
}

const EMPTY_STATE: HoroscopeTrendsState = {
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
  const [state, setState] = useState<HoroscopeTrendsState>(EMPTY_STATE);

  useEffect(() => {
    let isMounted = true;

    setState({ ...EMPTY_STATE, loading: true });

    async function load() {
      try {
        let query = supabase
          .from('horoscopes')
          .select('date, zodiac_sign, rank')
          .order('date', { ascending: true });

        query = query.gte('date', getCutoffDate(period));

        const { data: rows, error } = await query;

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
  }, [zodiacSign, period]);

  return state;
}

export function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  return format(d, 'M/d');
}
