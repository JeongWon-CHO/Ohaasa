import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// ============================================================
// Types
// ============================================================

export interface GogoEntry {
  zodiac_sign:   string;
  lucky_color:   string;
  lucky_item:    string;
  money_score:   number; // 1-5
  love_score:    number; // 1-5
  work_score:    number; // 1-5
  health_score:  number; // 1-5
}

export interface GogoParseResult {
  date: string;          // "YYYY-MM-DD" (현재 연도 기준)
  entries: GogoEntry[];  // 12개
}

// ============================================================
// Zodiac mapping: gogo HTML id → English zodiac_sign
// ============================================================

const GOGO_ID_MAP: Record<string, string> = {
  ohitsuji: "aries",
  ousi:     "taurus",
  futago:   "gemini",
  kani:     "cancer",
  sisi:     "leo",
  otome:    "virgo",
  tenbin:   "libra",
  sasori:   "scorpio",
  ite:      "sagittarius",
  yagi:     "capricorn",
  mizugame: "aquarius",
  uo:       "pisces",
};

// ============================================================
// Internal helpers
// ============================================================

/**
 * .rank-area .ttl-area 텍스트 ("5月15日（Fri）の占い") 에서
 * YYYY-MM-DD 형식의 날짜 문자열을 반환한다.
 * 연도는 referenceYear (기본값: 현재 연도)를 사용한다.
 */
function parsePageDate($: cheerio.CheerioAPI, referenceYear: number): string {
  const text = $(".rank-area .ttl-area").first().text();
  const m = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (!m) {
    throw new Error(`[gogo-parser] Cannot parse date from ttl-area: "${text.trim()}"`);
  }
  const month = m[1].padStart(2, "0");
  const day   = m[2].padStart(2, "0");
  return `${referenceYear}-${month}-${day}`;
}

/**
 * .read-area 의 innerHTML 에서 span.{cls} 바로 뒤의 텍스트를 추출한다.
 * HTML 형식: <span class="{cls}">…</span>：value
 */
function extractSpanSuffix(html: string, cls: string, label: string): string {
  // 풀와이드 콜론(：U+FF1A) 또는 ASCII 콜론(:) 모두 허용
  const re = new RegExp(`class="${cls}"[^>]*>[^<]*<\\/span>\\s*[：:]\\s*([^<\\n\\r]+)`);
  const value = html.match(re)?.[1]?.trim();
  if (!value) {
    throw new Error(`[gogo-parser] Cannot extract ${label} (class="${cls}")`);
  }
  return value;
}

/**
 * .number-one-box 내 특정 카테고리의 아이콘 개수(1-5)를 반환한다.
 * 개수가 범위를 벗어나면 에러를 던진다.
 */
function countIcons(
  box: cheerio.Cheerio<AnyNode>,
  category: string,
  gogoId: string,
): number {
  const n = box.find(`.lucky-${category} .lucky-box img.icon-${category}`).length;
  if (n < 1 || n > 5) {
    throw new Error(
      `[gogo-parser] Invalid ${category} score for #${gogoId}: ${n} (expected 1-5)`
    );
  }
  return n;
}

// ============================================================
// Main export
// ============================================================

/**
 * 고고별자리 운세 페이지 HTML을 파싱해 12개 별자리의 운세 데이터를 반환한다.
 *
 * @param html            고고별자리 페이지 HTML 문자열
 * @param referenceYear   날짜 연도 (기본값: 현재 연도). 테스트에서 고정값 전달 가능.
 *
 * @throws 필수 요소가 없거나 스코어 범위를 벗어나면 에러를 던진다.
 */
export function parse(html: string, referenceYear = new Date().getFullYear()): GogoParseResult {
  const $ = cheerio.load(html);

  const date = parsePageDate($, referenceYear);
  const entries: GogoEntry[] = [];

  for (const [gogoId, zodiacSign] of Object.entries(GOGO_ID_MAP)) {
    const seizaBox = $(`#${gogoId}`);
    if (!seizaBox.length) {
      throw new Error(`[gogo-parser] Missing seiza-box: #${gogoId}`);
    }

    const readAreaHtml = seizaBox.find(".read-area").html();
    if (!readAreaHtml) {
      throw new Error(`[gogo-parser] Missing .read-area in #${gogoId}`);
    }

    const lucky_color = extractSpanSuffix(readAreaHtml, "lucky-color-txt", "lucky_color");
    const lucky_item  = extractSpanSuffix(readAreaHtml, "key-txt", "lucky_item");

    const box = seizaBox.find(".number-one-box");
    if (!box.length) {
      throw new Error(`[gogo-parser] Missing .number-one-box in #${gogoId}`);
    }

    entries.push({
      zodiac_sign:  zodiacSign,
      lucky_color,
      lucky_item,
      money_score:  countIcons(box, "money",  gogoId),
      love_score:   countIcons(box, "love",   gogoId),
      work_score:   countIcons(box, "work",   gogoId),
      health_score: countIcons(box, "health", gogoId),
    });
  }

  if (entries.length !== 12) {
    throw new Error(`[gogo-parser] Expected 12 entries, got ${entries.length}`);
  }

  return { date, entries };
}
