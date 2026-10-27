import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { fetchBroadcastHoroscopes } from '../lib/broadcastHoroscopes';
import type { Horoscope, HoroscopeSource } from '../types/horoscope';

export function useBroadcastHoroscopes(source: HoroscopeSource, enabled = true) {
  const [state, setState] = useState<{
    source: HoroscopeSource;
    horoscopes: Horoscope[];
    loading: boolean;
    error: string | null;
  }>({ source, horoscopes: [], loading: true, error: null });
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ source, horoscopes: [], loading: true, error: null });
    fetchBroadcastHoroscopes(supabase, source, controller.signal).then(horoscopes => {
      if (!controller.signal.aborted) setState({ source, horoscopes, loading: false, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ source, horoscopes: [], loading: false, error: '운세를 불러오지 못했어요.' });
    });
    return () => controller.abort();
  }, [source, enabled, revision]));
  return {
    ...(state.source === source ? state : { horoscopes: [], loading: true, error: null }),
    retry: () => setRevision(value => value + 1),
  };
}
