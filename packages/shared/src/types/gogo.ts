import type { Horoscope } from "./horoscope";

/** 고고 전용 테이블에는 오하아사 항목이나 source 컬럼을 저장하지 않는다. */
export type GogoHoroscope = Pick<
  Horoscope,
  | "date"
  | "zodiac_sign"
  | "zodiac_name"
  | "rank"
  | "advice"
  | "advice_ko"
  | "lucky_color"
  | "lucky_color_ko"
  | "lucky_item"
  | "lucky_item_ko"
  | "money_score"
  | "love_score"
  | "work_score"
  | "health_score"
>;
