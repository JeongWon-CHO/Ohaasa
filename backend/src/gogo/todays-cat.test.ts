import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as cheerio from "cheerio";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHtml, parse } from "./todays-cat";

const fixture = (day: string) =>
  readFileSync(
    resolve(__dirname, `fixtures/todays-cat-2026-10-${day}.html`),
    "utf8",
  );
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Today's Cat 사용자 제공 HTML", () => {
  it.each(["26", "27"])(
    "10월 %s일의 본문 날짜와 별자리 12개를 읽는다",
    (day) => {
      const result = parse(fixture(day));
      expect(result.date).toBe(`2026-10-${day}`);
      expect(result.entries).toHaveLength(12);
      expect(new Set(result.entries.map((row) => row.zodiac_sign)).size).toBe(
        12,
      );
      expect(result.entries.map((row) => row.rank)).toEqual(
        Array.from({ length: 12 }, (_, i) => i + 1),
      );
    },
  );

  it("27일 처녀자리의 본문·아이템·점수를 읽고 광고 이미지는 제외한다", () => {
    const $ = cheerio.load(fixture("27"));
    $(".neko-icons").first().append('<img src="/advertisement.png">');
    expect(parse($.html()).entries[0]).toEqual({
      zodiac_sign: "virgo",
      rank: 1,
      advice:
        "金運が絶好調。投資がうまくいき、一部を還元するとさらなるリターンがありそう。貴重なアイテムもゲットできる日。",
      lucky_color: "緑",
      lucky_item: "目薬",
      money_score: 5,
      love_score: 4,
      work_score: 5,
      health_score: 5,
    });
    expect(parse(fixture("26")).entries[0]).toMatchObject({
      zodiac_sign: "capricorn",
      lucky_color: "黄",
      lucky_item: "求人誌",
      money_score: 5,
      love_score: 5,
      work_score: 5,
      health_score: 5,
    });
  });

  it.each([
    "title",
    "date",
    "count",
    "sign",
    "rank",
    "advice",
    "color",
    "item",
    "score",
  ])("%s 누락·중복·오류를 거부한다", (reason) => {
    const $ = cheerio.load(fixture("27"));
    const cards = $(".neko-wrap");
    if (reason === "title") $(".entry-title-mod").remove();
    if (reason === "date") $(".entry-card-info").text("2026.02.30 05:10更新");
    if (reason === "count") cards.last().remove();
    if (reason === "sign")
      cards
        .eq(1)
        .find(".neko-site-title")
        .text(cards.first().find(".neko-site-title").text());
    if (reason === "rank") cards.eq(1).find(".neko-rank-badge").text("1");
    if (reason === "advice") cards.first().find(".neko-word").empty();
    if (reason === "color")
      cards.first().find(".neko-lucky-item").first().remove();
    if (reason === "item")
      cards.first().find(".neko-lucky-item").last().remove();
    if (reason === "score") cards.first().find(".neko-icons").first().empty();
    expect(() => parse($.html())).toThrow();
  });

  it("업데이트 날짜가 없으면 링크나 기사 날짜로 대체하지 않는다", () => {
    const $ = cheerio.load(fixture("26"));
    $(".entry-card-info").remove();
    expect(() => parse($.html())).toThrow("update date");
  });

  it("날짜 지정 URL, 타임아웃으로 요청한다", async () => {
    const request = vi.fn(
      async (_url: URL, _init: RequestInit) => new Response("html"),
    );
    vi.stubGlobal("fetch", request);
    expect(await fetchHtml("2026-10-26")).toBe("html");
    const [url, init] = request.mock.calls[0];
    expect(url.toString()).toBe(
      "https://todays-cat.net/tv/tv-asahi/?date=2026-10-26",
    );
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("HTTP 실패는 HTML로 취급하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    await expect(fetchHtml("2026-10-27")).rejects.toThrow("HTTP 503");
  });
});
