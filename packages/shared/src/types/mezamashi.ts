import type { ZodiacSign } from '../constants/zodiac';

/** 별도 mezamashi_horoscopes 테이블. 기존 Horoscope 데이터와 혼합하지 않는다. */
export interface MezamashiHoroscope {
  date: string;
  zodiac_sign: ZodiacSign;
  zodiac_name: string;
  rank: number;
  // 본문 운세. 원본 JSON의 advice는 본문이 아닌 추가 조언이다.
  advice: string;
  lucky_point: string;
  lucky_color: string;
  extra_advice: string | null;
  lucky_person: string | null;
  lucky_menu: string | null;
  advice_ko: string | null;
  lucky_point_ko: string | null;
  lucky_color_ko: string | null;
  extra_advice_ko: string | null;
  lucky_person_ko: string | null;
  lucky_menu_ko: string | null;
}
