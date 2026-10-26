import { describe, expect, it } from "vitest";
import { isValidTranslation, translateMezamashiText } from "./translator";

describe("메자마시 짧은 항목 번역 검증", () => {
  it("색상은 운세를 생성하지 않고 고정 번역을 사용한다", async () => {
    expect(
      await translateMezamashiText("グリーン", "mezamashi lucky_color"),
    ).toBe("초록색");
    expect(
      await translateMezamashiText("ブラック", "mezamashi lucky_color"),
    ).toBe("검은색");
    expect(
      isValidTranslation(
        "lucky_color",
        "グリーン",
        "오늘은 자연과의 조화가 중요한 날입니다.",
      ),
    ).toBe(false);
  });

  it("한국어로 된 거절 문구도 번역으로 인정하지 않는다", () => {
    expect(
      isValidTranslation(
        "lucky_point",
        "栗ようかん",
        "죄송하지만, 별자리 운세 문장을 제공해 주세요.",
      ),
    ).toBe(false);
    expect(isValidTranslation("lucky_point", "栗ようかん", "밤 양갱")).toBe(
      true,
    );
    expect(
      isValidTranslation("lucky_menu", "なすの味噌炒め", "가지 된장 볶음"),
    ).toBe(true);
  });
});
