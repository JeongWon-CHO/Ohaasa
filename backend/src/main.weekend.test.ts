import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { crawlAndSave } from "./main";
import { fetchHtml } from "./gogo/fetcher";
import { parse as parseGogo } from "./gogo/parser";
import { fetchHtml as fetchCat, parse as parseCat } from "./gogo/todays-cat";
import { collectAndSave } from "./mezamashi/pipeline";
import { fetchJson } from "./mezamashi/fetcher";
import { parse as parseMezamashi } from "./mezamashi/parser";

vi.mock("./gogo/fetcher", () => ({ fetchHtml: vi.fn() }));
vi.mock("./gogo/todays-cat", () => ({
  fetchHtml: vi.fn(async () => {
    throw new Error("fallback offline");
  }),
  parse: vi.fn(),
}));
vi.mock("./gogo/parser", () => ({ parse: vi.fn() }));
vi.mock("./gogo/translator", () => ({
  translateGogoEntries: vi.fn(async () => new Map()),
}));
vi.mock("./mezamashi/fetcher", () => ({ fetchJson: vi.fn() }));
vi.mock("./mezamashi/parser", () => ({ parse: vi.fn() }));
vi.mock("./mezamashi/pipeline", () => ({ collectAndSave: vi.fn() }));
vi.mock("./translator/translate", () => ({
  translateAdvice: vi.fn(async () => "번역"),
  containsJapanese: () => false,
  translateOhaasaLuckyItem: vi.fn(),
}));

const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const entries = signs.map((sign, i) => ({
  zodiac_sign: sign,
  rank: i + 1,
  advice: "本文",
  lucky_color: "青",
  lucky_item: "本",
  money_score: 3,
  love_score: 3,
  work_score: 3,
  health_score: 3,
}));
const upsert = vi.fn(async () => ({ error: null }));
const query = {
  eq: () => query,
  then: (resolve: (value: unknown) => unknown) =>
    resolve({ data: [], error: null }),
};
const from = vi.fn(() => ({ select: () => query, upsert }));
const db = { from } as unknown as Parameters<typeof crawlAndSave>[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
  vi.mocked(fetchHtml).mockResolvedValue("<html>");
  vi.mocked(parseGogo).mockReturnValue({ date: "2026-10-24", entries });
  vi.mocked(collectAndSave).mockResolvedValue({
    status: "saved",
    date: "2026-10-24",
    count: 12,
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("주말 수집 대체 흐름", () => {
  it("공식 실패 후 Today's Cat이 정상이면 고고로 저장하고 메자마시를 호출하지 않는다", async () => {
    vi.mocked(fetchHtml).mockRejectedValueOnce(new Error("official offline"));
    vi.mocked(fetchCat).mockResolvedValueOnce("cat HTML");
    vi.mocked(parseCat).mockReturnValueOnce({ date: "2026-10-24", entries });
    expect(await crawlAndSave(db, false, false)).toBe(true);
    expect(collectAndSave).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ source: "gogo" })]),
      { onConflict: "date,zodiac_sign" },
    );
  });
  it("고고 정상 시 기존 테이블에 저장하고 메자마시를 호출하지 않는다", async () => {
    expect(await crawlAndSave(db, false, false)).toBe(true);
    expect(collectAndSave).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ source: "gogo" })]),
      { onConflict: "date,zodiac_sign" },
    );
  });
  it("고고 네트워크 실패 시 메자마시 전용 수집을 실행한다", async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    expect(await crawlAndSave(db, false, false)).toBe(true);
    expect(collectAndSave).toHaveBeenCalledWith(db, "2026-10-24");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("고고 날짜가 지나면 force로도 오늘 운세로 재사용하지 않는다", async () => {
    vi.mocked(parseGogo).mockReturnValue({ date: "2026-10-23", entries });
    expect(await crawlAndSave(db, false, true)).toBe(true);
    expect(collectAndSave).toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
  it("고고 순위 중복도 대체 대상으로 취급한다", async () => {
    vi.mocked(parseGogo).mockReturnValue({
      date: "2026-10-24",
      entries: entries.map((e) => ({ ...e, rank: 1 })),
    });
    expect(await crawlAndSave(db, false, false)).toBe(true);
    expect(collectAndSave).toHaveBeenCalled();
  });
  it("두 소스 모두 당일 데이터가 없으면 성공으로 보고하지 않는다", async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    vi.mocked(collectAndSave).mockResolvedValue({
      status: "stale",
      date: "2026-10-23",
      count: 0,
    });
    expect(await crawlAndSave(db, false, false)).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
  it("메자마시도 실패하면 알림 준비를 진행하지 않는다", async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    vi.mocked(collectAndSave).mockRejectedValue(new Error("offline"));
    expect(await crawlAndSave(db, false, false)).toBe(false);
  });
  it("dry-run 대체는 검증만 하고 DB 저장·번역을 호출하지 않는다", async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    vi.mocked(fetchJson).mockResolvedValue({});
    vi.mocked(parseMezamashi).mockReturnValue({
      date: "2026-10-24",
      entries: [],
    });
    expect(await crawlAndSave(db, true, false)).toBe(true);
    expect(from).not.toHaveBeenCalled();
    expect(collectAndSave).not.toHaveBeenCalled();
  });
});
