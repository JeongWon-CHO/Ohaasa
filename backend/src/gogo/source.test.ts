import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGogo } from "./source";
import { fetchHtml } from "./fetcher";
import { parse } from "./parser";
import { fetchHtml as fetchCat, parse as parseCat } from "./todays-cat";

vi.mock("./fetcher", () => ({ fetchHtml: vi.fn() }));
vi.mock("./parser", () => ({ parse: vi.fn() }));
vi.mock("./todays-cat", async (original) => ({
  ...(await original<typeof import("./todays-cat")>()),
  fetchHtml: vi.fn(),
}));
const html = readFileSync(
  resolve(__dirname, "fixtures/todays-cat-2026-10-27.html"),
  "utf8",
);
const current = parseCat(html);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchHtml).mockResolvedValue("official");
  vi.mocked(parse).mockReturnValue(current);
  vi.mocked(fetchCat).mockResolvedValue(html);
});

describe("고고 공식 우선 수집", () => {
  it("공식 당일 데이터면 예비 소스는 요청하지 않는다", async () => {
    expect(await fetchGogo(current.date)).toEqual(current);
    expect(fetchCat).not.toHaveBeenCalled();
  });
  it.each(["network", "parse", "stale", "incomplete"])(
    "공식 %s 시 예비 소스를 사용한다",
    async (failure) => {
      if (failure === "network")
        vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
      if (failure === "parse")
        vi.mocked(parse).mockImplementation(() => {
          throw new Error("bad HTML");
        });
      if (failure === "stale")
        vi.mocked(parse).mockReturnValue({ ...current, date: "2026-10-26" });
      if (failure === "incomplete")
        vi.mocked(parse).mockReturnValue({
          ...current,
          entries: current.entries.slice(1),
        });
      expect(await fetchGogo(current.date)).toEqual(current);
      expect(fetchCat).toHaveBeenCalledOnce();
      expect(fetchCat).toHaveBeenCalledWith(current.date);
    },
  );
  it("예비 소스도 과거 날짜면 실제 날짜를 유지해 저장 경로가 거부하게 한다", async () => {
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    vi.mocked(fetchCat).mockResolvedValue(
      html.replace("2026.10.27 05:10", "2026.10.26 05:10"),
    );
    expect((await fetchGogo(current.date)).date).toBe("2026-10-26");
  });
  it.each(["offline", "broken"])(
    "양쪽 실패(%s)는 오류로 반환한다",
    async (failure) => {
      vi.mocked(fetchHtml).mockRejectedValue(new Error("official offline"));
      if (failure === "offline")
        vi.mocked(fetchCat).mockRejectedValue(new Error("cat offline"));
      else vi.mocked(fetchCat).mockResolvedValue("<html>maintenance</html>");
      await expect(fetchGogo(current.date)).rejects.toThrow(
        "Both collection sources failed",
      );
    },
  );
  it("공식이 stale이고 예비 소스도 실패하면 stale을 유지한다", async () => {
    vi.mocked(parse).mockReturnValue({ ...current, date: "2026-10-26" });
    vi.mocked(fetchCat).mockRejectedValue(new Error("offline"));
    expect((await fetchGogo(current.date)).date).toBe("2026-10-26");
  });
  it("기존 force 동작은 공식 소스에만 적용한다", async () => {
    vi.mocked(parse).mockReturnValue({ ...current, date: "2026-10-26" });
    expect(
      (await fetchGogo(current.date, { allowStaleOfficial: true })).date,
    ).toBe("2026-10-26");
    expect(fetchCat).not.toHaveBeenCalled();
    vi.mocked(fetchHtml).mockRejectedValue(new Error("offline"));
    vi.mocked(fetchCat).mockResolvedValue(
      html.replace("2026.10.27 05:10", "2026.10.26 05:10"),
    );
    await expect(
      fetchGogo(current.date, { allowStaleOfficial: true }),
    ).rejects.toThrow("Both collection sources failed");
  });
});
