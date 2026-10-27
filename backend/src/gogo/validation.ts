import type { GogoParseResult } from "./parser";

export const SIGN_NAMES: Record<string, string> = {
  aries: "おひつじ座",
  taurus: "おうし座",
  gemini: "ふたご座",
  cancer: "かに座",
  leo: "しし座",
  virgo: "おとめ座",
  libra: "てんびん座",
  scorpio: "さそり座",
  sagittarius: "いて座",
  capricorn: "やぎ座",
  aquarius: "みずがめ座",
  pisces: "うお座",
};
const FIELDS = ["advice", "lucky_color", "lucky_item"] as const;

export function validate(result: GogoParseResult): void {
  const entries = result.entries;
  if (
    entries.length !== 12 ||
    new Set(entries.map((e) => e.zodiac_sign)).size !== 12 ||
    new Set(entries.map((e) => e.rank)).size !== 12 ||
    entries.some(
      (e) =>
        !Object.hasOwn(SIGN_NAMES, e.zodiac_sign) ||
        !Number.isInteger(e.rank) ||
        e.rank < 1 ||
        e.rank > 12 ||
        FIELDS.some((field) => !e[field]?.trim()) ||
        [e.money_score, e.love_score, e.work_score, e.health_score].some(
          (score) => !Number.isInteger(score) || score < 1 || score > 6,
        ),
    )
  ) {
    throw new Error("[gogo] Incomplete horoscope data");
  }
}
