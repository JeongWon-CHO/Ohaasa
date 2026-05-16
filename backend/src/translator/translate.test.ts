import { describe, it, expect } from "vitest";
import { containsJapanese } from "./translate";

describe("containsJapanese()", () => {
  // ----------------------------------------------------------
  // CJK 한자
  // ----------------------------------------------------------
  describe("CJK 한자", () => {
    it("한자 '妥協'만 있으면 true를 반환한다", () => {
      expect(containsJapanese("妥協")).toBe(true);
    });

    it("한국어 문장에 한자 '妥協'가 포함되면 true를 반환한다", () => {
      expect(containsJapanese("어느 정도에서妥協하는 것이 현명한 선택입니다.")).toBe(true);
    });

    it("다른 CJK 한자도 감지한다", () => {
      expect(containsJapanese("仕事運が上昇中です。")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 히라가나
  // ----------------------------------------------------------
  describe("히라가나", () => {
    it("히라가나만 있으면 true를 반환한다", () => {
      expect(containsJapanese("ひらがな")).toBe(true);
    });

    it("한국어에 히라가나가 섞이면 true를 반환한다", () => {
      expect(containsJapanese("오늘은 운세가 よい하루입니다.")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 가타카나
  // ----------------------------------------------------------
  describe("가타카나", () => {
    it("가타카나만 있으면 true를 반환한다", () => {
      expect(containsJapanese("カタカナ")).toBe(true);
    });

    it("한국어에 가타카나가 섞이면 true를 반환한다", () => {
      expect(containsJapanese("한국어 カタカナ 혼재")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 정상 (false 기대)
  // ----------------------------------------------------------
  describe("정상 결과 (false)", () => {
    it("한자 없이 '타협'만 있으면 false를 반환한다", () => {
      expect(containsJapanese("타협")).toBe(false);
    });

    it("한자를 한글로 교체한 문장은 false를 반환한다", () => {
      expect(containsJapanese("어느 정도에서 타협하는 것이 현명한 선택입니다.")).toBe(false);
    });

    it("순수 한국어 문장은 false를 반환한다", () => {
      expect(containsJapanese("오늘은 재물운이 상승하는 날입니다. 적극적으로 도전해보세요.")).toBe(false);
    });

    it("영어만 있으면 false를 반환한다", () => {
      expect(containsJapanese("Lucky! So Good!")).toBe(false);
    });

    it("빈 문자열은 false를 반환한다", () => {
      expect(containsJapanese("")).toBe(false);
    });
  });
});
