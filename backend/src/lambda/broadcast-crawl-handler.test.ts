import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handler } from "./broadcast-crawl-handler";
import { collectAndSave as collectGogo } from "../gogo/pipeline";
import { collectAndSave as collectMezamashi } from "../mezamashi/pipeline";
import { fetchJson } from "../mezamashi/fetcher";
import { parse } from "../mezamashi/parser";

vi.mock("../db/supabase", () => ({ createAdminClient: () => ({}) }));
vi.mock("../gogo/pipeline", () => ({ collectAndSave: vi.fn() }));
vi.mock("../mezamashi/pipeline", () => ({ collectAndSave: vi.fn() }));
vi.mock("../mezamashi/fetcher", () => ({ fetchJson: vi.fn() }));
vi.mock("../mezamashi/parser", () => ({ parse: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T00:00:00Z"));
  vi.mocked(collectGogo).mockResolvedValue({
    status: "saved",
    date: "2026-10-27",
    count: 12,
  });
  vi.mocked(collectMezamashi).mockResolvedValue({
    status: "saved",
    date: "2026-10-27",
    count: 12,
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("알림 없는 방송별 수집 핸들러 (외부 호출 전부 대체)", () => {
  it.each(["2026-10-27", "2026-10-31", "2026-11-01"])(
    "평일·주말 모두 두 방송을 수집한다: %s",
    async (date) => {
      vi.setSystemTime(new Date(`${date}T00:00:00Z`));
      await handler();
      expect(collectGogo).toHaveBeenCalledWith({}, date, { dryRun: false });
      expect(collectMezamashi).toHaveBeenCalledWith({}, date);
    },
  );
  it("고고 실패와 무관하게 메자마시는 처리한다", async () => {
    vi.mocked(collectGogo).mockRejectedValue(new Error("offline"));
    const result = await handler();
    expect(collectMezamashi).toHaveBeenCalled();
    expect(result.results).toMatchObject([
      { source: "gogo", status: "failed" },
      { source: "mezamashi", status: "saved" },
    ]);
  });
  it("메자마시 실패와 무관하게 고고는 처리한다", async () => {
    vi.mocked(collectMezamashi).mockRejectedValue(new Error("offline"));
    expect((await handler()).results).toMatchObject([
      { status: "saved" },
      { status: "failed" },
    ]);
  });
  it("둘 다 실패하면 운영 로그에 오류를 숨기지 않는다", async () => {
    vi.mocked(collectGogo).mockRejectedValue(new Error("offline"));
    vi.mocked(collectMezamashi).mockRejectedValue(new Error("offline"));
    await expect(handler()).rejects.toThrow("Both sources failed");
  });
  it("dryRun은 메자마시 저장 경로를 실행하지 않는다", async () => {
    vi.mocked(fetchJson).mockResolvedValue({});
    vi.mocked(parse).mockReturnValue({
      date: "2026-10-27",
      entries: Array(12).fill({}),
    });
    const result = await handler({ dryRun: true });
    expect(collectGogo).toHaveBeenCalledWith({}, "2026-10-27", {
      dryRun: true,
    });
    expect(collectMezamashi).not.toHaveBeenCalled();
    expect(result.results[1].status).toBe("dry_run");
  });
});
