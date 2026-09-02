import { useCallback, useEffect, useState } from 'react';

import { loadMonthJournals, type DailyJournal } from '@/src/lib/journal';

/**
 * 한 달치 일기를 읽는다. 홈 탭과 스케치북이 같이 쓴다.
 *
 * `refresh()`는 tick만 올리는 동기 함수다 — 일기를 쓰고 돌아왔을 때
 * 화면이 스스로 다시 읽게 하려면 화면 쪽에서 useFocusEffect로 불러주면 된다.
 */
export function useMonthJournals(yearMonth: string) {
  const [journals, setJournals] = useState<Map<string, DailyJournal>>(new Map());
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // cancelled 플래그가 없으면 월을 빠르게 넘길 때 먼저 띄운 조회가 나중에 도착해
    // 지금 보고 있는 달을 덮어쓸 수 있다.
    let cancelled = false;
    loadMonthJournals(yearMonth).then((loaded) => {
      if (!cancelled) setJournals(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, tick]);

  return { journals, refresh };
}
