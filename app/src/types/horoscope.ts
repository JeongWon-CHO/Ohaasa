import type { ZodiacSign } from '@/src/constants/zodiac';

export interface Horoscope {
  id: string;
  date: string;         // "2026-04-29" (Supabase DATE → string)
  zodiac_sign: ZodiacSign;
  zodiac_name: string;  // 일본어 별자리명 (うお座 등)
  rank: number;         // 1–12
  advice: string;       // \n 정규화된 일본어 원문 조언 텍스트
  advice_ko: string | null; // GPT 번역된 한국어 조언. null이면 advice(원문)로 fallback
  created_at: string;
}
