import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectAndSave, translateEntries, type GogoRow } from "./pipeline";
import { parse, type GogoEntry } from "./parser";

vi.mock("./fetcher", () => ({ fetchHtml: vi.fn(async () => "fixture") }));
vi.mock("./parser", () => ({ parse: vi.fn() }));
vi.mock("./translator", () => ({ translateGogoEntries: vi.fn() }));
vi.mock("../translator/translate", () => ({
  containsJapanese: (text: string) => /[ぁ-んァ-ヶ一-龯]/.test(text),
  translateAdvice: vi.fn(),
}));

const date = "2026-10-27";
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
const entries: GogoEntry[] = signs.map((zodiac_sign, i) => ({
  zodiac_sign,
  rank: i + 1,
  advice: `本文${i}`,
  lucky_color: "青",
  lucky_item: "本",
  money_score: 3,
  love_score: 3,
  work_score: 3,
  health_score: 3,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(parse).mockReturnValue({ date, entries });
});

function database(
  existing: GogoRow[] = [],
  queryError: unknown = null,
  saveError: unknown = null,
) {
  const upsert = vi.fn(async () => ({ error: saveError }));
  const from = vi.fn(() => ({
    select: () => ({ eq: async () => ({ data: existing, error: queryError }) }),
    upsert,
  }));
  return { client: { from } as unknown as SupabaseClient, from, upsert };
}

describe("고고 전용 저장", () => {
  it("동일한 원문·번역은 재사용하고 변경된 필드만 번역한다", async () => {
    const translate = vi.fn(
      async (_entry: GogoEntry, _field: string) => "한국어 번역",
    );
    const existing = await translateEntries(entries, date, [], translate);
    translate.mockClear();
    const changed = entries.map((row) => ({ ...row }));
    changed[0].advice = "変更した本文";
    await translateEntries(changed, date, existing, translate);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith(changed[0], "advice");
  });
  it("동일한 색상·아이템은 별자리 간에도 한 번만 번역한다", async () => {
    const translate = vi.fn(
      async (_entry: GogoEntry, _field: string) => "번역",
    );
    await translateEntries(entries, date, [], translate);
    expect(
      translate.mock.calls.filter(([, field]) => field === "lucky_color"),
    ).toHaveLength(1);
    expect(
      translate.mock.calls.filter(([, field]) => field === "lucky_item"),
    ).toHaveLength(1);
  });
  it.each(["日本語", " ", null])(
    "유효하지 않은 번역 %s는 null로 저장하고 다음 실행에서 재시도한다",
    async (value) => {
      const incomplete = await translateEntries(
        entries,
        date,
        [],
        async () => value,
      );
      expect(
        incomplete.every(
          (row) => row.advice_ko === null && row.lucky_item_ko === null,
        ),
      ).toBe(true);
      const retry = vi.fn(async () => "번역 완료");
      const completed = await translateEntries(
        entries,
        date,
        incomplete,
        retry,
      );
      expect(retry).toHaveBeenCalled();
      expect(completed.every((row) => row.advice_ko === "번역 완료")).toBe(
        true,
      );
    },
  );
  it("개별 번역 예외가 원문 처리를 중단하지 않는다", async () => {
    const rows = await translateEntries(entries, date, [], async () => {
      throw new Error("offline");
    });
    expect(rows).toHaveLength(12);
    expect(rows[0].advice).toBe(entries[0].advice);
    expect(rows[0].advice_ko).toBeNull();
  });
  it("과거·미래 데이터는 오늘로 바꾸거나 DB에 저장하지 않는다", async () => {
    const db = database();
    for (const staleDate of ["2026-10-26", "2026-10-28"]) {
      vi.mocked(parse).mockReturnValue({ date: staleDate, entries });
      expect(await collectAndSave(db.client, date)).toMatchObject({
        status: "stale",
        date: staleDate,
      });
    }
    expect(db.from).not.toHaveBeenCalled();
  });
  it("dryRun은 검증만 하고 DB와 번역을 호출하지 않는다", async () => {
    const db = database();
    expect(
      await collectAndSave(db.client, date, { dryRun: true }),
    ).toMatchObject({ status: "dry_run", count: 12 });
    expect(db.from).not.toHaveBeenCalled();
  });
  it.each(["count", "rank", "sign", "advice", "score"])(
    "불완전한 %s는 저장 전에 거부한다",
    async (reason) => {
      const broken = entries.map((row) => ({ ...row }));
      if (reason === "count") broken.pop();
      if (reason === "rank") broken[1].rank = 1;
      if (reason === "sign") broken[1].zodiac_sign = "unknown";
      if (reason === "advice") broken[0].advice = "";
      if (reason === "score") broken[0].money_score = 7;
      vi.mocked(parse).mockReturnValue({ date, entries: broken });
      const db = database();
      await expect(collectAndSave(db.client, date)).rejects.toThrow(
        "Incomplete",
      );
      expect(db.from).not.toHaveBeenCalled();
    },
  );
  it("전용 테이블에만 12행을 저장하고 재실행 시 번역을 재사용한다", async () => {
    const existing = await translateEntries(
      entries,
      date,
      [],
      async () => "기존 번역",
    );
    const db = database(existing);
    expect(await collectAndSave(db.client, date)).toEqual({
      status: "saved",
      date,
      count: 12,
    });
    expect(db.from.mock.calls).toEqual([
      ["gogo_horoscopes"],
      ["gogo_horoscopes"],
    ]);
    expect(db.upsert).toHaveBeenCalledWith(existing, {
      onConflict: "date,zodiac_sign",
    });
  });
  it("기존 번역 조회 실패 시 덮어쓰지 않는다", async () => {
    const db = database([], { message: "offline" });
    await expect(collectAndSave(db.client, date)).rejects.toThrow(
      "query failed",
    );
    expect(db.upsert).not.toHaveBeenCalled();
  });
  it("저장 실패는 성공으로 반환하지 않는다", async () => {
    const existing = await translateEntries(
      entries,
      date,
      [],
      async () => "번역",
    );
    await expect(
      collectAndSave(database(existing, null, {}).client, date),
    ).rejects.toThrow("Save failed");
  });
});
