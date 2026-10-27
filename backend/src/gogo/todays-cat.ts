import * as cheerio from "cheerio";
import type { GogoParseResult } from "./parser";
import { validate } from "./validation";

export const SOURCE_URL = "https://todays-cat.net/tv/tv-asahi/";

const SIGNS: Record<string, string> = {
  おひつじ座: "aries",
  おうし座: "taurus",
  ふたご座: "gemini",
  かに座: "cancer",
  しし座: "leo",
  おとめ座: "virgo",
  てんびん座: "libra",
  さそり座: "scorpio",
  いて座: "sagittarius",
  やぎ座: "capricorn",
  みずがめ座: "aquarius",
  うお座: "pisces",
};

export async function fetchHtml(date: string): Promise<string> {
  const url = new URL(SOURCE_URL);
  url.searchParams.set("date", date);
  console.log(`[gogo:today's-cat] GET ${url}`);
  const response = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "Ohaasa-Horoscope/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`[today's-cat] HTTP ${response.status}`);
  return response.text();
}

/** URLや記事公開日ではなく、運勢の更新日と各カードの内容を読む。 */
export function parse(html: string): GogoParseResult {
  const $ = cheerio.load(html);
  if (!$(".entry-title-mod").first().text().includes("ゴーゴー星占い"))
    throw new Error("[today's-cat] Missing Gogo horoscope title");
  const update = $(".entry-title-mod").first().next(".entry-card-info").text();
  const match = update.match(/(\d{4})\.(\d{2})\.(\d{2})\s+\d{2}:\d{2}更新/);
  if (!match) throw new Error("[today's-cat] Missing horoscope update date");
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
    throw new Error("[today's-cat] Invalid horoscope update date");

  const entries = $(".neko-wrap")
    .map((_i, element) => {
      const card = $(element);
      const name = card
        .find(".neko-site-title")
        .text()
        .replace(/^📺\s*/, "")
        .trim();
      const zodiac_sign = SIGNS[name];
      if (!zodiac_sign)
        throw new Error(`[today's-cat] Unknown zodiac: ${name}`);
      const luckyValue = (label: string): string => {
        const item = card
          .find(".neko-lucky-item")
          .filter((_j, el) =>
            $(el).find(".neko-lucky-label").text().includes(label),
          )
          .clone();
        item.find(".neko-lucky-label").remove();
        return item.text().trim();
      };
      const score = (category: string, label: string): number => {
        const section = card
          .find(".neko-sub-card")
          .filter((_j, el) =>
            $(el).find(".neko-section-label").text().includes(label),
          );
        // 広告などの画像を点数として数えない。
        return section.find(`.neko-icons img[src$="/icon-${category}-32.png"]`)
          .length;
      };
      return {
        zodiac_sign,
        rank: Number(card.find(".neko-rank-badge").text().trim()),
        advice: card.find(".neko-word").text().trim(),
        lucky_color: luckyValue("ラッキーカラー"),
        lucky_item: luckyValue("幸運のカギ"),
        money_score: score("money", "金運"),
        love_score: score("love", "恋愛運"),
        work_score: score("work", "仕事運"),
        health_score: score("health", "健康運"),
      };
    })
    .get();
  const result = { date, entries };
  validate(result);
  return result;
}
