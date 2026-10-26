import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { parseHtml } from "./parser";
import { collectAndSave, translateEntries } from "./pipeline";

const entries = parseHtml(readFileSync(resolve(__dirname, "fixtures/2026-10-26.html"), "utf8"), 2026).entries;
const input = { date: "2026/10/26", ranking: entries.map(e => ({
  name: e.zodiac_name, rank: e.rank, text: e.advice, point: e.lucky_point,
  color: e.lucky_color, advice: e.extra_advice ?? "", person: e.lucky_person ?? "", menu: e.lucky_menu ?? "",
})) };

describe("mezamashi pipeline", () => {
  it("원문이 같은 필드는 재번역하지 않고 변경된 필드만 갱신한다", async () => {
    const translate = vi.fn(async () => "한국어 번역");
    const rows = await translateEntries(entries, [], translate);
    translate.mockClear();
    const updated = entries.map(e => ({ ...e }));
    updated[0].lucky_point = "新しい香水";
    await translateEntries(updated, rows, translate);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith("新しい香水", "mezamashi lucky_point");
  });

  it("번역 실패와 일본어 잔존은 null로 남기고 원문을 보존한다", async () => {
    const rows = await translateEntries(entries.slice(0, 1), [], async () => "日本語");
    expect(rows[0].advice_ko).toBeNull();
    expect(rows[0].advice).toBe(entries[0].advice);
    const retried = await translateEntries(entries.slice(0, 1), rows, async () => "번역 완료");
    expect(retried[0].advice_ko).toBe("번역 완료");
  });

  it("추가 항목이 없는 순위의 번역도 null로 둔다", async () => {
    const [row] = await translateEntries(entries.slice(1, 2), [], async () => "번역");
    expect(row.extra_advice_ko).toBeNull();
    expect(row.lucky_person_ko).toBeNull();
    expect(row.lucky_menu_ko).toBeNull();
  });

  it("당일 데이터가 아니면 DB에 접근하지 않는다 (일요일/업데이트 전 포함)", async () => {
    const from = vi.fn();
    const result = await collectAndSave({ from } as unknown as SupabaseClient, "2026-10-27", input);
    expect(result).toEqual({ status: "stale", date: "2026-10-26", count: 0 });
    expect(from).not.toHaveBeenCalled();
  });

  it("별도 테이블에만 12행을 저장한다", async () => {
    const existing = await translateEntries(entries, [], async () => "기존 번역");
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({
      select: () => ({ eq: async () => ({ data: existing, error: null }) }), upsert,
    }));
    const result = await collectAndSave({ from } as unknown as SupabaseClient, "2026-10-26", input);
    expect(result.count).toBe(12);
    expect(from.mock.calls).toEqual([["mezamashi_horoscopes"], ["mezamashi_horoscopes"]]);
    expect(upsert).toHaveBeenCalledWith(existing, { onConflict: "date,zodiac_sign" });
  });

  it("기존 번역 조회 실패 시 덮어쓰지 않는다", async () => {
    const from = vi.fn(() => ({ select: () => ({ eq: async () => ({ data: null, error: { message: "unavailable" } }) }) }));
    await expect(collectAndSave({ from } as unknown as SupabaseClient, "2026-10-26", input)).rejects.toThrow("query failed");
    expect(from).toHaveBeenCalledTimes(1);
  });
});
