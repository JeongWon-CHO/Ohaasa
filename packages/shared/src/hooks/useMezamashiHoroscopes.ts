import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { MezamashiHoroscope } from "../types/mezamashi";

/** 메자마시 전용 조회. 기존 운세 선택 및 방송일 컨텍스트와 독립적으로 동작한다. */
export function useMezamashiHoroscopes() {
  const [horoscopes, setHoroscopes] = useState<MezamashiHoroscope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const latest = await supabase
          .from("mezamashi_horoscopes")
          .select("date")
          .order("date", { ascending: false })
          .limit(1)
          .abortSignal(controller.signal)
          .maybeSingle();
        if (latest.error) throw latest.error;
        if (!latest.data) {
          setHoroscopes([]);
          return;
        }
        const result = await supabase
          .from("mezamashi_horoscopes")
          .select("*")
          .eq("date", latest.data.date)
          .order("rank")
          .abortSignal(controller.signal);
        if (result.error) throw result.error;
        if (!controller.signal.aborted)
          setHoroscopes((result.data ?? []) as MezamashiHoroscope[]);
      } catch {
        if (!controller.signal.aborted)
          setError("메자마시 운세를 불러오지 못했어요.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  return {
    horoscopes,
    loading,
    error,
    retry: () => setRevision((value) => value + 1),
  };
}
