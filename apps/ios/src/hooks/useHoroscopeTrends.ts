import { endOfMonth, format, getDaysInMonth, parseISO, subDays, subMonths } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import type { ZodiacSign } from '@/src/constants/zodiac';

/**
 * 최근 N일 두 가지와, 특정 달 하나.
 *
 * 달은 `month:2026-08` 꼴의 문자열로 싣는다 — 값 하나로 상태를 관리할 수 있어
 * "기간 종류"와 "고른 달"을 따로 들고 다니며 어긋날 일이 없다.
 */
export type TrendsPeriod = '7d' | '14d' | `month:${MonthKey}`;

/** `yyyy-MM` */
export type MonthKey = string;

const MONTH_PREFIX = 'month:';

export function monthPeriod(month: MonthKey): TrendsPeriod {
  return `${MONTH_PREFIX}${month}`;
}

/** 월간이면 `yyyy-MM`, 아니면 null. */
export function getPeriodMonth(period: TrendsPeriod): MonthKey | null {
  return period.startsWith(MONTH_PREFIX) ? period.slice(MONTH_PREFIX.length) : null;
}

function previousMonth(month: MonthKey): MonthKey {
  return format(subMonths(parseISO(`${month}-01`), 1), 'yyyy-MM');
}

function rowsOfMonth(rows: TrendRow[], month: MonthKey): TrendRow[] {
  return rows.filter((row) => row.date.startsWith(`${month}-`));
}
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
  const month = getPeriodMonth(period);
  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    // 올해면 "8월", 해가 넘어가면 어느 해인지 붙여야 구분된다.
    return year === new Date().getFullYear() ? `${monthNum}월` : `${year}년 ${monthNum}월`;
  }
  return period === '7d' ? '최근 7일' : '최근 14일';
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
  const month = getPeriodMonth(period);
  if (month) return getDaysInMonth(parseISO(`${month}-01`));
  return period === '7d' ? 7 : 14;
}

/**
 * 조회할 날짜 구간. 월간은 **위쪽도 막아야** 한다 — `gte`만 걸면 지난 달을 고를 때
 * 그 달부터 오늘까지가 전부 딸려와 egress가 달 수만큼 늘어난다.
 */
function getDateRange(period: TrendsPeriod): { from: string; to: string | null } {
  const month = getPeriodMonth(period);
  if (month) {
    const first = parseISO(`${month}-01`);
    // 화살표를 "전 달 대비"로 내려면 전 달도 같이 받아야 한다. 두 달치라 행이 두 배지만,
    // 지난 달의 평균은 더 변하지 않으므로 아래 rangeCache가 한 번만 받게 잡아준다.
    return {
      from: format(subMonths(first, 1), 'yyyy-MM-01'),
      to: format(endOfMonth(first), 'yyyy-MM-dd'),
    };
  }
  const daysBack = getTargetCount(period) - 1 + CUTOFF_BUFFER_DAYS;
  return { from: format(subDays(new Date(), daysBack), 'yyyy-MM-dd'), to: null };
}

/**
 * 이미 끝난 구간의 조회 결과. 지난 달의 순위는 더 바뀌지 않으므로 달을 오갈 때마다
 * 다시 받을 이유가 없다 — 전 달까지 두 달치를 받는 월간에서 특히 크다.
 *
 * **끝나지 않은 구간은 담지 않는다**(`to`가 오늘 이후이거나 아예 없는 경우).
 * 이번 달과 최근 N일은 크론이 돌 때마다 늘어난다.
 */
const rangeCache = new Map<string, TrendRow[]>();

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '운세 추이를 불러오지 못했습니다.';
}

type TrendRow = { date: string; zodiac_sign: ZodiacSign; rank: number };

function ranksBySignOf(rows: TrendRow[]): Map<ZodiacSign, number[]> {
  const map = new Map<ZodiacSign, number[]>();
  for (const row of rows) {
    const list = map.get(row.zodiac_sign) ?? [];
    list.push(row.rank);
    map.set(row.zodiac_sign, list);
  }
  return map;
}

type TrendsDerived = Pick<
  HoroscopeTrendsState,
  'points' | 'comparePoints' | 'averageRank' | 'minRank' | 'maxRank' | 'signAverages'
>;

const EMPTY_DERIVED: TrendsDerived = {
  points: [],
  comparePoints: [],
  averageRank: null,
  minRank: null,
  maxRank: null,
  signAverages: [],
};

