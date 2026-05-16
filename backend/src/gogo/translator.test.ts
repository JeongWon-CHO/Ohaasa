import { describe, it, expect, beforeEach, vi } from "vitest";

import type { GogoEntry } from "./parser";

// ============================================================
// Fixture helper
// ============================================================

function makeEntry(
  zodiac_sign: string,
  lucky_color: string,
  lucky_item: string,
): GogoEntry {
  return { zodiac_sign, rank: 1, advice: "", lucky_color, lucky_item, money_score: 3, love_score: 3, work_score: 3, health_score: 3 };
}

// ============================================================
// Helpers
// ============================================================

const ALL_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

// ============================================================
// Tests (OPENAI_API_KEY 없는 환경 기준)
// vi.resetModules()로 모듈 캐시를 초기화해 _client 상태를 리셋한다.
// ============================================================

describe("translateGogoEntries() — no OPENAI_API_KEY", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
  });

  // ----------------------------------------------------------
  // 1. COLOR_MAP 매핑 동작
  // ----------------------------------------------------------
  describe("COLOR_MAP", () => {
    it("매핑된 색상은 API key 없이도 한국어를 반환한다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const result = await translateGogoEntries([makeEntry("aries", "ゴールド", "コスメ")]);
      expect(result.get("aries")?.lucky_color_ko).toBe("금색");
    });

    it("매핑에 없는 색상은 null을 반환한다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const result = await translateGogoEntries([makeEntry("aries", "マゼンタ", "コスメ")]);
      expect(result.get("aries")?.lucky_color_ko).toBeNull();
    });

    it("알려진 색상 매핑이 모두 올바르다", async () => {
      const { translateGogoEntries } = await import("./translator");

      const cases: Array<[string, string]> = [
        // 한자
        ["赤", "빨간색"],   ["青", "파란색"],    ["黄色", "노란색"],
        ["緑", "초록색"],   ["白", "흰색"],       ["黒", "검은색"],
        ["紫", "보라색"],   ["茶色", "갈색"],     ["水色", "하늘색"],
        ["灰色", "회색"],   ["橙色", "주황색"],
        // 카타카나
        ["ゴールド", "금색"],     ["シルバー", "은색"],   ["グレー", "회색"],
        ["ピンク", "분홍색"],     ["ネイビー", "남색"],   ["ベージュ", "베이지색"],
        ["ラベンダー", "연보라색"], ["オレンジ色", "주황색"], ["ブルー", "파란색"],
        ["イエロー", "노란색"],   ["ホワイト", "흰색"],   ["ブラック", "검은색"],
        ["グリーン", "초록색"],   ["レッド", "빨간색"],   ["パープル", "보라색"],
      ];

      for (const [ja, ko] of cases) {
        const result = await translateGogoEntries([makeEntry("aries", ja, "dummy")]);
        expect(result.get("aries")?.lucky_color_ko, `${ja} → ${ko}`).toBe(ko);
      }
    });

    it("샘플 HTML의 12개 색상이 모두 매핑된다", async () => {
      const { translateGogoEntries } = await import("./translator");

      const sampleColors: Array<[string, string]> = [
        ["ゴールド", "금색"],   // aries
        ["グレー",   "회색"],   // taurus
        ["黒",       "검은색"], // gemini
        ["紫",       "보라색"], // cancer
        ["ネイビー", "남색"],   // leo
        ["水色",     "하늘색"], // virgo
        ["オレンジ色","주황색"],// libra
        ["青",       "파란색"], // scorpio
        ["黄色",     "노란색"], // sagittarius
        ["赤",       "빨간색"], // capricorn
        ["シルバー", "은색"],   // aquarius
        ["茶色",     "갈색"],   // pisces
      ];

      for (const [ja, ko] of sampleColors) {
        const result = await translateGogoEntries([makeEntry("aries", ja, "dummy")]);
        expect(result.get("aries")?.lucky_color_ko, `sample color ${ja}`).toBe(ko);
      }
    });
  });

  // ----------------------------------------------------------
  // 2. 아이템 번역 (API key 없음 → null)
  // ----------------------------------------------------------
  describe("lucky_item_ko without API key", () => {
    it("API key 없으면 lucky_item_ko는 null이다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const result = await translateGogoEntries([makeEntry("aries", "ゴールド", "コスメ")]);
      expect(result.get("aries")?.lucky_item_ko).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // 3. 결과 구조
  // ----------------------------------------------------------
  describe("result structure", () => {
    it("입력과 동일한 수의 entry를 반환한다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const entries = ALL_SIGNS.map((s) => makeEntry(s, "ゴールド", "コスメ"));
      const result = await translateGogoEntries(entries);
      expect(result.size).toBe(12);
    });

    it("12개 zodiac_sign이 모두 Map에 포함된다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const entries = ALL_SIGNS.map((s) => makeEntry(s, "ゴールド", "コスメ"));
      const result = await translateGogoEntries(entries);
      for (const sign of ALL_SIGNS) {
        expect(result.has(sign), `${sign} should be in result`).toBe(true);
      }
    });

    it("각 entry에 zodiac_sign, lucky_color_ko, lucky_item_ko 필드가 있다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const result = await translateGogoEntries([makeEntry("aries", "ゴールド", "コスメ")]);
      const entry = result.get("aries");
      expect(entry).toHaveProperty("zodiac_sign");
      expect(entry).toHaveProperty("lucky_color_ko");
      expect(entry).toHaveProperty("lucky_item_ko");
    });
  });

  // ----------------------------------------------------------
  // 4. 중복 값 처리
  // ----------------------------------------------------------
  describe("deduplication", () => {
    it("같은 색상을 가진 여러 entry가 동일한 한국어 값을 갖는다", async () => {
      const { translateGogoEntries } = await import("./translator");
      const entries = [
        makeEntry("aries",  "ゴールド", "コスメ"),
        makeEntry("taurus", "ゴールド", "写真"),
        makeEntry("gemini", "ゴールド", "手帳"),
      ];
      const result = await translateGogoEntries(entries);
      expect(result.get("aries")?.lucky_color_ko).toBe("금색");
      expect(result.get("taurus")?.lucky_color_ko).toBe("금색");
      expect(result.get("gemini")?.lucky_color_ko).toBe("금색");
    });
  });
});
