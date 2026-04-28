import { describe, it, expect, vi } from "vitest";
import { parse } from "./parser";
import type { HoroscopeEntry } from "./parser";
import type { HoroscopeApiResponse } from "./fetcher";
import sampleData from "./sample.json";

// ============================================================
// Helpers
// ============================================================

function bySign(entries: HoroscopeEntry[], sign: string): HoroscopeEntry {
  const found = entries.find((e) => e.zodiac_sign === sign);
  if (!found) throw new Error(`zodiac_sign "${sign}" not found`);
  return found;
}

/** sample.json을 기반으로 특정 필드를 변경한 복사본을 반환 */
function makeData(override: Partial<HoroscopeApiResponse> = {}): HoroscopeApiResponse {
  return { ...(sampleData as HoroscopeApiResponse), ...override };
}

/** detail 배열의 특정 인덱스 항목을 변경한 복사본을 반환 */
function withDetail(
  idx: number,
  patch: Partial<HoroscopeApiResponse["detail"][number]>
): HoroscopeApiResponse {
  const detail = sampleData.detail.map((d, i) =>
    i === idx ? { ...d, ...patch } : { ...d }
  );
  return makeData({ detail });
}

// ============================================================
// Tests
// ============================================================

describe("parse()", () => {
  // ----------------------------------------------------------
  // 1. 기본 결과 구조
  // ----------------------------------------------------------
  describe("result structure", () => {
    it("sample.json에서 12개 엔트리를 반환한다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      expect(entries).toHaveLength(12);
    });

    it("각 엔트리에 date, zodiac_sign, zodiac_name, rank, advice 필드가 있다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      for (const e of entries) {
        expect(e).toHaveProperty("date");
        expect(e).toHaveProperty("zodiac_sign");
        expect(e).toHaveProperty("zodiac_name");
        expect(e).toHaveProperty("rank");
        expect(e).toHaveProperty("advice");
      }
    });

    it("모든 필드가 비어있지 않다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      for (const e of entries) {
        expect(e.date).toBeTruthy();
        expect(e.zodiac_sign).toBeTruthy();
        expect(e.zodiac_name).toBeTruthy();
        expect(e.rank).toBeGreaterThan(0);
        expect(e.advice).toBeTruthy();
      }
    });
  });

  // ----------------------------------------------------------
  // 2. 날짜 변환
  // ----------------------------------------------------------
  describe("date parsing", () => {
    it("onair_date '20260428' → '2026-04-28'", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      expect(entries[0].date).toBe("2026-04-28");
    });

    it("모든 엔트리의 date가 동일하다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const dates = new Set(entries.map((e) => e.date));
      expect(dates.size).toBe(1);
    });

    it("단자리 월/일 날짜도 정확히 변환한다", () => {
      const entries = parse(makeData({ onair_date: "20260101" }));
      expect(entries[0].date).toBe("2026-01-01");
    });
  });

  // ----------------------------------------------------------
  // 3. rank 변환
  // ----------------------------------------------------------
  describe("rank parsing", () => {
    it("1~12 순위가 모두 존재한다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const ranks = entries.map((e) => e.rank).sort((a, b) => a - b);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it("모든 rank가 고유하다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const ranks = entries.map((e) => e.rank);
      expect(new Set(ranks).size).toBe(12);
    });

    it("ranking_no '1'이 rank 1로 변환된다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const rank1 = entries.find((e) => e.rank === 1);
      expect(rank1).toBeDefined();
      expect(rank1?.zodiac_sign).toBe("pisces"); // horoscope_st "12"
    });
  });

  // ----------------------------------------------------------
  // 4. horoscope_st → zodiac_sign / zodiac_name 매핑
  // ----------------------------------------------------------
  describe("zodiac mapping", () => {
    it("horoscope_st 01~12가 올바른 zodiac_sign에 매핑된다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);

      const expectedBySign: Record<string, string> = {
        aries: "01", taurus: "02", gemini: "03", cancer: "04",
        leo: "05", virgo: "06", libra: "07", scorpio: "08",
        sagittarius: "09", capricorn: "10", aquarius: "11", pisces: "12",
      };

      // sample.json의 horoscope_st 값과 매핑된 zodiac_sign 일치 검증
      for (const detail of sampleData.detail) {
        const entry = entries.find((e) =>
          e.rank === Number(detail.ranking_no)
        );
        expect(entry).toBeDefined();
        const expectedSign = Object.entries(expectedBySign).find(
          ([, st]) => st === detail.horoscope_st
        )?.[0];
        expect(entry?.zodiac_sign).toBe(expectedSign);
      }
    });

    it("12개 zodiac_sign이 모두 고유하다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const signs = entries.map((e) => e.zodiac_sign);
      expect(new Set(signs).size).toBe(12);
    });

    it("zodiac_name이 일본어로 올바르게 설정된다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const mapping: Array<[string, string]> = [
        ["aries", "おひつじ座"],
        ["taurus", "おうし座"],
        ["gemini", "ふたご座"],
        ["cancer", "かに座"],
        ["leo", "しし座"],
        ["virgo", "おとめ座"],
        ["libra", "てんびん座"],
        ["scorpio", "さそり座"],
        ["sagittarius", "いて座"],
        ["capricorn", "やぎ座"],
        ["aquarius", "みずがめ座"],
        ["pisces", "うお座"],
      ];
      for (const [sign, name] of mapping) {
        expect(bySign(entries, sign).zodiac_name).toBe(name);
      }
    });
  });

  // ----------------------------------------------------------
  // 5. advice 정규화
  // ----------------------------------------------------------
  describe("advice normalization", () => {
    it("탭 문자(\\t)가 줄바꿈(\\n)으로 변환된다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      for (const e of entries) {
        expect(e.advice).not.toContain("\t");
      }
    });

    it("앞뒤 공백이 제거된다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      for (const e of entries) {
        expect(e.advice).toBe(e.advice.trim());
      }
    });

    it("trailing 탭으로 생기는 빈 줄이 없다", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      for (const e of entries) {
        const lines = e.advice.split("\n");
        expect(lines.every((l) => l.trim().length > 0)).toBe(true);
      }
    });

    it("3문장 advice는 \\n으로 구분된다 (pisces, rank 1)", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const pisces = bySign(entries, "pisces");
      const lines = pisces.advice.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("片想いの恋が進展するかも?");
      expect(lines[1]).toBe("ロマンチックなムードにドキドキ");
      expect(lines[2]).toBe("エレガントな振る舞いを心掛けて");
    });

    it("2문장 advice는 \\n으로 구분된다 (capricorn, rank 2)", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      const cap = bySign(entries, "capricorn");
      const lines = cap.advice.split("\n");
      expect(lines).toHaveLength(2);
    });
  });

  // ----------------------------------------------------------
  // 6. open_st 처리
  // ----------------------------------------------------------
  describe("open_st handling", () => {
    it("open_st が '2'のとき正常に処理する", () => {
      const entries = parse(sampleData as HoroscopeApiResponse);
      expect(entries).toHaveLength(12);
    });

    it("open_st が '2'以外のとき警告ログを出力して処理を継続する", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const entries = parse(makeData({ open_st: "1" }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("open_st"));
      expect(entries).toHaveLength(12);
      warnSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // 7. 검증 에러
  // ----------------------------------------------------------
  describe("validation errors", () => {
    it("detail이 12개 미만이면 에러를 던진다", () => {
      const data = makeData({ detail: sampleData.detail.slice(0, 11) });
      expect(() => parse(data)).toThrow("[parser]");
    });

    it("detail이 12개 초과이면 에러를 던진다", () => {
      const data = makeData({
        detail: [...sampleData.detail, { ...sampleData.detail[0], horoscope_detail_id: "99999" }],
      });
      expect(() => parse(data)).toThrow("[parser]");
    });

    it("onair_date가 8자리 미만이면 에러를 던진다", () => {
      expect(() => parse(makeData({ onair_date: "2026042" }))).toThrow("[parser]");
    });

    it("onair_date가 숫자 외 문자를 포함하면 에러를 던진다", () => {
      expect(() => parse(makeData({ onair_date: "2026-04-28" }))).toThrow("[parser]");
    });

    it("onair_date가 유효하지 않은 날짜이면 에러를 던진다", () => {
      expect(() => parse(makeData({ onair_date: "20261332" }))).toThrow("[parser]");
    });

    it("ranking_no가 범위를 벗어나면 에러를 던진다", () => {
      expect(() => parse(withDetail(0, { ranking_no: "13" }))).toThrow("[parser]");
    });

    it("ranking_no가 '0'이면 에러를 던진다", () => {
      expect(() => parse(withDetail(0, { ranking_no: "0" }))).toThrow("[parser]");
    });

    it("horoscope_st가 알 수 없는 값이면 에러를 던진다", () => {
      expect(() => parse(withDetail(0, { horoscope_st: "13" }))).toThrow("[parser]");
    });

    it("horoscope_text가 빈 문자열이면 에러를 던진다", () => {
      expect(() => parse(withDetail(0, { horoscope_text: "" }))).toThrow("[parser]");
    });

    it("horoscope_text가 탭만 있으면 에러를 던진다", () => {
      expect(() => parse(withDetail(0, { horoscope_text: "\t\t\t" }))).toThrow("[parser]");
    });

    it("rank 중복이 있으면 에러를 던진다", () => {
      const data = withDetail(1, { ranking_no: "1" }); // rank 1이 두 개
      expect(() => parse(data)).toThrow("[parser]");
    });

    it("horoscope_st 중복이 있으면 에러를 던진다", () => {
      const data = withDetail(1, { horoscope_st: "12" }); // pisces 중복
      expect(() => parse(data)).toThrow("[parser]");
    });
  });
});
