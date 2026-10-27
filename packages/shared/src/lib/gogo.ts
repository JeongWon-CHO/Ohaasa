import type { Horoscope } from "../types/horoscope";
import type { GogoHoroscope } from "../types/gogo";

export function gogoToHoroscope(entry: GogoHoroscope): Horoscope {
  return {
    ...entry,
    source: "gogo",
    lucky_place: null,
    lucky_place_ko: null,
    lucky_item_ohaasa: null,
    lucky_item_ohaasa_ko: null,
  };
}
