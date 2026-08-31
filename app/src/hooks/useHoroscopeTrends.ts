import { addMonths, format, parseISO, subDays } from 'date-fns';
import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { ZodiacSign } from '@/src/constants/zodiac';

// 월간 기간은 "m:2026-08" 형태의 문자열이다 — 객체가 아니라 문자열이라
// state 비교 · useEffect deps · Map 키를 그대로 쓸 수 있다.
export type MonthPeriod = `m:${string}`;
export type TrendsPeriod = '7d' | '30d' | MonthPeriod;
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

interface HoroscopeRankRow {
  date: string;
  zodiac_sign: ZodiacSign;
  rank: number;
}

export function monthPeriod(month: string): MonthPeriod {
  return `m:${month}`;
}

// 월간 기간이면 "YYYY-MM", 아니면 null
export function getPeriodMonth(period: TrendsPeriod): string | null {
  return period.startsWith('m:') ? period.slice(2) : null;
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return `${year}년 ${monthNum}월`;
}

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
  const month = getPeriodMonth(period);
  if (month) return formatMonthLabel(month);
  return period === '7d' ? '최근 7일' : '최근 30일';
}

// 화살표 캡션·공유 카드처럼 "무엇 대비인가"를 말해야 하는 곳에서 쓴다
export function trendBaselineLabel(period: TrendsPeriod): string {
  return getPeriodMonth(period) ? '전월' : '전날';
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
// 실제 존재하는 row 중 최근 N개를 골라 쓴다 (아래 takeWindow).
const CUTOFF_BUFFER_DAYS = 3;

function getTargetCount(period: TrendsPeriod): number {
  return period === '7d' ? 7 : 30;
}

function getCutoffDate(period: TrendsPeriod): string {
  const daysBack = getTargetCount(period) - 1 + CUTOFF_BUFFER_DAYS;
  return format(subDays(new Date(), daysBack), 'yyyy-MM-dd');
}

// '7d'·'30d'는 버퍼만큼 넓게 받아온 뒤 최근 N개만 쓴다.
// 월간에는 쓰지 않는다 — 쿼리(gte 월초 · lt 다음 달 1일)가 이미 정확한 범위라
// 31일 달에 slice(-30)을 걸면 1일치가 조용히 빠진다.
function takeWindow<T>(rows: T[], period: TrendsPeriod): T[] {
  return rows.slice(-getTargetCount(period));
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 추이를 불러오지 못했습니다.';
}

// 지난 달은 행이 더 늘지 않으므로 한 번 받으면 캐시한다(이번 달은 매일 늘어나므로 제외).
// 달을 왔다갔다 하는 조작이 곧 재조회가 되는 걸 막는 장치다.
const pastMonthCache = new Map<string, HoroscopeRankRow[]>();

function isPastMonth(month: string): boolean {
  return month < format(new Date(), 'yyyy-MM');
}

async function fetchRankRows(period: TrendsPeriod): Promise<HoroscopeRankRow[]> {
  const month = getPeriodMonth(period);

  if (month) {
    const cached = pastMonthCache.get(month);
    if (cached) return cached;

    const monthStart = parseISO(`${month}-01`);
    // 월간 화살표가 전월 대비라 이전 달까지 함께 받는다 (최대 2개월 ≈ 744행, db-max-rows 1000 아래)
    const { data, error } = await supabase
      .from('horoscopes')
      .select('date, zodiac_sign, rank')
      .gte('date', format(addMonths(monthStart, -1), 'yyyy-MM-dd'))
      .lt('date', format(addMonths(monthStart, 1), 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as HoroscopeRankRow[];
    if (isPastMonth(month)) pastMonthCache.set(month, rows);
    return rows;
  }

  const { data, error } = await supabase
    .from('horoscopes')
    .select('date, zodiac_sign, rank')
    .gte('date', getCutoffDate(period))
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as HoroscopeRankRow[];
}

function seriesFor(rows: HoroscopeRankRow[], sign: ZodiacSign): RankPoint[] {
  return rows.filter((row) => row.zodiac_sign === sign).map((row) => ({ date: row.date, rank: row.rank }));
}

function groupRanksBySign(rows: HoroscopeRankRow[]): Map<ZodiacSign, number[]> {
  const map = new Map<ZodiacSign, number[]>();
  for (const row of rows) {
    const list = map.get(row.zodiac_sign) ?? [];
    list.push(row.rank);
    map.set(row.zodiac_sign, list);
  }
  return map;
}

// 별자리별 평균 등수를 오름차순으로. pick이 각 별자리의 rank 배열에서 쓸 구간을 고른다.
function buildSortedAverages(
  ranksBySign: Map<ZodiacSign, number[]>,
  pick: (ranks: number[]) => number[],
): { sign: ZodiacSign; averageRank: number }[] {
  return Array.from(ranksBySign.entries())
    .map(([sign, signRanks]) => {
      const picked = pick(signRanks);
      return picked.length ? { sign, averageRank: Math.round(average(picked) * 10) / 10 } : null;
    })
    .filter((item): item is { sign: ZodiacSign; averageRank: number } => item !== null)
    .sort((a, b) => a.averageRank - b.averageRank);
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
        const allRows = await fetchRankRows(period);

        const month = getPeriodMonth(period);
        const monthStart = month ? `${month}-01` : null;

        // 월간은 받아온 2개월치를 "선택한 달"과 "그 전 달"로 가른다.
        // 일수 기간('7d'·'30d')은 같은 배열을 두 번 쓰되 baseline만 하루 앞당겨 자른다.
        const windowRows = monthStart ? allRows.filter((row) => row.date >= monthStart) : allRows;
        const baselineRows = monthStart ? allRows.filter((row) => row.date < monthStart) : allRows;

        const pickWindow = <T,>(items: T[]): T[] => (month ? items : takeWindow(items, period));
        const pickBaseline = (ranks: number[]) => (month ? ranks : takeWindow(ranks.slice(0, -1), period));

        const points: RankPoint[] = zodiacSign ? pickWindow(seriesFor(windowRows, zodiacSign)) : [];
        const comparePoints: RankPoint[] = compareSign ? pickWindow(seriesFor(windowRows, compareSign)) : [];

        const ranks = points.map((p) => p.rank);
        const averageRank = ranks.length ? Math.round(average(ranks) * 10) / 10 : null;
        const minRank = ranks.length ? Math.min(...ranks) : null;
        const maxRank = ranks.length ? Math.max(...ranks) : null;

        const sortedAverages = buildSortedAverages(groupRanksBySign(windowRows), pickWindow);
        const currentRoundedRanks = computeRoundedRankMap(sortedAverages);

        // 화살표는 "평균 등수 배지가 직전 기준 대비 어떻게 바뀌었는지"다.
        // 일수 기간은 같은 길이 윈도우를 하루 앞당긴 값(전날 대비),
        // 월간은 이전 달 전체 평균(전월 대비)이 기준이다.
        const baselineAverages = buildSortedAverages(groupRanksBySign(baselineRows), pickBaseline);
        const baselineRoundedRanks = computeRoundedRankMap(baselineAverages);

        const signAverages: SignAverage[] = sortedAverages.map((item, index) => {
          const exactRank = index + 1;
          const roundedRank = currentRoundedRanks.get(item.sign)!;
          const baselineRank = baselineRoundedRanks.get(item.sign);
          const diff = baselineRank !== undefined ? baselineRank - roundedRank : 0; // 양수면 등수가 더 작아짐(개선)
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
