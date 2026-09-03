import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  loadJournalDates,
  loadMonthJournals,
  type DailyJournal,
} from '@/src/lib/journal';

/** 처음 붙일 달 수. 두 달이면 화면을 채우고 스크롤도 걸린다. */
const INITIAL_MONTHS = 2;
const MONTHS_PER_PAGE = 2;

export interface ArchiveMonth {
  /** YYYY-MM */
  yearMonth: string;
  /** 그 달의 기록. 최신순. 비어 있는 달은 섹션으로 나오지 않는다. */
  journals: DailyJournal[];
}

/**
 * 보관함용 조회. **달 목록과 본문을 분리해서 읽는다.**
 *
 * 키 목록(`loadJournalDates`)은 파싱이 없어 전부 훑어도 싸고, 본문은 화면에
 * 닿은 달만 `loadMonthJournals`로 읽는다. 한 번에 다 읽으면 1년치가 1.9MB라
 * 첫 진입이 그대로 멈춘다(`journal.ts`의 PREFIX 주석).
 *
 * `refresh()`는 `useMonthJournals`와 같은 동기 tick 함수다 — 탭은 언마운트되지
 * 않으므로 화면에서 `useFocusEffect`로 불러줘야 갱신된다.
 */
export function useJournalArchive() {
  const [months, setMonths] = useState<string[]>([]);
  const [limit, setLimit] = useState(INITIAL_MONTHS);
  const [loaded, setLoaded] = useState<Map<string, DailyJournal[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // ① 키만 훑어 기록이 있는 달을 최신순으로 추린다.
  useEffect(() => {
    let cancelled = false;
    loadJournalDates().then((dates) => {
      if (cancelled) return;
      // dates가 내림차순이라 직전 값과만 비교하면 중복이 걸러진다.
      const list: string[] = [];
      for (const date of dates) {
        const ym = date.slice(0, 7);
        if (list[list.length - 1] !== ym) list.push(ym);
      }
      setMonths(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const target = useMemo(() => months.slice(0, limit), [months, limit]);

  // ② 보이는 달만 본문을 읽는다.
  //
  // tick이 올라간 회차에는 이미 읽은 달도 다시 읽는다 — 일기를 고치고 돌아왔을 때
  // 내용이 바뀌었는지는 키 목록만으로 알 수 없기 때문이다. 대신 달이 쌓일수록
  // 이 재조회가 무거워지므로, expo-file-system으로 옮길 때 같이 손봐야 한다.
  const seenTickRef = useRef(tick);
  useEffect(() => {
    const stale = seenTickRef.current !== tick;
    seenTickRef.current = tick;

    const wanted = stale ? target : target.filter((ym) => !loaded.has(ym));
    if (wanted.length === 0) return;

    let cancelled = false;
    Promise.all(
      wanted.map((ym) =>
        loadMonthJournals(ym).then((map) => {
          const list = [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
          return [ym, list] as const;
        }),
      ),
    ).then((pairs) => {
      // 월을 빠르게 넘길 때 먼저 띄운 조회가 나중에 도착해 덮는 걸 막는다.
      if (cancelled) return;
      setLoaded((prev) => {
        const next = new Map(prev);
        for (const [ym, list] of pairs) next.set(ym, list);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [target, loaded, tick]);

  // 아직 본문을 안 읽은 달은 내보내지 않는다 — 넘기면 "0장" 헤더가 먼저 떴다가
  // 그림이 뒤늦게 채워지는 게 보인다.
  const sections = useMemo<ArchiveMonth[]>(
    () =>
      target.flatMap((ym) => {
        const journals = loaded.get(ym);
        return journals ? [{ yearMonth: ym, journals }] : [];
      }),
    [target, loaded],
  );

  const loadMore = useCallback(() => {
    setLimit((l) => (l >= months.length ? l : l + MONTHS_PER_PAGE));
  }, [months.length]);

  return {
    sections,
    /** 첫 조회가 끝나기 전. 이때는 "기록 없음"을 띄우면 안 된다. */
    loading,
    isEmpty: !loading && months.length === 0,
    loadMore,
    refresh,
  };
}
