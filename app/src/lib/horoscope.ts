import { supabase } from '@/src/lib/supabase';
import type { ZodiacSign } from '@/src/constants/zodiac';
import type { Horoscope } from '@/src/types/horoscope';

// 위젯 카드용 짧은 날짜 표기("4월 29일") — DatePill의 formatBroadcastDate(전체 문장)와 별도.
export function formatShortDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}월 ${day}일`;
}

// 위젯 등 React 렌더 트리 밖(headless task)에서 쓰는 단일 별자리 조회.
// useAllHoroscopes와 달리 12개 전체가 아닌 1개 행만 필요해 별도 쿼리로 분리.
// storage.ts/notifications.ts와 동일하게 절대 throw하지 않고 실패 시 null 반환.
export async function fetchTodayHoroscopeForSign(
  zodiacSign: ZodiacSign,
): Promise<Horoscope | null> {
  try {
    const { data: dateRow, error: dateError } = await supabase
      .from('horoscopes')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dateError || !dateRow) return null;

    const { data: row, error: rowError } = await supabase
      .from('horoscopes')
      .select('*')
      .eq('date', dateRow.date)
      .eq('zodiac_sign', zodiacSign)
      .maybeSingle();

    if (rowError || !row) return null;

    return row as Horoscope;
  } catch {
    return null;
  }
}
