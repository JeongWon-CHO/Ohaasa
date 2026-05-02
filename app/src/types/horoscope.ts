import type { ZodiacSign } from '@/src/constants/zodiac';

export interface Horoscope {
  id: string;
  date: string;         // "2026-04-29" (Supabase DATE → string)
  zodiac_sign: ZodiacSign;
  zodiac_name: string;  // 일본어 별자리명 (うお座 등)
  rank: number;         // 1–12
  advice: string;       // \n 정규화된 조언 텍스트
  created_at: string;
}
