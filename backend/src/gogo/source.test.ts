import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGogo } from "./source";
import { fetchHtml } from "./fetcher";
import { parse } from "./parser";
import { SIGN_NAMES } from "./validation";

vi.mock("./fetcher", () => ({ fetchHtml: vi.fn() }));
vi.mock("./parser", () => ({ parse: vi.fn() }));
const current = {
  date: "2026-11-16",
  entries: Object.keys(SIGN_NAMES).map((zodiac_sign, i) => ({
    zodiac_sign, rank: i + 1, advice: "本文", lucky_color: "青", lucky_item: "本",
    money_score: 3, love_score: 3, work_score: 3, health_score: 3,
  })),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchHtml).mockResolvedValue("official");
  vi.mocked(parse).mockReturnValue(current);
});

describe("고고 공식 사이트 수집", () => {
  it("공식 당일 데이터를 검증해 반환한다", async () => {
    expect(await fetchGogo(current.date)).toEqual(current);
    expect(fetchHtml).toHaveBeenCalledOnce();
    expect(parse).toHaveBeenCalledWith("official", 2026);
  });
  it.each([false, true])("접속 실패를 전파한다 (force=%s)", async (force) => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    await expect(fetchGogo(current.date, { allowStaleOfficial: force })).rejects.toThrow("offline");
    expect(parse).not.toHaveBeenCalled();
  });
  it("파싱 실패를 전파한다", async () => {
    vi.mocked(parse).mockImplementation(() => { throw new Error("bad HTML"); });
    await expect(fetchGogo(current.date)).rejects.toThrow("bad HTML");
  });
  it.each([false, true])("불완전한 데이터는 거부한다 (force=%s)", async (force) => {
    vi.mocked(parse).mockReturnValue({ ...current, entries: current.entries.slice(1) });
    await expect(fetchGogo(current.date, { allowStaleOfficial: force })).rejects.toThrow("Incomplete");
  });
  it.each(["2026-11-15", "2026-11-17"])("날짜 불일치(%s)는 실제 날짜를 유지한다", async (date) => {
    vi.mocked(parse).mockReturnValue({ ...current, date });
    expect((await fetchGogo(current.date)).date).toBe(date);
  });
  it("force에서도 실제 날짜를 유지해 메인 수집기의 기존 처리를 따른다", async () => {
    vi.mocked(parse).mockReturnValue({ ...current, date: "2026-11-15" });
    expect((await fetchGogo(current.date, { allowStaleOfficial: true })).date).toBe("2026-11-15");
  });
});
