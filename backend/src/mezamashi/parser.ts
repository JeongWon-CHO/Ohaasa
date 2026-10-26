import * as cheerio from "cheerio";

const SIGNS = {
  "おひつじ座": "aries", "おうし座": "taurus", "ふたご座": "gemini",
  "かに座": "cancer", "しし座": "leo", "おとめ座": "virgo",
  "てんびん座": "libra", "さそり座": "scorpio", "いて座": "sagittarius",
  "やぎ座": "capricorn", "みずがめ座": "aquarius", "うお座": "pisces",
} as const;

export interface MezamashiEntry {
  date: string;
  zodiac_sign: typeof SIGNS[keyof typeof SIGNS];
  zodiac_name: string;
  rank: number;
  advice: string;
  lucky_point: string;
  lucky_color: string;
  extra_advice: string | null;
  lucky_person: string | null;
  lucky_menu: string | null;
}

function fail(message: string): never {
  throw new Error(`[mezamashi-parser] ${message}`);
}

function plain(value: unknown): string {
  if (typeof value !== "string") return "";
  const $ = cheerio.load(value.replace(/<br\s*\/?\s*>/gi, "\n"));
  $("script, style").remove();
  return $.root().text().split("\n").map(line => line.trim()).filter(Boolean).join("\n");
}

function required(value: unknown, label: string): string {
  return plain(value) || fail(`Missing ${label}`);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Expected object");
  return value as Record<string, unknown>;
}

function parseDate(value: unknown): string {
  if (typeof value !== "string") fail("Missing date");
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) fail("Invalid date format");
  const [, year, month, day] = match;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail("Invalid calendar date");
  return date;
}

/** 공식 JSON을 검증한다. 12개 별자리/순위가 완전하지 않으면 저장하지 않는다. */
export function parse(input: unknown): { date: string; entries: MezamashiEntry[] } {
  const data = record(input);
  const date = parseDate(data.date);
  if (!Array.isArray(data.ranking) || data.ranking.length !== 12) fail("Expected 12 rankings");
  const entries = data.ranking.map(value => {
    const row = record(value);
    const name = required(row.name, "name");
    if (!Object.prototype.hasOwnProperty.call(SIGNS, name)) fail(`Unknown zodiac: ${name}`);
    if (typeof row.rank !== "number" || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > 12) fail("Invalid rank");
    return {
      date, zodiac_sign: SIGNS[name as keyof typeof SIGNS], zodiac_name: name, rank: row.rank,
      advice: required(row.text, "text"),
      lucky_point: required(row.point, "point"), lucky_color: required(row.color, "color"),
      extra_advice: plain(row.advice) || null,
      lucky_person: plain(row.person) || null, lucky_menu: plain(row.menu) || null,
    };
  });
  if (new Set(entries.map(e => e.zodiac_sign)).size !== 12) fail("Duplicate zodiac");
  if (new Set(entries.map(e => e.rank)).size !== 12) fail("Duplicate rank");
  return { date, entries: entries.sort((a, b) => a.rank - b.rank) };
}

/** 브라우저에서 저장한 HTML 검사용. 연도가 없으므로 기준 연도를 명시한다. */
export function parseHtml(html: string, referenceYear: number): ReturnType<typeof parse> {
  if (!Number.isInteger(referenceYear) || referenceYear < 1000 || referenceYear > 9999) fail("Invalid reference year");
  const $ = cheerio.load(html);
  const match = $("#uranai .date").first().text().match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) fail("Missing HTML date");
  const ranking = $("#uranai .uranaiList > li").toArray().map(el => {
    const box = $(el);
    const fields = new Map<string, string>();
    for (const line of plain(box.find(".point").html()).split("\n")) {
      const separator = line.search(/[：:]/);
      if (separator >= 0) fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
    return {
      name: box.find(".name").text(), rank: Number(box.find(".rank").text().replace(/位/g, "").trim()),
      text: box.find(".text").html(), point: fields.get("ラッキーポイント"), color: fields.get("ラッキーカラー"),
      advice: fields.get("アドバイス") ?? fields.get("おまじない"), person: fields.get("ラッキーパーソン"), menu: fields.get("ラッキーメニュー"),
    };
  });
  return parse({ date: `${referenceYear}/${match[1]}/${match[2]}`, ranking });
}
