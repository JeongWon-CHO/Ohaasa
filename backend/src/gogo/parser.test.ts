import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parse } from "./parser";
import type { GogoEntry } from "./parser";

// gogo_sample.html — 프로젝트 루트에서 한 수준 위 backend/ 기준:
// backend/src/gogo/parser.test.ts → ../../../ = ohaasa/
const FIXTURE_HTML = readFileSync(
  resolve(__dirname, "../../../gogo_sample.html"),
  "utf-8"
);

// 2026-05-15 샘플 기반으로 HTML을 직접 확인해 작성한 기대값
const SAMPLE_EXPECTED: Record<string, Partial<GogoEntry>> = {
  aries:  { lucky_color: "ゴールド",  lucky_item: "コスメ",       money_score: 4, love_score: 2, work_score: 4, health_score: 3 },
  taurus: { lucky_color: "グレー",    lucky_item: "写真",          money_score: 5, love_score: 4, work_score: 3, health_score: 4 },
  gemini: { lucky_color: "黒",        lucky_item: "アイピロー",    money_score: 5, love_score: 5, work_score: 5, health_score: 4 },
  cancer: { lucky_color: "紫",        lucky_item: "デパ地下",      money_score: 2, love_score: 1, work_score: 3, health_score: 2 },
};

function bySign(entries: GogoEntry[], sign: string): GogoEntry {
  const found = entries.find((e) => e.zodiac_sign === sign);
  if (!found) throw new Error(`zodiac_sign "${sign}" not found`);
  return found;
}

// ============================================================
// Tests
// ============================================================

describe("gogo parse()", () => {

  // ----------------------------------------------------------
  // 1. 결과 구조
  // ----------------------------------------------------------
  describe("result structure", () => {
    it("date를 YYYY-MM-DD 형식으로 반환한다", () => {
      const { date } = parse(FIXTURE_HTML, 2026);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("샘플의 날짜는 2026-05-15다", () => {
      const { date } = parse(FIXTURE_HTML, 2026);
      expect(date).toBe("2026-05-15");
    });

    it("12개 GogoEntry를 반환한다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      expect(entries).toHaveLength(12);
    });

    it("각 entry에 7개 필드가 모두 있다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      for (const e of entries) {
        expect(e).toHaveProperty("zodiac_sign");
        expect(e).toHaveProperty("lucky_color");
        expect(e).toHaveProperty("lucky_item");
        expect(e).toHaveProperty("money_score");
        expect(e).toHaveProperty("love_score");
        expect(e).toHaveProperty("work_score");
        expect(e).toHaveProperty("health_score");
      }
    });
  });

  // ----------------------------------------------------------
  // 2. 별자리 커버리지
  // ----------------------------------------------------------
  describe("zodiac coverage", () => {
    it("12개 별자리 sign이 모두 포함된다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      const signs = entries.map((e) => e.zodiac_sign).sort();
      expect(signs).toEqual([
        "aquarius", "aries", "cancer", "capricorn", "gemini",
        "leo", "libra", "pisces", "sagittarius", "scorpio", "taurus", "virgo",
      ]);
    });

    it("모든 zodiac_sign이 고유하다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      expect(new Set(entries.map((e) => e.zodiac_sign)).size).toBe(12);
    });
  });

  // ----------------------------------------------------------
  // 3. 스코어 범위
  // ----------------------------------------------------------
  describe("score ranges", () => {
    it("모든 score가 1-5 범위 내에 있다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      for (const e of entries) {
        expect(e.money_score,  `${e.zodiac_sign}.money_score`).toBeGreaterThanOrEqual(1);
        expect(e.money_score,  `${e.zodiac_sign}.money_score`).toBeLessThanOrEqual(5);
        expect(e.love_score,   `${e.zodiac_sign}.love_score`).toBeGreaterThanOrEqual(1);
        expect(e.love_score,   `${e.zodiac_sign}.love_score`).toBeLessThanOrEqual(5);
        expect(e.work_score,   `${e.zodiac_sign}.work_score`).toBeGreaterThanOrEqual(1);
        expect(e.work_score,   `${e.zodiac_sign}.work_score`).toBeLessThanOrEqual(5);
        expect(e.health_score, `${e.zodiac_sign}.health_score`).toBeGreaterThanOrEqual(1);
        expect(e.health_score, `${e.zodiac_sign}.health_score`).toBeLessThanOrEqual(5);
      }
    });

    it("lucky_color와 lucky_item이 비어있지 않다", () => {
      const { entries } = parse(FIXTURE_HTML, 2026);
      for (const e of entries) {
        expect(e.lucky_color, `${e.zodiac_sign}.lucky_color`).toBeTruthy();
        expect(e.lucky_item,  `${e.zodiac_sign}.lucky_item`).toBeTruthy();
      }
    });
  });

  // ----------------------------------------------------------
  // 4. 샘플 데이터 검증 (HTML에서 직접 확인한 값)
  // ----------------------------------------------------------
  describe("sample data assertions", () => {
    for (const [sign, expected] of Object.entries(SAMPLE_EXPECTED)) {
      it(`${sign}: lucky_color="${expected.lucky_color}", lucky_item="${expected.lucky_item}"`, () => {
        const { entries } = parse(FIXTURE_HTML, 2026);
        const e = bySign(entries, sign);
        expect(e.lucky_color).toBe(expected.lucky_color);
        expect(e.lucky_item).toBe(expected.lucky_item);
      });

      it(`${sign}: money_score=${expected.money_score}, love_score=${expected.love_score}, work_score=${expected.work_score}, health_score=${expected.health_score}`, () => {
        const { entries } = parse(FIXTURE_HTML, 2026);
        const e = bySign(entries, sign);
        expect(e.money_score).toBe(expected.money_score);
        expect(e.love_score).toBe(expected.love_score);
        expect(e.work_score).toBe(expected.work_score);
        expect(e.health_score).toBe(expected.health_score);
      });
    }
  });

  // ----------------------------------------------------------
  // 5. 날짜 파싱 - referenceYear 파라미터
  // ----------------------------------------------------------
  describe("date referenceYear", () => {
    it("referenceYear를 전달하면 해당 연도가 사용된다", () => {
      const { date } = parse(FIXTURE_HTML, 2025);
      expect(date).toBe("2025-05-15");
    });

    it("referenceYear가 없으면 현재 연도가 사용된다", () => {
      const { date } = parse(FIXTURE_HTML);
      expect(date).toMatch(/^\d{4}-05-15$/);
    });
  });

  // ----------------------------------------------------------
  // 6. 잘못된 HTML 에러 처리
  // ----------------------------------------------------------
  describe("invalid HTML errors", () => {
    it("ttl-area 날짜가 없으면 에러를 던진다", () => {
      const badHtml = FIXTURE_HTML.replace(/\d{1,2}月\d{1,2}日/, "");
      expect(() => parse(badHtml, 2026)).toThrow("[gogo-parser]");
    });

    it("#ohitsuji 요소가 없으면 에러를 던진다", () => {
      const badHtml = FIXTURE_HTML.replace(/id="ohitsuji"/, 'id="ohitsuji-removed"');
      expect(() => parse(badHtml, 2026)).toThrow("[gogo-parser]");
    });
  });
});
