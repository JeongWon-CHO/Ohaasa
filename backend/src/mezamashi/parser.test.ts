import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, parseHtml } from "./parser";

const html = readFileSync(resolve(__dirname, "fixtures/2026-10-26.html"), "utf8");

export function sampleJson() {
  const { entries } = parseHtml(html, 2026);
  return { date: "2026/10/26", ranking: entries.map(entry => ({
    name: entry.zodiac_name, rank: entry.rank, text: entry.advice.replace(/\n/g, "<br>"),
    point: entry.lucky_point, color: entry.lucky_color, advice: entry.extra_advice ?? "",
    person: entry.lucky_person ?? "", menu: entry.lucky_menu ?? "",
  })) };
}

describe("mezamashi parser", () => {
  it("저장한 HTML에서 12개 순위와 추가 항목을 추출한다", () => {
    const result = parseHtml(html, 2026);
    expect(result.date).toBe("2026-10-26");
    expect(result.entries).toHaveLength(12);
    expect(result.entries[0]).toMatchObject({
      zodiac_sign: "sagittarius", rank: 1,
      advice: "個性や能力が輝く絶好調な一日に。\n何事も積極的にチャレンジしよう。",
      extra_advice: "エンタメの話をする", lucky_point: "バニラの香水", lucky_person: "体を鍛えている人",
    });
    expect(result.entries[2]).toMatchObject({ zodiac_sign: "aries", lucky_point: "天窓がある場所", extra_advice: null });
    expect(result.entries[11]).toMatchObject({ zodiac_sign: "virgo", extra_advice: "人にお茶を入れる", lucky_menu: "なすの味噌炒め" });
  });

  it("JSON을 같은 내부 형식으로 정규화한다", () => {
    expect(parse(sampleJson())).toEqual(parseHtml(html, 2026));
  });

  it.each(["2026/02/30", "2026/13/01", "26/10/26", "", null])("잘못된 날짜 %s를 거절한다", date => {
    expect(() => parse({ ...sampleJson(), date })).toThrow();
  });

  it("연말 날짜도 JSON 연도를 그대로 사용한다", () => {
    expect(parse({ ...sampleJson(), date: "2025/12/31" }).date).toBe("2025-12-31");
  });

  it.each(["rank", "zodiac", "text", "point", "color", "count"])("손상된 %s는 저장 대상에서 제외한다", kind => {
    const input = sampleJson();
    if (kind === "rank") input.ranking[1].rank = 1;
    if (kind === "zodiac") input.ranking[1].name = input.ranking[0].name;
    if (kind === "count") input.ranking.pop();
    if (kind === "text") input.ranking[0].text = "";
    if (kind === "point") input.ranking[0].point = "";
    if (kind === "color") input.ranking[0].color = "";
    expect(() => parse(input)).toThrow();
  });

  it("알 수 없는 별자리와 범위 밖 순위를 거절한다", () => {
    const input = sampleJson();
    input.ranking[0].name = "不明座";
    expect(() => parse(input)).toThrow("Unknown zodiac");
    input.ranking[0].name = "いて座";
    input.ranking[0].rank = 13;
    expect(() => parse(input)).toThrow("Invalid rank");
  });
});