/**
 * 서버가 걸러주는 건 기간(`date`)뿐이다 — 쿼리에 `zodiac_sign`이 없고, 별자리 필터는
 * 전부 여기서 한다. 그래서 `zodiacSign`·`compareSign`이 바뀌어도 **다시 받아올 이유가 없다.**
 */
function computeTrends(
  fetchedRows: TrendRow[],
  zodiacSign: ZodiacSign | null,
  compareSign: ZodiacSign | null,
  period: TrendsPeriod,
): TrendsDerived {
  const targetCount = getTargetCount(period);
  const month = getPeriodMonth(period);

  // 월간은 전 달까지 받아오므로, 화면에 그릴 행은 고른 달만 추린다.
  const allRows = month ? rowsOfMonth(fetchedRows, month) : fetchedRows;

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

  const ranksBySign = ranksBySignOf(allRows);

  const sortedAverages = Array.from(ranksBySign.entries())
    .map(([sign, signRanks]) => ({
      sign,
      averageRank: Math.round(average(signRanks.slice(-targetCount)) * 10) / 10,
    }))
    .sort((a, b) => a.averageRank - b.averageRank);

  const todayRoundedRanks = computeRoundedRankMap(sortedAverages);

  // 화살표의 비교 기준.
  // - 일간: 같은 길이의 기간을 하루 앞당겨 다시 계산한 "어제 시점의 등수"
  // - 월간: 전 달 전체의 평균 등수. 한 달짜리 창을 하루 앞당겨 봐야 거의 그대로라
  //   화살표가 의미를 잃는다.
  const baselineRanksBySign = month
    ? ranksBySignOf(rowsOfMonth(fetchedRows, previousMonth(month)))
    : new Map(
        Array.from(ranksBySign.entries()).map(([sign, signRanks]) => [
          sign,
          signRanks.slice(0, -1).slice(-targetCount),
        ]),
      );

  const baselineAverages = Array.from(baselineRanksBySign.entries())
    .map(([sign, signRanks]) =>
      signRanks.length ? { sign, averageRank: Math.round(average(signRanks) * 10) / 10 } : null,
    )
    .filter((item): item is { sign: ZodiacSign; averageRank: number } => item !== null)
    .sort((a, b) => a.averageRank - b.averageRank);

  const yesterdayRoundedRanks = computeRoundedRankMap(baselineAverages);

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

  return { points, comparePoints, averageRank, minRank, maxRank, signAverages };
}

export function useHoroscopeTrends(
  zodiacSign: ZodiacSign | null,
  period: TrendsPeriod,
  compareSign: ZodiacSign | null = null,
): HoroscopeTrendsState {
  const [rows, setRows] = useState<TrendRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /**
   * 조회는 **기간에만** 의존한다.
   *
   * `zodiacSign`·`compareSign`을 deps에 넣으면 클라이언트 필터일 뿐인 비교 토글 한 번에
   * 30일치 396행(12별자리 × 33일)을 다시 받는다. 무료 티어 egress에서 이게 컸다.
   */
  useEffect(() => {
    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기간이 바뀌는 즉시 로딩으로 바꿔야 이전 기간의 그래프가 남지 않는다.
    setLoading(true);

    async function load() {
      try {
        const range = getDateRange(period);
        const cacheKey = `${range.from}|${range.to ?? ''}`;
        const cached = range.to && range.to < format(new Date(), 'yyyy-MM-dd')
          ? rangeCache.get(cacheKey)
          : undefined;

        if (cached) {
          setRows(cached);
          setError(null);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('horoscopes')
          .select('date, zodiac_sign, rank')
          .gte('date', range.from);
        if (range.to) query = query.lte('date', range.to);

        const { data, error: fetchError } = await query.order('date', { ascending: true });

        if (fetchError) throw fetchError;
        if (!isMounted) return;

        const fetched = (data ?? []) as TrendRow[];
        // 끝난 구간만 담는다 — 진행 중인 구간을 담으면 새 날짜가 영영 안 보인다.
        if (range.to && range.to < format(new Date(), 'yyyy-MM-dd')) {
          rangeCache.set(cacheKey, fetched);
        }

        setRows(fetched);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setRows(null);
        setError(getErrorMessage(err));
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [period, reloadToken]);

  const derived = useMemo(
    () => (rows ? computeTrends(rows, zodiacSign, compareSign, period) : EMPTY_DERIVED),
    [rows, zodiacSign, compareSign, period],
  );

  return { ...derived, loading, error, refetch: () => setReloadToken((t) => t + 1) };
}
