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
  rankDiff: number;
  // 반올림 모드: 반올림값이 같으면 같은 등수("공동 등수")를 부여하고 다음 번호를 스킵
  roundedRank: number;
  // 소수점 모드: 정렬 순서 그대로 순차 등수
  exactRank: number;
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

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function diffToTrend(diff: number): Trend {
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
}

// averageRank 오름차순 정렬된 리스트에 반올림 기준 공동 등수를 부여 (순위 배지와 동일한 규칙)
function computeRoundedRankMap(sorted: { sign: ZodiacSign; averageRank: number }[]): Map<ZodiacSign, number> {
  const map = new Map<ZodiacSign, number>();
  sorted.forEach((item, index) => {
    const exactRank = index + 1;
    const prevSign = index > 0 ? sorted[index - 1].sign : null;
    const tiedWithPrev = prevSign !== null && Math.round(item.averageRank) === Math.round(sorted[index - 1].averageRank);
    map.set(item.sign, tiedWithPrev ? map.get(prevSign)! : exactRank);
  });
  return map;
}

export function periodLabel(period: TrendsPeriod): string {
  return period === '7d' ? '최근 7일' : '최근 30일';
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
      // const loadStart = Date.now();
      try {
        // const fetchStart = Date.now();
        const { data: rows, error } = await supabase
          .from('horoscopes')
          .select('date, zodiac_sign, rank')
          .gte('date', getCutoffDate(period))
          .order('date', { ascending: true });
        // console.log(`[stats] supabase fetch (${period}): ${Date.now() - fetchStart}ms`);

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

        const sortedAverages = Array.from(ranksBySign.entries())
          .map(([sign, signRanks]) => ({
            sign,
            averageRank: Math.round(average(signRanks.slice(-targetCount)) * 10) / 10,
          }))
          .sort((a, b) => a.averageRank - b.averageRank);

        const todayRoundedRanks = computeRoundedRankMap(sortedAverages);

        // 화살표는 "평균 등수 배지가 어제 대비 어떻게 바뀌었는지"를 비교해야 하므로,
        // 같은 길이의 기간을 하루 앞당겨 다시 계산해 어제 시점의 등수를 구한다.
        const yesterdayAverages = Array.from(ranksBySign.entries())
          .map(([sign, signRanks]) => {
            const yesterdayRanks = signRanks.slice(0, -1).slice(-targetCount);
            return yesterdayRanks.length ? { sign, averageRank: Math.round(average(yesterdayRanks) * 10) / 10 } : null;
          })
          .filter((item): item is { sign: ZodiacSign; averageRank: number } => item !== null)
          .sort((a, b) => a.averageRank - b.averageRank);

        const yesterdayRoundedRanks = computeRoundedRankMap(yesterdayAverages);

        const signAverages: SignAverage[] = sortedAverages.map((item, index) => {
          const exactRank = index + 1;
          const roundedRank = todayRoundedRanks.get(item.sign)!;
          const yesterdayRank = yesterdayRoundedRanks.get(item.sign);
          const diff = yesterdayRank !== undefined ? yesterdayRank - roundedRank : 0; // 양수면 오늘 등수가 더 작아짐(개선)
          return {
            sign: item.sign,
            averageRank: item.averageRank,
            roundedRank,
            exactRank,
            trend: diffToTrend(diff),
            rankDiff: Math.abs(diff),
          };
        });

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
          // console.log(`[stats] total load (${period}): ${Date.now() - loadStart}ms`);
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
