import type { Horoscope } from "../types/horoscope";
import type { MezamashiHoroscope } from "../types/mezamashi";

/** 저장된 메자마시 데이터를 공통 표시 모델로 변환한다. 고고 항목은 채우지 않는다. */
export function mezamashiToHoroscope(entry: MezamashiHoroscope): Horoscope {
  return {
    date: entry.date,
    zodiac_sign: entry.zodiac_sign,
    zodiac_name: entry.zodiac_name,
    rank: entry.rank,
    advice: entry.advice,
    advice_ko: entry.advice_ko,
    source: "mezamashi",
    mezamashi: entry,
    lucky_place: null,
    lucky_place_ko: null,
    lucky_item_ohaasa: null,
    lucky_item_ohaasa_ko: null,
    lucky_color: null,
    lucky_color_ko: null,
    lucky_item: null,
    lucky_item_ko: null,
    money_score: null,
    love_score: null,
    work_score: null,
    health_score: null,
  };
}
