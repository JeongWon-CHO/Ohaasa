import type { ZodiacSign } from '@/src/constants/zodiac';

export type HoroscopeSource = 'ohaasa' | 'gogo';

// id·created_at은 스키마엔 있지만 앱이 읽지 않아 select에서 뺐다(순위 리스트 key도 zodiac_sign이다).
// 다시 쓰려면 useHoroscope.ts의 HOROSCOPE_COLUMNS에 먼저 넣어야 한다 — 안 그러면 undefined가 온다.
export interface Horoscope {
  date: string;              // "2026-04-29" (Supabase DATE → string)
  zodiac_sign: ZodiacSign;
  zodiac_name: string;       // 일본어 별자리명 (うお座 등)
  rank: number;              // 1-12
  advice: string;            // \n 정규화된 일본어 원문 조언 텍스트
  advice_ko: string | null;  // GPT 번역된 한국어 조언. null이면 advice(원문)로 fallback
  source: HoroscopeSource;   // 'ohaasa'(평일) | 'gogo'(주말)
  // 기존 오하아사 행운 장소 기록 — 새 데이터에서는 null, 고고에서는 항상 null
  lucky_place:    string | null;
  lucky_place_ko: string | null; // null이면 lucky_place(원문)로 fallback
  // 오하아사 평일 아이템 — null이면 기존 고고 아이템으로 fallback
  lucky_item_ohaasa:    string | null;
  lucky_item_ohaasa_ko: string | null; // null이면 lucky_item_ohaasa(원문)로 fallback
  // 고고별자리 필드 — 평일에는 컬러·점수만, 주말에는 아이템도 제공
  lucky_color:    string | null;
  lucky_item:     string | null;
  lucky_color_ko: string | null; // 한국어 번역. null이면 lucky_color(원문)로 fallback
  lucky_item_ko:  string | null; // 한국어 번역. null이면 lucky_item(원문)로 fallback
  money_score:    number | null;
  love_score:     number | null;
  work_score:     number | null;
  health_score:   number | null;
}
