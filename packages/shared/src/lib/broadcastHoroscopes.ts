import type { SupabaseClient } from '@supabase/supabase-js';
import { ZODIAC_MAP } from '../constants/zodiac';
import type { Horoscope, HoroscopeSource } from '../types/horoscope';
import type { MezamashiHoroscope } from '../types/mezamashi';
import { mezamashiToHoroscope } from './mezamashi';

export const BROADCAST_SOURCES: HoroscopeSource[] = ['ohaasa', 'gogo', 'mezamashi'];

export function isBroadcastSource(value: unknown): value is HoroscopeSource {
  return BROADCAST_SOURCES.some(source => source === value);
}

/** 소스를 섞거나 불완전한 날짜를 공개하지 않는다. */
export function latestCompleteBroadcast(rows: Horoscope[], source: HoroscopeSource): Horoscope[] {
  const dates = [...new Set(rows.map(row => row.date))].sort().reverse();
  for (const date of dates) {
    const group = rows.filter(row => row.date === date && row.source === source);
    if (
      group.length === 12 &&
      new Set(group.map(row => row.zodiac_sign)).size === 12 &&
      new Set(group.map(row => row.rank)).size === 12 &&
      group.every(row => Object.hasOwn(ZODIAC_MAP, row.zodiac_sign) &&
        Number.isInteger(row.rank) && row.rank >= 1 && row.rank <= 12 && row.advice?.trim() &&
        (source !== 'mezamashi' || Boolean(row.mezamashi?.lucky_point?.trim() && row.mezamashi?.lucky_color?.trim())))
    ) return group.sort((a, b) => a.rank - b.rank);
  }
  return [];
}

/** 원본의 최신 저장 날짜들을 조회한다. 수집·번역·기기 등록은 실행하지 않는다. */
export async function fetchBroadcastHoroscopes(
  client: SupabaseClient,
  source: HoroscopeSource,
  signal: AbortSignal,
): Promise<Horoscope[]> {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  let query = client.from(source === 'mezamashi' ? 'mezamashi_horoscopes' : 'horoscopes')
    .select('*').lte('date', today);
  if (source !== 'mezamashi') query = query.eq('source', source);
  const { data, error } = await query.order('date', { ascending: false })
    .order('rank', { ascending: true }).limit(168).abortSignal(signal);
  if (error) throw error;
  const rows = source === 'mezamashi'
    ? ((data ?? []) as MezamashiHoroscope[]).map(mezamashiToHoroscope)
    : (data ?? []) as Horoscope[];
  return latestCompleteBroadcast(rows, source);
}
