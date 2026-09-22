import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

type HoroscopeDateContextValue = {
  selectedDate: string | null;  // null = 항상 최신 날짜 사용
  latestDate: string | null;    // Supabase에서 조회한 최신 방송일
  latestDateLoading: boolean;
  setSelectedDate: (date: string | null) => void;
  resetToLatestDate: () => void;
  isLatest: boolean;            // selectedDate === null || selectedDate === latestDate
};

const HoroscopeDateContext = createContext<HoroscopeDateContextValue | null>(null);

export function HoroscopeDateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<string | null>(null);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [latestDateLoading, setLatestDateLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('horoscopes')
          .select('date')
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (isMounted && data) {
          setLatestDate(data.date);
        }
      } catch {
        // latestDate stays null; isLatest falls back to selectedDate === null
      } finally {
        if (isMounted) setLatestDateLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const setSelectedDate = useCallback((date: string | null) => {
    setSelectedDateState(date);
  }, []);

  const resetToLatestDate = useCallback(() => {
    setSelectedDateState(null);
  }, []);

  // latestDate 로딩 중일 때도 selectedDate === null이면 최신으로 간주
  const isLatest = selectedDate === null || selectedDate === latestDate;

  return (
    <HoroscopeDateContext.Provider
      value={{ selectedDate, latestDate, latestDateLoading, setSelectedDate, resetToLatestDate, isLatest }}
    >
      {children}
    </HoroscopeDateContext.Provider>
  );
}

export function useHoroscopeDateContext() {
  const ctx = useContext(HoroscopeDateContext);
  if (!ctx) throw new Error('useHoroscopeDateContext must be used within HoroscopeDateProvider');
  return ctx;
}
